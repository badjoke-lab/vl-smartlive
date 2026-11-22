import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  extractYoutubeVideoId, resolveActiveYoutubeLiveChat,
  fetchYoutubeLiveChatPage, normalizeYoutubeLiveComment,
  dedupeYoutubeLiveMessages
} from '../apps/obs-bridge/src/renderer/lib/youtube-live-chat.js';

const videoId = 'aBcD123_-xy';
const chatId = 'Cg0KC2FiY0QxMjNfLXh5KicKGFVD';
const apiKey = 'AIzaSyTestApiKeyNotForRealUse0000000';
assert.equal(extractYoutubeVideoId(videoId), videoId);
assert.equal(extractYoutubeVideoId('https://youtu.be/' + videoId),videoId);
assert.equal(extractYoutubeVideoId('https://www.youtube.com/watch?v=' + videoId + '&t=99'),videoId);
assert.equal(extractYoutubeVideoId('https://youtube.com/live/' + videoId),videoId);
for (const bad of ['http://youtube.com/watch?v='+videoId, 'https://evil.example/watch?v='+videoId,'https://youtube.com/watch?v=../foo','not a video']) {
  assert.throws(()=>extractYoutubeVideoId(bad),/invalid_youtube_video_url/);
}
const calls = [];
const fetchFn = async (url, options) => {
  calls.push({url, options});
  assert.equal(options.method, 'GET');
  assert.equal(options.headers['x-goog-api-key'], apiKey);
  assert.equal(options.referrerPolicy, 'no-referrer');
  assert.equal(new URL(url).searchParams.has('key'), false);
  if (new URL(url).pathname.endsWith('/videos')) {
    assert.equal(new URL(url).searchParams.get('id'),videoId);
    return {ok:true,status:200,json:async()=>({items:[{liveStreamingDetails:{activeLiveChatId:chatId}}]})};
  }
  assert.equal(new URL(url).searchParams.get('part'), 'snippet,authorDetails');
  assert.equal(new URL(url).searchParams.get('liveChatId'), chatId);
  return {ok:true,status:200,json:async()=>({
    pollingIntervalMillis:2000,
    nextPageToken:'NEXT_PAGE_TOKEN',
    items:[
      {id:'msg-001',snippet:{publishedAt:'2026-11-23T01:00:00Z',type:'textMessageEvent',displayMessage:'マイク小さい？'},
        authorDetails:{displayName:'viewerA'}},
      {id:'msg-002',snippet:{publishedAt:'2026-11-23T01:00:01Z',displayMessage:'https://example.org 今すぐ見て'},
        authorDetails:{displayName:'viewerB'}}
    ]
  })};
};
const resolved=await resolveActiveYoutubeLiveChat({fetchFn,apiKey,videoUrlOrId:videoId});
assert.deepEqual(resolved,{videoId,liveChatId:chatId});
const page=await fetchYoutubeLiveChatPage({fetchFn,apiKey,liveChatId:chatId});
assert.equal(page.pollingIntervalMillis,5000,'do not poll before API/adapter minimum');
const providerSlow = async () => ({ok:true,status:200,json:async()=>({
  pollingIntervalMillis:400000, items:[], nextPageToken:'SLOW'
})});
const slowPage=await fetchYoutubeLiveChatPage({fetchFn:providerSlow,apiKey,liveChatId:chatId});
assert.equal(slowPage.pollingIntervalMillis,400000,
  'never cap down a provider interval and overpoll YouTube');

assert.equal(page.nextPageToken,'NEXT_PAGE_TOKEN');
assert.equal(page.items.length,2);
const raw=normalizeYoutubeLiveComment(page.items[0]);
const risky=normalizeYoutubeLiveComment(page.items[1]);
assert.equal(raw.sourceType,'youtube_live_api');
assert.deepEqual(raw.labels.sort(),['audio_issue','question']);
assert.equal(raw.queued,false);
assert.equal(raw.held,false);
assert.equal(risky.held,true);
assert.ok(risky.labels.includes('url_detected'));
assert.equal(risky.priority,'urgent');
assert.equal(normalizeYoutubeLiveComment({id:'non-text',snippet:{}}),null);
const email=normalizeYoutubeLiveComment({id:'email',snippet:{displayMessage:'contact email@example.org'}});
assert.equal(email.held,true);
assert.equal(email.holdReason,'personal_info_candidate');
const seen=new Set();
assert.equal(dedupeYoutubeLiveMessages(page.items,seen).length,2);
assert.equal(dedupeYoutubeLiveMessages(page.items,seen).length,0);
for(let i=0;i<5100;i++)dedupeYoutubeLiveMessages([{id:'new'+i}],seen);
assert.ok(seen.size <= 5000);
assert.equal(calls.length,2);
assert.ok(calls.every(c=>!c.url.includes(apiKey)));

const notLive=async()=>({ok:true,status:200,json:async()=>({items:[{liveStreamingDetails:{}}]})});
await assert.rejects(()=>resolveActiveYoutubeLiveChat({fetchFn:notLive,apiKey,videoUrlOrId:videoId}),/active_public_live_chat_not_found/);
for (const status of [400,401,403,404,429,500]) {
  const fail=async()=>({ok:false,status});
  await assert.rejects(()=>fetchYoutubeLiveChatPage({fetchFn:fail,apiKey,liveChatId:chatId}),/^(Error: )?(invalid_youtube_request|api_authorization_required|api_denied_or_quota_exhausted|youtube_resource_not_found|api_rate_limited|youtube_api_unavailable)/);
}
await assert.rejects(()=>fetchYoutubeLiveChatPage({fetchFn,apiKey:'short',liveChatId:chatId}),/invalid_runtime_api_key/);
await assert.rejects(()=>fetchYoutubeLiveChatPage({fetchFn,apiKey,liveChatId:'../../bad'}),/invalid_live_chat_id/);
await assert.rejects(()=>fetchYoutubeLiveChatPage({
  fetchFn:async()=>{throw new Error('SensitiveDataDontShow');},apiKey,liveChatId:chatId
}),/youtube_network_or_cors_error/);

const ui=readFileSync('apps/obs-bridge/src/renderer/main.js','utf8');
const html=readFileSync('apps/obs-bridge/index.html','utf8');
for(const key of ['youtubeVideoInput','youtubeApiKeyInput','youtubeConnectButton','youtubeDisconnectButton','youtubeLiveStatus']) {
  assert.match(html,new RegExp(key));
}
for(const term of ['resolveActiveYoutubeLiveChat','fetchYoutubeLiveChatPage','dedupeYoutubeLiveMessages',
  "sourceType: 'youtube_live_api'",'queueContinuousRecord',
  "apiKeyField.value = ''",'youtubePollingIntervalMillis']) {
  assert.ok(ui.includes(term), 'missing UI integration: '+term);
}
console.log('YouTube Live: public v3 API key header, chat resolution, paging, rate-limit, redaction-safe errors, hold, dedup, UI wiring passed.');
