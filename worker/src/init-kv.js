#!/usr/bin/env node
/**
 * 將 students.json 導入 Cloudflare Worker KV
 * 用法: node worker/src/init-kv.js
 *
 * 需要 wrangler.toml 和 API Key。
 * 此腳本通過 Worker REST API 調用 /api/admin/init。
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const BASE_URL = 'https://star-photo-api.vincecham91.workers.dev';
const API_KEY = 'star-teacher-key-2026';
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../');

// 讀取學生 JSON
const studentsFile = resolve(PROJECT_ROOT, 'data/students.json');
const studentsRaw = readFileSync(studentsFile, 'utf-8');
// 去除 BOM
const cleanJson = studentsRaw.replace(/^﻿/, '');
const students = JSON.parse(cleanJson);

// 教師資料
const teachers = [
  {
    uid: 'teacher-001',
    name: 'Cham Chin Hong',
    email: 'teacher@school.edu.my',
    password: '12345',
    role: 'teacher',
  },
];

console.log(`準備初始化 ${students.length} 名學生 + ${teachers.length} 名教師`);

async function main() {
  // 1. 健康檢查
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const health = await healthRes.json();
  console.log('Worker 狀態:', health.status || health.error);

  // 2. 初始化 KV 數據
  const initRes = await fetch(`${BASE_URL}/api/admin/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ students, teachers }),
  });

  const init = await initRes.json();
  if (init.success) {
    console.log(`✅ 初始化成功: ${init.studentsCount} 名學生, ${init.teachersCount} 名教師`);
  } else {
    console.error('❌ 初始化失敗:', init.error);
    process.exit(1);
  }

  // 3. 驗證教師登入
  const loginRes = await fetch(`${BASE_URL}/api/auth/teacher/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: teachers[0].email, password: '12345' }),
  });
  const login = await loginRes.json();
  if (login.success) {
    console.log('✅ 教師登入驗證成功:', login.teacher.name);
  } else {
    console.error('❌ 教師登入驗證失敗:', login.error);
  }

  // 4. 驗證學生登入（測試第一個學生）
  const studentLoginRes = await fetch(`${BASE_URL}/api/auth/student/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      className: students[0].class,
      name: students[0].name,
      password: students[0].password,
    }),
  });
  const studentLogin = await studentLoginRes.json();
  if (studentLogin.success) {
    console.log('✅ 學生登入驗證成功:', studentLogin.student.studentName);
  } else {
    console.error('❌ 學生登入驗證失敗:', studentLogin.error);
  }

  // 5. 獲取統計
  const statsRes = await fetch(`${BASE_URL}/api/stats/overview`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  const stats = await statsRes.json();
  console.log(`✅ 總覽統計: 共 ${stats.totalStudents} 名學生, ${stats.completedCount} 已完成, ${stats.completionRate}% 完成率`);

  // 6. 獲取班級列表
  const classesRes = await fetch(`${BASE_URL}/api/classes`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  const classes = await classesRes.json();
  console.log(`✅ 班級: ${classes.length} 個班級`);
  classes.forEach(c => {
    console.log(`   - ${c.className}: ${c.completedCount}/${c.studentCount} (${c.completionRate}%)`);
  });

  console.log('\n🎉 全部初始化完成！');
}

main().catch(err => {
  console.error('錯誤:', err);
  process.exit(1);
});
