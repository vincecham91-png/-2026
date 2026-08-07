/**
 * Star Photo Share System
 * Supabase 配置与初始化
 * Version 1.1
 * 2026-08-05
 *
 * 功能：初始化 Supabase 客户端（Database + Auth + Storage + Realtime）
 * 所有页面统一引用此文件，禁止重复初始化
 */

// ========================================
// 检查配置
// ========================================
const SUPABASE_URL = window.SPSS_SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = window.SPSS_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const IS_CONFIGURED =
  SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co' &&
  SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';

// ========================================
// 初始化 Supabase 客户端
// ========================================
let supabaseClient = null;
let supabase = null;

// 检查 SDK 是否加载
if (!window.supabase) {
  console.error('[Supabase] ❌ SDK 未加载！请检查 <script> 标签顺序');
} else if (!IS_CONFIGURED) {
  console.warn('[Supabase] ⚠️ 未配置 Supabase URL 或 Key');
} else {
  try {
    supabase = window.supabase;
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] ✅ 客户端初始化成功:', SUPABASE_URL);
  } catch (error) {
    console.error('[Supabase] ❌ 初始化失败:', error.message);
  }
}

// ========================================
// 表名常量
// ========================================
const TABLES = {
  STUDENTS: 'students',
  WORKS: 'works',
  CLASSES: 'classes',
  TEACHERS: 'teachers',
  SETTINGS: 'settings',
  LOGS: 'logs',
  ANNOUNCEMENTS: 'announcements'
};

// ========================================
// 教师配置
// ========================================
const TEACHER_CONFIG = window.SPSS_TEACHER_CONFIG || {
  username: 'Cham Chin Hong',
  email: 'teacher@school.edu.my',
  password: '12345',
  displayName: 'Cham Chin Hong',
  role: 'teacher'
};

// ========================================
// 导出到全局
// ========================================
window.SPSS = window.SPSS || {};
window.SPSS.supabase = supabase;
window.SPSS.supabaseClient = supabaseClient;
window.SPSS.TABLES = TABLES;
window.SPSS.TEACHER_CONFIG = TEACHER_CONFIG;
window.SPSS.SUPABASE_URL = SUPABASE_URL;
window.SPSS.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

// 调试日志
console.log('[Supabase Config] SUPABASE_URL:', SUPABASE_URL);
console.log('[Supabase Config] supabaseClient:', supabaseClient ? '✅ 已创建' : '❌ 未创建');
console.log('[Supabase Config] window.supabase:', window.supabase ? '✅ 已加载' : '❌ 未加载');
