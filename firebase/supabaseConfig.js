/**
 * Star Photo Share System
 * Supabase 配置与初始化
 * Version 1.0
 * 2026-08-05
 *
 * 功能：初始化 Supabase 客户端（Database + Auth + Storage + Realtime）
 * 所有页面统一引用此文件，禁止重复初始化
 *
 * 注意：Supabase URL 和 Key 请从 config.local.js 加载
 */

// ========================================
// 检查是否加载了本地配置
// ========================================
if (!window.SPSS_SUPABASE_URL || !window.SPSS_SUPABASE_ANON_KEY) {
  console.warn('[Config] 警告: 未检测到本地配置文件 config.local.js');
  console.warn('[Config] 请确保在 html 中先加载 config.local.js');
}

// ========================================
// 使用本地配置
// ========================================
const SUPABASE_URL = window.SPSS_SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = window.SPSS_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// ========================================
// 判断是否配置了真实 Supabase
// ========================================
const IS_SUPABASE_CONFIGURED =
  SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co' &&
  SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';

// ========================================
// 初始化 Supabase 客户端
// ========================================
let supabaseClient = null;
let supabase = null;

if (IS_SUPABASE_CONFIGURED && typeof createClient !== 'undefined') {
  try {
    supabase = window.supabase;
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] 初始化成功 —', SUPABASE_URL);
  } catch (error) {
    console.warn('[Supabase] 初始化失败，使用本地数据模式:', error.message);
  }
} else {
  console.log('[Supabase] 未配置或 SDK 未加载，使用本地数据模式');
}

// ========================================
// 表名常量（对应 Supabase Database Tables）
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
// 教师本地帐号配置（从本地配置加载）
// ========================================
const TEACHER_CONFIG = window.SPSS_TEACHER_CONFIG || {
  username: 'Cham Chin Hong',
  email: 'teacher@school.edu.my',
  password: '12345',
  displayName: 'Cham Chin Hong',
  role: 'teacher'
};

// ========================================
// 角色常量
// ========================================
const ROLES = {
  TEACHER: 'teacher',
  ADMIN: 'admin'
};

// ========================================
// 导出（供其他模块使用）
// ========================================
window.SPSS = window.SPSS || {};
window.SPSS.supabase = supabase;
window.SPSS.supabaseClient = supabaseClient;
window.SPSS.TABLES = TABLES;
window.SPSS.ROLES = ROLES;
window.SPSS.TEACHER_CONFIG = TEACHER_CONFIG;
window.SPSS.SUPABASE_URL = SUPABASE_URL;
window.SPSS.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
