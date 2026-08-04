/**
 * Star Photo Share System
 * API Client — Cloudflare Worker 前端客戶端
 * Version 1.0
 * 2026-08-04
 *
 * 取代 Firebase SDK，使用 Cloudflare Worker API：
 * - 圖片上傳到 R2（無 CORS 問題，全球 CDN）
 * - 資料讀寫通過 Worker → Firestore（edge 快取加速）
 * - Worker 不可用時降級到 localStorage
 *
 * 注意：此文件假設已不再載入 Firebase SDK。
 * 所有 Firebase 操作改由 Worker API 處理。
 */

const API = {
  // Worker API 基礎 URL（部署後更新）
  BASE_URL: 'https://star-photo-api.vincecham91.workers.dev',

  // 教師 API Key（基本保護）
  TEACHER_KEY: 'star-teacher-key-2026',

  /**
   * 呼叫 Worker API
   * @param {string} path - API 路徑 (如 /api/students)
   * @param {object} options - fetch 選項
   * @returns {Promise<any>} JSON 回應
   */
  async call(path, options = {}) {
    const url = `${this.BASE_URL}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `API 錯誤: ${res.status}`);
    }

    return await res.json();
  },

  /**
   * 上傳圖片到 R2（multipart/form-data）
   * @returns {Promise<{success: boolean, url: string}>}
   */
  async uploadFile(file, className, studentId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('class', className);
    formData.append('studentId', studentId);

    const url = `${this.BASE_URL}/api/upload`;
    const res = await fetch(url, { method: 'POST', body: formData });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || '上傳失敗');
    }

    return await res.json();
  }
};

// ========================================
// 命名空間（與舊 firebase.js 兼容）
// ========================================
window.SPSS = window.SPSS || {};

// ========================================
// localStorage 降級方案（從 firebase.js 遷移）
// ========================================

const LDB_PREFIX = 'spss_';
const LDB_KEYS = {
  WORKS_INDEX: 'spss_works_index',
  WORK_PREFIX: 'spss_work_',
  STUDENT_STATUS: 'spss_student_status',
  CLASS_STATS: 'spss_class_stats',
  LOGS: 'spss_logs',
  IMAGE_PREFIX: 'spss_img_'
};

function ldbGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function ldbSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
}

function ldbRemove(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}

function ldbGetWorksIndex() {
  return ldbGet(LDB_KEYS.WORKS_INDEX) || [];
}

function ldbAddToWorksIndex(studentId) {
  const index = ldbGetWorksIndex();
  if (!index.includes(studentId)) {
    index.push(studentId);
    ldbSet(LDB_KEYS.WORKS_INDEX, index);
  }
}

function ldbRemoveFromWorksIndex(studentId) {
  const index = ldbGetWorksIndex().filter(id => id !== studentId);
  ldbSet(LDB_KEYS.WORKS_INDEX, index);
}

function ldbSaveWork(studentId, workData) {
  const data = {
    ...workData,
    createdAt: workData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  ldbSet(LDB_KEYS.WORK_PREFIX + studentId, data);
  ldbAddToWorksIndex(studentId);
}

function ldbGetWork(studentId) {
  return ldbGet(LDB_KEYS.WORK_PREFIX + studentId);
}

function ldbDeleteWork(studentId) {
  ldbRemove(LDB_KEYS.WORK_PREFIX + studentId);
  ldbRemove(LDB_KEYS.IMAGE_PREFIX + studentId);
  ldbRemoveFromWorksIndex(studentId);
}

function ldbGetAllWorks() {
  const index = ldbGetWorksIndex();
  return index
    .map(id => {
      const work = ldbGetWork(id);
      return work ? { id, ...work } : null;
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

function ldbGetWorksByClass(className) {
  return ldbGetAllWorks().filter(w => w.class === className);
}

function ldbUpdateStudentStatus(studentId, completed, data) {
  const allStatus = ldbGet(LDB_KEYS.STUDENT_STATUS) || {};
  allStatus[studentId] = {
    ...allStatus[studentId],
    completed,
    uploadTime: completed ? new Date().toISOString() : null,
    hasPhoto: completed ? !!(data.photoURL || data.photoLink) : false,
    reason: data.reason || ''
  };
  ldbSet(LDB_KEYS.STUDENT_STATUS, allStatus);
}

function ldbGetStudentStatus(studentId) {
  const allStatus = ldbGet(LDB_KEYS.STUDENT_STATUS) || {};
  return allStatus[studentId] || null;
}

function ldbGetAllStudentStatus() {
  const raw = ldbGet(LDB_KEYS.STUDENT_STATUS) || {};
  const result = {};
  Object.keys(raw).forEach(function(sid) {
    const st = raw[sid];
    result[sid] = Object.assign({}, st, {
      photoURL: st.photoURL || (st.hasPhoto ? '__local__' : ''),
      photoLink: st.photoLink || ''
    });
  });
  return result;
}

function ldbUpdateClassStats(className, allStudents) {
  const statusMap = ldbGetAllStudentStatus();
  const classStudents = allStudents.filter(s => s.class === className);
  const totalCount = classStudents.length;
  let completedCount = 0;
  classStudents.forEach(s => {
    const status = statusMap[s.studentId];
    if (status && status.completed) completedCount++;
  });

  const stats = ldbGet(LDB_KEYS.CLASS_STATS) || {};
  stats[className] = {
    className,
    studentCount: totalCount,
    completedCount,
    completionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    updatedAt: new Date().toISOString()
  };
  ldbSet(LDB_KEYS.CLASS_STATS, stats);
}

function ldbGetAllClassStats() {
  const stats = ldbGet(LDB_KEYS.CLASS_STATS) || {};
  return Object.values(stats).sort((a, b) => (a.className || '').localeCompare(b.className || ''));
}

function ldbAddLog(type, userId, message) {
  const logs = ldbGet(LDB_KEYS.LOGS) || [];
  logs.push({ type, userId, message, timestamp: new Date().toISOString(), userAgent: navigator.userAgent });
  if (logs.length > 200) logs.splice(0, logs.length - 200);
  ldbSet(LDB_KEYS.LOGS, logs);
}

// ========================================
// API 操作（Worker 優先 + localStorage 降級）
// ========================================

/**
 * Worker API 是否可用（懶加載檢查）
 */
let _workerAvailable = null;
async function isWorkerAvailable() {
  if (_workerAvailable !== null) return _workerAvailable;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    await fetch(`${API.BASE_URL}/api/students`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    _workerAvailable = true;
  } catch (e) {
    console.warn('[API] Worker 不可用，使用本地模式:', e.message);
    _workerAvailable = false;
  }
  return _workerAvailable;
}

/**
 * 根據班級獲取學生列表
 */
async function getStudentsByClass(className) {
  try {
    if (await isWorkerAvailable()) {
      const students = await API.call(`/api/students?class=${encodeURIComponent(className)}`);
      if (students && students.length > 0) return students;
    }
  } catch (e) {
    console.warn('[API] getStudentsByClass 失敗:', e.message);
  }

  // 降級：從本地 JSON 讀取
  try {
    const response = await fetch('data/students.json');
    if (response.ok) {
      let students = await response.json();
      const statusMap = ldbGetAllStudentStatus();
      return students
        .filter(s => s.class === className)
        .map(s => {
          const status = statusMap[s.studentId];
          return status ? { ...s, ...status, id: s.studentId } : { ...s, id: s.studentId };
        })
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  } catch (e) {}
  return [];
}

/**
 * 獲取所有班級
 */
async function getAllClasses() {
  try {
    if (await isWorkerAvailable()) {
      const classes = await API.call('/api/students');
      if (classes && classes.length > 0) return classes;
    }
  } catch (e) {}

  try {
    const response = await fetch('data/students.json');
    if (response.ok) {
      const students = await response.json();
      const classSet = new Set(students.map(s => s.class));
      return Array.from(classSet).sort();
    }
  } catch (e) {}
  return [];
}

/**
 * 學生登入驗證
 */
async function verifyStudentLogin(className, name, password) {
  try {
    if (await isWorkerAvailable()) {
      const result = await API.call('/api/login', {
        method: 'POST',
        body: JSON.stringify({ className, name, password })
      });
      if (result.success && result.student) return result.student;
      return null;
    }
  } catch (e) {
    console.warn('[API] 登入驗證失敗:', e.message);
  }

  // 降級：從本地 JSON 驗證
  try {
    const response = await fetch('data/students.json');
    if (response.ok) {
      const students = await response.json();
      const student = students.find(s =>
        s.class === className && s.name === name && s.status === 'active'
      );
      if (student && student.password === password) return { ...student, id: student.studentId };
    }
  } catch (e) {}
  return null;
}

/**
 * 獲取單個學生資料
 */
async function getStudentById(studentId) {
  try {
    if (await isWorkerAvailable()) {
      const student = await API.call(`/api/students/${studentId}`);
      if (student) return student;
    }
  } catch (e) {}

  try {
    const response = await fetch('data/students.json');
    if (response.ok) {
      const students = await response.json();
      const student = students.find(s => s.studentId === studentId);
      if (student) {
        const status = ldbGetStudentStatus(studentId);
        return { id: studentId, ...student, ...(status || {}) };
      }
    }
  } catch (e) {}
  return null;
}

/**
 * 更新學生完成狀態
 */
async function updateStudentStatus(studentId, completed, data = {}) {
  try {
    if (await isWorkerAvailable()) {
      await API.call(`/api/students/${studentId}`, {
        method: 'PUT',
        body: JSON.stringify({ completed, ...data })
      });
      return;
    }
  } catch (e) {}

  ldbUpdateStudentStatus(studentId, completed, data);
}

/**
 * 獲取學生作品
 */
async function getStudentWork(studentId) {
  try {
    if (await isWorkerAvailable()) {
      const work = await API.call(`/api/works/${studentId}`);
      if (work) return work;
    }
  } catch (e) {}

  const work = ldbGetWork(studentId);
  return work ? { id: studentId, ...work } : null;
}

/**
 * 儲存學生作品
 */
async function saveWork(studentId, workData) {
  try {
    if (await isWorkerAvailable()) {
      await API.call(`/api/works/${studentId}`, {
        method: 'POST',
        body: JSON.stringify(workData)
      });
      return;
    }
  } catch (e) {
    console.error('[API] saveWork 雲端失敗:', e.message);
    throw new Error(`雲端儲存失敗：${e.message}`);
  }

  // 離線降級
  ldbSaveWork(studentId, workData);
  ldbUpdateStudentStatus(studentId, true, {
    photoURL: workData.photoURL || '',
    photoLink: workData.photoLink || '',
    reason: workData.reason || ''
  });
  if (workData.class) {
    let allStudents = [];
    try {
      const response = await fetch('data/students.json');
      if (response.ok) allStudents = await response.json();
    } catch (e) {}
    ldbUpdateClassStats(workData.class, allStudents);
  }
  ldbAddLog('upload', studentId, `${workData.name} 上傳了作品（本地）`);
}

/**
 * 刪除學生作品
 */
async function deleteWork(studentId, photoURL) {
  try {
    if (await isWorkerAvailable()) {
      await API.call(`/api/works/${studentId}`, { method: 'DELETE' });
      return;
    }
  } catch (e) {}

  const work = ldbGetWork(studentId);
  ldbDeleteWork(studentId);
  ldbUpdateStudentStatus(studentId, false, { photoURL: '', photoLink: '', reason: '' });
  if (work && work.class) {
    let allStudents = [];
    try {
      const response = await fetch('data/students.json');
      if (response.ok) allStudents = await response.json();
    } catch (e) {}
    ldbUpdateClassStats(work.class, allStudents);
  }
  ldbAddLog('delete', studentId, '學生刪除了作品（本地）');
}

/**
 * 根據班級獲取所有作品
 */
async function getWorksByClass(className) {
  try {
    if (await isWorkerAvailable()) {
      const works = await API.call(`/api/works?class=${encodeURIComponent(className)}`);
      if (works && works.length > 0) return works;
    }
  } catch (e) {}

  return ldbGetWorksByClass(className);
}

/**
 * 獲取所有作品
 */
async function getAllWorks() {
  try {
    if (await isWorkerAvailable()) {
      const works = await API.call('/api/works');
      if (works && works.length > 0) return works;
    }
  } catch (e) {}

  return ldbGetAllWorks();
}

/**
 * 獲取所有班級統計
 */
async function getAllClassStats() {
  try {
    if (await isWorkerAvailable()) {
      const stats = await API.call('/api/stats/classes', {
        headers: { 'X-API-Key': API.TEACHER_KEY }
      });
      if (stats && stats.length > 0) return stats;
    }
  } catch (e) {}

  try {
    const response = await fetch('data/students.json');
    if (response.ok) {
      const students = await response.json();
      const statusMap = ldbGetAllStudentStatus();
      const classMap = {};
      students.forEach(s => {
        if (!classMap[s.class]) classMap[s.class] = { total: 0, completed: 0 };
        classMap[s.class].total++;
        const st = statusMap[s.studentId];
        if (st && st.completed) classMap[s.class].completed++;
      });
      return Object.entries(classMap).map(([className, data]) => ({
        className,
        studentCount: data.total,
        completedCount: data.completed,
        completionRate: Math.round((data.completed / data.total) * 100)
      })).sort((a, b) => a.className.localeCompare(b.className));
    }
  } catch (e) {}
  return [];
}

/**
 * 獲取系統概覽統計
 */
async function getOverviewStats() {
  try {
    if (await isWorkerAvailable()) {
      const stats = await API.call('/api/stats/overview', {
        headers: { 'X-API-Key': API.TEACHER_KEY }
      });
      if (stats && stats.totalStudents > 0) return stats;
    }
  } catch (e) {}

  try {
    const response = await fetch('data/students.json');
    if (response.ok) {
      const students = await response.json();
      const statusMap = ldbGetAllStudentStatus();
      const totalStudents = students.length;
      let completedCount = 0;
      students.forEach(s => {
        const status = statusMap[s.studentId];
        if (status && status.completed) completedCount++;
      });
      return {
        totalStudents,
        completedCount,
        incompleteCount: totalStudents - completedCount,
        completionRate: totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0
      };
    }
  } catch (e) {}
  return { totalStudents: 0, completedCount: 0, incompleteCount: 0, completionRate: 0 };
}

/**
 * 搜尋學生
 */
async function searchStudents(query) {
  try {
    if (await isWorkerAvailable()) {
      if (query) {
        const students = await API.call(`/api/students/search?q=${encodeURIComponent(query)}`);
        if (students && students.length > 0) return students;
      } else {
        const students = await API.call('/api/students/search?q=');
        if (students && students.length > 0) return students;
      }
    }
  } catch (e) {}

  try {
    const response = await fetch('data/students.json');
    if (response.ok) {
      let students = await response.json();
      const statusMap = ldbGetAllStudentStatus();
      students = students.map(s => {
        const status = statusMap[s.studentId];
        return status ? { ...s, ...status, id: s.studentId } : { ...s, id: s.studentId };
      });
      if (query) {
        const keyword = query.toLowerCase();
        students = students.filter(s =>
          s.name.toLowerCase().includes(keyword) ||
          s.studentId.includes(keyword) ||
          s.class.includes(keyword)
        );
      }
      return students;
    }
  } catch (e) {}
  return [];
}

// ========================================
// 圖片上傳（Worker + R2 優先，base64 降級）
// ========================================

/**
 * 上傳圖片到 Cloudflare R2（或降級到 base64）
 */
async function uploadImage(file, className, studentId, onProgress) {
  if (onProgress) onProgress(10);

  // 路徑 A：Cloudflare R2（無 CORS 問題）
  try {
    if (await isWorkerAvailable()) {
      if (onProgress) onProgress(30);
      const result = await API.uploadFile(file, className, studentId);
      if (result.success && result.url) {
        if (onProgress) onProgress(100);
        console.log('[API] ✅ R2 上傳成功:', result.url.substring(0, 60) + '...');
        return result.url;
      }
    }
  } catch (e) {
    console.warn('[API] R2 上傳失敗，降級到 base64:', e.message);
  }

  // 路徑 B：base64 降級
  if (onProgress) onProgress(50);
  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('檔案讀取失敗'));
      reader.readAsDataURL(file);
    });
    if (onProgress) onProgress(100);
    console.log('[API] ⚠️ 降級 base64:', studentId, '-', (base64.length / 1024).toFixed(1) + 'KB');
    return base64;
  } catch (e) {
    throw new Error('圖片處理失敗');
  }
}

// ========================================
// 教師認證（保留 Firebase Auth 或改用 API Key）
// ========================================

/**
 * 教師登入（僅本地模式 — 需要 Firebase Auth 替代方案）
 * 生產環境建議使用 Workers + Firebase Auth REST API
 */
async function teacherLogin(email, password) {
  // 注意：Firebase Auth 在純 API 模式下需要特殊處理
  // 此處提供基本結構，完整實現需在 Worker 中整合 Firebase Auth REST API
  throw new Error('教師登入需要 Firebase Auth。請在 Worker 環境中設定 FIREBASE_AUTH 變數。');
}

async function teacherLogout() {
  // Worker API 本身無狀態，無需登出操作
  return true;
}

async function getCurrentTeacher() {
  // 返回本地 Session 中的教師
  const session = window.SPSS.getSession && window.SPSS.getSession('teacherSession');
  return session || null;
}

// ========================================
// 日誌記錄
// ========================================

async function addLog(type, userId, message) {
  ldbAddLog(type, userId, message);
}

// ========================================
// 匯出到全局
// ========================================
window.SPSS.API = API;
window.SPSS.isWorkerAvailable = isWorkerAvailable;
window.SPSS.getStudentsByClass = getStudentsByClass;
window.SPSS.getAllClasses = getAllClasses;
window.SPSS.verifyStudentLogin = verifyStudentLogin;
window.SPSS.getStudentById = getStudentById;
window.SPSS.updateStudentStatus = updateStudentStatus;
window.SPSS.getStudentWork = getStudentWork;
window.SPSS.saveWork = saveWork;
window.SPSS.deleteWork = deleteWork;
window.SPSS.getWorksByClass = getWorksByClass;
window.SPSS.getAllWorks = getAllWorks;
window.SPSS.getAllClassStats = getAllClassStats;
window.SPSS.getOverviewStats = getOverviewStats;
window.SPSS.searchStudents = searchStudents;
window.SPSS.uploadImage = uploadImage;
window.SPSS.teacherLogin = teacherLogin;
window.SPSS.teacherLogout = teacherLogout;
window.SPSS.getCurrentTeacher = getCurrentTeacher;
window.SPSS.addLog = addLog;

// 不再需要 Firebase SDK
window.SPSS.firestoreDB = null;
window.SPSS.firebaseStorage = null;
window.SPSS.firebaseAuth = null;

console.log('[SPSS] API 模組已載入（Cloudflare Worker + localStorage 降級）');
