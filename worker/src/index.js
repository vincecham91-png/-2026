/**
 * Star Photo Share — Cloudflare Worker（KV 圖片儲存）
 *
 * 功能：
 * - POST /api/upload → 接收圖片 → 存入 KV → 返回專屬 URL
 * - GET  /api/photos/:key → 直接返回圖片（瀏覽器可直接顯示）
 *
 * 優勢：無需 R2 手動啟用，KV 免費額度 1GB 儲存/天
 * 每張照片約 50-200KB base64，免費額度可存 5000-20000 張
 */

const CONFIG = {
  ALLOWED_ORIGIN: 'https://vincecham91-png.github.io',
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': CONFIG.ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function cors() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': CONFIG.ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// ========================================
// 上傳圖片到 KV
// ========================================
async function handleUpload(request, env) {
  const formData = await request.formData();
  const file = formData.get('file');
  const className = formData.get('class') || 'unknown';
  const studentId = formData.get('studentId') || 'unknown';

  if (!file) return json({ error: '缺少檔案' }, 400);
  if (file.size > CONFIG.MAX_SIZE) return json({ error: '檔案過大，上限 10MB' }, 400);

  // 轉 base64 存入 KV
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`;

  // 生成唯一 key
  const key = `${className}/${studentId}/${Date.now()}.jpg`;

  await env.PHOTOS.put(key, dataUrl, {
    metadata: { className, studentId, contentType: file.type, size: file.size },
  });

  // 返回可訪問的 URL
  const url = `https://star-photo-api.vincecham91.workers.dev/api/photos/${key}`;
  console.log(`[Worker] ✅ 已儲存: ${key} (${(dataUrl.length / 1024).toFixed(1)}KB)`);

  return json({ success: true, url, key });
}

// ========================================
// 提供圖片（直接返回 base64 HTML 頁面或 redirect）
// ========================================
async function handleGetPhoto(request, env) {
  const url = new URL(request.url);
  const key = url.pathname.replace('/api/photos/', '');

  if (!key) return json({ error: '缺少 key' }, 400);

  const dataUrl = await env.PHOTOS.get(key);
  if (!dataUrl) return json({ error: '找不到圖片' }, 404);

  // 返回 HTML 頁面顯示圖片（支援直接瀏覽器打開）
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Photo</title><style>body{margin:0;display:flex;justify-content:center;background:#000}</style></head><body><img src="${dataUrl}" style="max-width:100%;max-height:100vh" /></body></html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  );
}

// ========================================
// 直接返回 raw base64（給 <img src> 使用）
// ========================================
async function handleGetPhotoRaw(request, env) {
  const url = new URL(request.url);
  const key = url.pathname.replace('/api/raw/', '');
  if (!key) return json({ error: '缺少 key' }, 400);

  const dataUrl = await env.PHOTOS.get(key);
  if (!dataUrl) return json({ error: '找不到圖片' }, 404);

  // 返回純 base64 字串（前端可用 fetch 取得後放入 img src）
  return new Response(dataUrl, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

// ========================================
// 路由
// ========================================
async function route(request, env) {
  const url = new URL(request.url);
  const method = request.method;

  if (method === 'OPTIONS') return cors();

  try {
    if (method === 'GET' && (url.pathname === '/api/health' || url.pathname === '/')) {
      return json({ status: 'ok', storage: 'KV', version: '2.0.0' });
    }
    if (method === 'POST' && url.pathname === '/api/upload') {
      return await handleUpload(request, env);
    }
    if (method === 'GET' && url.pathname.startsWith('/api/photos/')) {
      return await handleGetPhoto(request, env);
    }
    if (method === 'GET' && url.pathname.startsWith('/api/raw/')) {
      return await handleGetPhotoRaw(request, env);
    }
    return json({ error: 'Not Found' }, 404);
  } catch (e) {
    console.error('[Worker]', e);
    return json({ error: '伺服器錯誤' }, 500);
  }
}

export default { fetch: route };
