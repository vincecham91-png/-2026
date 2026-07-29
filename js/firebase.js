/**
 * Star Photo Share System
 * Firebase JS - Firebase 数据库操作封装
 * Version 1.0
 * 2026-07-17
 *
 * 功能：Firestore CRUD、Storage 上传下载、学生验证、日志记录
 * 所有 Firebase 操作统一通过此模块
 */

// ========================================
// 命名空间
// ========================================
window.SPSS = window.SPSS || {};

// ========================================
// Firestore 操作封装
// ========================================

/**
 * 获取 Firestore 实例
 * @returns {firebase.firestore.Firestore}
 */
function getFirestore() {
  return window.SPSS.firestoreDB || null;
}

/**
 * 获取 Storage 实例
 * @returns {firebase.storage.Storage|null}
 */
function getStorage() {
  return window.SPSS.firebaseStorage || null;
}

/**
 * 获取 Auth 实例
 * @returns {firebase.auth.Auth|null}
 */
function getAuth() {
  return window.SPSS.firebaseAuth || null;
}

// ========================================
// localStorage 降級方案（當 Firebase 未配置或失敗時使用）
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
 * 從 localStorage 讀取 JSON 資料
 * @param {string} key - 儲存鍵
 * @returns {*} 解析後的資料，失敗回傳 null
 */
function ldbGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('[LDB] 讀取失敗:', key, e);
    return null;
  }
}

/**
 * 寫入 JSON 資料到 localStorage
 * @param {string} key - 儲存鍵
 * @param {*} data - 要儲存的資料
 */
function ldbSet(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('[LDB] 寫入失敗（可能超出容量）:', key, e);
  }
}

/**
 * 刪除 localStorage 資料
 * @param {string} key - 儲存鍵
 */
function ldbRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('[LDB] 刪除失敗:', key, e);
  }
}

/**
 * 獲取所有作品的 studentId 索引
 * @returns {Array<string>}
 */
function ldbGetWorksIndex() {
  return ldbGet(LDB_KEYS.WORKS_INDEX) || [];
}

/**
 * 更新作品索引（加入新的 studentId）
 * @param {string} studentId
 */
function ldbAddToWorksIndex(studentId) {
  const index = ldbGetWorksIndex();
  if (!index.includes(studentId)) {
    index.push(studentId);
    ldbSet(LDB_KEYS.WORKS_INDEX, index);
  }
}

/**
 * 從作品索引中移除 studentId
 * @param {string} studentId
 */
function ldbRemoveFromWorksIndex(studentId) {
  const index = ldbGetWorksIndex().filter(id => id !== studentId);
  ldbSet(LDB_KEYS.WORKS_INDEX, index);
}

/**
 * 儲存單個作品到 localStorage
 * @param {string} studentId
 * @param {object} workData
 */
function ldbSaveWork(studentId, workData) {
  const data = {
    ...workData,
    // 將 Firebase Timestamp 轉為 ISO 字串以便序列化
    createdAt: workData.createdAt ? (workData.createdAt.toDate ? workData.createdAt.toDate().toISOString() : workData.createdAt) : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  ldbSet(LDB_KEYS.WORK_PREFIX + studentId, data);
  ldbAddToWorksIndex(studentId);
}

/**
 * 讀取單個作品
 * @param {string} studentId
 * @returns {object|null}
 */
function ldbGetWork(studentId) {
  return ldbGet(LDB_KEYS.WORK_PREFIX + studentId);
}

/**
 * 刪除單個作品
 * @param {string} studentId
 */
function ldbDeleteWork(studentId) {
  ldbRemove(LDB_KEYS.WORK_PREFIX + studentId);
  ldbRemove(LDB_KEYS.IMAGE_PREFIX + studentId);
  ldbRemoveFromWorksIndex(studentId);
}

/**
 * 獲取所有作品
 * @returns {Array}
 */
function ldbGetAllWorks() {
  const index = ldbGetWorksIndex();
  return index
    .map(id => {
      const work = ldbGetWork(id);
      return work ? { id, ...work } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
}

/**
 * 根據班級獲取作品
 * @param {string} className
 * @returns {Array}
 */
function ldbGetWorksByClass(className) {
  return ldbGetAllWorks()
    .filter(w => w.class === className)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/**
 * 更新學生完成狀態到 localStorage
 * @param {string} studentId
 * @param {boolean} completed
 * @param {object} data - 其他欄位
 */
function ldbUpdateStudentStatus(studentId, completed, data) {
  const allStatus = ldbGet(LDB_KEYS.STUDENT_STATUS) || {};
  // 只儲存完成標記，不儲存完整 base64（避免 localStorage 爆滿）
  // 完整作品資料（含圖片）統一存在 spss_work_{studentId}
  allStatus[studentId] = {
    ...allStatus[studentId],
    completed,
    uploadTime: completed ? new Date().toISOString() : null,
    hasPhoto: completed ? !!(data.photoURL || data.photoLink) : false,
    reason: data.reason || ''
  };
  ldbSet(LDB_KEYS.STUDENT_STATUS, allStatus);
}

/**
 * 獲取學生完成狀態
 * @param {string} studentId
 * @returns {object|null}
 */
function ldbGetStudentStatus(studentId) {
  const allStatus = ldbGet(LDB_KEYS.STUDENT_STATUS) || {};
  return allStatus[studentId] || null;
}

/**
 * 獲取所有學生完成狀態
 * @returns {object} studentId → status 的映射
 */
function ldbGetAllStudentStatus() {
  const raw = ldbGet(LDB_KEYS.STUDENT_STATUS) || {};
  // 向後相容：將 hasPhoto 映射回 photoURL（供 UI 判斷完成狀態）
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

/**
 * 更新班級統計
 * @param {string} className
 * @param {Array} allStudents - 該班所有學生
 */
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

/**
 * 獲取所有班級統計
 * @returns {Array}
 */
function ldbGetAllClassStats() {
  const stats = ldbGet(LDB_KEYS.CLASS_STATS) || {};
  return Object.values(stats).sort((a, b) => (a.className || '').localeCompare(b.className || ''));
}

/**
 * 寫入操作日誌
 * @param {string} type
 * @param {string} userId
 * @param {string} message
 */
function ldbAddLog(type, userId, message) {
  const logs = ldbGet(LDB_KEYS.LOGS) || [];
  logs.push({
    type,
    userId,
    message,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  });
  // 只保留最近 200 條
  if (logs.length > 200) {
    logs.splice(0, logs.length - 200);
  }
  ldbSet(LDB_KEYS.LOGS, logs);
}

/**
 * 檢查 Firebase 是否可用
 * @returns {boolean}
 */
function isFirebaseAvailable() {
  return !!(window.SPSS.firestoreDB);
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

  // 嘗試 Firebase
  if (isFirebaseAvailable()) {
    try {
      const db = getFirestore();
      const snapshot = await db.collection('students')
        .where('class', '==', className)
        .where('status', '==', 'active')
        .orderBy('name')
        .get();

      cloudStudents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.warn('[Firebase] 獲取班級學生失敗，嘗試本地:', error.message);
    }
  }

  if (cloudStudents && cloudStudents.length > 0) return cloudStudents;

  // localStorage 降級
  try {
    const response = await fetch('data/students.json');
    if (response.ok) {
      let students = await response.json();
      const statusMap = ldbGetAllStudentStatus();

      const result = students
        .filter(s => s.class === className)
        .map(s => {
          const status = statusMap[s.studentId];
          if (status) {
            return { ...s, ...status, id: s.studentId };
          }
          return { ...s, id: s.studentId };
        })
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      console.log('[LDB] 從本地讀取' + className + '學生:', result.length, '人');
      return result;
    }
  } catch (e) {
    console.warn('[LDB] 本地學生讀取失敗:', e);
  }

  return [];
}

/**
 * 获取所有班级
 * @returns {Promise<Array>} 班级名称数组
 */
async function getAllClasses() {
  let cloudClasses = null;

  // 嘗試 Firebase
  if (isFirebaseAvailable()) {
    try {
      const db = getFirestore();
      const snapshot = await db.collection('students')
        .where('status', '==', 'active')
        .select('class')
        .get();

      const classSet = new Set();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.class) classSet.add(data.class);
      });

      cloudClasses = Array.from(classSet).sort();
    } catch (error) {
      console.warn('[Firebase] 獲取班級列表失敗，嘗試本地:', error.message);
    }
  }

  if (cloudClasses && cloudClasses.length > 0) return cloudClasses;

  // localStorage 降級
  try {
    const response = await fetch('data/students.json');
    if (response.ok) {
      const students = await response.json();
      const classSet = new Set(students.map(s => s.class));
      console.log('[LDB] 從本地讀取班級:', [...classSet].join(', '));
      return Array.from(classSet).sort();
    }
  } catch (e) {
    console.warn('[LDB] 本地班級讀取失敗:', e);
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
    const db = getFirestore();
    const snapshot = await db.collection('students')
      .where('class', '==', className)
      .where('name', '==', name)
      .where('status', '==', 'active')
      .get();

    if (snapshot.empty) {
      return null;
    }

    const studentDoc = snapshot.docs[0];
    const student = studentDoc.data();

    if (student.password !== password) {
      return null;
    }

    // 更新最后登入时间
    await studentDoc.ref.update({
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });

    return {
      id: studentDoc.id,
      ...student
    };
  } catch (error) {
    console.error('[Firebase] 学生登录验证失败:', error);
    throw error;
  }
}

/**
 * 获取单个学生资料
 * @param {string} studentId - 学号
 * @returns {Promise<object|null>}
 */
async function getStudentById(studentId) {
  // 嘗試 Firebase
  if (isFirebaseAvailable()) {
    try {
      const db = getFirestore();
      const doc = await db.collection('students').doc(studentId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
    } catch (error) {
      console.warn('[Firebase] 獲取學生資料失敗，嘗試本地:', error.message);
    }
  }

  // localStorage 降級：從本地 JSON 讀取並合併完成狀態
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
  // 嘗試 Firebase
  if (isFirebaseAvailable()) {
    try {
      const db = getFirestore();
      await db.collection('students').doc(studentId).update({
        completed,
        uploadTime: completed ? firebase.firestore.FieldValue.serverTimestamp() : null,
        ...data
      });
      return;
    } catch (error) {
      console.warn('[Firebase] 更新學生狀態失敗，降級到本地:', error.message);
    }
  }

  // localStorage 降級
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
  // 嘗試 Firebase
  if (isFirebaseAvailable()) {
    try {
      const db = getFirestore();
      const doc = await db.collection('works').doc(studentId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
    } catch (error) {
      console.warn('[Firebase] 獲取作品失敗，嘗試本地:', error.message);
    }
  }

  // localStorage 降級（Firebase 無資料時自動使用）
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
  // 嘗試 Firebase 雲端儲存
  if (isFirebaseAvailable()) {
    try {
      const db = getFirestore();
      const now = firebase.firestore.FieldValue.serverTimestamp();

      await db.collection('works').doc(studentId).set({
        studentId: workData.studentId,
        name: workData.name,
        class: workData.class,
        photoURL: workData.photoURL || '',
        photoLink: workData.photoLink || '',
        reason: workData.reason || '',
        completed: true,
        updatedAt: now,
        createdAt: workData.createdAt || now
      }, { merge: true });

      // 同时更新学生 Collection
      await updateStudentStatus(studentId, true, {
        photoURL: workData.photoURL || '',
        photoLink: workData.photoLink || '',
        reason: workData.reason || ''
      });

      // 更新班级完成统计
      if (workData.class) {
        await updateClassStats(workData.class);
      }

      // 记录日志
      await addLog('upload', studentId, `${workData.name} 上传了作品`);
      console.log('[Firebase] 作品已儲存到雲端:', studentId);
      return;
    } catch (error) {
      console.warn('[Firebase] 雲端儲存失敗，降級到本地儲存:', error.message);
    }
  }

  // localStorage 本地降級方案
  ldbSaveWork(studentId, workData);

  // 更新學生完成狀態
  ldbUpdateStudentStatus(studentId, true, {
    photoURL: workData.photoURL || '',
    photoLink: workData.photoLink || '',
    reason: workData.reason || ''
  });

  // 更新班級統計
  if (workData.class) {
    let allStudents = [];
    try {
      const response = await fetch('data/students.json');
      if (response.ok) allStudents = await response.json();
    } catch (e) { /* 使用空陣列 */ }
    ldbUpdateClassStats(workData.class, allStudents);
  }

  // 記錄日誌
  ldbAddLog('upload', studentId, `${workData.name} 上傳了作品（本地）`);
  console.log('[LDB] 作品已儲存到本地:', studentId);
}

/**
 * 删除学生作品
 * @param {string} studentId - 学号
 * @param {string} photoURL - Storage 中的图片 URL
 * @returns {Promise<void>}
 */
async function deleteWork(studentId, photoURL) {
  // 嘗試 Firebase
  if (isFirebaseAvailable()) {
    try {
      const db = getFirestore();

      // 删除 Firestore 中的作品
      await db.collection('works').doc(studentId).delete();

      // 更新学生状态
      await updateStudentStatus(studentId, false, {
        photoURL: '',
        photoLink: '',
        reason: ''
      });

      // 删除 Storage 中的图片
      if (photoURL) {
        try {
          const storage = getStorage();
          const imageRef = storage.refFromURL(photoURL);
          await imageRef.delete();
        } catch (storageError) {
          console.warn('[Firebase] 删除 Storage 图片失败（可能已删除）:', storageError);
        }
      }

      // 记录日志
      await addLog('delete', studentId, `学生删除了作品`);
      console.log('[Firebase] 作品已從雲端刪除:', studentId);
      return;
    } catch (error) {
      console.warn('[Firebase] 雲端刪除失敗，降級到本地:', error.message);
    }
  }

  // localStorage 降級
  const work = ldbGetWork(studentId); // 先讀取以獲取班級資訊
  ldbDeleteWork(studentId);
  ldbUpdateStudentStatus(studentId, false, {
    photoURL: '',
    photoLink: '',
    reason: ''
  });

  // 更新班級統計
  let allStudents = [];
  try {
    const response = await fetch('data/students.json');
    if (response.ok) allStudents = await response.json();
  } catch (e) { /* 使用空陣列 */ }
  if (work && work.class) {
    ldbUpdateClassStats(work.class, allStudents);
  }

  ldbAddLog('delete', studentId, `學生刪除了作品（本地）`);
  console.log('[LDB] 作品已從本地刪除:', studentId);
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

  // 嘗試 Firebase
  if (isFirebaseAvailable()) {
    try {
      const db = getFirestore();
      const snapshot = await db.collection('works')
        .where('class', '==', className)
        .orderBy('name')
        .get();

      cloudWorks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.warn('[Firebase] 獲取班級作品失敗，嘗試本地:', error.message);
    }
  }

  if (cloudWorks && cloudWorks.length > 0) return cloudWorks;

  // localStorage 降級
  const localWorks = ldbGetWorksByClass(className);
  console.log('[LDB] 從本地讀取' + className + '作品:', localWorks.length, '件');
  return localWorks;
}

/**
 * 获取所有作品
 * @returns {Promise<Array>}
 */
async function getAllWorks() {
  let cloudWorks = null;

  // 嘗試 Firebase
  if (isFirebaseAvailable()) {
    try {
      const db = getFirestore();
      const snapshot = await db.collection('works')
        .orderBy('createdAt', 'desc')
        .get();

      cloudWorks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.warn('[Firebase] 獲取所有作品失敗，嘗試本地:', error.message);
    }
  }

  // 合併：Firebase 資料優先，localStorage 補充（避免雲端空庫時資料消失）
  if (cloudWorks && cloudWorks.length > 0) {
    return cloudWorks;
  }

  // localStorage 降級
  const localWorks = ldbGetAllWorks();
  console.log('[LDB] 從本地讀取作品:', localWorks.length, '件');
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
  // 嘗試 Firebase
  if (isFirebaseAvailable()) {
    try {
      const db = getFirestore();

      // 统计该班学生总数和完成数
      const studentsSnapshot = await db.collection('students')
        .where('class', '==', className)
        .where('status', '==', 'active')
        .get();

      const totalCount = studentsSnapshot.size;
      let completedCount = 0;
      studentsSnapshot.docs.forEach(doc => {
        if (doc.data().completed) completedCount++;
      });

      const completionRate = totalCount > 0
        ? Math.round((completedCount / totalCount) * 100)
        : 0;

      // 更新或创建班级统计
      await db.collection('classes').doc(className).set({
        className,
        studentCount: totalCount,
        completedCount,
        completionRate,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return;
    } catch (error) {
      console.warn('[Firebase] 更新班級統計失敗，降級到本地:', error.message);
    }
  }

  // localStorage 降級
  let allStudents = [];
  try {
    const response = await fetch('data/students.json');
    if (response.ok) allStudents = await response.json();
  } catch (e) { /* 使用空陣列 */ }
  ldbUpdateClassStats(className, allStudents);
}

/**
 * 获取班级统计
 * @param {string} className - 班级名称
 * @returns {Promise<object|null>}
 */
async function getClassStats(className) {
  // 嘗試 Firebase
  if (isFirebaseAvailable()) {
    try {
      const db = getFirestore();
      const doc = await db.collection('classes').doc(className).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
    } catch (error) {
      console.warn('[Firebase] 獲取班級統計失敗，嘗試本地:', error.message);
    }
  }

  // localStorage 降級
  const stats = ldbGet(LDB_KEYS.CLASS_STATS) || {};
  if (stats[className]) return stats[className];

  // 從本地 JSON 計算
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
          ? Math.round((completedCount / classStudents.length) * 100)
          : 0
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

  // 嘗試 Firebase
  if (isFirebaseAvailable()) {
    try {
      const db = getFirestore();
      const snapshot = await db.collection('classes')
        .orderBy('className')
        .get();

      cloudStats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.warn('[Firebase] 獲取所有班級統計失敗，嘗試本地:', error.message);
    }
  }

  if (cloudStats && cloudStats.length > 0) return cloudStats;

  // localStorage 降級
  const stats = ldbGetAllClassStats();
  if (stats.length > 0) {
    console.log('[LDB] 從本地讀取班級統計:', stats.length, '班');
    return stats;
  }

  // 無任何上傳記錄時，從本地 JSON 計算
  try {
    const response = await fetch('data/students.json');
    if (response.ok) {
      const students = await response.json();
      const classMap = {};
      students.forEach(s => {
        if (!classMap[s.class]) classMap[s.class] = { total: 0 };
        classMap[s.class].total++;
      });
      return Object.entries(classMap).map(([className, data]) => ({
        className,
        studentCount: data.total,
        completedCount: 0,
        completionRate: 0,
        updatedAt: null
      })).sort((a, b) => a.className.localeCompare(b.className));
    }
  } catch (e) { /* 忽略 */ }

  return [];
}

// ========================================
// 统计总览
// ========================================

/**
 * 获取系统概览统计
 * @returns {Promise<object>} { totalStudents, completedCount, completionRate }
 */
async function getOverviewStats() {
  let cloudStats = null;

  // 嘗試 Firebase
  if (isFirebaseAvailable()) {
    try {
      const db = getFirestore();
      const snapshot = await db.collection('students')
        .where('status', '==', 'active')
        .get();

      const totalStudents = snapshot.size;
      let completedCount = 0;
      snapshot.docs.forEach(doc => {
        if (doc.data().completed) completedCount++;
      });

      cloudStats = {
        totalStudents,
        completedCount,
        incompleteCount: totalStudents - completedCount,
        completionRate: totalStudents > 0
          ? Math.round((completedCount / totalStudents) * 100)
          : 0
      };

      if (totalStudents > 0) return cloudStats;
    } catch (error) {
      console.warn('[Firebase] 獲取概覽統計失敗，嘗試本地:', error.message);
    }
  }

  // localStorage 降級
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

      console.log('[LDB] 從本地計算統計:', completedCount, '/', totalStudents);
      return {
        totalStudents,
        completedCount,
        incompleteCount: totalStudents - completedCount,
        completionRate: totalStudents > 0
          ? Math.round((completedCount / totalStudents) * 100)
          : 0
      };
    }
  } catch (e) {
    console.warn('[LDB] 本地統計失敗:', e);
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

  // 嘗試 Firebase
  if (isFirebaseAvailable()) {
    try {
      const db = getFirestore();
      const snapshot = await db.collection('students')
        .where('status', '==', 'active')
        .orderBy('name')
        .get();

      const keyword = query.toLowerCase();
      cloudStudents = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s =>
          s.name.toLowerCase().includes(keyword) ||
          s.studentId.includes(keyword) ||
          s.class.includes(keyword)
        );
    } catch (error) {
      console.warn('[Firebase] 搜尋學生失敗，嘗試本地:', error.message);
    }
  }

  if (cloudStudents && cloudStudents.length > 0) return cloudStudents;

  // localStorage 降級：從本地 JSON 讀取並合併完成狀態
  try {
    const response = await fetch('data/students.json');
    if (response.ok) {
      let students = await response.json();
      const statusMap = ldbGetAllStudentStatus();

      // 合併完成狀態
      students = students.map(s => {
        const status = statusMap[s.studentId];
        if (status) {
          return { ...s, ...status, id: s.studentId };
        }
        return { ...s, id: s.studentId };
      });

      const keyword = query.toLowerCase();
      const filtered = students.filter(s =>
        s.name.toLowerCase().includes(keyword) ||
        s.studentId.includes(keyword) ||
        s.class.includes(keyword)
      );
      console.log('[LDB] 從本地讀取學生:', filtered.length, '人（含完成狀態）');
      return filtered;
    }
  } catch (e) {
    console.warn('[LDB] 本地學生搜尋失敗:', e);
  }

  return [];
}

// ========================================
// Storage 操作
// ========================================

/**
 * 上传图片到 Firebase Storage
 * @param {File} file - 图片文件
 * @param {string} className - 班级
 * @param {string} studentId - 学号
 * @param {Function} onProgress - 进度回调 (percentage)
 * @returns {Promise<string>} 下载 URL
 */
async function uploadImage(file, className, studentId, onProgress) {
  // 嘗試 Firebase Storage
  if (isFirebaseAvailable()) {
    try {
      const storage = getStorage();
      if (storage) {
        const extension = file.name.split('.').pop().toLowerCase();
        const fileName = `photo.${extension}`;
        const path = `images/${className}/${studentId}/${fileName}`;
        const storageRef = storage.ref(path);

        // 上传
        const uploadTask = storageRef.put(file);

        // 监听进度
        if (onProgress) {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              );
              onProgress(progress);
            },
            (error) => {
              console.error('[Storage] 上传失败:', error);
              throw error;
            }
          );
        }

        // 等待上传完成
        await uploadTask;

        // 获取下载 URL
        const downloadURL = await storageRef.getDownloadURL();
        return downloadURL;
      }
    } catch (error) {
      console.warn('[Storage] 雲端上傳失敗，使用本地儲存:', error.message);
    }
  }

  // localStorage 降級：將圖片轉為 base64（統一儲存在 work 資料中，不另存）
  if (onProgress) onProgress(50);

  try {
    const base64 = await fileToBase64(file);
    if (onProgress) onProgress(100);
    console.log('[LDB] 圖片已轉為 base64:', studentId, '-', (base64.length / 1024).toFixed(1) + 'KB');
    return base64;
  } catch (e) {
    console.warn('[LDB] 圖片轉換失敗，使用 blob URL:', e);
    return URL.createObjectURL(file);
  }
}

/**
 * 將 File 轉換為 base64 字串
 * @param {File} file - 圖片檔案
 * @returns {Promise<string>} base64 資料 URL
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('檔案讀取失敗'));
    reader.readAsDataURL(file);
  });
}

/**
 * 从 Storage 删除图片
 * @param {string} photoURL - 图片下载 URL
 * @returns {Promise<void>}
 */
async function deleteImage(photoURL) {
  try {
    const storage = getStorage();
    const imageRef = storage.refFromURL(photoURL);
    await imageRef.delete();
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
    const auth = getAuth();
    const userCredential = await auth.signInWithEmailAndPassword(email, password);

    // 检查是否为教师
    const db = getFirestore();
    const teacherDoc = await db.collection('teachers').doc(userCredential.user.uid).get();

    if (!teacherDoc.exists) {
      await auth.signOut();
      throw new Error('您不是注册教师');
    }

    const teacherData = teacherDoc.data();
    if (!['teacher', 'admin'].includes(teacherData.role)) {
      await auth.signOut();
      throw new Error('权限不足');
    }

    // 更新最后登入
    await teacherDoc.ref.update({
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });

    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      ...teacherData
    };
  } catch (error) {
    console.error('[Firebase] 教师登录失败:', error);
    throw error;
  }
}

/**
 * 教师登出
 * @returns {Promise<void>}
 */
async function teacherLogout() {
  try {
    const auth = getAuth();
    await auth.signOut();
  } catch (error) {
    console.error('[Firebase] 教师登出失败:', error);
    throw error;
  }
}

/**
 * 获取当前教师信息
 * @returns {Promise<object|null>}
 */
async function getCurrentTeacher() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) return null;

    const db = getFirestore();
    const doc = await db.collection('teachers').doc(user.uid).get();

    if (!doc.exists) return null;

    return {
      uid: user.uid,
      email: user.email,
      ...doc.data()
    };
  } catch (error) {
    console.error('[Firebase] 获取教师信息失败:', error);
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
  // 嘗試 Firebase
  if (isFirebaseAvailable()) {
    try {
      const db = getFirestore();
      await db.collection('logs').add({
        type,
        userId,
        message,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        userAgent: navigator.userAgent
      });
      return;
    } catch (error) {
      console.warn('[Firebase] 記錄日誌失敗:', error);
    }
  }

  // localStorage 降級
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
  try {
    const db = getFirestore();
    const snapshot = await db.collection('announcements')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('[Firebase] 获取公告失败:', error);
    return [];
  }
}

// ========================================
// 导出到全局
// ========================================
window.SPSS.getFirestore = getFirestore;
window.SPSS.getStorage = getStorage;
window.SPSS.getAuth = getAuth;
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
window.SPSS.isFirebaseAvailable = isFirebaseAvailable;

console.log('[SPSS] Firebase 模块已加载（含 localStorage 降級方案）');
