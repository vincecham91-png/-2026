/**
 * Star Photo Share System
 * Import Students to Supabase
 * Version 1.0
 */

const fs = require('fs');
const path = require('path');

// Supabase 配置
const SUPABASE_URL = 'https://dhibndbjkxzotindclei.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoaWJuZGJqa3h6b3RpbmRjbGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Njk2NjEsImV4cCI6MjEwMjA0NTY2MX0.3m90a43ykWObygEpmMx3mO4zpn3izHOOUvFombcSUj0';

async function importStudents() {
  console.log('🚀 开始导入学生数据...\n');

  // 读取 students.json
  const studentsFile = path.join(__dirname, '..', 'data', 'students.json');
  const students = JSON.parse(fs.readFileSync(studentsFile, 'utf8'));
  console.log(`📊 读取到 ${students.length} 名学生\n`);

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  let success = 0;
  let failed = 0;

  // 分批导入（每批 10 条）
  const batchSize = 10;
  for (let i = 0; i < students.length; i += batchSize) {
    const batch = students.slice(i, i + batchSize);

    const records = batch.map(s => ({
      student_id: s.studentId,
      name: s.name,
      class: s.class,
      password: s.password || s.studentId,
      completed: s.completed || false,
      status: 'active'
    }));

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
        method: 'POST',
        headers,
        body: JSON.stringify(records)
      });

      if (res.ok) {
        success += batch.length;
        console.log(`✅ 已导入 ${success}/${students.length} 名学生`);
      } else {
        const error = await res.text();
        console.error(`❌ 批次失败:`, error);
        failed += batch.length;
      }
    } catch (error) {
      console.error(`❌ 请求错误:`, error.message);
      failed += batch.length;
    }
  }

  console.log(`\n🎉 导入完成！成功: ${success}, 失败: ${failed}`);

  // 统计班级
  const classStats = {};
  students.forEach(s => {
    classStats[s.class] = (classStats[s.class] || 0) + 1;
  });
  console.log('\n📋 班级统计：');
  Object.entries(classStats).forEach(([cls, count]) => {
    console.log(`   ${cls}: ${count} 人`);
  });
}

importStudents().catch(console.error);
