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
const commentsOrdered = () => state.commentMode === 'Raw' ? [...state.comments] : [...state.comments].sort((a,b)=>({warning:0,question:1,issue:2,general:2,praise:3}[a.radar]??9)-({warning:0,question:1,issue:2,general:2,praise:3}[b.radar]??9));
const safeDownload = (filename, text) => { const blob = new Blob([text], { type: 'application/json;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url); };

function languageToggle() {
  const lang = el('div', undefined, 'row lang-toggle');
  lang.append(el('span', t('language')));
  [['en', t('english')], ['ja', t('japanese')]].forEach(([code, label]) => {
    const b = el('button', label, state.language === code ? 'active' : '');
    b.onclick = () => { setLanguage(code); state.language = code; render(); };
    lang.append(b);
  });
  return lang;
}

function buildCommentsPanel() {
  const wrap = el('section', undefined, 'panel comments-panel');
  const top = el('div', undefined, 'comments-top');
  top.append(el('h3', t('comments')), el('span', t('viewerCount'), 'viewer-chip'), el('button', '⚙', 'icon-btn'));
  wrap.append(top);
  const tabs = el('div', undefined, 'tabs');
  ['Raw', 'Radar'].forEach((m) => { const b = el('button', m, state.commentMode === m ? 'active' : ''); b.onclick = () => { state.commentMode = m; render(); }; tabs.append(b); });
  wrap.append(tabs);
  const stats = el('div', undefined, 'mini-stats');
  [['questions','24'], ['warnings','8'], ['praise','52'], ['issues','6']].forEach(([k,v]) => { const p = el('span', undefined, 'pill'); p.append(el('strong', v), el('small', t(k))); stats.append(p); });
  wrap.append(stats);
  const list = el('div', undefined, 'comment-list');
  commentsOrdered().forEach((c, idx) => {
    const it = el('article', undefined, `comment ${c.radar} ${idx===1?'selected':''}`);
    const meta = el('div', undefined, 'comment-meta');
    meta.append(el('small', c.time), el('strong', c.author), el('span', c.category, 'category'));
    const actions = el('div', undefined, 'comment-actions');
    ['✓', '📌', '🔊'].forEach((a) => actions.append(el('button', a, 'icon-btn')));
    it.append(meta, el('p', c.message), actions);
    list.append(it);
  });
  wrap.append(list);
  return wrap;
}

function liveScreen() {
  const area = el('section', undefined, 'main');
  const grid = el('div', undefined, 'live-grid');
  const left = el('div', undefined, 'stack');
  const panel = el('section', undefined, 'panel');
  const preview = el('div', undefined, 'preview-surface');
  preview.append(el('span', 'PREVIEW', 'badge red'), el('span', 'LIVE', 'badge green'), el('span', 'Scene: Game Main', 'scene-chip'));
  preview.append(el('div', undefined, 'preview-radar'));
  preview.append(el('div', undefined, 'preview-subject'));
  const bl = el('div', undefined, 'preview-bars'); ['Health','Stability','Latency'].forEach((k)=>{const r=el('div',undefined,'hud-row');r.append(el('small',k),el('span',undefined,'hud-meter'));bl.append(r);}); preview.append(bl);
  const br = el('div', undefined, 'preview-hud'); ['REC','NET','CAM'].forEach((k)=>br.append(el('span',k,'hud-pill'))); preview.append(br);
  panel.append(preview);

  const strip = el('div', undefined, 'control-strip');
  ['Scene A ▾', t('edit'), t('switchScene')].forEach((n)=>strip.append(el('button', n)));
  ['Mic','System'].forEach((n)=>{const m=el('div',undefined,'meter-block');m.append(el('small',n),el('span',undefined,'meter-bars'));strip.append(m);});
  strip.append(el('button','⛶'));
  panel.append(strip);

  const sources = el('div', undefined, 'source-grid');
  [['🖥','Screen capture','Desktop capture / enabled','enabled'],['📷','Camera','1080p / disabled','disabled'],['🎙','Microphone','USB mic / enabled','enabled']]
    .forEach(([i,a,b,s])=>{const c=el('article',undefined,'source-card');const h=el('div',undefined,'source-head');h.append(el('span',i,'source-icon'),el('strong',a),el('span','⋯','source-menu'));c.append(h,el('p',b),el('span',s,'state '+s));sources.append(c);});
  panel.append(sources);

  const metrics = el('div', undefined, 'metrics-grid');
  [['Audio','-8 dB','input level'],['Upload speed','6.2 Mbps','uplink'],['Bitrate','6200 kbps','target 6500'],['Dropped frames','0.42%','last 10 min'],['CPU usage','34%','normal'],['GPU usage','21%','normal'],['Viewers','124','live']] .forEach(([a,b,c])=>{const m=el('article',undefined,'metric-card');m.append(el('small',a),el('strong',b),el('span',c),el('div',undefined,'spark'));metrics.append(m);});
  panel.append(metrics);

  const status = el('div', undefined, 'statusbar');
  ['Connected','Preview only','Encoder stable','Auto reconnect ON','Radar ON','Local rec OFF','00:18:42','/Users/demo/VL-SmartLive/records'].forEach((x)=>status.append(el('span',x,'status-pill')));
  panel.append(status);

  left.append(panel);
  grid.append(left, buildCommentsPanel());
  area.append(grid);
  return area;
}

function makeSimpleScreen(title, sections) { const m=el('section',undefined,'main'); const g=el('section',undefined,'panel dense-grid'); g.append(el('h2',title)); sections.forEach((s)=>{const c=el('article',undefined,'subcard'); c.append(el('h3',s[0]),el('p',s[1])); g.append(c);}); m.append(g); return m; }

function prepareScreen(){
  const m=el('section',undefined,'main');const wrap=el('section',undefined,'panel dense-grid');wrap.append(el('h2',t('prepare')));
  ['Setup steps','Source cards','Platform cards','Account card','Stream details','Comment integration','Preview settings','Preview-ready CTA'].forEach((s)=>{const c=el('article',undefined,'subcard');c.append(el('h3',s),el('p',t('streamSetupSteps')));wrap.append(c);});
  const r=el('input');r.placeholder='RTMP / RTMPS URL';r.value=state.localSettings.rtmpUrl;r.oninput=()=>{state.localSettings.rtmpUrl=r.value;localStorage.setItem('pcStandaloneSettings',JSON.stringify({rtmpUrl:r.value}));};
  const k=el('input');k.type='password';k.placeholder=t('runtimeStreamKey');k.oninput=()=>{state.streamKey=k.value;};
  wrap.append(r,k,el('p',t('streamKeyNotSaved')));wrap.append(el('button',t('openPreview')));m.append(wrap);return m;
}
function commentsScreen(){return makeSimpleScreen(t('comments'),[['Category chips','Raw / Radar / Questions / Warnings / Praise / Issues'],['Comment list','Chronological and priority views'],['Selected detail panel','Read / pin / done actions'],['Footer tools','Read queue / filter / NG settings']]);}
function stabilityScreen(){return makeSimpleScreen(t('stability'),[['Alert summary cards','Audio / Network / Dropped / CPU'],['Active alerts list','Currently impacting stream'],['Recommendation card','Switch mode and reduce bitrate suggestions'],['Actions','Switch / Reassess / Open detailed settings']]);}
function settingsScreen(){
  const m = makeSimpleScreen(t('settings'), [['Setting groups','Stream / Input / Display / Comment / Read-aloud / Stability'],['Import/Export','Local settings only'],['Privacy note',t('localPrivacy')],['Security note',t('streamKeyNotSaved')]]);
  m.querySelector('.dense-grid').append(languageToggle());
  return m;
}
function reportScreen(){const m=el('section',undefined,'main');const c=el('section',undefined,'panel dense-grid');c.append(el('h2',t('report')));['Summary metric cards','Chart placeholders','Highlight candidates table','Trouble history table'].forEach((s)=>{const a=el('article',undefined,'subcard');a.append(el('h3',s),el('p','Mock desktop analytics view'));c.append(a);});const a=el('button',t('downloadReport'));a.onclick=()=>safeDownload('report.json',JSON.stringify({duration:'01:12:24'},null,2));const b=el('button',t('downloadLogs'));b.onclick=()=>safeDownload('logs.json',JSON.stringify([{message:'local preview'}],null,2));const d=el('button',t('downloadComments'));d.onclick=()=>safeDownload('comments.jsonl',state.comments.map((x)=>JSON.stringify(x)).join('\n'));c.append(a,b,d);m.append(c);return m;}

function renderMain(){if(state.screen==='Live')return liveScreen();if(state.screen==='Prepare')return prepareScreen();if(state.screen==='Comments')return commentsScreen();if(state.screen==='Stability')return stabilityScreen();if(state.screen==='Settings')return settingsScreen();return reportScreen();}

function render(){
  app.textContent='';
  const shell=el('main',undefined,'shell');
  const header=el('header',undefined,'topbar');
  header.append(el('h1','SmartLive PC Standalone'));
  const chips=el('div',undefined,'header-chips');
  ['Platform: YouTube',`${t('streamStatus')}: Preview`,'00:18:42',`${t('preset')}: ${t('stableMode')}`,'Connection: Good'].forEach((x)=>chips.append(el('span',x,'chip')));
  const right=el('div',undefined,'top-actions');
  right.append(languageToggle(),el('button','Open preview'),el('button','End preview','danger'));
  header.append(chips,right);
  shell.append(header);

  const body=el('div',undefined,'body');
  const side=el('aside',undefined,'sidebar');
  const brand = el('div', undefined, 'brand');
  brand.append(el('span', '●', 'brand-icon'), el('strong', 'SmartLive'), el('small', 'Standalone'));
  side.append(brand);
  const nav = el('div', undefined, 'nav');
  navItems.forEach((n)=>{const b=el('button',t(n.toLowerCase()),state.screen===n?'active':'');b.onclick=()=>{state.screen=n;render();};nav.append(b);});
  side.append(nav);
  const sys = el('div', undefined, 'side-status');
  [['Connection','OK'],['Encoder','Stable'],['Dropped frames','0.42%'],['Bitrate','4.2 Mbps']].forEach(([k,v])=>{const r=el('div',undefined,'status-row');r.append(el('span',k),el('strong',v));sys.append(r);});
  side.append(sys);
  const foot = el('div', undefined, 'side-footer');
  foot.append(el('small','v0.3.x'),el('button','Help / Manual'));
  side.append(foot);

  body.append(side,renderMain());
  shell.append(body);
  app.append(shell);
}

render();
