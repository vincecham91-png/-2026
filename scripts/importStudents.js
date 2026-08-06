/**
 * Star Photo Share System
 * 导入学生数据到 Supabase
 * Version 1.0
 * 2026-08-05
 *
 * 使用：node scripts/importStudents.js
 */

const fs = require('fs');
const path = require('path');

// ========================================
// 配置
// ========================================
const SUPABASE_URL = 'https://wqxpnpcgydyblktktigv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxeHBucGNneWR5YmxrdGt0aWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDUwNzAsImV4cCI6MjEwMTQ4MTA3MH0.X-QktVBOHoJ-47vq-Z0fz-XsrL-SkVMUbxY9pmB8TZM';

const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

// ========================================
// 读取学生数据
// ========================================
function readStudents() {
  const jsonPath = path.join(__dirname, '..', 'data', 'students.json');
  let raw = fs.readFileSync(jsonPath, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // 移除 BOM
  return JSON.parse(raw);
}

// ========================================
// API 请求
// ========================================
async function supabaseRequest(method, table, body = null, filter = null) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  if (filter) {
    const params = Object.entries(filter)
      .map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`)
      .join('&');
    url += `?${params}`;
  }

  const options = {
    method,
    headers: {
      ...HEADERS,
      'Prefer': 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  };

  const res = await fetch(url, options);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.substring(0, 200)}`);
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

// ========================================
// 批量插入学生
// ========================================
async function importStudents(students) {
  console.log(`📄 读取到 ${students.length} 名学生\n`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  // 分批处理（每批 20 条）
  const BATCH_SIZE = 20;
  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const batch = students.slice(i, i + BATCH_SIZE);

    const records = batch.map(s => ({
      student_id: s.studentId,
      name: s.name,
      class: s.class,
      password: s.password || s.studentId,
      completed: false,
      photo_url: '',
      photo_link: '',
      reason: '',
      status: 'active'
    }));

    try {
      const result = await supabaseRequest('POST', 'students', records);
      const count = Array.isArray(result) ? result.length : 0;
      inserted += count;
      console.log(`  ✅ 批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(students.length / BATCH_SIZE)}: +${count} 名学生`);
    } catch (error) {
      console.error(`  ❌ 批次 ${Math.floor(i / BATCH_SIZE) + 1} 失败:`, error.message);
      errors += batch.length;
    }

    // 进度条
    process.stdout.write(`\r  进度: ${Math.min(i + BATCH_SIZE, students.length)} / ${students.length}`);
  }

  console.log('\n');

  // 统计班级
  const classMap = {};
  students.forEach(s => {
    if (!classMap[s.class]) classMap[s.class] = { total: 0 };
    classMap[s.class].total++;
  });

  // 插入班级统计
  console.log('📊 更新班级统计...');
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
      console.error(`  ⚠️ ${className}: ${error.message}`);
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`  导入完成！`);
  console.log(`  新增: ${inserted} 名学生`);
  console.log(`  跳过: ${skipped}`);
  console.log(`  错误: ${errors}`);
  console.log(`  班级: ${Object.keys(classMap).length} 个`);
  console.log('═'.repeat(50));
}

// ========================================
// 主函数
// ========================================
async function main() {
  console.log('═'.repeat(50));
  console.log('  星图照片分享系统 — 学生数据导入');
  console.log('═'.repeat(50) + '\n');

  try {
    const students = readStudents();
    await importStudents(students);
    console.log('\n✅ 导入完成！');
  } catch (error) {
    console.error('\n❌ 导入失败:', error.message);
    process.exit(1);
  }
}

main();
