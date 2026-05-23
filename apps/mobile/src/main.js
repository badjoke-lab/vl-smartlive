const comments = [
  ['warning', 'たけぽん', '12:29:45', '音小さいかも'],
  ['question', 'ゆうき', '12:29:20', 'これは何のアプリ？'],
  ['praise', 'さくら', '12:28:55', 'こんにちは！'],
  ['video', 'Kenta_Travel', '12:29:18', '映像がカクカクします'],
  ['danger', '悪質ユーザー', '12:29:55', 'お前の配信つまらない。消えろよwww']
];

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.toggle('active', screen.dataset.screen === id));
  document.querySelectorAll('[data-target]').forEach((button) => button.classList.toggle('active', button.dataset.target === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderComments(targetId, count = comments.length) {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.innerHTML = '';
  comments.slice(0, count).forEach(([type, name, time, message]) => {
    const item = document.createElement('article');
    item.className = `comment-card ${type}`;
    item.innerHTML = `<div class="comment-icon">${iconFor(type)}</div><div class="comment-body"><strong>${message}</strong><span>ユーザー：${name}</span><small>${time}</small></div><div class="comment-actions"><button>読む</button><button>固定</button><button>対応済</button></div>`;
    target.append(item);
  });
}

function iconFor(type) {
  return { warning: '⚠', question: '?', praise: '☺', video: '▶', danger: '!' }[type] || '●';
}

function setupNavigation() {
  document.querySelectorAll('[data-target]').forEach((button) => {
    button.addEventListener('click', () => showScreen(button.dataset.target));
  });
}

function setupInputs() {
  document.querySelectorAll('input, textarea, select, button').forEach((el) => {
    if (!el.hasAttribute('type') && el.tagName === 'BUTTON') el.setAttribute('type', 'button');
  });
}

renderComments('live-comments', 3);
renderComments('center-comments', 5);
setupNavigation();
setupInputs();