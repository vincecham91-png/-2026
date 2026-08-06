/**
 * Star Photo Share System
 * Import Supabase - 批量导入学生到 Supabase
 * Version 1.0
 * 2026-08-05
 *
 * 功能：读取 students.json → 导入 Supabase Database
 * 使用：node scripts/importSupabase.js
 *
 * 配置：在顶部的配置区填写 Supabase URL 和 anon key
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

// ========================================
// 配置 — 请填入你的 Supabase 信息
// ========================================
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// ========================================
// 辅助函数
// ========================================

/**
 * 发送 Supabase REST API 请求
 */
async function supabaseRequest(method, table, body = null, filter = null) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${filter ? '?' + Object.entries(filter).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&') : ''}`;

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  };

  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  }
  return null;
}

/**
 * 获取所有学生
 */
async function getAllStudents() {
  return await supabaseRequest('GET', 'students');
}

/**
 * 检查学生是否已存在
 */
async function studentExists(studentId) {
  const result = await getAllStudents();
  if (!result) return false;
  return result.some(s => s.student_id === studentId);
}

/**
 * 导入学生数据
 */
async function importSupabase() {
  console.log('=== 星图照片分享系统 - Supabase 导入 ===\n');

  // 读取 students.json
  const jsonPath = path.resolve(config.JSON_OUTPUT_PATH);

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ students.json 不存在: ${jsonPath}`);
    console.log('请先执行: node scripts/convertExcel.js');
    process.exit(1);
  }

  const students = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`📄 读取到 ${students.length} 名学生\n`);

  // 验证 Supabase 配置
  if (SUPABASE_URL === 'https://YOUR_PROJECT_ID.supabase.co' ||
      SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.error('❌ 请先在脚本顶部配置 SUPABASE_URL 和 SUPABASE_ANON_KEY');
    process.exit(1);
  }

  // 批量导入
  console.log('🔄 正在导入 Supabase...\n');

  let importedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  // 获取现有学生（用于检测是否更新）
  let existingStudents = [];
  try {
    existingStudents = await getAllStudents();
    console.log(`📋 现有 ${existingStudents.length} 名学生\n`);
  } catch (e) {
    console.warn(`⚠️ 无法获取现有学生: ${e.message}`);
  }

  // 建立快速查找表
  const existingMap = new Map();
  existingStudents.forEach(s => existingMap.set(s.student_id, s));

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const existing = existingMap.get(student.studentId);

    try {
      if (config.IMPORT_MODE === 'add' && existing) {
        // 新增模式：跳过已存在的
        updatedCount++;
      } else {
        // 同步/覆盖模式：upsert
        await supabaseRequest('POST', 'students', {
          student_id: student.studentId,
          name: student.name,
          class: student.class,
          password: student.password || student.studentId,
          status: student.status || 'active',
          completed: false,
          photo_url: '',
          photo_link: '',
          reason: '',
          upload_time: null,
          last_login: null
        });
        updatedCount++;
      }

      // 进度显示
      if ((i + 1) % 10 === 0 || i === students.length - 1) {
        process.stdout.write(`\r  进度: ${i + 1} / ${students.length}`);
      }
    } catch (error) {
      errorCount++;
      console.error(`\n❌ 导入失败: ${student.name} (${student.studentId}): ${error.message}`);
    }
  }

  process.stdout.write('\n');

  // 自动建立班级统计
  console.log('\n🔄 更新班级统计...');
  const classMap = {};
  students.forEach(s => {
    if (!classMap[s.class]) classMap[s.class] = { total: 0, completed: 0 };
    classMap[s.class].total++;
  });

  for (const [className, data] of Object.entries(classMap)) {
    try {
      await supabaseRequest('POST', 'classes', {
        class_name: className,
        student_count: data.total,
        completed_count: 0,
        completion_rate: 0
      });
      console.log(`  ✅ ${className}: ${data.total} 人`);
    } catch (error) {
      console.error(`  ❌ ${className}: ${error.message}`);
    }
  }

  // 输出导入报告
  const reportTime = new Date().toISOString();
  const report = [
    '=== Supabase 导入报告 ===',
    `执行时间: ${reportTime}`,
    `导入模式: ${config.IMPORT_MODE}`,
    `总人数: ${students.length}`,
    `新增: ${importedCount}`,
    `更新: ${updatedCount}`,
    `错误: ${errorCount}`,
    `班级数: ${Object.keys(classMap).length}`
  ].join('\n');

  console.log('\n' + '='.repeat(50));
  console.log(report);
  console.log('='.repeat(50));

  console.log('\n✅ 导入完成！');
}

// ========================================
// 执行
// ========================================
importSupabase().catch(console.error);
