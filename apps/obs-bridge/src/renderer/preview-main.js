const comments = [
  { time: "20:31:45", user: "userA", text: "音量が小さいかも", labels: ["audio_issue"], priority: "high" },
  { time: "20:31:52", user: "userB", text: "このソフトってスマホでも使えますか？", labels: ["question"], priority: "high" },
  { time: "20:32:01", user: "userC", text: "めっちゃきれい！！", labels: ["highlight"], priority: "normal" },
  { time: "20:32:10", user: "userD", text: "こんにちはー！", labels: ["normal"], priority: "normal" },
  { time: "20:32:15", user: "userE", text: "ナイス配信！！", labels: ["highlight"], priority: "normal" },
  { time: "20:32:20", user: "userF", text: "音声きれいに聞こえています", labels: ["normal"], priority: "normal" },
  { time: "20:32:25", user: "userG", text: "最高です！！！", labels: ["highlight"], priority: "normal" },
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const setText = (selector, value) => {
  const node = $(selector);
  if (node) node.textContent = String(value);
};

let mode = "raw";
let filter = "all";

function matchesFilter(comment) {
  if (filter === "all") return true;
  if (filter === "urgent") return comment.priority === "high";
  if (filter === "question") return comment.labels.includes("question");
  if (filter === "audio_issue") return comment.labels.includes("audio_issue");
  if (filter === "video_issue") return comment.labels.includes("video_issue");
  if (filter === "highlight") return comment.labels.includes("highlight");
  return true;
}

function labelText(comment) {
  if (comment.labels.includes("audio_issue")) return "音声";
  if (comment.labels.includes("question")) return "質問";
  if (comment.labels.includes("highlight")) return "盛上り";
  return "通常";
}

function renderComments() {
  const root = $("#commentList");
  if (!root) return;
  root.textContent = "";
  const search = ($("#commentSearch")?.value || "").trim().toLowerCase();
  const list = comments
    .filter(matchesFilter)
    .filter((comment) => !search || `${comment.user} ${comment.text}`.toLowerCase().includes(search))
    .sort((a, b) => {
      if (mode === "raw") return 0;
      const order = { high: 0, normal: 1, low: 2 };
      return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
    });

  for (const comment of list) {
    const item = document.createElement("article");
    item.className = `comment-item ${comment.priority === "high" ? "urgent" : ""}`;
    item.innerHTML = `
      <div class="comment-row-main">
        <span class="comment-time">${comment.time}</span>
        <strong>${comment.user}</strong>
        <span class="badge">${mode === "radar" ? "Radar · " : ""}${labelText(comment)}</span>
      </div>
      <p>${comment.text}</p>
      <div class="comment-actions">
        <button class="mini-button" type="button">読み上げ</button>
        <button class="mini-button" type="button">固定</button>
        <button class="mini-button" type="button">対応済み</button>
      </div>
    `;
    root.appendChild(item);
  }
}

function renderRadarTabs() {
  const root = $("#radarTabs");
  if (!root) return;
  const tabs = [
    ["all", "すべて", comments.length],
    ["question", "質問", comments.filter((c) => c.labels.includes("question")).length],
    ["audio_issue", "音声", comments.filter((c) => c.labels.includes("audio_issue")).length],
    ["highlight", "盛上り", comments.filter((c) => c.labels.includes("highlight")).length],
  ];
  root.textContent = "";
  for (const [id, label, count] of tabs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `radar-tab ${filter === id ? "active" : ""}`;
    button.textContent = `${label} ${count}`;
    button.addEventListener("click", () => {
      filter = id;
      renderRadarTabs();
      renderComments();
    });
    root.appendChild(button);
  }
}

function renderSummary() {
  setText("summaryComments", comments.length);
  setText("summaryQuestions", comments.filter((c) => c.labels.includes("question")).length);
  setText("summaryAudio", comments.filter((c) => c.labels.includes("audio_issue")).length);
  setText("summaryVideo", 1);
  setText("summaryHeld", 0);
  setText("summaryAlerts", 2);
  setText("heldCount", 0);
  setText("queueCount", 2);
  setText("nextQueueItem", "20:31:45 userA: 音量が小さいかも");
  setText("liveSummary", "OBS Mode: mock\nOBS State: mock_ready\nOBS Control: disabled\n\nComments are visible by default. Raw/Radar classification is available in-place.");
  setText("outputPreviewPanel", "No outputs generated yet. Use the output buttons to download local JSON/Markdown previews.");
}

function bind() {
  $$(".mode-tab").forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.dataset.mode || "raw";
      $$(".mode-tab").forEach((item) => item.classList.toggle("active", item === button));
      renderComments();
    });
  });

  $$(".nav-tab").forEach((button) => {
    button.addEventListener("click", () => {
      const screen = button.dataset.screen;
      $$(".nav-tab").forEach((item) => item.classList.toggle("active", item === button));
      $$(".screen").forEach((item) => item.classList.toggle("active", item.id === `${screen}Screen`));
    });
  });

  $("#commentFilter")?.addEventListener("change", (event) => {
    filter = event.target.value;
    renderRadarTabs();
    renderComments();
  });
  $("#commentSearch")?.addEventListener("input", renderComments);
  $("#addCommentButton")?.addEventListener("click", () => {
    const author = $("#commentAuthorInput")?.value.trim() || "guest";
    const text = $("#commentMessageInput")?.value.trim() || "コメント確認";
    const label = $("#commentLabelInput")?.value || "normal";
    comments.unshift({ time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), user: author, text, labels: [label], priority: label === "danger" ? "high" : "normal" });
    renderSummary();
    renderRadarTabs();
    renderComments();
  });
}

renderSummary();
renderRadarTabs();
renderComments();
bind();
