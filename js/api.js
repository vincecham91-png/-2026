/**
 * Star Photo Share System
 * API Client — 图片上传客户端
 * Version 2.0
 * 2026-08-05
 *
 * 策略：
 * - 图片上传：Supabase Storage（优先）→ Worker R2（备用）→ base64（降级）
 * - 数据操作：使用 Supabase 客户端（supabase.js）
 */

// ========================================
// Supabase 客户端获取
// ========================================
function getSupabaseClient() {
  return window.SPSS.supabaseClient || null;
}

/**
 * 上传到 Supabase Storage
 * @param {File} file - 图片文件
 * @param {string} className - 班级
 * @param {string} studentId - 学号
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<string>} 公开 URL
 */
async function uploadToSupabaseStorage(file, className, studentId, onProgress) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error('Supabase 未初始化');

  const extension = file.name.split('.').pop().toLowerCase();
  const path = `images/${className}/${studentId}/photo_${Date.now()}.${extension}`;

  const { data, error } = await sb.storage
    .from('images')
    .upload(path, file, { upsert: true, cacheControl: '3600' });

  if (error) throw error;

  const { data: urlData } = sb.storage.from('images').getPublicUrl(path);
  return urlData.publicUrl;
}

// ========================================
// 升级版的 uploadImage（Supabase Storage 优先）
// ========================================

/**
 * 上传图片 — Supabase Storage 优先 → Worker R2 备用 → base64 降级
 *
 * @param {File} file - 图片文件
 * @param {string} className - 班级
 * @param {string} studentId - 学号
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<string>} 图片 URL 或 base64
 */
async function uploadImage(file, className, studentId, onProgress) {
  if (onProgress) onProgress(5);

  // 先压缩（减少上传带宽）
  if (onProgress) onProgress(10);
  const compressed = await compressToBase64(file, 1200, 0.8, (pct) => {
    if (onProgress) onProgress(10 + Math.round(pct * 0.3));
  });
  console.log('[API] 压缩完成:', (compressed.length / 1024).toFixed(1) + 'KB');

  // 路径 A：Supabase Storage（最可靠，支持 CORS）
  try {
    if (onProgress) onProgress(50);
    const publicUrl = await uploadToSupabaseStorage(file, className, studentId, onProgress);
    if (onProgress) onProgress(100);
    console.log('[API] ✅ Supabase Storage 成功:', publicUrl.substring(0, 60) + '...');
    return publicUrl;
  } catch (e) {
    console.warn('[API] Supabase Storage 失败，尝试 Worker:', e.message);
  }

  // 路径 B：Cloudflare Worker R2
  const workerOk = await isWorkerAvailable();
  if (workerOk) {
    try {
      if (onProgress) onProgress(50);
      const blob = await (await fetch(compressed)).blob();
      const form = new FormData();
      form.append('file', blob, 'photo.jpg');
      form.append('class', className);
      form.append('studentId', studentId);

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('https://star-photo-api.vincecham91.workers.dev/api/upload', {
        method: 'POST',
        body: form,
        signal: controller.signal
      });
      clearTimeout(t);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          if (onProgress) onProgress(100);
          console.log('[API] ✅ Worker R2 成功:', data.url.substring(0, 60) + '...');
          return data.url;
        }
      }
      console.warn('[API] Worker 上传失败，使用 base64');
    } catch (e) {
      console.warn('[API] Worker 不可用，使用 base64:', e.message);
    }
  }

  // 路径 C：base64 直存（最终降级）
  if (onProgress) onProgress(100);
  console.log('[API] ⚠️ 降级 base64:', studentId, '-', (compressed.length / 1024).toFixed(1) + 'KB');
  return compressed;
}

/**
 * 检查 Worker 是否可用
 */
async function isWorkerAvailable() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://star-photo-api.vincecham91.workers.dev/api/health', { signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json();
    return data.status === 'ok';
  } catch (e) {
    return false;
  }
}

/**
 * Canvas 压缩图片并转 base64
 * @param {File} file - 原始文件
 * @param {number} maxDim - 最长边像素
 * @param {number} quality - JPEG 品质 0-1
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<string>} base64 data URL
 */
function compressToBase64(file, maxDim, quality, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round(h / w * maxDim); w = maxDim; }
          else { w = Math.round(w / h * maxDim); h = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        if (onProgress) onProgress(0.8);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('图片载入失败'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('档案读取失败'));
    reader.readAsDataURL(file);
  });
}

// ========================================
// 初始化（在 supabase.js 加载后执行）
// ========================================

function initApiClient() {
  window.SPSS.uploadImage = uploadImage;

  isWorkerAvailable().then(ok => {
    console.log(ok ? '[API] ✅ Worker 可用' : '[API] ⚠️ Worker 不可用，使用 base64');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApiClient);
} else {
  initApiClient();
}

// 导出
window.SPSS.API = { isWorkerAvailable };
window.SPSS.initApiClient = initApiClient;

console.log('[SPSS] API 模块已加载（Supabase Storage → Worker R2 → base64）');
