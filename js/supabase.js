/**
 * Star Photo Share System
 * Supabase 数据库操作封装
 * Version 1.0
 * 2026-08-05
 *
 * 功能：Database CRUD、Storage 上传下载、学生验证、日志记录
 * 所有 Supabase 操作统一通过此模块
 * 保留 localStorage 降级方案（Supabase 不可用时自动切换）
 */

// ========================================
// 命名空间
// ========================================
window.SPSS = window.SPSS || {};

// ========================================
// 获取 Supabase 客户端
// ========================================
function getSupabase() {
  return window.SPSS.supabaseClient || null;
}

/**
 * 检查 Supabase 是否可用
 * @returns {boolean}
 */
function isSupabaseAvailable() {
  return !!(window.SPSS.supabaseClient);
}

// ========================================
// localStorage 降级方案（当 Supabase 未配置或失败时使用）
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

/**
 * 从 localStorage 读取 JSON 资料
 */
function ldbGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('[LDB] 读取失败:', key, e);
    return null;
  }
}

/**
 * 写入 JSON 资料到 localStorage
 */
function ldbSet(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('[LDB] 写入失败（可能超出容量）:', key, e);
  }
}

/**
 * 删除 localStorage 资料
 */
function ldbRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('[LDB] 删除失败:', key, e);
  }
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
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function ldbGetWorksByClass(className) {
  return ldbGetAllWorks().filter(w => w.class === className)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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
  logs.push({
    type, userId, message,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  });
  if (logs.length > 200) logs.splice(0, logs.length - 200);
  ldbSet(LDB_KEYS.LOGS, logs);
}

// ========================================
// 学生相关操作
// ========================================

/**
 * 根据班级获取学生列表
 * @param {string} className - 班级名称
 * @returns {Promise<Array>} 学生数组
 */
async function getStudentsByClass(className) {
  let cloudStudents = null;

  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from(TABLES.STUDENTS)
        .select('*')
        .eq('class', className)
        .eq('status', 'active')
        .order('name');

      if (!error && data) {
        cloudStudents = data.map(row => ({ id: row.student_id || row.id, ...row }));
      }
    } catch (error) {
      console.warn('[Supabase] 获取班级学生失败，尝试本地:', error.message);
    }
  }

  if (cloudStudents && cloudStudents.length > 0) return cloudStudents;

  // localStorage 降级
  try {
    const response = await fetch('data/students.json');
    if (response.ok) {
      let students = await response.json();
      const statusMap = ldbGetAllStudentStatus();
      const result = students
        .filter(s => s.class === className)
        .map(s => {
          const status = statusMap[s.studentId];
          if (status) return { ...s, ...status, id: s.studentId };
          return { ...s, id: s.studentId };
        })
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return result;
    }
  } catch (e) {
    console.warn('[LDB] 本地学生读取失败:', e);
  }

  return [];
}

/**
 * 获取所有班级
 * @returns {Promise<Array>} 班级名称数组
 */
async function getAllClasses() {
  let cloudClasses = null;

  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from(TABLES.STUDENTS)
        .select('class')
        .eq('status', 'active');

      if (!error && data) {
        const classSet = new Set(data.map(row => row.class).filter(Boolean));
        cloudClasses = Array.from(classSet).sort();
      }
    } catch (error) {
      console.warn('[Supabase] 获取班级列表失败，尝试本地:', error.message);
    }
  }

  if (cloudClasses && cloudClasses.length > 0) return cloudClasses;

  try {
    const response = await fetch('data/students.json');
    if (response.ok) {
      const students = await response.json();
      const classSet = new Set(students.map(s => s.class));
      return Array.from(classSet).sort();
    }
  } catch (e) {
    console.warn('[LDB] 本地班级读取失败:', e);
  }

  return [];
}

/**
 * 学生登入验证
 * @param {string} className - 班级
 * @param {string} name - 姓名
 * @param {string} password - 学号（密码）
 * @returns {Promise<object|null>} 学生数据或 null
 */
async function verifyStudentLogin(className, name, password) {
  try {
    if (isSupabaseAvailable()) {
      const sb = getSupabase();
      const { data, error } = await sb
        .from(TABLES.STUDENTS)
        .select('*')
        .eq('class', className)
        .eq('name', name)
        .eq('status', 'active')
        .single();

      if (error || !data) return null;
      if (data.password !== password) return null;

      // 更新最后登入时间
      await sb.from(TABLES.STUDENTS).update({ last_login: new Date().toISOString() })
        .eq('student_id', data.student_id);

      return { id: data.student_id || data.id, ...data };
    }
  } catch (error) {
    console.error('[Supabase] 学生登录验证失败:', error);
    throw error;
  }

  // localStorage 降级
  try {
    const response = await fetch('data/students.json');
    if (response.ok) {
      const students = await response.json();
      const student = students.find(s => s.class === className && s.name === name && s.studentId);
      if (student && student.password === password) return student;
    }
  } catch (e) {}
  return null;
}

/**
 * 获取单个学生资料
 * @param {string} studentId - 学号
 * @returns {Promise<object|null>}
 */
async function getStudentById(studentId) {
  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from(TABLES.STUDENTS)
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (!error && data) return { id: data.student_id || data.id, ...data };
    } catch (error) {
      console.warn('[Supabase] 获取学生资料失败，尝试本地:', error.message);
    }
  }

  // localStorage 降级
  try {
    const response = await fetch('data/students.json');
    if (response.ok) {
      const students = await response.json();
      const student = students.find(s => s.studentId === studentId);
      if (student) {
        const status = ldbGetStudentStatus(studentId);
        return {
          id: studentId,
          ...student,
          ...(status || {}),
          completed: status ? status.completed : (student.completed || false)
        };
      }
    }
  } catch (e) { /* 忽略 */ }

  return null;
}

/**
 * 更新学生完成状态
 * @param {string} studentId - 学号
 * @param {boolean} completed - 是否完成
 * @param {object} data - 其他更新数据
 * @returns {Promise<void>}
 */
async function updateStudentStatus(studentId, completed, data = {}) {
  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      const updateData = {
        completed,
        upload_time: completed ? new Date().toISOString() : null,
        ...data
      };
      await sb.from(TABLES.STUDENTS).update(updateData).eq('student_id', studentId);
      return;
    } catch (error) {
      console.warn('[Supabase] 更新学生状态失败，降级到本地:', error.message);
    }
  }
  ldbUpdateStudentStatus(studentId, completed, data);
}

// ========================================
// 作品相关操作
// ========================================

/**
 * 获取学生作品
 * @param {string} studentId - 学号
 * @returns {Promise<object|null>}
 */
async function getStudentWork(studentId) {
  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from(TABLES.WORKS)
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (!error && data) return { id: data.student_id || data.id, ...data };
    } catch (error) {
      console.warn('[Supabase] 获取作品失败，尝试本地:', error.message);
    }
  }

  const work = ldbGetWork(studentId);
  return work ? { id: studentId, ...work } : null;
}

/**
 * 保存学生作品
 * @param {string} studentId - 学号
 * @param {object} workData - 作品数据
 * @returns {Promise<void>}
 */
async function saveWork(studentId, workData) {
  const now = new Date().toISOString();
  const doc = {
    student_id: workData.studentId,
    name: workData.name,
    class: workData.class,
    photo_url: workData.photoURL || '',
    photo_link: workData.photoLink || '',
    reason: workData.reason || '',
    completed: true,
    created_at: workData.createdAt || now,
    updated_at: now
  };

  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();

      // UPSERT 作品
      const { error: upsertError } = await sb
        .from(TABLES.WORKS)
        .upsert(doc, { onConflict: 'student_id' });

      if (!upsertError) {
        // ✅ 同步更新 students 表的 completed 状态
        const { error: studentError } = await sb
          .from(TABLES.STUDENTS)
          .update({
            completed: true,
            upload_time: now,
            photo_url: doc.photo_url,
            photo_link: doc.photo_link,
            reason: doc.reason,
            updated_at: now
          })
          .eq('student_id', studentId);

        if (studentError) {
          console.warn('[Supabase] 更新学生状态失败:', studentError.message);
        }

        // ✅ 重新计算班级统计
        if (workData.class) {
          const { error: statsError } = await updateClassStats(workData.class);
          if (statsError) {
            console.warn('[Supabase] 更新班级统计失败:', statsError.message);
          }
        }

        await addLog('upload', studentId, `${workData.name} 上传了作品`);
        console.log('[Supabase] ✅ 云端储存成功:', studentId);
        ldbSaveWork(studentId, workData);
        return;
      }
      console.warn('[Supabase] Upsert 失败，降级到本地:', upsertError.message);
    } catch (error) {
      console.warn('[Supabase] 储存失败，存本地:', error.message);
    }
  }

  // localStorage 备份
  ldbSaveWork(studentId, workData);
  ldbUpdateStudentStatus(studentId, true, {
    photoURL: workData.photoURL || '', photoLink: workData.photoLink || '', reason: workData.reason || ''
  });
  if (workData.class) {
    let allStudents = [];
    try { const r = await fetch('data/students.json'); if (r.ok) allStudents = await r.json(); } catch (e) {}
    ldbUpdateClassStats(workData.class, allStudents);
  }
  ldbAddLog('upload', studentId, `${workData.name} 上传了作品`);
  console.log('[SPSS] 作品已储存:', studentId);

  // 后台持续重试 Supabase 同步
  if (isSupabaseAvailable()) {
    const retrySync = async (retries = 5) => {
      for (let i = 0; i < retries; i++) {
        await new Promise(r => setTimeout(r, 3000 * (i + 1)));
        try {
          const sb = getSupabase();
          await sb.from(TABLES.WORKS).upsert(doc, { onConflict: 'student_id' });
          try { await updateStudentStatus(studentId, true, doc); } catch (e) {}
          if (workData.class) { try { await updateClassStats(workData.class); } catch (e) {} }
          console.log('[Supabase] ✅ 后台同步成功:', studentId);
          return;
        } catch (e) { console.warn('[Supabase] 后台同步重试 ' + (i + 1) + '/' + retries + ' 失败: ' + e.message); }
      }
    };
    retrySync();
  }
}

/**
 * 删除学生作品
 * @param {string} studentId - 学号
 * @param {string} photoURL - 图片 URL
 * @returns {Promise<void>}
 */
async function deleteWork(studentId, photoURL) {
  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();

      // 删除作品
      await sb.from(TABLES.WORKS).delete().eq('student_id', studentId);

      // 更新学生状态
      await updateStudentStatus(studentId, false, { photoURL: '', photoLink: '', reason: '' });

      // 删除 Storage 图片
      if (photoURL && photoURL.startsWith('data:')) {
        // base64 存储的图片不删除（已在数据中）
      } else if (photoURL) {
        try {
          await deleteImage(photoURL);
        } catch (e) {
          console.warn('[Supabase] 删除 Storage 图片失败:', e);
        }
      }

      await addLog('delete', studentId, `学生删除了作品`);
      console.log('[Supabase] 作品已从云端删除:', studentId);
      return;
    } catch (error) {
      console.warn('[Supabase] 云端删除失败，降级到本地:', error.message);
    }
  }

  const work = ldbGetWork(studentId);
  ldbDeleteWork(studentId);
  ldbUpdateStudentStatus(studentId, false, { photoURL: '', photoLink: '', reason: '' });
  let allStudents = [];
  try { const r = await fetch('data/students.json'); if (r.ok) allStudents = await r.json(); } catch (e) {}
  if (work && work.class) ldbUpdateClassStats(work.class, allStudents);
  ldbAddLog('delete', studentId, `学生删除了作品（本地）`);
}

// ========================================
// 班级作品查询
// ========================================

/**
 * 根据班级获取所有作品
 * @param {string} className - 班级名称
 * @returns {Promise<Array>}
 */
async function getWorksByClass(className) {
  let cloudWorks = null;

  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from(TABLES.WORKS)
        .select('*')
        .eq('class', className)
        .order('name');

      if (!error && data) {
        cloudWorks = data.map(row => ({ id: row.student_id || row.id, ...row }));
      }
    } catch (error) {
      console.warn('[Supabase] 获取班级作品失败，尝试本地:', error.message);
    }
  }

  if (cloudWorks && cloudWorks.length > 0) return cloudWorks;

  const localWorks = ldbGetWorksByClass(className);
  console.log('[LDB] 从本地读取' + className + '作品:', localWorks.length, '件');
  return localWorks;
}

/**
 * 获取所有作品
 * @returns {Promise<Array>}
 */
async function getAllWorks() {
  let cloudWorks = null;

  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from(TABLES.WORKS)
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        cloudWorks = data.map(row => ({ id: row.student_id || row.id, ...row }));
      }
    } catch (error) {
      console.warn('[Supabase] 获取所有作品失败，尝试本地:', error.message);
    }
  }

  if (cloudWorks && cloudWorks.length > 0) return cloudWorks;

  const localWorks = ldbGetAllWorks();
  console.log('[LDB] 从本地读取作品:', localWorks.length, '件');
  return localWorks;
}

// ========================================
// 班级统计操作
// ========================================

/**
 * 更新班级统计
 * @param {string} className - 班级名称
 * @returns {Promise<void>}
 */
async function updateClassStats(className) {
  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();

      const { data: students, error } = await sb
        .from(TABLES.STUDENTS)
        .select('student_id, completed')
        .eq('class', className)
        .eq('status', 'active');

      if (error) throw error;

      const totalCount = students ? students.length : 0;
      let completedCount = students ? students.filter(s => s.completed).length : 0;
      const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      await sb.from(TABLES.CLASSES).upsert({
        class_name: className,
        student_count: totalCount,
        completed_count: completedCount,
        completion_rate: completionRate,
        updated_at: new Date().toISOString()
      }, { onConflict: 'class_name' });
      return;
    } catch (error) {
      console.warn('[Supabase] 更新班级统计失败，降级到本地:', error.message);
    }
  }

  let allStudents = [];
  try { const r = await fetch('data/students.json'); if (r.ok) allStudents = await r.json(); } catch (e) {}
  ldbUpdateClassStats(className, allStudents);
}

/**
 * 获取班级统计
 * @param {string} className - 班级名称
 * @returns {Promise<object|null>}
 */
async function getClassStats(className) {
  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from(TABLES.CLASSES)
        .select('*')
        .eq('class_name', className)
        .single();

      if (!error && data) return { id: data.class_name, ...data };
    } catch (error) {
      console.warn('[Supabase] 获取班级统计失败，尝试本地:', error.message);
    }
  }

  const stats = ldbGet(LDB_KEYS.CLASS_STATS) || {};
  if (stats[className]) return stats[className];

  try {
    const response = await fetch('data/students.json');
    if (response.ok) {
      const students = await response.json();
      const classStudents = students.filter(s => s.class === className);
      const statusMap = ldbGetAllStudentStatus();
      let completedCount = 0;
      classStudents.forEach(s => {
        const status = statusMap[s.studentId];
        if (status && status.completed) completedCount++;
      });
      return {
        className,
        studentCount: classStudents.length,
        completedCount,
        completionRate: classStudents.length > 0
          ? Math.round((completedCount / classStudents.length) * 100) : 0
      };
    }
  } catch (e) { /* 忽略 */ }

  return null;
}

/**
 * 获取所有班级统计
 * @returns {Promise<Array>}
 */
async function getAllClassStats() {
  let cloudStats = null;

  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from(TABLES.CLASSES)
        .select('*')
        .order('class_name');

      if (!error && data) {
        cloudStats = data.map(row => ({ id: row.class_name, ...row }));
      }
    } catch (error) {
      console.warn('[Supabase] 获取所有班级统计失败，尝试本地:', error.message);
    }
  }

  if (cloudStats && cloudStats.length > 0) return cloudStats;

  // 从 JSON 补全所有班级
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
      const merged = Object.entries(classMap).map(([className, data]) => {
        const ldbStats = ldbGetAllClassStats();
        const ldb = ldbStats.find(cs => cs.className === className);
        return {
          className,
          studentCount: data.total,
          completedCount: ldb ? Math.max(data.completed, ldb.completedCount || 0) : data.completed,
          completionRate: 0
        };
      });
      merged.forEach(c => {
        c.completionRate = c.studentCount > 0 ? Math.round((c.completedCount / c.studentCount) * 100) : 0;
      });
      return merged.sort((a, b) => a.className.localeCompare(b.className));
    }
  } catch (e) {
    console.warn('[LDB] 班级统计计算失败:', e);
  }

  return [];
}

// ========================================
// 统计总览
// ========================================

/**
 * 获取系统概览统计
 * @returns {Promise<object>}
 */
async function getOverviewStats() {
  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      const { data: students, error } = await sb
        .from(TABLES.STUDENTS)
        .select('student_id, completed')
        .eq('status', 'active');

      if (!error && students) {
        const totalStudents = students.length;
        const completedCount = students.filter(s => s.completed).length;
        return {
          totalStudents,
          completedCount,
          incompleteCount: totalStudents - completedCount,
          completionRate: totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0
        };
      }
    } catch (error) {
      console.warn('[Supabase] 获取概览统计失败，尝试本地:', error.message);
    }
  }

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
  } catch (e) {
    console.warn('[LDB] 本地统计失败:', e);
  }

  return { totalStudents: 0, completedCount: 0, incompleteCount: 0, completionRate: 0 };
}

// ========================================
// 搜索
// ========================================

/**
 * 搜索学生
 * @param {string} query - 搜索关键词
 * @returns {Promise<Array>}
 */
async function searchStudents(query) {
  let cloudStudents = null;

  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from(TABLES.STUDENTS)
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (!error && data) {
        const keyword = query.toLowerCase();
        cloudStudents = data
          .map(row => ({ id: row.student_id || row.id, ...row }))
          .filter(s =>
            (s.name || '').toLowerCase().includes(keyword) ||
            (s.studentId || '').includes(keyword) ||
            (s.class || '').includes(keyword)
          );
      }
    } catch (error) {
      console.warn('[Supabase] 搜索学生失败，尝试本地:', error.message);
    }
  }

  if (cloudStudents && cloudStudents.length > 0) return cloudStudents;

  try {
    const response = await fetch('data/students.json');
    if (response.ok) {
      let students = await response.json();
      const statusMap = ldbGetAllStudentStatus();
      students = students.map(s => {
        const status = statusMap[s.studentId];
        if (status) return { ...s, ...status, id: s.studentId };
        return { ...s, id: s.studentId };
      });
      const keyword = query.toLowerCase();
      return students.filter(s =>
        (s.name || '').toLowerCase().includes(keyword) ||
        (s.studentId || '').includes(keyword) ||
        (s.class || '').includes(keyword)
      );
    }
  } catch (e) {
    console.warn('[LDB] 本地学生搜索失败:', e);
  }

  return [];
}

/**
 * 将中文班级名转换为 ASCII 路径（Supabase Storage 不支持中文路径）
 * @param {string} className - 班级名称，如 "初二忠"
 * @returns {string} ASCII 路径，如 "class-02-zhong"
 */
function classNameToStoragePath(className) {
  if (!className) return 'default';
  // 映射常见中文班级名为 ASCII
  const classMap = {
    '初二忠': 'class-02-zhong',
    '初二孝': 'class-02-xiao',
    '初二仁': 'class-02-ren',
    '初二爱': 'class-02-ai',
    '初三忠': 'class-03-zhong',
    '初三孝': 'class-03-xiao',
    '初三仁': 'class-03-ren',
    '初三爱': 'class-03-ai'
  };
  return classMap[className] || className.replace(/[^\w\s-]/g, '').toLowerCase().replace(/\s+/g, '-');
}

// ========================================
// Storage 操作
// ========================================

/**
 * 上传图片 — Supabase Storage 优先，失败时降级到 base64
 *
 * 路径 A：Supabase Storage → 返回下载 URL
 * 路径 B：base64 直存（Storage 不可用时）
 *
 * @param {File} file - 图片文件
 * @param {string} className - 班级
 * @param {string} studentId - 学号
 * @param {Function} onProgress - 进度回调 (percentage)
 * @returns {Promise<string>} Storage 下载 URL 或 base64 data URL
 */
async function uploadImage(file, className, studentId, onProgress) {
  if (onProgress) onProgress(5);

  // 路径 A：Supabase Storage
  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      if (sb) {
        const extension = file.name.split('.').pop().toLowerCase();
        // ⚠️ 重要：使用 ASCII 路径，避免 Supabase Storage 中文路径问题
        const classPath = classNameToStoragePath(className);
        const path = `images/${classPath}/${studentId}/photo_${Date.now()}.${extension}`;

        // 上传到 Supabase Storage
        const { data, error } = await sb.storage
          .from('images')
          .upload(path, file, {
            upsert: true,
            cacheControl: '3600'
          });

        if (error) throw error;

        // 获取公开 URL
        const { data: urlData } = sb.storage.from('images').getPublicUrl(path);
        if (onProgress) onProgress(100);
        console.log('[Storage] ✅ 上传成功:', urlData.publicUrl.substring(0, 60) + '...');
        return urlData.publicUrl;
      }
    } catch (storageError) {
      console.warn('[Storage] Supabase Storage 失败，降级到 base64:', storageError.message);
    }
  }

  // 路径 B：base64 降级（跨设备可存取）
  if (onProgress) onProgress(50);
  try {
    const base64 = await fileToBase64(file);
    if (onProgress) onProgress(100);
    console.log('[Storage] ⚠️ 降级 base64:', studentId, '-', (base64.length / 1024).toFixed(1) + 'KB');
    return base64;
  } catch (e) {
    console.error('[Storage] base64 编码失败:', e.message);
    throw new Error('图片处理失败');
  }
}

/**
 * 将 File 转换为 base64 字符串
 * @param {File} file - 图片文件
 * @returns {Promise<string>} base64 资料 URL
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('档案读取失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 从 Storage 删除图片
 * @param {string} photoURL - 图片下载 URL
 * @returns {Promise<void>}
 */
async function deleteImage(photoURL) {
  if (!isSupabaseAvailable()) return;
  try {
    const sb = getSupabase();
    // 从 URL 反推路径（格式：images/{class-path}/{studentId}/photo_{timestamp}.ext）
    const urlObj = new URL(photoURL);
    const path = urlObj.pathname.split('/storage/v1/object/public/images/')[1];
    if (path) {
      await sb.storage.from('images').remove([path]);
      console.log('[Storage] ✅ 删除成功:', path);
    }
  } catch (error) {
    console.error('[Storage] 删除图片失败:', error);
    throw error;
  }
}

// ========================================
// 教师认证
// ========================================

/**
 * 教师登入
 * @param {string} email - 邮箱
 * @param {string} password - 密码
 * @returns {Promise<object>} 用户对象
 */
async function teacherLogin(email, password) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      throw new Error('邮箱或密码错误');
    }

    // 检查是否为教师
    const { data: teacherDoc, error: teacherError } = await sb
      .from(TABLES.TEACHERS)
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (teacherError || !teacherDoc) {
      await sb.auth.signOut();
      throw new Error('您不是注册教师');
    }

    if (!['teacher', 'admin'].includes(teacherDoc.role)) {
      await sb.auth.signOut();
      throw new Error('权限不足');
    }

    // 更新最后登入
    await sb.from(TABLES.TEACHERS).update({ last_login: new Date().toISOString() })
      .eq('id', data.user.id);

    return {
      uid: data.user.id,
      email: data.user.email,
      ...teacherDoc
    };
  } catch (error) {
    console.error('[Supabase] 教师登录失败:', error);
    throw error;
  }
}

/**
 * 教师登出
 * @returns {Promise<void>}
 */
async function teacherLogout() {
  try {
    const sb = getSupabase();
    await sb.auth.signOut();
  } catch (error) {
    console.error('[Supabase] 教师登出失败:', error);
    throw error;
  }
}

/**
 * 获取当前教师信息
 * @returns {Promise<object|null>}
 */
async function getCurrentTeacher() {
  try {
    const sb = getSupabase();
    const { data: { user } } = await sb.auth.getUser();

    if (!user) return null;

    const { data, error } = await sb
      .from(TABLES.TEACHERS)
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !data) return null;

    return {
      uid: user.id,
      email: user.email,
      ...data
    };
  } catch (error) {
    console.error('[Supabase] 获取教师信息失败:', error);
    return null;
  }
}

// ========================================
// 日志记录
// ========================================

/**
 * 添加操作日志
 * @param {string} type - 操作类型: login/upload/delete/modify
 * @param {string} userId - 用户 ID
 * @param {string} message - 日志信息
 * @returns {Promise<void>}
 */
async function addLog(type, userId, message) {
  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      await sb.from(TABLES.LOGS).insert({
        type,
        user_id: userId,
        message,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent
      });
      return;
    } catch (error) {
      console.warn('[Supabase] 记录日志失败:', error);
    }
  }
  ldbAddLog(type, userId, message);
}

// ========================================
// 公告操作
// ========================================

/**
 * 获取最新公告
 * @param {number} limit - 条数限制
 * @returns {Promise<Array>}
 */
async function getAnnouncements(limit = 5) {
  if (!isSupabaseAvailable()) return [];
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from(TABLES.ANNOUNCEMENTS)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    return data.map(row => ({ id: row.id, ...row }));
  } catch (error) {
    console.error('[Supabase] 获取公告失败:', error);
    return [];
  }
}

// ========================================
// 实时监听 works 集合（替代旧版 Firestore onSnapshot）
// ========================================

/**
 * 订阅作品实时更新
 * @param {Function} callback - 数据变更时的回调函数
 * @returns {Function} 取消订阅函数
 */
function subscribeWorks(callback) {
  if (!isSupabaseAvailable()) {
    console.warn('[Supabase] 未初始化，无法订阅实时数据');
    return () => {};
  }

  try {
    const sb = getSupabase();
    const subscription = sb
      .channel('works_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: TABLES.WORKS },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase] 🔄 实时监听已启动');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Supabase] 实时监听连接失败，使用轮询备用');
        }
      });

    return () => {
      sb.removeChannel(subscription);
      console.log('[Supabase] 实时监听已关闭');
    };
  } catch (error) {
    console.warn('[Supabase] 无法启动实时监听:', error.message);
    return () => {};
  }
}

// ========================================
// 导出到全局
// ========================================
window.SPSS.getSupabase = getSupabase;
window.SPSS.isSupabaseAvailable = isSupabaseAvailable;
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
window.SPSS.updateClassStats = updateClassStats;
window.SPSS.getClassStats = getClassStats;
window.SPSS.getAllClassStats = getAllClassStats;
window.SPSS.getOverviewStats = getOverviewStats;
window.SPSS.searchStudents = searchStudents;
window.SPSS.uploadImage = uploadImage;
window.SPSS.deleteImage = deleteImage;
window.SPSS.teacherLogin = teacherLogin;
window.SPSS.teacherLogout = teacherLogout;
window.SPSS.getCurrentTeacher = getCurrentTeacher;
window.SPSS.addLog = addLog;
window.SPSS.getAnnouncements = getAnnouncements;
window.SPSS.subscribeWorks = subscribeWorks;

console.log('[SPSS] Supabase 模块已加载（含 localStorage 降级方案）');
