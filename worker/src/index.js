/**
 * Star Photo Share — Cloudflare Worker API v3.0
 *
 * 完整後端 API，替代 Firebase：
 * - 圖片儲存：KV（base64，已存在）
 * - 學生資料：KV
 * - 作品資料：KV
 * - 班級統計：KV
 * - 教師認證：API Key + KV
 * - 操作日誌：KV
 *
 * 部署：cd worker && npm run deploy
 */

// ========================================
// 配置
// ========================================

// 允许的 CORS 域名（支持 GitHub Pages + Cloudflare Pages）
const ALLOWED_ORIGINS = [
  'https://YOUR_GITHUB_USERNAME.github.io',
  'https://ffe0a093.YOUR_PROJECT.pages.dev',
];

function getAllowedOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  // 检查精确匹配
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  // 检查是否是 Cloudflare Pages 预览部署 (*.YOUR_PROJECT.pages.dev)
  if (origin.endsWith('.YOUR_PROJECT.pages.dev')) return origin;
  // 检查是否是 GitHub Pages
  if (origin === 'https://YOUR_GITHUB_USERNAME.github.io') return origin;
  // 返回第一个默认 origin
  return ALLOWED_ORIGINS[0];
}

const CONFIG = {
  API_KEY: 'chew-star-2026-secure-key',
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
};

// ========================================
// KV Key 命名規範
// ========================================

const KEYS = {
  STUDENTS_INDEX: 'students:index',
  STUDENT: (id) => `students:${id}`,
  WORKS_INDEX: 'works:index',
  WORK: (id) => `works:${id}`,
  WORKS_BY_CLASS: (cls) => `works:class:${cls}`,
  CLASSES_INDEX: 'classes:index',
  CLASS: (name) => `classes:${name}`,
  TEACHERS_INDEX: 'teachers:index',
  TEACHER: (uid) => `teachers:${uid}`,
  LOGS_INDEX: 'logs:index',
};

// ========================================
// 工具函數
// ========================================

let currentOrigin = ALLOWED_ORIGINS[0];

function json(data, status, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': currentOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      ...extraHeaders,
    },
  });
}

function cors() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': currentOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/** 驗證教師 API Key */
function isTeacher(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const key = env.API_KEY || CONFIG.API_KEY;
  return auth === `Bearer ${key}`;
}

/** 從 KV 讀取 JSON，不存在時返回預設值 */
async function kvGet(env, key, defaultValue = null) {
  try {
    const raw = await env.PHOTOS.get(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.error(`[KV] 讀取失敗 ${key}:`, e.message);
    return defaultValue;
  }
}

/** 寫入 JSON 到 KV */
async function kvPut(env, key, data) {
  try {
    await env.PHOTOS.put(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error(`[KV] 寫入失敗 ${key}:`, e.message);
    return false;
  }
}

/** 添加日誌 */
async function addLog(env, type, userId, message) {
  const logs = await kvGet(env, KEYS.LOGS_INDEX, []);
  logs.push({
    type,
    userId,
    message,
    timestamp: new Date().toISOString(),
  });
  // 只保留最近 500 條
  if (logs.length > 500) logs.splice(0, logs.length - 500);
  await kvPut(env, KEYS.LOGS_INDEX, logs);
}

/** 重新計算班級統計 */
async function recalcClassStats(env, className) {
  const students = await kvGet(env, KEYS.STUDENTS_INDEX, []);
  const classStudents = students.filter(s => s.class === className);
  const total = classStudents.length;

  // 從學生完成狀態計算
  let completed = 0;
  for (const s of classStudents) {
    const student = await kvGet(env, KEYS.STUDENT(s.studentId));
    if (student && student.completed) completed++;
  }

  const stats = {
    className,
    studentCount: total,
    completedCount: completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    updatedAt: new Date().toISOString(),
  };

  await kvPut(env, KEYS.CLASS(className), stats);

  // 更新 classes:index
  const classIndex = await kvGet(env, KEYS.CLASSES_INDEX, []);
  const idx = classIndex.findIndex(c => c.className === className);
  if (idx >= 0) {
    classIndex[idx] = stats;
  } else {
    classIndex.push(stats);
  }
  await kvPut(env, KEYS.CLASSES_INDEX, classIndex);

  return stats;
}

// ========================================
// 認證端點
// ========================================

/** POST /api/auth/teacher/login */
async function handleTeacherLogin(request, env) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return json({ error: '請輸入郵箱和密碼' }, 400);

    const teachers = await kvGet(env, KEYS.TEACHERS_INDEX, []);
    const teacher = teachers.find(t => t.email === email);
    if (!teacher) return json({ error: '帳號或密碼錯誤' }, 401);

    const teacherData = await kvGet(env, KEYS.TEACHER(teacher.uid));
    if (!teacherData || teacherData.password !== password) {
      return json({ error: '帳號或密碼錯誤' }, 401);
    }

    await addLog(env, 'login', teacher.uid, `${teacherData.name} 登入了教師後台`);

    return json({
      success: true,
      teacher: {
        uid: teacherData.uid,
        email: teacherData.email,
        name: teacherData.name,
        role: teacherData.role,
        token: env.API_KEY || CONFIG.API_KEY, // 前端存此 token 用於後續請求
      },
    });
  } catch (e) {
    return json({ error: '請求格式錯誤' }, 400);
  }
}

/** POST /api/auth/student/login */
async function handleStudentLogin(request, env) {
  try {
    const { className, name, password } = await request.json();
    if (!className || !name || !password) {
      return json({ error: '請填寫所有欄位' }, 400);
    }

    const students = await kvGet(env, KEYS.STUDENTS_INDEX, []);
    const matched = students.find(
      s => s.class === className && s.name === name && s.status === 'active'
    );

    if (!matched) return json({ error: '找不到此學生' }, 401);

    const student = await kvGet(env, KEYS.STUDENT(matched.studentId));
    if (!student || student.password !== password) {
      return json({ error: '學號不正確' }, 401);
    }

    await addLog(env, 'login', student.studentId, `${student.name} 登入了學生頁面`);

    return json({
      success: true,
      student: {
        studentId: student.studentId,
        studentName: student.name,
        studentClass: student.class,
        completed: student.completed || false,
      },
    });
  } catch (e) {
    return json({ error: '請求格式錯誤' }, 400);
  }
}

// ========================================
// 學生端點
// ========================================

/** GET /api/students */
async function handleGetAllStudents(request, env) {
  const students = await kvGet(env, KEYS.STUDENTS_INDEX, []);

  // 合併完成狀態
  const result = [];
  for (const s of students) {
    const detail = await kvGet(env, KEYS.STUDENT(s.studentId));
    result.push({
      studentId: s.studentId,
      name: s.name,
      class: s.class,
      completed: detail ? detail.completed : false,
      photoURL: detail ? (detail.photoURL || '') : '',
      photoLink: detail ? (detail.photoLink || '') : '',
      status: s.status,
    });
  }

  return json(result);
}

/** GET /api/students/:id */
async function handleGetStudent(request, env, studentId) {
  const student = await kvGet(env, KEYS.STUDENT(studentId));
  if (!student) return json({ error: '找不到此學生' }, 404);
  return json(student);
}

// ========================================
// 作品端點
// ========================================

/** GET /api/works */
async function handleGetAllWorks(request, env) {
  const url = new URL(request.url);
  const className = url.searchParams.get('class');

  let works;
  if (className) {
    works = await kvGet(env, KEYS.WORKS_BY_CLASS(className), []);
  } else {
    works = await kvGet(env, KEYS.WORKS_INDEX, []);
  }

  // 按 updatedAt 降序
  works.sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  });

  return json(works);
}

/** GET /api/works/:studentId */
async function handleGetWork(request, env, studentId) {
  const work = await kvGet(env, KEYS.WORK(studentId));
  if (!work) return json({ error: '找不到此作品' }, 404);
  return json(work);
}

/** POST /api/works */
async function handleSaveWork(request, env) {
  try {
    const workData = await request.json();
    const { studentId } = workData;

    if (!studentId) return json({ error: '缺少 studentId' }, 400);

    const now = new Date().toISOString();

    // 讀取現有作品（如果存在）
    const existing = await kvGet(env, KEYS.WORK(studentId));
    const createdAt = (existing && existing.createdAt) || now;

    const work = {
      studentId: workData.studentId,
      name: workData.name || '',
      class: workData.class || '',
      photoURL: workData.photoURL || '',
      photoLink: workData.photoLink || '',
      reason: workData.reason || '',
      completed: true,
      createdAt,
      updatedAt: now,
    };

    // 寫入作品
    await kvPut(env, KEYS.WORK(studentId), work);

    // 更新作品索引
    const worksIndex = await kvGet(env, KEYS.WORKS_INDEX, []);
    const idx = worksIndex.findIndex(w => w.studentId === studentId);
    const indexEntry = {
      studentId, name: work.name, class: work.class,
      photoURL: work.photoURL ? '__has_photo__' : '',
      createdAt: work.createdAt, updatedAt: work.updatedAt,
    };
    if (idx >= 0) {
      worksIndex[idx] = indexEntry;
    } else {
      worksIndex.push(indexEntry);
    }
    await kvPut(env, KEYS.WORKS_INDEX, worksIndex);

    // 更新班級作品索引
    if (work.class) {
      const classWorks = await kvGet(env, KEYS.WORKS_BY_CLASS(work.class), []);
      const cIdx = classWorks.findIndex(w => w.studentId === studentId);
      if (cIdx >= 0) {
        classWorks[cIdx] = indexEntry;
      } else {
        classWorks.push(indexEntry);
      }
      await kvPut(env, KEYS.WORKS_BY_CLASS(work.class), classWorks);
    }

    // 更新學生完成狀態
    const student = await kvGet(env, KEYS.STUDENT(studentId));
    if (student) {
      student.completed = true;
      student.photoURL = work.photoURL || student.photoURL || '';
      student.photoLink = work.photoLink || student.photoLink || '';
      student.reason = work.reason || student.reason || '';
      await kvPut(env, KEYS.STUDENT(studentId), student);

      // 更新學生索引中的 completed 標記
      const studentsIndex = await kvGet(env, KEYS.STUDENTS_INDEX, []);
      const sIdx = studentsIndex.findIndex(s => s.studentId === studentId);
      if (sIdx >= 0) {
        studentsIndex[sIdx].completed = true;
        await kvPut(env, KEYS.STUDENTS_INDEX, studentsIndex);
      }
    }

    // 更新班級統計
    if (work.class) {
      await recalcClassStats(env, work.class);
    }

    await addLog(env, 'upload', studentId, `${work.name} 上傳了作品`);

    return json({ success: true, work });
  } catch (e) {
    console.error('[API] 儲存作品失敗:', e.message);
    return json({ error: '儲存失敗: ' + e.message }, 500);
  }
}

/** DELETE /api/works/:studentId */
async function handleDeleteWork(request, env, studentId) {
  try {
    const work = await kvGet(env, KEYS.WORK(studentId));
    if (!work) return json({ error: '找不到此作品' }, 404);

    // 從索引移除
    const worksIndex = await kvGet(env, KEYS.WORKS_INDEX, []);
    await kvPut(env, KEYS.WORKS_INDEX, worksIndex.filter(w => w.studentId !== studentId));

    // 從班級索引移除
    if (work.class) {
      const classWorks = await kvGet(env, KEYS.WORKS_BY_CLASS(work.class), []);
      await kvPut(env, KEYS.WORKS_BY_CLASS(work.class),
        classWorks.filter(w => w.studentId !== studentId));
    }

    // 清除作品
    await env.PHOTOS.delete(KEYS.WORK(studentId));

    // 更新學生狀態為未完成
    const student = await kvGet(env, KEYS.STUDENT(studentId));
    if (student) {
      student.completed = false;
      student.photoURL = '';
      student.photoLink = '';
      student.reason = '';
      await kvPut(env, KEYS.STUDENT(studentId), student);
    }

    // 更新班級統計
    if (work.class) {
      await recalcClassStats(env, work.class);
    }

    await addLog(env, 'delete', studentId, `${work.name} 刪除了作品`);

    return json({ success: true });
  } catch (e) {
    console.error('[API] 刪除作品失敗:', e.message);
    return json({ error: '刪除失敗' }, 500);
  }
}

// ========================================
// 班級端點
// ========================================

/** GET /api/classes */
async function handleGetClasses(request, env) {
  const classes = await kvGet(env, KEYS.CLASSES_INDEX, []);
  classes.sort((a, b) => (a.className || '').localeCompare(b.className || ''));
  return json(classes);
}

// ========================================
// 統計端點
// ========================================

/** GET /api/stats/overview */
async function handleGetOverview(request, env) {
  const students = await kvGet(env, KEYS.STUDENTS_INDEX, []);
  const totalStudents = students.filter(s => s.status === 'active').length;
  const completedCount = students.filter(s => s.completed).length;

  return json({
    totalStudents,
    completedCount,
    incompleteCount: totalStudents - completedCount,
    completionRate: totalStudents > 0
      ? Math.round((completedCount / totalStudents) * 100)
      : 0,
  });
}

// ========================================
// 管理端點
// ========================================

/** POST /api/admin/init — 初始化 KV 數據（一次性） */
async function handleAdminInit(request, env) {
  if (!isTeacher(request, env)) return json({ error: '權限不足' }, 403);

  try {
    const { students, teachers } = await request.json();

    if (students && students.length > 0) {
      // 寫入學生索引
      const studentsIndex = students.map(s => ({
        studentId: s.studentId,
        name: s.name,
        class: s.class,
        status: s.status || 'active',
        completed: s.completed || false,
      }));
      await kvPut(env, KEYS.STUDENTS_INDEX, studentsIndex);

      // 寫入每個學生
      for (const s of students) {
        await kvPut(env, KEYS.STUDENT(s.studentId), {
          studentId: s.studentId,
          name: s.name,
          class: s.class,
          password: s.password || s.studentId,
          completed: s.completed || false,
          photoURL: s.photoURL || '',
          photoLink: s.photoLink || '',
          reason: s.reason || '',
          status: s.status || 'active',
        });
      }

      // 計算班級統計
      const classMap = {};
      students.forEach(s => {
        if (!classMap[s.class]) classMap[s.class] = { total: 0, completed: 0 };
        classMap[s.class].total++;
        if (s.completed) classMap[s.class].completed++;
      });

      const classesIndex = Object.entries(classMap).map(([className, data]) => ({
        className,
        studentCount: data.total,
        completedCount: data.completed,
        completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
        updatedAt: new Date().toISOString(),
      }));
      await kvPut(env, KEYS.CLASSES_INDEX, classesIndex);

      // 寫入每個班級
      for (const c of classesIndex) {
        await kvPut(env, KEYS.CLASS(c.className), c);
      }

      console.log(`[Admin] ✅ 已初始化 ${students.length} 名學生、${classesIndex.length} 個班級`);
    }

    // 寫入教師
    if (teachers && teachers.length > 0) {
      const teachersIndex = teachers.map(t => ({
        uid: t.uid,
        name: t.name,
        email: t.email,
        role: t.role || 'teacher',
      }));
      await kvPut(env, KEYS.TEACHERS_INDEX, teachersIndex);

      for (const t of teachers) {
        await kvPut(env, KEYS.TEACHER(t.uid), t);
      }

      console.log(`[Admin] ✅ 已初始化 ${teachers.length} 名教師`);
    }

    // 初始化空的索引
    await kvPut(env, KEYS.WORKS_INDEX, []);
    await kvPut(env, KEYS.LOGS_INDEX, []);

    return json({
      success: true,
      studentsCount: students ? students.length : 0,
      teachersCount: teachers ? teachers.length : 0,
    });
  } catch (e) {
    console.error('[Admin] 初始化失敗:', e.message);
    return json({ error: '初始化失敗: ' + e.message }, 500);
  }
}

// ========================================
// 圖片端點（保留原有功能）
// ========================================

/** POST /api/upload — 上傳圖片到 KV */
async function handleUpload(request, env) {
  const formData = await request.formData();
  const file = formData.get('file');
  const className = formData.get('class') || 'unknown';
  const studentId = formData.get('studentId') || 'unknown';

  if (!file) return json({ error: '缺少檔案' }, 400);
  if (file.size > CONFIG.MAX_SIZE) return json({ error: '檔案過大，上限 10MB' }, 400);

  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`;

  const key = `${className}/${studentId}/${Date.now()}.jpg`;
  await env.PHOTOS.put(key, dataUrl, {
    metadata: { className, studentId, contentType: file.type, size: file.size },
  });

  const url = `https://YOUR_WORKER_DOMAIN.workers.dev/api/photos/${key}`;
  console.log(`[Worker] ✅ 已儲存圖片: ${key} (${(dataUrl.length / 1024).toFixed(1)}KB)`);

  return json({ success: true, url, key });
}

/** GET /api/photos/:key — 瀏覽器顯示圖片 */
async function handleGetPhoto(request, env) {
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace('/api/photos/', ''));
  if (!key) return json({ error: '缺少 key' }, 400);

  const dataUrl = await env.PHOTOS.get(key);
  if (!dataUrl) return json({ error: '找不到圖片' }, 404);

  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Photo</title><style>body{margin:0;display:flex;justify-content:center;background:#000}</style></head><body><img src="${dataUrl}" style="max-width:100%;max-height:100vh" alt="學生作品" /></body></html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  );
}

/** GET /api/raw/:key — 返回 raw base64（給前端 img src 使用） */
async function handleGetPhotoRaw(request, env) {
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace('/api/raw/', ''));
  if (!key) return json({ error: '缺少 key' }, 400);

  const dataUrl = await env.PHOTOS.get(key);
  if (!dataUrl) return json({ error: '找不到圖片' }, 404);

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
  currentOrigin = getAllowedOrigin(request);
  const url = new URL(request.url);
  const method = request.method;
  const path = url.pathname;

  if (method === 'OPTIONS') return cors();

  try {
    // ─── 健康檢查 ───
    if ((method === 'GET') && (path === '/api/health' || path === '/')) {
      return json({ status: 'ok', storage: 'KV', version: '3.0.0' });
    }

    // ─── 認證 ───
    if (method === 'POST' && path === '/api/auth/teacher/login') {
      return await handleTeacherLogin(request, env);
    }
    if (method === 'POST' && path === '/api/auth/student/login') {
      return await handleStudentLogin(request, env);
    }

    // ─── 學生 ───
    if (method === 'GET' && path === '/api/students') {
      if (!isTeacher(request, env)) return json({ error: '權限不足' }, 403);
      return await handleGetAllStudents(request, env);
    }
    if (method === 'GET' && path.startsWith('/api/students/')) {
      const studentId = decodeURIComponent(path.replace('/api/students/', ''));
      return await handleGetStudent(request, env, studentId);
    }

    // ─── 作品 ───
    if (method === 'GET' && path === '/api/works') {
      if (!isTeacher(request, env)) return json({ error: '權限不足' }, 403);
      return await handleGetAllWorks(request, env);
    }
    if (method === 'GET' && path.startsWith('/api/works/')) {
      const studentId = decodeURIComponent(path.replace('/api/works/', ''));
      return await handleGetWork(request, env, studentId);
    }
    if (method === 'POST' && path === '/api/works') {
      return await handleSaveWork(request, env);
    }
    if (method === 'DELETE' && path.startsWith('/api/works/')) {
      if (!isTeacher(request, env)) return json({ error: '權限不足' }, 403);
      const studentId = decodeURIComponent(path.replace('/api/works/', ''));
      return await handleDeleteWork(request, env, studentId);
    }

    // ─── 班級 ───
    if (method === 'GET' && path === '/api/classes') {
      if (!isTeacher(request, env)) return json({ error: '權限不足' }, 403);
      return await handleGetClasses(request, env);
    }

    // ─── 統計 ───
    if (method === 'GET' && path === '/api/stats/overview') {
      return await handleGetOverview(request, env);
    }

    // ─── 管理端點 ───
    if (method === 'POST' && path === '/api/admin/init') {
      return await handleAdminInit(request, env);
    }

    // ─── 圖片（保留原有端點）───
    if (method === 'POST' && path === '/api/upload') {
      return await handleUpload(request, env);
    }
    if (method === 'GET' && path.startsWith('/api/photos/')) {
      return await handleGetPhoto(request, env);
    }
    if (method === 'GET' && path.startsWith('/api/raw/')) {
      return await handleGetPhotoRaw(request, env);
    }

    return json({ error: 'Not Found' }, 404);
  } catch (e) {
    console.error('[Worker] 錯誤:', e.message, e.stack);
    return json({ error: '伺服器錯誤: ' + e.message }, 500);
  }
}

export default { fetch: route };
