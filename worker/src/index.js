/**
 * Star Photo Share — Cloudflare Worker API
 *
 * 取代前端直接調用 Firebase SDK，提供：
 * 1. 圖片上傳到 R2（無 CORS 問題）
 * 2. Firestore 資料讀寫代理（edge 快取）
 * 3. 學生登入驗證 API
 *
 * 部署：wrangler deploy
 */

// ========================================
// 配置
// ========================================

const CONFIG = {
  // Firebase 項目
  FIREBASE_PROJECT: 'starphoto2026-397c3',
  FIREBASE_API_KEY: 'AIzaSyAY0bUU6Yc9YsH2PZH5O1L7FpgFUpip1zY',
  FIRESTORE_BASE: 'https://firestore.googleapis.com/v1/projects/starphoto2026-397c3/databases/(default)/documents',

  // 教師 API Key（基本保護）
  TEACHER_API_KEY: 'star-teacher-key-2026',

  // CORS
  ALLOWED_ORIGIN: 'https://vincecham91-png.github.io',

  // Firestore REST API 認證 token（使用 API Key）
  get AUTH_PARAMS() { return `key=${this.FIREBASE_API_KEY}`; }
};

// ========================================
// Firestore REST API 封裝
// ========================================

/**
 * 讀取單個文檔
 */
async function getDocument(collection, docId) {
  const url = `${CONFIG.FIRESTORE_BASE}/${collection}/${docId}?${CONFIG.AUTH_PARAMS}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Firestore 讀取失敗: ${res.status}`);
  }
  const data = await res.json();
  return firestoreDocToJson(data);
}

/**
 * 查詢集合（簡單過濾 + 排序）
 */
async function queryCollection(collection, { where, orderBy, limit, select } = {}) {
  // 構建結構化查詢
  const body = { from: [{ collectionId: collection }] };

  if (where) {
    body.where = {
      fieldFilter: {
        field: { fieldPath: where.field },
        op: where.op || 'EQUAL',
        value: where.value
      }
    };
  }

  if (orderBy) {
    body.orderBy = [{ field: { fieldPath: orderBy.field }, direction: orderBy.dir || 'ASCENDING' }];
  }

  if (limit) body.limit = limit;

  if (select) {
    body.select = { fields: select.map(f => ({ fieldPath: f })) };
  }

  const url = `${CONFIG.FIRESTORE_BASE}/${collection}:runQuery?${CONFIG.AUTH_PARAMS}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore 查詢失敗: ${res.status} ${errText}`);
  }

  const results = await res.json();
  return (results || [])
    .filter(r => r.document)
    .map(r => firestoreDocToJson(r.document));
}

/**
 * 寫入文檔（創建或更新）
 */
async function setDocument(collection, docId, data) {
  const url = `${CONFIG.FIRESTORE_BASE}/${collection}/${docId}?${CONFIG.AUTH_PARAMS}`;
  const body = {
    fields: jsonToFirestoreFields(data)
  };

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore 寫入失敗: ${res.status} ${errText}`);
  }

  return await res.json();
}

/**
 * 刪除文檔
 */
async function deleteDocument(collection, docId) {
  const url = `${CONFIG.FIRESTORE_BASE}/${collection}/${docId}?${CONFIG.AUTH_PARAMS}`;
  const res = await fetch(url, { method: 'DELETE' });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Firestore 刪除失敗: ${res.status}`);
  }
}

/**
 * Firestore REST API 文件格式 → 普通 JSON
 */
function firestoreDocToJson(doc) {
  const name = doc.name || '';
  const parts = name.split('/');
  const id = parts[parts.length - 1];
  const data = firestoreFieldsToJson(doc.fields || {});
  return { id, ...data };
}

/**
 * Firestore Value 格式 → 普通 JSON
 */
function firestoreFieldsToJson(fields) {
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) result[key] = value.stringValue;
    else if (value.integerValue !== undefined) result[key] = parseInt(value.integerValue);
    else if (value.doubleValue !== undefined) result[key] = value.doubleValue;
    else if (value.booleanValue !== undefined) result[key] = value.booleanValue;
    else if (value.timestampValue !== undefined) result[key] = value.timestampValue;
    else if (value.nullValue !== undefined) result[key] = null;
    else if (value.mapValue) result[key] = firestoreFieldsToJson(value.mapValue.fields || {});
    else if (value.arrayValue) {
      result[key] = (value.arrayValue.values || []).map(v => {
        if (v.stringValue !== undefined) return v.stringValue;
        if (v.mapValue) return firestoreFieldsToJson(v.mapValue.fields || {});
        return null;
      });
    }
    else result[key] = null;
  }
  return result;
}

/**
 * JSON → Firestore Value 格式
 */
function jsonToFirestoreFields(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (typeof value === 'number') {
      fields[key] = Number.isInteger(value) ? { integerValue: value } : { doubleValue: value };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/))) {
      fields[key] = { timestampValue: value instanceof Date ? value.toISOString() : value };
    } else {
      fields[key] = { stringValue: String(value) };
    }
  }
  return fields;
}

// ========================================
// R2 圖片儲存
// ========================================

async function uploadToR2(file, className, studentId, env) {
  const bucket = env.PHOTOS;
  const ext = file.name ? file.name.split('.').pop().toLowerCase() : 'jpg';
  const key = `images/${className}/${studentId}/photo_${Date.now()}.${ext}`;

  await bucket.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type || 'image/jpeg',
      cacheControl: 'public, max-age=31536000, immutable'
    }
  });

  // 返回公開 URL（需設定 R2 bucket 為公開或使用 custom domain）
  // 如果沒有 custom domain，使用 r2.dev subdomain
  const publicUrl = `https://pub-${env.R2_PUBLIC_ID}.r2.dev/${key}`;
  return publicUrl;
}

// ========================================
// API 路由處理器
// ========================================

/**
 * 學生登入驗證
 */
async function handleLogin(request) {
  const { className, name, password } = await request.json();

  // 查詢學生
  const students = await queryCollection('students', {
    where: { field: 'class', op: 'EQUAL', value: { stringValue: className } }
  });

  const student = students.find(s => s.name === name && s.status === 'active');

  if (!student) {
    return errorResponse('找不到該學生', 404);
  }

  if (student.password !== password) {
    return errorResponse('學號不正確', 401);
  }

  // 更新最後登入時間
  try {
    await setDocument('students', student.id, {
      ...student,
      lastLogin: new Date().toISOString()
    });
  } catch (e) { /* 不影響登入 */ }

  return jsonResponse({
    success: true,
    student: {
      studentId: student.studentId,
      name: student.name,
      class: student.class,
      completed: student.completed || false,
      photoURL: student.photoURL || '',
      photoLink: student.photoLink || '',
      reason: student.reason || ''
    }
  });
}

/**
 * 取班級學生列表
 */
async function handleGetStudents(url) {
  const className = url.searchParams.get('class');

  if (className) {
    const students = await queryCollection('students', {
      where: { field: 'class', op: 'EQUAL', value: { stringValue: className } }
    });
    return jsonResponse(students.filter(s => s.status === 'active'));
  }

  // 無 class 參數 → 返回所有班級
  const students = await queryCollection('students');
  const classes = [...new Set(students.filter(s => s.status === 'active').map(s => s.class))].sort();
  return jsonResponse(classes);
}

/**
 * 取單個學生
 */
async function handleGetStudent(studentId) {
  const student = await getDocument('students', studentId);
  if (!student) return errorResponse('找不到學生', 404);
  return jsonResponse(student);
}

/**
 * 搜尋學生
 */
async function handleSearchStudents(url) {
  const query = url.searchParams.get('q') || '';
  const students = await queryCollection('students');
  const keyword = query.toLowerCase();
  const filtered = students
    .filter(s => s.status === 'active')
    .filter(s =>
      s.name.toLowerCase().includes(keyword) ||
      s.studentId.includes(keyword) ||
      s.class.includes(keyword)
    );
  return jsonResponse(filtered);
}

/**
 * 取作品
 */
async function handleGetWorks(url, studentId) {
  if (studentId) {
    const work = await getDocument('works', studentId);
    return jsonResponse(work);
  }

  const className = url.searchParams.get('class');
  if (className) {
    const works = await queryCollection('works', {
      where: { field: 'class', op: 'EQUAL', value: { stringValue: className } }
    });
    return jsonResponse(works);
  }

  const works = await queryCollection('works', {
    orderBy: { field: 'createdAt', dir: 'DESCENDING' }
  });
  return jsonResponse(works);
}

/**
 * 儲存作品
 */
async function handleSaveWork(request, studentId) {
  const workData = await request.json();

  const doc = {
    studentId: workData.studentId || studentId,
    name: workData.name || '',
    class: workData.class || '',
    photoURL: workData.photoURL || '',
    photoLink: workData.photoLink || '',
    reason: workData.reason || '',
    completed: true,
    createdAt: workData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setDocument('works', studentId, doc);

  // 更新學生狀態
  try {
    await setDocument('students', studentId, {
      completed: true,
      photoURL: doc.photoURL,
      photoLink: doc.photoLink,
      reason: doc.reason
    });
  } catch (e) { /* 不影響儲存 */ }

  return jsonResponse({ success: true, work: doc });
}

/**
 * 刪除作品
 */
async function handleDeleteWork(studentId) {
  await deleteDocument('works', studentId);

  // 重置學生狀態
  try {
    await setDocument('students', studentId, {
      completed: false,
      photoURL: '',
      photoLink: '',
      reason: ''
    });
  } catch (e) { /* 不影響刪除 */ }

  return jsonResponse({ success: true });
}

/**
 * R2 圖片上傳
 */
async function handleUpload(request, env) {
  const formData = await request.formData();
  const file = formData.get('file');
  const className = formData.get('class');
  const studentId = formData.get('studentId');

  if (!file) return errorResponse('缺少檔案', 400);
  if (!className || !studentId) return errorResponse('缺少班級或學號', 400);

  // 驗證檔案大小（最大 10MB）
  if (file.size > 10 * 1024 * 1024) {
    return errorResponse('檔案過大，上限 10MB', 400);
  }

  // 驗證檔案類型
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!validTypes.includes(file.type)) {
    return errorResponse('不支援的檔案格式', 400);
  }

  try {
    const publicUrl = await uploadToR2(file, className, studentId, env);
    return jsonResponse({ success: true, url: publicUrl });
  } catch (e) {
    console.error('R2 上傳失敗:', e);
    return errorResponse('上傳失敗，請稍後再試', 500);
  }
}

/**
 * 統計總覽
 */
async function handleGetOverview() {
  const students = await queryCollection('students');
  const active = students.filter(s => s.status === 'active');
  const completed = active.filter(s => s.completed).length;

  return jsonResponse({
    totalStudents: active.length,
    completedCount: completed,
    incompleteCount: active.length - completed,
    completionRate: active.length > 0 ? Math.round((completed / active.length) * 100) : 0
  });
}

/**
 * 班級統計
 */
async function handleGetClassStats() {
  const students = await queryCollection('students');
  const active = students.filter(s => s.status === 'active');

  const classMap = {};
  active.forEach(s => {
    if (!classMap[s.class]) classMap[s.class] = { total: 0, completed: 0 };
    classMap[s.class].total++;
    if (s.completed) classMap[s.class].completed++;
  });

  const stats = Object.entries(classMap).map(([className, data]) => ({
    className,
    studentCount: data.total,
    completedCount: data.completed,
    completionRate: Math.round((data.completed / data.total) * 100)
  }));

  return jsonResponse(stats.sort((a, b) => a.className.localeCompare(b.className)));
}

// ========================================
// 回應輔助
// ========================================

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': CONFIG.ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
      'Access-Control-Max-Age': '86400'
    }
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ error: message, code: status }, status);
}

/**
 * 檢查教師 API Key
 */
function checkTeacherAuth(request) {
  const apiKey = request.headers.get('X-API-Key');
  return apiKey === CONFIG.TEACHER_API_KEY;
}

// ========================================
// 路由
// ========================================

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': CONFIG.ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  try {
    // --- 公開端點（學生用）---

    if (method === 'POST' && path === '/api/login') {
      return await handleLogin(request);
    }

    if (method === 'GET' && path === '/api/students') {
      return await handleGetStudents(url);
    }

    if (path.startsWith('/api/students/')) {
      const studentId = path.split('/api/students/')[1];
      return await handleGetStudent(studentId);
    }

    if (method === 'GET' && path === '/api/students/search') {
      return await handleSearchStudents(url);
    }

    if (method === 'POST' && path === '/api/upload') {
      return await handleUpload(request, env);
    }

    // GET /api/works 或 /api/works/:id
    if (method === 'GET' && path.startsWith('/api/works')) {
      const workId = path === '/api/works' ? null : path.split('/api/works/')[1];
      return await handleGetWorks(url, workId);
    }

    if (method === 'POST' && path.startsWith('/api/works/')) {
      const studentId = path.split('/api/works/')[1];
      return await handleSaveWork(request, studentId);
    }

    if (method === 'DELETE' && path.startsWith('/api/works/')) {
      const studentId = path.split('/api/works/')[1];
      return await handleDeleteWork(studentId);
    }

    // --- 教師端點（需要 API Key）---

    if (method === 'GET' && path === '/api/stats/overview') {
      if (!checkTeacherAuth(request)) return errorResponse('未授權', 403);
      return await handleGetOverview();
    }

    if (method === 'GET' && path === '/api/stats/classes') {
      if (!checkTeacherAuth(request)) return errorResponse('未授權', 403);
      return await handleGetClassStats();
    }

    // 404
    return errorResponse('Not Found', 404);

  } catch (e) {
    console.error('[Worker] 錯誤:', e);
    return errorResponse(e.message || '伺服器錯誤', 500);
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
