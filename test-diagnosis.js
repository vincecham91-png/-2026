/**
 * 星图系统全面诊断测试
 */
const { chromium } = require('@playwright/test');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wqxpnpcgydyblktktigv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxeHBucGNneWR5YmxrdGt0aWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDUwNzAsImV4cCI6MjEwMTQ4MTA3MH0.X-QktVBOHoJ-47vq-Z0fz-XsrL-SkVMUbxY9pmB8TZM';

async function test() {
  console.log('═'.repeat(60));
  console.log('  星图系统全面诊断测试');
  console.log('═'.repeat(60) + '\n');

  const browser = await chromium.launch({ headless: true });

  // 测试 1: 教师登录
  console.log('📋 测试 1: 教师登录');
  console.log('-'.repeat(60));
  try {
    const page1 = await browser.newPage();
    page1.on('console', msg => console.log(`  [${msg.type()}] ${msg.text()}`));
    page1.on('pageerror', err => console.error(`  [Error] ${err.message}`));

    await page1.goto('https://2026-2hzg.vercel.app/teacher-login.html', { waitUntil: 'networkidle' });
    await page1.waitForTimeout(2000);

    const config = await page1.evaluate(() => ({
      hasConfig: !!window.SPSS_SUPABASE_URL,
      hasClient: !!window.SPSS?.supabaseClient,
      url: window.SPSS_SUPABASE_URL
    }));
    console.log('  配置检查:', JSON.stringify(config));

    await page1.fill('#emailInput', 'teacher@school.edu.my');
    await page1.fill('#passwordInput', '12345');
    await page1.click('#loginBtn');
    await page1.waitForTimeout(3000);

    const loginResult = await page1.evaluate(() => ({
      url: window.location.href,
      hasSession: !!sessionStorage.getItem('teacherSession'),
      error: document.getElementById('loginError')?.textContent || ''
    }));
    console.log('  登录结果:', JSON.stringify(loginResult));
    console.log('  状态:', loginResult.hasSession ? '✅ 成功' : '❌ 失败');

    // 检查教师后台数据
    if (loginResult.hasSession) {
      console.log('\n  📊 教师后台数据检查:');
      const dashboard = await page1.evaluate(async () => {
        const sb = window.SPSS?.supabaseClient;
        if (!sb) return { error: 'Supabase client not found' };

        const { data: students } = await sb.from('students').select('student_id').limit(1000);
        const { data: works } = await sb.from('works').select('student_id').limit(1000);
        const { data: classes } = await sb.from('classes').select('*');

        return {
          students: students?.length || 0,
          works: works?.length || 0,
          classes: classes?.length || 0,
          classDetails: classes?.map(c => `${c.class_name}: ${c.student_count}人, 完成${c.completed_count}人`)
        };
      });
      console.log('  统计数据:', JSON.stringify(dashboard, null, 2));
    }

    await page1.close();
  } catch (e) {
    console.log('  ❌ 教师登录测试失败:', e.message);
  }

  // 测试 2: Supabase API 直接检查
  console.log('\n📋 测试 2: Supabase API 直接检查');
  console.log('-'.repeat(60));
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 检查学生数据
    const { data: students } = await sb.from('students').select('student_id, name, class, completed').limit(10);
    console.log('  学生数据:', students?.length || 0, '条');
    if (students?.length > 0) {
      students.forEach(s =>
        console.log(`    - ${s.student_id} ${s.name} (${s.class}) 完成:${s.completed}`)
      );
    }

    // 检查作品
    const { data: works } = await sb.from('works').select('student_id, photo_url, completed, updated_at').limit(10);
    console.log('\n  作品数据:', works?.length || 0, '条');
    if (works?.length > 0) {
      works.forEach(w =>
        console.log(`    - ${w.student_id} 完成:${w.completed} 有图:${!!w.photo_url} 更新:${w.updated_at}`)
      );
    } else {
      console.log('    (无作品记录)');
    }

    // 检查班级统计
    const { data: classes } = await sb.from('classes').select('*');
    console.log('\n  班级统计:', classes?.length || 0, '个');
    classes?.forEach(c =>
      console.log(`    - ${c.class_name}: ${c.student_count}人, 完成${c.completed_count}人 (${c.completion_rate}%)`)
    );

  } catch (e) {
    console.log('  ❌ API 检查失败:', e.message);
  }

  // 测试 3: 检查实时监听功能
  console.log('\n📋 测试 3: 实时监听检查');
  console.log('-'.repeat(60));
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 订阅 works 表变化
    console.log('  订阅 works 表变化...');
    const subscription = sb
      .channel('works_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'works' },
        (payload) => {
          console.log('  📥 收到实时更新:', payload.eventType, payload.new?.student_id || payload.old?.student_id);
        }
      )
      .subscribe((status) => {
        console.log('  订阅状态:', status);
      });

    // 测试插入
    console.log('\n  测试插入作品...');
    const testId = 'test_sync_' + Date.now();
    const { data, error } = await sb.from('works').insert({
      student_id: testId,
      name: '测试同步',
      class: '测试班',
      photo_url: 'https://example.com/test.jpg',
      reason: '测试实时同步',
      completed: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).select();

    if (error) {
      console.log('  ❌ 插入失败:', error.message);
    } else {
      console.log('  ✅ 插入成功:', data?.[0]?.student_id);
      // 等待一下看是否有实时更新
      await new Promise(r => setTimeout(r, 2000));
      // 清理测试数据
      await sb.from('works').delete().eq('student_id', testId);
      console.log('  ✅ 测试数据已清理');
    }

    // 取消订阅
    await sb.removeChannel(subscription);
    console.log('  ✅ 订阅已关闭');

  } catch (e) {
    console.log('  ❌ 实时监听测试失败:', e.message);
  }

  await browser.close();

  console.log('\n' + '═'.repeat(60));
  console.log('  诊断完成');
  console.log('═'.repeat(60));
}

test().catch(console.error);
