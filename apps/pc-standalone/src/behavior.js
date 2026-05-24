export const RADAR_PRIORITY = { warning: 0, question: 1, issue: 2, general: 2, praise: 3 };

export function createInitialState(language = 'en') {
  const comments = [
    { id: 'c1', time: '12:28:31', author: 'takebon', handle: '@takebon_live', radar: 'warning', category: 'Audio/video trouble', message: 'Audio may be a little quiet.' },
    { id: 'c2', time: '12:28:40', author: 'yuuki', handle: '@yuuki_q', radar: 'question', category: 'Questions', message: 'Can this be used from a phone too?' },
    { id: 'c3', time: '12:28:55', author: 'sakura', handle: '@sakura_fan', radar: 'praise', category: 'Hype', message: 'Looks good. Looking forward to the stream.' },
    { id: 'c4', time: '12:29:10', author: 'ops_bot', handle: '@ops_monitor', radar: 'issue', category: 'Audio/video trouble', message: 'Minor frame jitter detected.' }
  ].map((c) => ({ ...c, pinned: false, done: false, hidden: false, muted: false, read: false }));
  return { screen: 'Live', language, commentMode: 'Raw', selectedComment: 'c1', comments,
    preview: { status: 'idle', source: 'Screen', micEnabled: true, screenEnabled: true, cameraEnabled: true, errorMessage: '', startedAt: null },
    prepare: { selectedSource: 'Screen', selectedPlatform: 'YouTube', selectedPreset: 'Stable', streamTitle: '', category: '', streamLanguage: 'English', shortNote: '', rtmpUrl: '', validationStatus: 'Missing target' },
    settings: { activeSettingsTab: 'Stream settings', defaultCommentTab: 'Raw', showCommentPanel: true, maxComments: 100, readAloudEnabled: true, stabilityModeEnabled: false, autoSuggestionEnabled: true, appScale: '100%', overlayStatus: true, overlayCommentCount: true },
    stability: { stabilityMode: false, lastAction: 'Idle', reassessCount: 0 }, report: { statusMessage: '' }, logs: [] };
}
export function orderComments(comments, mode) { return mode === 'Raw' ? [...comments] : [...comments].sort((a, b) => (RADAR_PRIORITY[a.radar] ?? 9) - (RADAR_PRIORITY[b.radar] ?? 9)); }
export function validateRtmpTarget(url) { const u = (url || '').trim(); return !u ? 'Missing target' : (/^rtmps?:\/\//.test(u) ? 'OK' : 'Invalid target'); }
export function sanitizePersistedSettings(input) { const out = {}; for (const [k, v] of Object.entries(input || {})) { if (!/(streamkey|password|secret|token)/i.test(k)) out[k] = v; } return out; }
export function assertNoSecretsInExport(text) { if (/("(streamkey|password|secret|token)"\s*:\s*(?!false\b))|obs password/i.test(text)) throw new Error('blocked secret'); return true; }
export function buildSafeReportExport(state) { return { platform: state.prepare.selectedPlatform, selectedSource: state.prepare.selectedSource, selectedPreset: state.prepare.selectedPreset, rtmpUrl: state.prepare.rtmpUrl || '', validationStatus: state.prepare.validationStatus, previewStatus: state.preview.status, commentMode: state.commentMode, stability: state.stability, summaryMetrics: { comments: state.comments.length, hidden: state.comments.filter((c) => c.hidden).length }, streamKeySaved: false }; }
export function buildSafeLogsExport(state) { return state.logs.map((x) => ({ timestamp: x.timestamp, action: x.action, status: x.status })); }
export function buildSafeCommentsJsonl(state) { return state.comments.map((c) => JSON.stringify(({ id: c.id, time: c.time, author: c.author, category: c.category, message: c.message, pinned: c.pinned, done: c.done, hidden: c.hidden, muted: c.muted, read: c.read }))).join('\n'); }
export function buildSafeSettingsExport(state) { return sanitizePersistedSettings({ ...state.settings, selectedSource: state.prepare.selectedSource, selectedPlatform: state.prepare.selectedPlatform, selectedPreset: state.prepare.selectedPreset, rtmpUrl: state.prepare.rtmpUrl, streamKeySaved: false }); }
export function applyCommentAction(state, commentId, action) { const target = state.comments.find((c) => c.id === commentId); if (!target) return state; if (action === 'pin') target.pinned = !target.pinned; if (action === 'done') target.done = !target.done; if (action === 'read') target.read = true; if (action === 'hide') target.hidden = true; if (action === 'mute') state.comments.filter((c) => c.author === target.author).forEach((c) => { c.muted = true; }); return state; }
export function applyPrepareSelection(state, type, value) { if (type in state.prepare) state.prepare[type] = value; if (type === 'selectedSource') state.preview.source = value; return state; }
export function applyStabilityAction(state, action) { if (action === 'switch') { state.stability.stabilityMode = true; state.settings.stabilityModeEnabled = true; state.stability.lastAction = 'Stability mode ON'; } if (action === 'reassess') { state.stability.reassessCount += 1; state.stability.lastAction = 'Reassess scheduled'; } return state; }
