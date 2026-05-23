const STORAGE_KEY = 'smartlive.language';
const SUPPORTED = ['en', 'ja'];

const dictionaries = {
  en: {
    live: 'Live', prepare: 'Prepare', comments: 'Comments', stability: 'Stability', settings: 'Settings', report: 'Report',
    language: 'Language', english: 'English', japanese: '日本語',
    streamStatus: 'Stream status', previewOnly: 'Preview only (local mock)',
    preset: 'Preset', stableMode: 'Stable mode',
    quality: 'Quality',
    commentRadar: 'Comment Radar', raw: 'Raw', radar: 'Radar',
    useCamera: 'Use camera', useScreen: 'Use screen/window', enableMic: 'Enable microphone',
    validateLocal: 'Validate target locally', streamKeyNotSaved: 'Stream key is not saved',
    addComment: 'Add comment', message: 'Message', author: 'Author',
    downloadReport: 'Download report.json', downloadLogs: 'Download logs.json', downloadComments: 'Download comments.jsonl',
    localPrivacy: 'Local-only mode. No cloud upload.',
    question: 'question', warning: 'warning', praise: 'praise', issue: 'issue/general'
  },
  ja: {
    live: 'ライブ', prepare: '準備', comments: 'コメント', stability: '安定性', settings: '設定', report: 'レポート',
    language: '言語', english: 'English', japanese: '日本語',
    streamStatus: '配信状態', previewOnly: 'プレビューのみ（ローカルモック）',
    preset: 'プリセット', stableMode: '安定モード', quality: '品質',
    commentRadar: 'コメントレーダー', raw: 'Raw', radar: 'Radar',
    useCamera: 'カメラを使う', useScreen: '画面/ウィンドウを使う', enableMic: 'マイクを有効化',
    validateLocal: '配信先をローカル検証', streamKeyNotSaved: 'Stream key is not saved',
    addComment: 'コメント追加', message: 'メッセージ', author: '投稿者',
    downloadReport: 'report.json をダウンロード', downloadLogs: 'logs.json をダウンロード', downloadComments: 'comments.jsonl をダウンロード',
    localPrivacy: 'ローカル専用モード。クラウド送信なし。',
    question: 'question', warning: 'warning', praise: 'praise', issue: 'issue/general'
  }
};

function detectInitialLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (SUPPORTED.includes(saved)) return saved;
  return 'en';
}

let currentLanguage = detectInitialLanguage();

export function t(key) {
  return dictionaries[currentLanguage]?.[key] ?? dictionaries.en[key] ?? key;
}

export function getLanguage() { return currentLanguage; }
export function setLanguage(lang) {
  currentLanguage = SUPPORTED.includes(lang) ? lang : 'en';
  localStorage.setItem(STORAGE_KEY, currentLanguage);
}
export function languages() { return SUPPORTED.slice(); }
