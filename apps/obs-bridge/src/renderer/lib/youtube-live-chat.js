// Public YouTube Live Chat API v3 read-only adapter.
// No login, tokens, API keys or stream credentials are persisted by this module.
// Caller must supply a user-authorized API key at runtime and poll no faster than
// YouTube's pollingIntervalMillis. Do not log request headers or full responses.
const GOOGLE_API = 'https://www.googleapis.com/youtube/v3';
const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const CHAT_ID_RE = /^[A-Za-z0-9_-]{8,256}$/;
const MIN_INTERVAL_MS = 5000;

export function extractYoutubeVideoId(value) {
  const raw = String(value || '').trim();
  if (ID_RE.test(raw)) return raw;
  let url;
  try { url = new URL(raw); } catch { throw new Error('invalid_youtube_video_url'); }
  if (url.protocol !== 'https:') throw new Error('invalid_youtube_video_url');
  const host = url.hostname.toLowerCase();
  let id = '';
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    id = url.pathname.split('/')[1] || '';
  } else if (['youtube.com','www.youtube.com','m.youtube.com'].includes(host)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
    else if (url.pathname.startsWith('/live/')) id = url.pathname.split('/')[2] || '';
  } else throw new Error('invalid_youtube_video_url');
  if (!ID_RE.test(id)) throw new Error('invalid_youtube_video_url');
  return id;
}
function requireRuntimeKey(apiKey) {
  if (typeof apiKey !== 'string' || !/^[A-Za-z0-9_-]{16,512}$/.test(apiKey.trim())) {
    throw new Error('invalid_runtime_api_key');
  }
  return apiKey.trim();
}
function apiError(status) {
  if (status === 400) return 'invalid_youtube_request';
  if (status === 401) return 'api_authorization_required';
  if (status === 403) return 'api_denied_or_quota_exhausted';
  if (status === 404) return 'youtube_resource_not_found';
  if (status === 429) return 'api_rate_limited';
  return 'youtube_api_unavailable';
}
async function requestJson(fetchFn, url, apiKey, signal) {
  if (typeof fetchFn !== 'function') throw new Error('fetch_unavailable');
  const checkedKey = requireRuntimeKey(apiKey);
  let response;
  try {
    response = await fetchFn(url, {
      method: 'GET',
      headers: { 'x-goog-api-key': checkedKey, accept: 'application/json' },
      cache: 'no-store', referrerPolicy: 'no-referrer', signal
    });
  } catch (error) {
    if (signal?.aborted || error?.name === 'AbortError') throw new Error('youtube_request_aborted');
    throw new Error('youtube_network_or_cors_error');
  }
  if (!response?.ok) throw new Error(apiError(response?.status));
  let data;
  try { data = await response.json(); }
  catch { throw new Error('invalid_youtube_api_response'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('invalid_youtube_api_response');
  }
  return data;
}

export async function resolveActiveYoutubeLiveChat({
  fetchFn = globalThis.fetch, apiKey, videoUrlOrId, signal
}) {
  const videoId = extractYoutubeVideoId(videoUrlOrId);
  const url = new URL(GOOGLE_API + '/videos');
  url.searchParams.set('part', 'liveStreamingDetails');
  url.searchParams.set('id', videoId);
  const result = await requestJson(fetchFn, url.toString(), apiKey, signal);
  const chatId = result.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
  if (!CHAT_ID_RE.test(String(chatId || ''))) {
    throw new Error('active_public_live_chat_not_found');
  }
  return { videoId, liveChatId: chatId };
}

export async function fetchYoutubeLiveChatPage({
  fetchFn = globalThis.fetch, apiKey, liveChatId, pageToken = null, signal
}) {
  if (!CHAT_ID_RE.test(String(liveChatId || ''))) throw new Error('invalid_live_chat_id');
  const url = new URL(GOOGLE_API + '/liveChat/messages');
  url.searchParams.set('part', 'snippet,authorDetails');
  url.searchParams.set('liveChatId', liveChatId);
  url.searchParams.set('maxResults', '200');
  if (pageToken) url.searchParams.set('pageToken', String(pageToken));
  const result = await requestJson(fetchFn, url.toString(), apiKey, signal);
  if (!Array.isArray(result.items)) throw new Error('invalid_youtube_api_response');
  // Never cap DOWN YouTube's interval: that would violate the provider's rate limit.
  const providerInterval = Number(result.pollingIntervalMillis);
  const interval = Number.isFinite(providerInterval) && providerInterval > 0
    ? Math.max(MIN_INTERVAL_MS, providerInterval) : MIN_INTERVAL_MS;
  return {
    items: result.items,
    nextPageToken: typeof result.nextPageToken === 'string' ? result.nextPageToken : null,
    pollingIntervalMillis: interval,
    offlineAt: result.offlineAt || null
  };
}

export function normalizeYoutubeLiveComment(item) {
  const id = typeof item?.id === 'string' ? item.id : '';
  if (!id || id.length > 256) return null;
  const snippet = item?.snippet || {};
  // Public live chat can return events without displayable message text.
  const text = String(snippet.displayMessage || snippet.textMessageDetails?.messageText || '').trim();
  if (!text) return null;
  const body = text.slice(0, 4000);
  const user = String(item?.authorDetails?.displayName || 'YouTube viewer').slice(0, 120);
  const timestamp = typeof snippet.publishedAt === 'string' &&
    Number.isFinite(Date.parse(snippet.publishedAt)) ? snippet.publishedAt : null;
  const labels = [];
  const holdReasons = [];
  if (/(?:https?:\/\/|www\.)\S+/i.test(body)) { labels.push('url_detected'); holdReasons.push('url_detected'); }
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(body)) {
    labels.push('personal_info_candidate'); holdReasons.push('personal_info_candidate');
  }
  if (body.length >= 120) { labels.push('long_message'); holdReasons.push('long_message'); }
  if (/[?？]/.test(body)) labels.push('question');
  if (/(?:マイク|音声|音が|聞こえな|no audio|mic(?:rophone)?|sound issue)/i.test(body)) labels.push('audio_issue');
  if (/(?:画面|映像|カクつ|止まっ|video issue|screen freeze|buffering)/i.test(body)) labels.push('video_issue');
  if (snippet.type === 'superChatEvent' || /(?:すごい|最高|amazing|great)/i.test(body)) labels.push('highlight');
  if (!labels.length) labels.push('normal');
  const held = holdReasons.length > 0;
  const priority = held ? 'urgent' :
    labels.some((label) => ['audio_issue', 'video_issue', 'question'].includes(label))
      ? 'high' : 'normal';
  return {
    id: 'youtube_' + id,
    time: timestamp ? new Date(timestamp).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}) : '--:--',
    timestamp, user, text: body, labels, priority,
    held, holdReason: holdReasons[0] || null,
    queued: false, handled: false, pinned: false,
    sourceType: 'youtube_live_api', platform: 'youtube',
    providerMessageId: id
  };
}

export function dedupeYoutubeLiveMessages(items, seenIds) {
  if (!Array.isArray(items) || !(seenIds instanceof Set)) throw new Error('invalid_dedupe_input');
  const fresh = [];
  for (const item of items) {
    if (typeof item?.id !== 'string' || !item.id || seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    fresh.push(item);
    // Bounded in-memory deduplication for long streams.
    while (seenIds.size > 5000) seenIds.delete(seenIds.values().next().value);
  }
  return fresh;
}
