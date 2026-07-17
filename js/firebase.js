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
  if (!window.SPSS.firestoreDB) {
    throw new Error('Firestore 未初始化，请先加载 firebaseConfig.js');
  }
  return window.SPSS.firestoreDB;
}

/**
 * 获取 Storage 实例
 * @returns {firebase.storage.Storage}
 */
function getStorage() {
  if (!window.SPSS.firebaseStorage) {
    throw new Error('Storage 未初始化，请先加载 firebaseConfig.js');
  }
  return window.SPSS.firebaseStorage;
}

/**
 * 获取 Auth 实例
 * @returns {firebase.auth.Auth}
 */
function getAuth() {
  if (!window.SPSS.firebaseAuth) {
    throw new Error('Auth 未初始化，请先加载 firebaseConfig.js');
  }
  return window.SPSS.firebaseAuth;
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
  try {
    const db = getFirestore();
    const snapshot = await db.collection('students')
      .where('class', '==', className)
      .where('status', '==', 'active')
      .orderBy('name')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('[Firebase] 获取学生列表失败:', error);
    throw error;
  }
}

/**
 * 获取所有班级
 * @returns {Promise<Array>} 班级名称数组
 */
async function getAllClasses() {
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

    return Array.from(classSet).sort();
  } catch (error) {
    console.error('[Firebase] 获取班级列表失败:', error);
    throw error;
  }
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
  try {
    const db = getFirestore();
    const doc = await db.collection('students').doc(studentId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('[Firebase] 获取学生资料失败:', error);
    throw error;
  }
}

/**
 * 更新学生完成状态
 * @param {string} studentId - 学号
 * @param {boolean} completed - 是否完成
 * @param {object} data - 其他更新数据
 * @returns {Promise<void>}
 */
async function updateStudentStatus(studentId, completed, data = {}) {
  try {
    const db = getFirestore();
    await db.collection('students').doc(studentId).update({
      completed,
      uploadTime: completed ? firebase.firestore.FieldValue.serverTimestamp() : null,
      ...data
    });
  } catch (error) {
    console.error('[Firebase] 更新学生状态失败:', error);
    throw error;
  }
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
  try {
    const db = getFirestore();
    const doc = await db.collection('works').doc(studentId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('[Firebase] 获取作品失败:', error);
    throw error;
  }
}

/**
 * 保存学生作品
 * @param {string} studentId - 学号
 * @param {object} workData - 作品数据
 * @returns {Promise<void>}
 */
async function saveWork(studentId, workData) {
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

  } catch (error) {
    console.error('[Firebase] 保存作品失败:', error);
    throw error;
  }
}

/**
 * 删除学生作品
 * @param {string} studentId - 学号
 * @param {string} photoURL - Storage 中的图片 URL
 * @returns {Promise<void>}
 */
async function deleteWork(studentId, photoURL) {
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

  } catch (error) {
    console.error('[Firebase] 删除作品失败:', error);
    throw error;
  }
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
  try {
    const db = getFirestore();
    const snapshot = await db.collection('works')
      .where('class', '==', className)
      .orderBy('name')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('[Firebase] 获取班级作品失败:', error);
    throw error;
  }
}

/**
 * 获取所有作品
 * @returns {Promise<Array>}
 */
async function getAllWorks() {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('works')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('[Firebase] 获取所有作品失败:', error);
    throw error;
  }
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

  } catch (error) {
    console.error('[Firebase] 更新班级统计失败:', error);
    throw error;
  }
}

/**
 * 获取班级统计
 * @param {string} className - 班级名称
 * @returns {Promise<object|null>}
 */
async function getClassStats(className) {
  try {
    const db = getFirestore();
    const doc = await db.collection('classes').doc(className).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('[Firebase] 获取班级统计失败:', error);
    throw error;
  }
}

/**
 * 获取所有班级统计
 * @returns {Promise<Array>}
 */
async function getAllClassStats() {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('classes')
      .orderBy('className')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('[Firebase] 获取所有班级统计失败:', error);
    throw error;
  }
}

// ========================================
// 统计总览
// ========================================

/**
 * 获取系统概览统计
 * @returns {Promise<object>} { totalStudents, completedCount, completionRate }
 */
async function getOverviewStats() {
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

    return {
      totalStudents,
      completedCount,
      incompleteCount: totalStudents - completedCount,
      completionRate: totalStudents > 0
        ? Math.round((completedCount / totalStudents) * 100)
        : 0
    };
  } catch (error) {
    console.error('[Firebase] 获取概览统计失败:', error);
    throw error;
  }
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
  try {
    const db = getFirestore();
    // Firebase 不支持全文搜索，使用前缀匹配
    const snapshot = await db.collection('students')
      .where('status', '==', 'active')
      .orderBy('name')
      .get();

    const keyword = query.toLowerCase();
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(s =>
        s.name.toLowerCase().includes(keyword) ||
        s.studentId.includes(keyword) ||
        s.class.includes(keyword)
      );
  } catch (error) {
    console.error('[Firebase] 搜索学生失败:', error);
    throw error;
  }
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
  try {
    const storage = getStorage();
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

  } catch (error) {
    console.error('[Storage] 图片上传失败:', error);
    throw error;
  }
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
  try {
    const db = getFirestore();
    await db.collection('logs').add({
      type,
      userId,
      message,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      userAgent: navigator.userAgent
    });
  } catch (error) {
    console.warn('[Firebase] 记录日志失败:', error);
    // 日志记录失败不影响主流程
  }
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

console.log('[SPSS] Firebase 模块已加载');
