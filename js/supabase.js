/**
 * Star Photo Share System
 * Supabase 数据库操作封装
 * Version 1.0
 * 2026-08-05
 *
 * 功能：Database CRUD、Storage 上传下载、学生验证、日志记录
 * 所有数据统一通过 Supabase 云端存储
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
// 学生相关操作
// ========================================

/**
 * 根据班级获取学生列表
 * @param {string} className - 班级名称
 * @returns {Promise<Array>} 学生数组
 */
async function getStudentsByClass(className) {
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
        return data.map(row => ({ id: row.student_id || row.id, ...row }));
      }
      if (error) throw error;
    } catch (error) {
      console.error('[Supabase] ❌ 获取班级学生失败:', error.message);
      throw error;
    }
  }

  throw new Error('Supabase 未配置或查询失败');
}

/**
 * 获取所有班级
 * @returns {Promise<Array>} 班级名称数组
 */
async function getAllClasses() {
  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from(TABLES.STUDENTS)
        .select('class')
        .eq('status', 'active');

      if (!error && data) {
        const classSet = new Set(data.map(row => row.class).filter(Boolean));
        return Array.from(classSet).sort();
      }
      if (error) throw error;
    } catch (error) {
      console.error('[Supabase] ❌ 获取班级列表失败:', error.message);
      throw error;
    }
  }

  throw new Error('Supabase 未配置或查询失败');
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
    console.error('[Supabase] ❌ 学生登录验证失败:', error);
    throw error;
  }

  throw new Error('Supabase 未配置');
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
      if (error) throw error;
    } catch (error) {
      console.error('[Supabase] ❌ 获取学生资料失败:', error.message);
      throw error;
    }
  }

  throw new Error('Supabase 未配置');
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
      console.error('[Supabase] ❌ 更新学生状态失败:', error.message);
      throw error;
    }
  }

  throw new Error('Supabase 未配置');
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
      if (error) throw error;
    } catch (error) {
      console.error('[Supabase] ❌ 获取作品失败:', error.message);
      throw error;
    }
  }

  throw new Error('Supabase 未配置');
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
        await updateStudentStatus(studentId, true, doc);
        if (workData.class) await updateClassStats(workData.class);
        await addLog('upload', studentId, `${workData.name} 上传了作品`);
        console.log('[Supabase] ✅ 云端储存成功:', studentId);
        return;
      }
      throw new Error(upsertError.message);
    } catch (error) {
      console.error('[Supabase] ❌ 储存失败:', error.message);
      throw error; // 向上抛出错误，让调用方处理
    }
  }

  throw new Error('Supabase 未配置，无法保存作品');
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
      if (photoURL && !photoURL.startsWith('data:')) {
        try {
          await deleteImage(photoURL);
        } catch (e) {
          console.warn('[Supabase] 删除 Storage 图片失败:', e);
        }
      }

      await addLog('delete', studentId, `学生删除了作品`);
      console.log('[Supabase] ✅ 作品已从云端删除:', studentId);
      return;
    } catch (error) {
      console.error('[Supabase] ❌ 云端删除失败:', error.message);
      throw error;
    }
  }

  throw new Error('Supabase 未配置，无法删除作品');
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
  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from(TABLES.WORKS)
        .select('*')
        .eq('class', className)
        .order('name');

      if (!error && data) {
        return data.map(row => ({ id: row.student_id || row.id, ...row }));
      }
      if (error) throw error;
    } catch (error) {
      console.error('[Supabase] ❌ 获取班级作品失败:', error.message);
      throw error;
    }
  }

  throw new Error('Supabase 未配置或查询失败');
}

/**
 * 获取所有作品
 * @returns {Promise<Array>}
 */
async function getAllWorks() {
  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from(TABLES.WORKS)
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        // 返回规范化的驼峰字段，兼容 teacher.js / gallery.js
        return data.map(row => ({
          id: row.student_id || row.id,
          studentId: row.student_id || row.id,
          name: row.name,
          class: row.class,
          photoURL: row.photo_url || '',
          photoLink: row.photo_link || '',
          reason: row.reason || '',
          completed: row.completed || false,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          ...row
        }));
      }
      if (error) throw error;
    } catch (error) {
      console.error('[Supabase] ❌ 获取所有作品失败:', error.message);
      throw error;
    }
  }

  throw new Error('Supabase 未配置或查询失败');
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
      console.error('[Supabase] ❌ 更新班级统计失败:', error.message);
      throw error;
    }
  }

  throw new Error('Supabase 未配置');
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
      if (error) throw error;
    } catch (error) {
      console.error('[Supabase] ❌ 获取班级统计失败:', error.message);
      throw error;
    }
  }

  throw new Error('Supabase 未配置');
}

/**
 * 获取所有班级统计
 * @returns {Promise<Array>}
 */
async function getAllClassStats() {
  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from(TABLES.CLASSES)
        .select('*')
        .order('class_name');

      if (!error && data) {
        // 映射 snake_case 到 camelCase
        return data.map(row => ({
          id: row.class_name,
          className: row.class_name,
          studentCount: row.student_count,
          completedCount: row.completed_count,
          completionRate: row.completion_rate,
          ...row
        }));
      }
      if (error) throw error;
    } catch (error) {
      console.error('[Supabase] ❌ 获取所有班级统计失败:', error.message);
      throw error;
    }
  }

  throw new Error('Supabase 未配置或查询失败');
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
      if (error) throw error;
    } catch (error) {
      console.error('[Supabase] ❌ 获取概览统计失败:', error.message);
      throw error;
    }
  }

  throw new Error('Supabase 未配置或查询失败');
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
        return data
          .map(row => ({ id: row.student_id || row.id, ...row }))
          .filter(s =>
            (s.name || '').toLowerCase().includes(keyword) ||
            (s.studentId || '').includes(keyword) ||
            (s.class || '').includes(keyword)
          );
      }
      if (error) throw error;
    } catch (error) {
      console.error('[Supabase] ❌ 搜索学生失败:', error.message);
      throw error;
    }
  }

  throw new Error('Supabase 未配置或查询失败');
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

  // 路径 A：Supabase Storage（使用拼音路径避免中文问题）
  if (isSupabaseAvailable()) {
    try {
      const sb = getSupabase();
      if (sb) {
        const extension = file.name.split('.').pop().toLowerCase();
        // 使用拼音路径（与 api.js 保持一致，避免中文 400 错误）
        const pinyinMap = { '初二忠':'chuer-zhong','初二孝':'chuer-xiao','初二仁':'chuer-ren','初二爱':'chuer-ai' };
        const pinyinClass = pinyinMap[className] || className.toLowerCase().replace(/\s+/g, '-');
        const path = `${pinyinClass}/${studentId}/photo_${Date.now()}.${extension}`;

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
      console.warn('[Storage] Supabase Storage 失败:', storageError.message);
      // 如果是 RLS 错误（权限不足），自动降级到 base64
      if (storageError.message && (
        storageError.message.includes('RLS') ||
        storageError.message.includes('permission') ||
        storageError.message.includes('must be owner')
      )) {
        console.warn('[Storage] 检測到 RLS 權限錯誤，自動降級到 base64');
      }
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
    // 从 URL 反推路径（格式：images/{class}/{studentId}/photo_{timestamp}.ext）
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
      console.error('[Supabase] ❌ 记录日志失败:', error);
      throw error;
    }
  }

  // 记录到控制台（不存储）
  console.log(`[Log] ${type}: ${userId} - ${message}`);
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

    if (error) throw error;
    return data.map(row => ({ id: row.id, ...row }));
  } catch (error) {
    console.error('[Supabase] ❌ 获取公告失败:', error);
    throw error;
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

console.log('[SPSS] Supabase 模块已加载（云端存储）');
