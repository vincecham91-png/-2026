/**
 * Star Photo Share System
 * Supabase 公共配置
 * Version 1.0
 * 2026-08-05
 *
 * 注意：此文件包含公开的 Supabase URL 和 Anon Key
 * 这些是公开信息，可以安全地提交到 GitHub
 * 敏感信息（如教师密码）请放在 config.local.js 中
 */

// ========================================
// Supabase 配置
// ========================================
const SUPABASE_URL = 'https://wqxpnpcgydyblktktigv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxeHBucGNneWR5YmxrdGt0aWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDUwNzAsImV4cCI6MjEwMTQ4MTA3MH0.X-QktVBOHoJ-47vq-Z0fz-XsrL-SkVMUbxY9pmB8TZM';

// ========================================
// 导出到全局
// ========================================
window.SPSS_SUPABASE_URL = SUPABASE_URL;
window.SPSS_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

console.log('[Config] Supabase 配置已加载');
