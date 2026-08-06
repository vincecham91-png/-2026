/**
 * Supabase 连接测试（无依赖版）
 * 直接运行：node test-supabase.js
 * 无需 npm install
 */

const SUPABASE_URL = 'https://wqxpnpcgydyblktktigv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxeHBucGNneWR5YmxrdGt0aWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDUwNzAsImV4cCI6MjEwMTQ4MTA3MH0.X-QktVBOHoJ-47vq-Z0fz-XsrL-SkVMUbxY9pmB8TZM';

const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

async function supabaseRequest(method, path, body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const options = {
    method,
    headers: {
      ...HEADERS,
      ...(body ? {} : {}),
      'Prefer': 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  };
  const res = await fetch(url, options);
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.substring(0, 200)}`);
  try { return JSON.parse(text); } catch { return text; }
}

async function test() {
  console.log('═'.repeat(55));
  console.log('  Supabase 连接测试 — 星图照片分享系统');
  console.log('═'.repeat(55));
  console.log();

  let pass = 0, fail = 0, warn = 0;
  function result(name, ok, detail = '') {
    const icon = ok === null ? '⚠️' : (ok ? '✅' : '❌');
    console.log(`${icon} ${name}`);
    if (detail) detail.split('\n').forEach(l => console.log('   ' + l));
    if (ok !== null) { ok ? pass++ : fail++; } else { warn++; }
  }

  // 1. 数据库连通性
  console.log('\n[1] 测试数据库连接...');
  try {
    const data = await supabaseRequest('GET', 'students?select=id&limit=1');
    result('数据库连接', true, '✅ 连接成功！Supabase REST API 正常响应');
  } catch (e) {
    const msg = e.message.toLowerCase();
    if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('404')) {
      result('数据库连接', true, '✅ 连接成功！但表格尚未创建。\n👉 请在 Supabase Dashboard → SQL Editor 执行 docs/supabase-setup.sql');
    } else {
      result('数据库连接', false, e.message);
    }
  }

  // 2. 表格检查
  console.log('\n[2] 检查表格...');
  try {
    const tables = ['students', 'works', 'classes', 'teachers', 'settings', 'logs', 'announcements'];
    const results = await Promise.allSettled(
      tables.map(t => supabaseRequest('GET', `${t}?select=id&limit=1`))
    );
    const ok = results.filter(r => r.status === 'fulfilled');
    const bad = results.filter(r => r.status === 'rejected');
    if (bad.length === 0) {
      result('表格检查', true, `✅ 全部 ${tables.length} 张表格已创建！`);
    } else if (ok.length > 0) {
      const okNames = ok.map((r, i) => {
        const t = tables.filter((_, j) => results.slice(0, j).find(x => x.status === 'rejected') === undefined);
        return t[i];
      });
      const badNames = bad.map((r, i) => tables.filter(t => !ok.includes(results.find(x => x === r)))[0]);
      result('表格检查', false, `✅ 已找到: ${tables.filter((_, i) => results[i].status === 'fulfilled').join(', ')}\n❌ 缺失: ${tables.filter((_, i) => results[i].status === 'rejected').join(', ')}`);
    } else {
      result('表格检查', false, '❌ 所有表格不存在，请先执行 supabase-setup.sql');
    }
  } catch (e) {
    result('表格检查', false, e.message);
  }

  // 3. Storage Bucket
  console.log('\n[3] 检查 Storage...');
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, { headers: HEADERS });
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        result('Storage 检查', false, '⚠️ Storage API 需要更高权限\n👉 请在 Dashboard → Storage → New bucket，name: images');
      } else {
        result('Storage 检查', false, `HTTP ${res.status}: ${text.substring(0, 100)}`);
      }
    } else {
      const buckets = await res.json();
      const hasImages = buckets.some(b => b.name === 'images');
      result('Storage 检查', hasImages ? true : false,
        hasImages ? '✅ images Bucket 已存在'
          : '⚠️ 未找到 images Bucket，请在 Dashboard → Storage → New bucket 创建');
    }
  } catch (e) {
    result('Storage 检查', false, e.message);
  }

  // 4. 写入测试（使用 INSERT 测试 RLS）
  console.log('\n[4] 写入测试...');
  try {
    const testId = 'test_' + Date.now();
    const data = await supabaseRequest('POST', 'students', {
      student_id: testId,
      name: '测试用户',
      class: '测试班',
      password: 'test123'
    });
    // 清理
    await supabaseRequest('DELETE', `students?student_id=eq.${testId}`);
    result('写入测试', true, '✅ 数据写入和清理成功');
  } catch (e) {
    const msg = e.message;
    if (msg.includes('policy') || msg.includes('security') || msg.includes('403')) {
      result('写入测试', null, '⚠️ RLS 策略阻止写入（预期行为）\nanon key 只有 SELECT 权限，写入需通过 Dashboard 或 Supabase CLI');
    } else {
      result('写入测试', false, msg);
    }
  }

  // 5. 读取测试
  console.log('\n[5] 读取测试...');
  try {
    const data = await supabaseRequest('GET', 'students?select=student_id,name,class&limit=5');
    if (Array.isArray(data) && data.length > 0) {
      result('读取测试', true, `✅ 读取到 ${data.length} 条记录`);
      data.forEach(r => console.log(`   · ${r.student_id} - ${r.name} (${r.class})`));
    } else {
      result('读取测试', true, '✅ 读取正常，当前无学生数据');
    }
  } catch (e) {
    result('读取测试', false, e.message);
  }

  // 6. Auth 服务
  console.log('\n[6] 检查 Auth...');
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/identify`, {
      method: 'HEAD',
      headers: HEADERS
    });
    if (res.status === 405 || res.status === 400) {
      result('Auth 服务', true, '✅ Auth 服务正常');
    } else if (res.ok) {
      result('Auth 服务', true, '✅ Auth 服务正常');
    } else {
      result('Auth 服务', false, `HTTP ${res.status}`);
    }
  } catch (e) {
    result('Auth 服务', false, e.message);
  }

  // 汇总
  console.log('\n' + '═'.repeat(55));
  console.log(`  测试结果: ✅ ${pass} 通过  ❌ ${fail} 失败  ⚠️ ${warn} 警告`);
  console.log('═'.repeat(55));

  if (fail > 0 || warn > 0) {
    console.log('\n📋 下一步操作：');
    console.log('1. 前往 Supabase Dashboard → SQL Editor');
    console.log('2. 执行 docs/supabase-setup.sql（创建表格和策略）');
    console.log('3. 前往 Storage → New bucket，name: images');
    console.log('4. 前往 Authentication → Users，创建教师账号');
  } else {
    console.log('\n🎉 一切正常！可以继续导入学生数据了。');
  }
}

test().catch(console.error);
