const STORAGE_KEY = 'smartlive.language';
const SUPPORTED = ['en', 'ja'];

const dictionaries = {
  en: {
    live: 'Live', prepare: 'Prepare', comments: 'Comments', stability: 'Stability', settings: 'Settings', report: 'Report',
    language: 'Language', english: 'English', japanese: '日本語', streamStatus: 'Stream status', previewOnly: 'Preview only (local mock)',
    preset: 'Preset', stableMode: 'Stable mode', raw: 'Raw', radar: 'Radar',
    validateLocal: 'Validate target locally', streamKeyNotSaved: 'Stream key is not saved', runtimeStreamKey: 'Runtime stream key',
    addComment: 'Add comment', message: 'Message', author: 'Author',
    downloadReport: 'Download report.json', downloadLogs: 'Download logs.json', downloadComments: 'Download comments.jsonl',
    localPrivacy: 'Local-only mode. No cloud upload.', question: 'question', warning: 'warning', praise: 'praise', issue: 'issue/general',
    questions: 'questions', warnings: 'warnings', issues: 'issues', viewerCount: 'Viewers: 124',
    readAloud: 'Read aloud', pin: 'Pin', edit: 'Edit', switchScene: 'Switch', streamSetupSteps: 'Stream setup steps',
    openPreview: 'Open preview', validateSetup: 'Validate setup', switchToStabilityMode: 'Switch to stability mode', reassessLater: 'Reassess later', openDetailedSettings: 'Open detailed settings'
  },
  ja: {
    live: 'ライブ', prepare: '準備', comments: 'コメント', stability: '安定性', settings: '設定', report: 'レポート',
    language: '言語', english: 'English', japanese: '日本語', streamStatus: '配信状態', previewOnly: 'プレビューのみ（ローカルモック）',
    preset: 'プリセット', stableMode: '安定モード', raw: 'Raw', radar: 'Radar',
    validateLocal: '配信先をローカル検証', streamKeyNotSaved: 'Stream key is not saved', runtimeStreamKey: '実行時ストリームキー',
    addComment: 'コメント追加', message: 'メッセージ', author: '投稿者',
    downloadReport: 'report.json をダウンロード', downloadLogs: 'logs.json をダウンロード', downloadComments: 'comments.jsonl をダウンロード',
    localPrivacy: 'ローカル専用モード。クラウド送信なし。', question: '質問', warning: '警告', praise: '称賛', issue: '問題/一般',
    questions: '質問', warnings: '警告', issues: '問題', viewerCount: '視聴者: 124',
    readAloud: '読み上げ', pin: 'ピン', edit: '編集', switchScene: '切替', streamSetupSteps: '配信準備ステップ',
    openPreview: 'プレビューを開く', validateSetup: 'セットアップを検証', switchToStabilityMode: '安定モードへ切替', reassessLater: '後で再評価', openDetailedSettings: '詳細設定を開く'
  }
};
function detectInitialLanguage() { const saved = localStorage.getItem(STORAGE_KEY); if (SUPPORTED.includes(saved)) return saved; return 'en'; }
let currentLanguage = detectInitialLanguage();
export function t(key) { return dictionaries[currentLanguage]?.[key] ?? dictionaries.en[key] ?? key; }
export function getLanguage() { return currentLanguage; }
export function setLanguage(lang) { currentLanguage = SUPPORTED.includes(lang) ? lang : 'en'; localStorage.setItem(STORAGE_KEY, currentLanguage); }
export function languages() { return SUPPORTED.slice(); }
