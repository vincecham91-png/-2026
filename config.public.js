/**
 * Star Photo Share System
 * Supabase 公共配置（仅包含公开信息）
 * Version 1.2
 * 2026-08-10
 *
 * 注意：此文件只导出到 window，不声明局部变量
 * 避免与 firebase/supabaseConfig.js 中的变量冲突
 */

// ========================================
// 直接导出到全局（不声明局部变量）
// ========================================
// TODO: 替换为实际的 Supabase anon key
window.SPSS_SUPABASE_URL = 'https://cortjiuduqdpiouqwgzp.supabase.co';
window.SPSS_SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

console.log('[Config] 公共配置已加载');
