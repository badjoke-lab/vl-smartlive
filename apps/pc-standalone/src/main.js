import { t, getLanguage, setLanguage } from './i18n.js';

const app = document.querySelector('#app');
if (!app) throw new Error('PC Standalone app root not found.');

const saved = JSON.parse(localStorage.getItem('pcStandaloneSettings') || '{}');
const state = {
  screen: 'Live',
  commentMode: 'Raw',
  language: getLanguage(),
  localSettings: { rtmpUrl: saved.rtmpUrl || '' },
  streamKey: '',
  comments: [
    { time: '12:28:31', author: 'takebon', radar: 'warning', category: 'Audio/video trouble', message: 'Audio may be a little quiet.' },
    { time: '12:28:40', author: 'yuuki', radar: 'question', category: 'Questions', message: 'Can this be used from a phone too?' },
    { time: '12:28:55', author: 'sakura', radar: 'praise', category: 'Hype', message: 'Looks good. Looking forward to the stream.' },
    { time: '12:29:10', author: 'ops_bot', radar: 'issue', category: 'Audio/video trouble', message: 'Minor frame jitter detected.' }
  ]
};
const navItems = ['Live', 'Prepare', 'Comments', 'Stability', 'Settings', 'Report'];
const el = (tag, txt, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = txt; return n; };
const validRtmp = (v) => { try { const u = new URL(v); return ['rtmp:', 'rtmps:'].includes(u.protocol); } catch { return false; } };
const commentsOrdered = () => state.commentMode === 'Raw' ? [...state.comments] : [...state.comments].sort((a,b)=>({warning:0,question:1,issue:2,general:2,praise:3}[a.radar]??9)-({warning:0,question:1,issue:2,general:2,praise:3}[b.radar]??9));
const safeDownload = (filename, text) => { const blob = new Blob([text], { type: 'application/json;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url); };

function buildCommentsPanel() {
  const wrap = el('section', undefined, 'card comments-panel');
  const top = el('div', undefined, 'comments-top');
  top.append(el('h3', t('comments')));
  top.append(el('span', t('viewerCount')));
  top.append(el('button', '⚙', 'icon-btn'));
  wrap.append(top);
  const tabs = el('div', undefined, 'tabs');
  ['Raw', 'Radar'].forEach((m) => { const b = el('button', m, state.commentMode === m ? 'active' : ''); b.onclick = () => { state.commentMode = m; render(); }; tabs.append(b); });
  wrap.append(tabs);
  const stats = el('div', undefined, 'mini-stats');
  ['questions', 'warnings', 'praise', 'issues'].forEach((k) => stats.append(el('span', t(k), 'pill')));
  wrap.append(stats);
  const list = el('div', undefined, 'comment-list');
  commentsOrdered().forEach((c, idx) => {
    const it = el('article', undefined, `comment ${c.radar} ${idx===1?'selected':''}`);
    it.append(el('small', `${c.time} · ${c.author}`));
    it.append(el('span', c.category, 'category'));
    it.append(el('p', c.message));
    const row = el('div', undefined, 'row');
    row.append(el('button', t('readAloud'))); row.append(el('button', t('pin')));
    row.append(el('button', '🔈')); row.append(el('button', '📌'));
    it.append(row); list.append(it);
  });
  wrap.append(list);
  return wrap;
}

function liveScreen() {
  const area = el('section', undefined, 'main');
  const grid = el('div', undefined, 'live-grid');
  const left = el('div', undefined, 'stack');
  const preview = el('section', undefined, 'card');
  preview.append(el('h2', 'VL SmartLive Preview'));
  const surface = el('div', undefined, 'preview-surface');
  surface.append(el('span', 'PREVIEW', 'badge red'));
  surface.append(el('span', 'LIVE', 'badge green'));
  ['Desktop capture', 'Game main', '1920x1080', '60 fps'].forEach((s)=>surface.append(el('span', s, 'hud')));
  preview.append(surface);
  const strip = el('div', undefined, 'control-strip');
  ['Scene A', t('edit'), t('switchScene'), 'Mic ▮▮▮▯', 'System ▮▮▮▮', '⛶'].forEach((n)=>strip.append(el('button', n)));
  preview.append(strip);
  const sources = el('div', undefined, 'source-grid');
  [['Screen capture','Desktop capture / enabled'],['Camera','1080p / disabled'],['Microphone','USB mic / enabled']].forEach(([a,b])=>{const c=el('article',undefined,'source-card');c.append(el('h4',a),el('p',b));sources.append(c);});
  preview.append(sources);
  const metrics = el('div', undefined, 'metrics');
  ['Audio -8 dB','Upload 6.2 Mbps','Bitrate 6200 kbps','Dropped 12','CPU 34%','GPU 21%','Viewers 124'].forEach((m)=>metrics.append(el('span',m,'metric')));
  preview.append(metrics);
  const status = el('div', undefined, 'statusbar');
  status.append(el('span','Connected · Encoder stable · Dropped 12 · CPU 34% · MEM 2.4GB · v0.0.x · local rec OFF'));
  preview.append(status);
  left.append(preview);
  grid.append(left, buildCommentsPanel());
  area.append(grid);
  return area;
}

function prepareScreen(){const m=el('section',undefined,'main');const c=el('section',undefined,'card');c.append(el('h2',t('prepare')));c.append(el('p',t('streamSetupSteps')));const chips=el('div',undefined,'metrics');['1 Source','2 Platform','3 Video / Audio','4 Details','5 Check'].forEach(v=>chips.append(el('span',v,'metric')));c.append(chips);const r=el('input');r.placeholder='RTMP / RTMPS URL';r.value=state.localSettings.rtmpUrl;r.oninput=()=>{state.localSettings.rtmpUrl=r.value;localStorage.setItem('pcStandaloneSettings',JSON.stringify({rtmpUrl:r.value}));};const k=el('input');k.type='password';k.placeholder=t('runtimeStreamKey');k.oninput=()=>{state.streamKey=k.value;};c.append(el('p','Screen · Window · Camera · Mic only'));c.append(el('p','YouTube · Twitch · Custom RTMP'));c.append(el('p','Signed in: local demo account'));c.append(r,k,el('p',t('streamKeyNotSaved')));c.append(el('p','Title / Category / Language selectors (mock)'));c.append(el('p','YouTube comments ON · Twitch comments OFF'));c.append(el('p','Preview card: 720p / 30fps recommendation, mic/system meter'));const b=el('button',t('openPreview'));c.append(b);m.append(c);return m;}
function commentsScreen(){const m=el('section',undefined,'main');const c=el('section',undefined,'card');c.append(el('h2',t('comments')));c.append(el('p','Raw mode / Radar mode · All · Questions · Audio/video trouble · Hype · Held / risky'));c.append(el('p','Read queue: 4 · Filter · NG settings'));c.append(el('p','Selected detail: user profile + Read aloud / Pin / Mark done / Hide comment / Mute user'));m.append(c);m.append(buildCommentsPanel());return m;}
function stabilityScreen(){const m=el('section',undefined,'main');const c=el('section',undefined,'card');c.append(el('h2',t('stability')));c.append(el('p','Audio issue · Network unstable · Dropped frames · CPU high load'));c.append(el('p','Active alerts list + recommendation: switch to stability mode / reduce bitrate / reduce fps / lower BGM / adjust keyframe'));c.append(el('p','Impact: image impact low · latency impact low · viewer experience improved'));c.append(el('button',t('switchToStabilityMode')),el('button',t('reassessLater')),el('button',t('openDetailedSettings')));m.append(c);return m;}
function settingsScreen(){const m=el('section',undefined,'main');const c=el('section',undefined,'card');c.append(el('h2',t('settings')));c.append(el('p','Stream settings · Input settings · Display settings · Comment settings · Read-aloud settings · Stability settings'));const row=el('div',undefined,'row');[['en',t('english')],['ja',t('japanese')]].forEach(([code,label])=>{const b=el('button',label,state.language===code?'active':'');b.onclick=()=>{setLanguage(code);state.language=code;render();};row.append(b);});c.append(row);c.append(el('p','Default comment tab: Raw / Radar · Show comment panel on startup · Max comments 200'));c.append(el('p','NG word filter toggle · Read-aloud toggle · Stability mode toggle'));c.append(el('p',t('localPrivacy')));c.append(el('p',t('streamKeyNotSaved')));c.append(el('button','Import settings'));c.append(el('button','Export settings'));m.append(c);return m;}
function reportScreen(){const m=el('section',undefined,'main');const c=el('section',undefined,'card');c.append(el('h2',t('report')));const met=el('div',undefined,'metrics');['Duration 01:12:24','Average viewers 98','Peak viewers 140','Comments 246','Questions 71','Trouble count 9'].forEach(v=>met.append(el('span',v,'metric')));c.append(met);c.append(el('p','Charts: bitrate / dropped frames / cumulative comments / alert count (placeholder)'));c.append(el('p','Highlight candidates table + trouble history table'));const a=el('button',t('downloadReport'));a.onclick=()=>safeDownload('report.json',JSON.stringify({duration:'01:12:24'},null,2));const b=el('button',t('downloadLogs'));b.onclick=()=>safeDownload('logs.json',JSON.stringify([{message:'local preview'}],null,2));const d=el('button',t('downloadComments'));d.onclick=()=>safeDownload('comments.jsonl',state.comments.map((x)=>JSON.stringify(x)).join('\n'));c.append(a,b,d);m.append(c);return m;}

function renderMain(){if(state.screen==='Live')return liveScreen();if(state.screen==='Prepare')return prepareScreen();if(state.screen==='Comments')return commentsScreen();if(state.screen==='Stability')return stabilityScreen();if(state.screen==='Settings')return settingsScreen();return reportScreen();}

function render(){app.textContent='';const shell=el('main',undefined,'shell');const header=el('header',undefined,'topbar');header.append(el('h1','SmartLive PC Standalone'));header.append(el('div',`${t('streamStatus')}: ${t('previewOnly')} · YouTube · 00:18:42 · ${t('preset')}: ${t('stableMode')}`,'status'));const lang=el('div',undefined,'row');lang.append(el('span',t('language')));[['en',t('english')],['ja',t('japanese')]].forEach(([code,label])=>{const b=el('button',label,state.language===code?'active':'');b.onclick=()=>{setLanguage(code);state.language=code;render();};lang.append(b);});header.append(lang);shell.append(header);const body=el('div',undefined,'body');const side=el('aside',undefined,'sidebar');navItems.forEach((n)=>{const b=el('button',t(n.toLowerCase()),state.screen===n?'active':'');b.onclick=()=>{state.screen=n;render();};side.append(b);});body.append(side,renderMain());shell.append(body);app.append(shell);}render();
