/**
 * Star Photo Share System
 * API Client — Cloudflare Worker 圖片上傳客戶端
 * Version 1.2
 * 2026-08-04
 *
 * 策略：
 * - 圖片上傳：Worker → R2（優先，無 CORS）→ base64（降級）
 * - 資料操作：保持使用 Firebase SDK（firebase.js）
 * - Worker 僅處理上傳，避免 Firestore REST API 兼容問題
 */

// ========================================
// Worker API 配置
// ========================================

const API = {
  BASE_URL: 'https://star-photo-api.vincecham91.workers.dev',

  /**
   * 上傳圖片到 Cloudflare R2
   * @param {File} file - 圖片檔案
   * @param {string} className - 班級
   * @param {string} studentId - 學號
   * @returns {Promise<{success: boolean, url: string}>}
   */
  async uploadImage(file, className, studentId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('class', className);
    formData.append('studentId', studentId);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const url = `${this.BASE_URL}/api/upload`;
      const res = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  },

  /**
   * 檢查 Worker 是否可用
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${this.BASE_URL}/api/health`, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();
      return data.status === 'ok';
    } catch (e) {
      return false;
    }
  }
};

// ========================================
// 覆蓋 firebase.js 的 uploadImage 函數
// （Worker 優先，Firebase Storage 為備用）
// ========================================

/**
 * 上傳圖片（Worker R2 優先 → 壓縮 base64 直存 Firestore）
 *
 * Firebase Storage CORS 從未修復，因此跳過。
 * 圖片先壓縮到 1200px/80% JPEG，確保在 Firestore 1MB 限制內。
 */
async function uploadImage(file, className, studentId, onProgress) {
  if (onProgress) onProgress(5);

  // 路徑 A：Cloudflare Worker → R2（最快，無 CORS）
  const workerOk = await API.isAvailable();
  if (workerOk) {
    try {
      if (onProgress) onProgress(20);
      const result = await API.uploadImage(file, className, studentId);
      if (result.success && result.url) {
        if (onProgress) onProgress(100);
        console.log('[API] ✅ R2 上傳成功:', result.url.substring(0, 60) + '...');
        return result.url;
      }
    } catch (e) {
      console.warn('[API] R2 不可用，使用 base64');
    }
  }

  // 路徑 B：Canvas 壓縮 → base64（這一步是必須的！原始照片太大）
  if (onProgress) onProgress(20);
  const base64 = await compressToBase64(file, 1000, 0.75, (pct) => {
    if (onProgress) onProgress(20 + Math.round(pct * 0.7));
  });
  if (onProgress) onProgress(100);
  console.log('[API] ✅ base64 編碼完成:', studentId, '-', (base64.length / 1024).toFixed(1) + 'KB');
  return base64;
}

/**
 * Canvas 壓縮圖片並轉 base64
 * @param {File} file - 原始檔案
 * @param {number} maxDim - 最長邊像素
 * @param {number} quality - JPEG 品質 0-1
 * @param {Function} onProgress - 進度回調
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
      img.onerror = () => reject(new Error('圖片載入失敗'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('檔案讀取失敗'));
    reader.readAsDataURL(file);
  });
}

// ========================================
// 初始化（在 firebase.js 載入後執行）
// ========================================

function initApiClient() {
  // 覆蓋 firebase.js 的 uploadImage（跳過 Storage CORS 等待）
  window.SPSS.uploadImage = uploadImage;

  API.isAvailable().then(ok => {
    console.log(ok ? '[API] ✅ Cloudflare Worker 可用' : '[API] ⚠️ Worker 不可用，使用 base64');
  });
}

// 自動初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApiClient);
} else {
  initApiClient();
}

// 匯出
window.SPSS.API = API;
window.SPSS.initApiClient = initApiClient;

console.log('[SPSS] API 模組已載入（Worker R2 + Firebase 降級）');
