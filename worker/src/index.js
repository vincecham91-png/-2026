/**
 * Star Photo Share — Cloudflare Worker（圖片上傳專用）
 *
 * 功能：接收前端圖片 → 上傳到 Cloudflare R2 → 返回公開 URL
 * 注意：數據操作（Firestore CRUD）仍由前端 Firebase SDK 處理
 *
 * 部署：wrangler deploy
 */

// ========================================
// 配置
// ========================================

const CONFIG = {
  ALLOWED_ORIGIN: 'https://vincecham91-png.github.io',
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
};

// ========================================
// 回應輔助
// ========================================

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': CONFIG.ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

// ========================================
// R2 圖片上傳
// ========================================

async function handleUpload(request, env) {
  const formData = await request.formData();
  const file = formData.get('file');
  const className = formData.get('class') || 'unknown';
  const studentId = formData.get('studentId') || 'unknown';

  if (!file) return errorResponse('缺少檔案', 400);

  // 驗證檔案大小
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    return errorResponse(`檔案過大，上限 ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`, 400);
  }

  // 驗證檔案類型
  if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
    return errorResponse('不支援的檔案格式（僅限 JPG、PNG、WEBP）', 400);
  }

  // 上傳到 R2
  const bucket = env.PHOTOS;
  if (!bucket) {
    return errorResponse('R2 儲存尚未設定。請在 Cloudflare Dashboard 啟用 R2。', 503);
  }

  const ext = file.name ? file.name.split('.').pop().toLowerCase() : 'jpg';
  const key = `images/${className}/${studentId}/photo_${Date.now()}.${ext}`;

  try {
    await bucket.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'image/jpeg',
        cacheControl: 'public, max-age=31536000, immutable'
      }
    });

    // 返回公開 URL
    const publicUrl = `https://pub-${env.R2_PUBLIC_ID || 'STARR'}.r2.dev/${key}`;
    return jsonResponse({ success: true, url: publicUrl });
  } catch (e) {
    console.error('R2 上傳失敗:', e);
    return errorResponse('上傳失敗，請稍後再試', 500);
  }
}

// ========================================
// 健康檢查
// ========================================

function handleHealth() {
  return jsonResponse({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.2.0',
    r2Enabled: false // 部署 R2 後更新
  });
}

// ========================================
// 路由
// ========================================

async function route(request, env) {
  const url = new URL(request.url);
  const method = request.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': CONFIG.ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  try {
    if (method === 'GET' && (url.pathname === '/api/health' || url.pathname === '/')) {
      return handleHealth();
    }

    if (method === 'POST' && url.pathname === '/api/upload') {
      return await handleUpload(request, env);
    }

    return errorResponse('Not Found', 404);
  } catch (e) {
    console.error('[Worker] 錯誤:', e);
    return errorResponse('伺服器錯誤', 500);
  }
}

// ========================================
// Worker 入口
// ========================================

export default {
  async fetch(request, env, ctx) {
    return await route(request, env);
  }
};
