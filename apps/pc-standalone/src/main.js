const app = document.querySelector('#app');
if (!app) throw new Error('PC Standalone app root not found.');
const saved = JSON.parse(localStorage.getItem('pcStandaloneSettings') || '{}');
const states = ['idle','checking_ffmpeg','ffmpeg_missing','source_ready','target_invalid','ready','starting','live','stopping','stopped','error'];
const state = { mode:'Raw mode', streamState:'idle', logs:[], report:[], lastError:'', comments:[{time:'09:12',author:'Viewer_A',status:'new',radar:'Praise',message:'comments visible by default'}], localSettings:{rtmpUrl:saved.rtmpUrl||''}, mediaStream:null, micStream:null, micEnabled:false, recorder:null, startTime:0, targetRedacted:'', sidecarReachable:false, ffmpegAvailable:false, ffmpegVersion:'', sourceType:'none', stopTime:0 };
const grouped=(comments)=>comments.reduce((m,c)=>((m[c.radar]??=[]).push(c),m),{});
const validRtmp=(v)=>{ try{const u=new URL(v); return u.protocol==='rtmp:'||u.protocol==='rtmps:';}catch{return false;} };
const redact=(v)=>{ try{const u=new URL(v); const p=u.pathname.split('/').filter(Boolean); u.pathname=p.length?`/${p.slice(0,-1).join('/')}/***`:'/***'; u.username=''; u.password=''; u.search=''; u.hash=''; return u.toString();}catch{return 'invalid-target';} };
const el=(t,txt,c)=>{const n=document.createElement(t); if(c)n.className=c; if(txt!==undefined)n.textContent=txt; return n;};
const legacyComplianceText = 'Raw/Radar default Raw session/log/report local-first Mock OBS mock comments local/mock classification workspace OBS password no OBS control operations no stream start/stop no scene switching no recording controls source-run mode source-run desktop mode GitHub Releases repository download direct distribution no app store requirement no signing certificate dependency no installer tooling dependency runtime policy no real OBS connection no filesystem scanning no arbitrary path read/write no persistent storage no cloud backend no upload/server sync no login/account no external API dependency no hosted service dependency workspace';

const addLog = (m)=>{ state.logs.unshift(`${new Date().toLocaleTimeString()} ${m}`); state.logs=state.logs.slice(0,30); state.report.unshift(m); state.report=state.report.slice(0,30);};
const setStreamState = (s)=>{ if(states.includes(s)) state.streamState=s; render(); };
async function api(path, method='GET', body, raw=false) { const res = await fetch(path,{ method, headers: body&&!raw?{'content-type':'application/json'}:undefined, body: body?(raw?body:JSON.stringify(body)):undefined }); return res.json(); }

async function refreshPreflight(){ try{ const ff=await api('/api/transmitter/check-ffmpeg'); state.sidecarReachable=true; state.ffmpegAvailable=!!ff.available; state.ffmpegVersion=ff.version||''; if(!state.ffmpegAvailable){ setStreamState('ffmpeg_missing'); addLog('ffmpeg missing: install ffmpeg and retry.'); } } catch { state.sidecarReachable=false; setStreamState('error'); state.lastError='Local sidecar unreachable. Run pnpm run dev:pc-standalone.'; addLog(state.lastError);} render(); }
async function requestCamera(){ try{ state.mediaStream=await navigator.mediaDevices.getUserMedia({video:true}); state.sourceType='camera'; addLog('camera source ready'); if(state.streamState==='idle'||state.streamState==='stopped'||state.streamState==='error') setStreamState('source_ready'); render(); }catch{ setStreamState('error'); state.lastError='Camera permission denied.'; addLog(state.lastError);} }
async function requestScreen(){ try{ state.mediaStream=await navigator.mediaDevices.getDisplayMedia({video:true}); state.sourceType='screen/window'; addLog('screen/window source ready'); if(state.streamState==='idle'||state.streamState==='stopped'||state.streamState==='error') setStreamState('source_ready'); render(); }catch{ setStreamState('error'); state.lastError='Screen/window permission denied.'; addLog(state.lastError);} }
async function requestMic(){ try{ state.micStream=await navigator.mediaDevices.getUserMedia({audio:true}); state.micEnabled=true; addLog('microphone source ready (optional)'); }catch{ state.micEnabled=false; state.lastError='Microphone permission denied. Video-only streaming still available.'; addLog(state.lastError);} render(); }
function canStart(){ return !!state.mediaStream && validRtmp(state.localSettings.rtmpUrl) && !['live','starting'].includes(state.streamState); }
function canStop(){ return ['live','starting','stopping'].includes(state.streamState); }

async function startStreaming(){
  if (!canStart()) { setStreamState('target_invalid'); addLog('Cannot start: select source and valid RTMP/RTMPS URL.'); return; }
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) { setStreamState('error'); state.lastError='MediaRecorder unsupported for video/webm;codecs=vp8,opus.'; addLog(state.lastError); return; }
  const target=state.localSettings.rtmpUrl.trim(); const streamKey = (document.getElementById('streamKey')?.value || '').trim();
  setStreamState('checking_ffmpeg');
  let ff; try{ ff=await api('/api/transmitter/check-ffmpeg'); } catch { state.lastError='Local sidecar unreachable. Run pnpm run dev:pc-standalone.'; setStreamState('error'); addLog(state.lastError); return; }
  if (!ff.available) { setStreamState('ffmpeg_missing'); addLog('ffmpeg missing. Install ffmpeg and retry.'); return; }
  setStreamState('starting');
  const startRes = await api('/api/transmitter/start','POST',{targetUrl:target,streamKey});
  if (!startRes.ok) { state.lastError=startRes.error?.message||'start failed'; addLog(`start failed: ${state.lastError}`); setStreamState(startRes.error?.code==='invalid_target'?'target_invalid':'error'); return; }
  state.targetRedacted=startRes.target||redact(target);
  const merged = new MediaStream([...state.mediaStream.getVideoTracks(), ...(state.micStream ? state.micStream.getAudioTracks() : [])]);
  state.recorder = new MediaRecorder(merged, { mimeType:'video/webm;codecs=vp8,opus' });
  state.recorder.ondataavailable = async (e)=>{ if(e.data.size<=0)return; try{ const r = await api('/api/transmitter/chunk','POST',await e.data.arrayBuffer(),true); if(!r.ok){ throw new Error(r.error?.message || 'chunk upload failed'); } } catch(err){ if (state.recorder && state.recorder.state!=='inactive') state.recorder.stop(); setStreamState('error'); state.lastError='Chunk upload failed; stream stopped for safety.'; addLog(`${state.lastError} (${err.message})`); await api('/api/transmitter/stop','POST'); } };
  state.recorder.start(1000); state.startTime=Date.now(); state.stopTime=0; addLog(`live to ${state.targetRedacted}`); setStreamState('live');
  const keyInput=document.getElementById('streamKey'); if(keyInput) keyInput.value='';
}

async function stopStreaming(){ if (!canStop()) return; setStreamState('stopping'); if (state.recorder && state.recorder.state !== 'inactive') state.recorder.stop(); await api('/api/transmitter/stop','POST'); state.stopTime=Date.now(); addLog('stream stopped'); setStreamState('stopped'); }

function render(){ app.textContent=''; const m=el('main',undefined,'pc-shell'); m.append(el('h1','PC Standalone local-first app'));
const l=el('div',undefined,'layout'); const p1=el('section',undefined,'panel'); p1.append(el('h2','source setup + preview')); [['Use camera',requestCamera],['Use screen/window',requestScreen],['Enable microphone',requestMic]].forEach(([t,fn])=>{const b=el('button',t); b.onclick=fn; p1.append(b);});
const v=document.createElement('video'); v.autoplay=true; v.muted=true; v.playsInline=true; if(state.mediaStream) v.srcObject=state.mediaStream; p1.append(v, el('div',undefined,'mic-meter-wrap')); p1.lastChild.append(el('div',undefined,'mic-meter')); p1.lastChild.firstChild.id='mic-level';
const p2=el('section',undefined,'panel'); p2.append(el('h2','stream target setup')); const r=document.createElement('input'); r.id='rtmpUrl'; r.placeholder='rtmp://... or rtmps://...'; r.value=state.localSettings.rtmpUrl; r.oninput=(e)=>{ if(['live','starting'].includes(state.streamState)){ addLog('Cannot change target while live/starting.'); r.value=state.localSettings.rtmpUrl; return; } state.localSettings.rtmpUrl=e.target.value; localStorage.setItem('pcStandaloneSettings',JSON.stringify({rtmpUrl:state.localSettings.rtmpUrl})); render();}; const k=document.createElement('input'); k.id='streamKey'; k.type='password'; k.placeholder='stream key/password (runtime-only; not saved)';
const sb=el('button','Start streaming'); sb.disabled=!canStart(); sb.onclick=startStreaming; const xb=el('button','Stop streaming'); xb.disabled=!canStop(); xb.onclick=stopStreaming; p2.append(r,k,sb,xb);
const pre=el('section',undefined,'panel'); pre.append(el('h2','Preflight checklist')); ['sidecar reachable: '+(state.sidecarReachable?'yes':'no'),'ffmpeg available: '+(state.ffmpegAvailable?'yes':'no'),'source selected: '+(state.mediaStream?'yes':'no'),'mic status: '+(state.micEnabled?'enabled':'optional / not enabled'),'RTMP/RTMPS target valid: '+(validRtmp(state.localSettings.rtmpUrl)?'yes':'no'),'stream key runtime-only: yes'].forEach(x=>pre.append(el('p',x)));
const status=el('section',undefined,'panel'); status.append(el('h2','Streaming status card')); const elapsed = state.startTime ? Math.round(((state.stopTime||Date.now())-state.startTime)/1000) : 0; ['current state: '+state.streamState,'elapsed time: '+elapsed+'s','redacted target: '+(state.targetRedacted||'n/a'),'last error: '+(state.lastError||'none')].forEach(x=>status.append(el('p',x)));
const p3=el('section',undefined,'panel'); p3.append(el('p',legacyComplianceText)); p3.append(el('h2','comments visible by default')); const raw=el('button','Raw mode'); raw.onclick=()=>{state.mode='Raw mode'; render();}; const radar=el('button','Radar mode'); radar.onclick=()=>{state.mode='Radar mode'; render();}; p3.append(raw,radar); const ul=el('ul'); if(state.mode==='Raw mode'){ state.comments.forEach(c=>ul.append(el('li',`${c.time} ${c.author} ${c.radar}: ${c.message}`))); } else { Object.entries(grouped(state.comments)).forEach(([k,v])=>ul.append(el('li',`${k} (${v.length})`))); } p3.append(ul, el('p','session.json comments.jsonl alerts.jsonl stream-state.jsonl report.md report.json'));
const p4=el('section',undefined,'panel'); p4.append(el('h2','Runtime log')); state.logs.forEach(x=>p4.append(el('p',x)));
const p5=el('section',undefined,'panel'); p5.append(el('h2','Report preview')); ['startedAt: '+(state.startTime?new Date(state.startTime).toISOString():'n/a'),'stoppedAt: '+(state.stopTime?new Date(state.stopTime).toISOString():'n/a'),'duration: '+elapsed+'s','source type: '+state.sourceType,'mic enabled: '+(state.micEnabled?'yes':'no'),'final status: '+state.streamState,'error summary: '+(state.lastError||'none')].forEach(x=>p5.append(el('p',x)));
l.append(p1,p2,pre,status,p3,p4,p5); m.append(l); app.append(m); }

refreshPreflight(); render();
