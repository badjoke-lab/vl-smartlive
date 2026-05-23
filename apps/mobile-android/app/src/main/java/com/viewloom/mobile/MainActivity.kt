package com.viewloom.mobile

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.os.SystemClock
import android.text.InputType
import android.view.SurfaceView
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import com.pedro.library.rtmp.RtmpCamera2
import com.pedro.rtmp.utils.ConnectCheckerRtmp
import java.time.Duration
import java.time.Instant
import java.util.UUID
import kotlin.concurrent.thread
import kotlin.math.abs

class MainActivity : Activity(), ConnectCheckerRtmp {
    private val requestCameraCode = 1001
    private val requestMicCode = 1002

    private lateinit var previewView: SurfaceView
    private lateinit var commentsView: TextView
    private lateinit var statusView: TextView
    private lateinit var runtimeLogView: TextView
    private lateinit var reportPreviewView: TextView
    private lateinit var permissionStatusView: TextView
    private lateinit var micMeterView: TextView
    private lateinit var streamTargetInput: EditText
    private lateinit var streamKeyInput: EditText

    private var cameraReady = false
    private var micReady = false
    private var previewReady = false
    private var micMeterRunning = false
    private var radarMode = false
    private var streamState = "idle"
    private var finalStatus = "idle"
    private var rtmpCamera2: RtmpCamera2? = null
    private var sessionId = UUID.randomUUID().toString()
    private var startedAt: Instant? = null
    private var stoppedAt: Instant? = null
    private var lastErrorSummary: String? = null

    private val runtimeLogs = mutableListOf<String>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        title = "Mobile RTMP/RTMPS Streaming"

        val root = ScrollView(this)
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 24, 24, 24)
            setBackgroundColor(Color.parseColor("#10151F"))
        }

        content.addView(label("Streaming status card"))
        statusView = label("Stream state: idle")
        content.addView(statusView)

        content.addView(label("Permission status panel"))
        permissionStatusView = label("permission status initializing")
        content.addView(permissionStatusView)

        content.addView(label("Preview area"))
        previewView = SurfaceView(this).apply { minimumHeight = 360 }
        content.addView(previewView)

        content.addView(Button(this).apply {
            text = "Enable camera permission / preview"
            setOnClickListener { requestCameraPermissionAfterTap() }
        })

        content.addView(Button(this).apply {
            text = "Enable microphone permission / level check"
            setOnClickListener { requestMicPermissionAfterTap() }
        })

        micMeterView = label("Mic meter status: idle")
        content.addView(micMeterView)

        streamTargetInput = EditText(this).apply {
            hint = "RTMP/RTMPS target (runtime only)"
            inputType = InputType.TYPE_CLASS_TEXT
        }
        content.addView(streamTargetInput)

        streamKeyInput = EditText(this).apply {
            hint = "Stream key / password (runtime only)"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
        content.addView(streamKeyInput)

        content.addView(Button(this).apply {
            text = "Start streaming"
            setOnClickListener { startStreaming() }
        })

        content.addView(Button(this).apply {
            text = "Stop streaming"
            setOnClickListener { stopStreaming("stopped") }
        })

        content.addView(Button(this).apply {
            text = "Export/share report"
            setOnClickListener { sharePlainText("ViewLoom report", buildReportText()) }
        })

        content.addView(Button(this).apply {
            text = "Export/share runtime log"
            setOnClickListener { sharePlainText("ViewLoom runtime log", buildRuntimeLogText()) }
        })

        content.addView(label("Comments panel (visible by default)"))
        content.addView(Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, listOf("Raw", "Radar"))
            setSelection(0)
            setOnItemSelectedListener(object : android.widget.AdapterView.OnItemSelectedListener {
                override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: View?, position: Int, id: Long) {
                    radarMode = position == 1
                    refreshCommentsPanel()
                    renderSessionReport()
                }
                override fun onNothingSelected(parent: android.widget.AdapterView<*>?) = Unit
            })
        })

        commentsView = label("")
        content.addView(commentsView)

        content.addView(label("Session / log / report panel"))
        content.addView(label("Runtime log panel"))
        runtimeLogView = label("")
        content.addView(runtimeLogView)

        content.addView(label("Report preview panel"))
        reportPreviewView = label("")
        content.addView(reportPreviewView)

        root.addView(content)
        setContentView(root)

        rtmpCamera2 = RtmpCamera2(previewView, this)
        updateStreamState("idle")
        refreshCommentsPanel()
        appendRuntimeLog("Session initialized (in memory only): $sessionId")
        refreshPermissionStatus()
    }

    private fun label(text: String): TextView = TextView(this).apply {
        this.text = text
        setTextColor(Color.parseColor("#E5E7EB"))
    }

    private fun requestCameraPermissionAfterTap() {
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            cameraReady = true
            startPreviewIfPossible()
            appendRuntimeLog("Camera permission already granted.")
            refreshPermissionStatus()
            return
        }
        requestPermissions(arrayOf(Manifest.permission.CAMERA), requestCameraCode)
    }

    private fun requestMicPermissionAfterTap() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            micReady = true
            startMicMeter()
            appendRuntimeLog("Microphone permission already granted.")
            refreshPermissionStatus()
            return
        }
        requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), requestMicCode)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
        when (requestCode) {
            requestCameraCode -> {
                cameraReady = granted
                if (granted) {
                    startPreviewIfPossible()
                } else {
                    fail("Camera permission denied. Enable Camera in Android Settings and retry.")
                }
                appendRuntimeLog("Camera permission result: $granted")
            }
            requestMicCode -> {
                micReady = granted
                if (granted) {
                    startMicMeter()
                } else {
                    fail("Microphone permission denied. Enable Microphone in Android Settings and retry.")
                }
                appendRuntimeLog("Microphone permission result: $granted")
            }
        }
        refreshPermissionStatus()
        if (cameraReady && micReady && streamState != "live") updateStreamState("ready")
    }

    private fun startPreviewIfPossible() {
        rtmpCamera2?.startPreview()
        previewReady = true
        appendRuntimeLog("Camera preview ready.")
        refreshPermissionStatus()
    }

    private fun startMicMeter() {
        if (micMeterRunning) return
        micMeterRunning = true
        refreshPermissionStatus()
        thread(start = true) {
            val bufferSize = AudioRecord.getMinBufferSize(44100, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
            if (bufferSize <= 0) {
                runOnUiThread {
                    fail("Mic meter unavailable on this device.")
                    refreshPermissionStatus()
                }
                micMeterRunning = false
                return@thread
            }
            val recorder = AudioRecord(MediaRecorder.AudioSource.MIC, 44100, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, bufferSize)
            val samples = ShortArray(bufferSize)
            recorder.startRecording()
            while (micMeterRunning) {
                val read = recorder.read(samples, 0, samples.size)
                val level = if (read > 0) samples.take(read).maxOf { abs(it.toInt()) } / 32767.0 else 0.0
                runOnUiThread { micMeterView.text = "Mic meter status: running (level %.2f)".format(level) }
                SystemClock.sleep(150)
            }
            recorder.stop()
            recorder.release()
        }
    }

    private fun startStreaming() {
        if (!cameraReady) {
            updateStreamState("permission_required")
            fail("Camera permission is required before starting stream.")
            return
        }
        if (!micReady) {
            updateStreamState("permission_required")
            fail("Microphone permission is required before starting stream. Video-only is unsupported in this build.")
            return
        }
        updateStreamState("validating_target")
        val target = streamTargetInput.text.toString().trim()
        val key = streamKeyInput.text.toString().trim()
        if (!(target.startsWith("rtmp://") || target.startsWith("rtmps://"))) {
            fail("Invalid target. Use rtmp:// or rtmps:// target.")
            return
        }
        val targetHasEmbeddedKey = target.removePrefix("rtmp://").removePrefix("rtmps://").contains('/') && !target.endsWith("/")
        if (key.isEmpty() && !targetHasEmbeddedKey) {
            fail("Missing stream key/password. Provide a stream key or full target path.")
            return
        }
        if (!isNetworkAvailable()) {
            appendRuntimeLog("Network unavailable detected before connect attempt.")
        }
        val endpoint = if (key.isEmpty()) target else if (target.endsWith("/")) "$target$key" else "$target/$key"
        val camera = rtmpCamera2 ?: run {
            fail("Streaming transport unavailable.")
            return
        }
        updateStreamState("starting")
        if (!camera.prepareAudio() || !camera.prepareVideo()) {
            fail("Encoder failure while preparing camera/microphone stream.")
            return
        }
        startedAt = Instant.now()
        stoppedAt = null
        lastErrorSummary = null
        finalStatus = "starting"
        camera.startStream(endpoint)
        appendRuntimeLog("Start requested to ${redactTarget(target)}")
        renderSessionReport()
    }

    private fun stopStreaming(requestStatus: String) {
        updateStreamState("stopping")
        val camera = rtmpCamera2
        if (camera != null && camera.isStreaming) {
            camera.stopStream()
            appendRuntimeLog("Stop requested on live stream.")
        } else {
            appendRuntimeLog("Stop requested while not live; no-op transport stop.")
        }
        stoppedAt = Instant.now()
        streamKeyInput.text.clear()
        updateStreamState(requestStatus)
        appendRuntimeLog("Stream key/password field cleared from runtime UI memory.")
    }

    private fun sharePlainText(subject: String, text: String) {
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, subject)
            putExtra(Intent.EXTRA_TEXT, text)
        }
        startActivity(Intent.createChooser(intent, "Share"))
    }

    private fun fail(message: String) {
        lastErrorSummary = message
        updateStreamState("error")
        statusView.text = "Error: $message"
        appendRuntimeLog("Error: $message")
    }

    private fun refreshPermissionStatus() {
        val permissionSummary = buildString {
            appendLine("camera permission: ${if (cameraReady) "granted" else "missing"}")
            appendLine("microphone permission: ${if (micReady) "granted" else "missing"}")
            appendLine("preview status: ${if (previewReady) "ready" else "not ready"}")
            appendLine("mic meter status: ${if (micMeterRunning) "running" else "idle"}")
        }
        permissionStatusView.text = permissionSummary
    }

    private fun redactTarget(target: String): String {
        return target.replace(Regex("(rtmps?://[^/]+/).*"), "$1***")
    }

    private fun refreshCommentsPanel() {
        commentsView.text = if (radarMode) "Radar mode: grouped highlights, question, danger" else "Raw mode: chronological comments visible by default"
        appendRuntimeLog("Comment view set to ${if (radarMode) "Radar" else "Raw"}.")
    }

    private fun updateStreamState(newState: String) {
        streamState = newState
        finalStatus = newState
        statusView.text = "Stream state: $newState"
        appendRuntimeLog("state=$newState")
        renderSessionReport()
    }

    private fun appendRuntimeLog(event: String) {
        runtimeLogs.add("${Instant.now()} $event")
        runtimeLogView.text = buildRuntimeLogText()
        renderSessionReport()
    }

    private fun buildRuntimeLogText(): String = runtimeLogs.takeLast(80).joinToString("\n")

    private fun buildReportText(): String {
        val duration = if (startedAt != null && stoppedAt != null) Duration.between(startedAt, stoppedAt).seconds else null
        val safeTarget = redactTarget(streamTargetInput.text.toString().trim())
        return buildString {
            appendLine("sessionId=$sessionId")
            appendLine("state=$streamState")
            appendLine("startedAt=${startedAt ?: "-"}")
            appendLine("stoppedAt=${stoppedAt ?: "-"}")
            appendLine("duration=${duration ?: "-"}s")
            appendLine("finalStatus=$finalStatus")
            appendLine("target=$safeTarget")
            appendLine("cameraPermission=$cameraReady")
            appendLine("microphonePermission=$micReady")
            appendLine("previewStatus=${if (previewReady) "ready" else "not_ready"}")
            appendLine("micMeterStatus=${if (micMeterRunning) "running" else "idle"}")
            appendLine("errorSummary=${lastErrorSummary ?: "-"}")
            appendLine("commentMode=${if (radarMode) "Radar" else "Raw"}")
            appendLine("runtimeLogCount=${runtimeLogs.size}")
        }
    }

    private fun renderSessionReport() {
        reportPreviewView.text = buildReportText()
        refreshPermissionStatus()
    }

    private fun isNetworkAvailable(): Boolean {
        val cm = getSystemService(ConnectivityManager::class.java) ?: return false
        val active = cm.activeNetwork ?: return false
        val capabilities = cm.getNetworkCapabilities(active) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    override fun onConnectionSuccessRtmp() {
        runOnUiThread {
            updateStreamState("live")
            appendRuntimeLog("Streaming transport connected.")
        }
    }

    override fun onConnectionFailedRtmp(reason: String) {
        runOnUiThread {
            val safeTarget = redactTarget(streamTargetInput.text.toString().trim())
            fail("Connection failed. Check network/target and retry. target=$safeTarget reason=$reason")
        }
    }

    override fun onDisconnectRtmp() {
        runOnUiThread {
            stoppedAt = Instant.now()
            updateStreamState("stopped")
            appendRuntimeLog("Streaming transport disconnected.")
        }
    }

    override fun onAuthErrorRtmp() {
        runOnUiThread { fail("RTMP auth error. Verify stream key/password and retry.") }
    }

    override fun onAuthSuccessRtmp() {
        runOnUiThread { appendRuntimeLog("RTMP auth success.") }
    }
}
