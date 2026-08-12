/**
 * Star Photo Share System
 * Supabase 配置与初始化
 * Version 2.0 - 2026-08-12
 *
 * 功能：初始化 Supabase 客户端（Database + Auth + Storage + Realtime）
 * 所有页面统一引用此文件，禁止重复初始化
 */

// ========================================
// 检查配置
// ========================================
var SUPABASE_URL = window.SPSS_SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';
var SUPABASE_ANON_KEY = window.SPSS_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

var IS_CONFIGURED =
  SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co' &&
  SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
  SUPABASE_URL !== 'https://cortjiuduqdpiouqwgzp.supabase.co';

// ========================================
// 初始化 Supabase 客户端
// ========================================
var supabaseClient = null;
var spssSupabase = null;

if (!window.supabase) {
  console.error('[Supabase] ❌ SDK 未加载！请检查 <script> 标签顺序');
} else if (!IS_CONFIGURED) {
  console.warn('[Supabase] ⚠️ 未配置 Supabase URL 或 Key（请编辑 config.public.js）');
} else {
  try {
    spssSupabase = window.supabase;
    supabaseClient = spssSupabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] ✅ 客户端初始化成功:', SUPABASE_URL);
  } catch (error) {
    console.error('[Supabase] ❌ 初始化失败:', error.message);
  }
}

// ========================================
// 表名常量
// ========================================
var TABLES = {
  STUDENTS: 'students',
  WORKS: 'works',
  CLASSES: 'classes',
  TEACHERS: 'teachers',
  SETTINGS: 'settings',
  LOGS: 'logs',
  ANNOUNCEMENTS: 'announcements'
};

// ========================================
// 导出到全局
// ========================================
window.SPSS = window.SPSS || {};
window.SPSS.supabase = spssSupabase;
window.SPSS.supabaseClient = supabaseClient;
window.SPSS.TABLES = TABLES;
window.SPSS.SUPABASE_URL = SUPABASE_URL;

console.log('[Supabase Config] URL:', SUPABASE_URL);
console.log('[Supabase Config] 客户端:', supabaseClient ? '✅ 已创建' : '❌ 未创建');
