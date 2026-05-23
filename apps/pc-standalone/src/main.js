import { t, getLanguage, setLanguage } from './i18n.js';

const app = document.querySelector('#app');
if (!app) throw new Error('PC Standalone app root not found.');

const saved = JSON.parse(localStorage.getItem('pcStandaloneSettings') || '{}');
const state = {
  screen: 'Live', commentMode: 'Raw', language: getLanguage(),
  localSettings: { rtmpUrl: saved.rtmpUrl || '' }, streamKey: '', platform: 'YouTube',
  comments: [
    { time: '12:28:31', author: 'takebon', radar: 'warning', message: 'Audio may be a little quiet.', handled: false, pinned: false },
    { time: '12:28:40', author: 'yuuki', radar: 'question', message: 'Can this be used from a phone too?', handled: false, pinned: false },
    { time: '12:28:55', author: 'sakura', radar: 'praise', message: 'Looks good. Looking forward to the stream.', handled: false, pinned: false },
    { time: '12:29:10', author: 'ops_bot', radar: 'issue', message: 'Minor frame jitter detected.', handled: false, pinned: false }
  ]
};
const navItems = ['Live','Prepare','Comments','Stability','Settings','Report'];
const el=(t1,txt,cls)=>{const n=document.createElement(t1);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
const validRtmp=(v)=>{try{const u=new URL(v);return ['rtmp:','rtmps:'].includes(u.protocol);}catch{return false;}};
function commentsOrdered() {
  if (state.commentMode === 'Raw') return [...state.comments];

  const priority = {
    warning: 0,
    question: 1,
    issue: 2,
    praise: 3,
    general: 4
  };

  return [...state.comments].sort((a, b) => {
    const left = priority[a.radar] ?? 99;
    const right = priority[b.radar] ?? 99;
    return left - right;
  });
}


function safeDownload(filename, text) { const blob = new Blob([text], { type: 'application/json;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

function commentsPanel(compact=false){const wrap=el('section',undefined,'card comments-panel');const head=el('div',undefined,'row');head.append(el('h3',compact?'Comments / Comment Radar':t('comments')));const tabs=el('div',undefined,'tabs');['Raw','Radar'].forEach(m=>{const b=el('button',m,state.commentMode===m?'active':'');b.onclick=()=>{state.commentMode=m;render();};tabs.append(b);});head.append(tabs);wrap.append(head);const list=el('div',undefined,'comment-list');commentsOrdered().forEach(c=>{const it=el('article',undefined,`comment ${c.radar}`);it.append(el('small',`${c.time} · ${c.author}`));it.append(el('p',c.message));const actions=el('div',undefined,'row');[['Pin',()=>c.pinned=!c.pinned],[c.handled?'Undo':'Done',()=>c.handled=!c.handled],['Read',()=>{}]].forEach(([n,h])=>{const b=el('button',n);b.onclick=()=>{h();render();};actions.append(b);});it.append(el('span',t(c.radar),'pill'));it.append(actions);list.append(it);});wrap.append(list);if(!compact){const form=el('div',undefined,'row');const a=el('input');a.placeholder=t('author');const m=el('input');m.placeholder=t('message');const s=el('button',t('addComment'));s.onclick=()=>{if(m.value.trim()){state.comments.unshift({time:new Date().toLocaleTimeString(),author:a.value||'guest',radar:'question',message:m.value,handled:false,pinned:false});a.value='';m.value='';render();}};form.append(a,m,s);wrap.append(form);const d=el('button',t('downloadComments'));d.onclick=()=>safeDownload('comments.jsonl',state.comments.map(c=>JSON.stringify(c)).join('\n'));wrap.append(d);}return wrap;}

function renderMain(){const main=el('section',undefined,'main');if(state.screen==='Live'){const grid=el('div',undefined,'live-grid');const preview=el('section',undefined,'card');preview.append(el('h2','VL SmartLive Preview'));preview.append(el('div','PREVIEW / LIVE','badge'));preview.append(el('p','Platform: YouTube · Timer: 00:18:42 · 6.2 Mbps · 60 fps · Dropped: 12 · CPU 34%'));const ctl=el('div',undefined,'row');[t('useCamera'),t('useScreen'),t('enableMic')].forEach(n=>ctl.append(el('button',n)));preview.append(ctl);preview.append(el('p','Quality/Stability: Stable · local mock only'));grid.append(preview,commentsPanel(true));main.append(grid);} else if(state.screen==='Prepare'){const card=el('section',undefined,'card');card.append(el('h2',t('prepare')));card.append(el('p','YouTube / Twitch / Custom RTMP / RTMPS'));const r=el('input');r.placeholder='RTMP / RTMPS URL';r.value=state.localSettings.rtmpUrl;r.oninput=()=>{state.localSettings.rtmpUrl=r.value;localStorage.setItem('pcStandaloneSettings',JSON.stringify({rtmpUrl:r.value}));};const k=el('input');k.type='password';k.placeholder='Runtime stream key';k.oninput=()=>{state.streamKey=k.value;};card.append(r,k,el('p',t('streamKeyNotSaved')));const v=el('button',t('validateLocal'));v.onclick=()=>alert(validRtmp(state.localSettings.rtmpUrl)?'OK':'Invalid RTMP/RTMPS URL');card.append(v,el('p','Stable / Balanced / High quality / Low latency'));main.append(card);} else if(state.screen==='Comments'){main.append(commentsPanel(false));} else if(state.screen==='Stability'){const c=el('section',undefined,'card');c.append(el('h2',t('stability')),el('p','Bitrate: 6.2 Mbps · Dropped frames: 12 · CPU: 34% · Audio: -8dB'),el('p','Stability mode: Stable'),el('p','Alert timeline: warning -> recovered'),el('p','Recommendation: keep bitrate below 7 Mbps.'));main.append(c);} else if(state.screen==='Settings'){const c=el('section',undefined,'card');c.append(el('h2',t('settings')),el('p',`${t('language')}:`));const row=el('div',undefined,'row');[['en',t('english')],['ja',t('japanese')]].forEach(([code,label])=>{const b=el('button',label,state.language===code?'active':'');b.onclick=()=>{setLanguage(code);state.language=code;render();};row.append(b);});c.append(row,el('p','Theme: dark dashboard (placeholder)'),el('p','Comment behavior: placeholder'),el('p','Radar behavior: placeholder'),el('p',t('localPrivacy')),el('p',t('streamKeyNotSaved')));main.append(c);} else if(state.screen==='Report'){const c=el('section',undefined,'card');c.append(el('h2',t('report')),el('p','Session summary · Duration 00:18:42 · Average bitrate 6.1 Mbps'),el('p','Dropped frames 12 · Total comments 24 · question 9 · warning 4 · Stability score 91'));const a=el('button',t('downloadReport'));a.onclick=()=>safeDownload('report.json',JSON.stringify({duration:'00:18:42'},null,2));const b=el('button',t('downloadLogs'));b.onclick=()=>safeDownload('logs.json',JSON.stringify([{message:'local preview'}],null,2));const d=el('button',t('downloadComments'));d.onclick=()=>safeDownload('comments.jsonl',state.comments.map(c=>JSON.stringify(c)).join('\n'));c.append(a,b,d);main.append(c);}return main;}

function render(){app.textContent='';const shell=el('main',undefined,'shell');const header=el('header',undefined,'topbar');header.append(el('h1','SmartLive PC Standalone'));header.append(el('div',`${t('streamStatus')}: ${t('previewOnly')} · YouTube · 00:18:42 · ${t('preset')}: ${t('stableMode')}`,'status'));const lang=el('div',undefined,'row');lang.append(el('span',t('language')));[['en',t('english')],['ja',t('japanese')]].forEach(([code,label])=>{const b=el('button',label,state.language===code?'active':'');b.onclick=()=>{setLanguage(code);state.language=code;render();};lang.append(b);});header.append(lang);shell.append(header);
const body=el('div',undefined,'body');const side=el('aside',undefined,'sidebar');navItems.forEach(n=>{const b=el('button',t(n.toLowerCase()),state.screen===n?'active':'');b.onclick=()=>{state.screen=n;render();};side.append(b);});body.append(side,renderMain());shell.append(body);app.append(shell);} 

render();
