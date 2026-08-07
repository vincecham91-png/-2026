/**
 * 教师登录测试脚本
 */
const { chromium } = require('@playwright/test');

async function testLogin() {
  console.log('🚀 启动浏览器测试...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 记录控制台日志
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.error(`[Page Error] ${err.message}`);
  });

  try {
    // 1. 打开登录页面
    console.log('1️⃣ 打开教师登录页面...');
    await page.goto('https://2026-2hzg.vercel.app/teacher-login.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 2. 截图
    await page.screenshot({ path: 'test-login-1.png', fullPage: true });
    console.log('   ✅ 页面已加载');

    // 3. 检查 Supabase 配置
    console.log('\n2️⃣ 检查 Supabase 配置...');
    const configStatus = await page.evaluate(() => {
      return {
        hasSPSS: !!window.SPSS,
        hasConfig: !!window.SPSS_SUPABASE_URL,
        hasClient: !!window.SPSS?.supabaseClient,
        hasSupabase: !!window.supabase,
        url: window.SPSS_SUPABASE_URL || '未设置',
        client: window.SPSS?.supabaseClient ? '✅ 已创建' : '❌ 未创建'
      };
    });
    console.log('   window.SPSS:', configStatus.hasSPSS);
    console.log('   window.SPSS_SUPABASE_URL:', configStatus.hasConfig);
    console.log('   window.SPSS.supabaseClient:', configStatus.hasClient);
    console.log('   window.supabase SDK:', configStatus.hasSupabase);
    console.log('   URL:', configStatus.url);
    console.log('   客户端状态:', configStatus.client);

    // 4. 输入登录信息
    console.log('\n3️⃣ 输入登录信息...');
    await page.fill('#emailInput', 'teacher@school.edu.my');
    await page.fill('#passwordInput', '12345');
    await page.screenshot({ path: 'test-login-2.png', fullPage: true });

    // 5. 点击登录按钮
    console.log('4️⃣ 点击登录按钮...');
    await page.click('#loginBtn');

    // 6. 等待结果
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-login-3.png', fullPage: true });

    // 7. 检查结果
    const result = await page.evaluate(() => {
      const errorDiv = document.getElementById('loginError');
      const errorVisible = errorDiv?.classList.contains('login-error--visible');
      const errorMsg = errorDiv?.textContent || '';
      const currentUrl = window.location.href;
      return {
        errorVisible,
        errorMsg,
        currentUrl,
        hasTeacherSession: !!sessionStorage.getItem('teacherSession')
      };
    });

    console.log('\n5️⃣ 测试结果:');
    console.log('   错误信息可见:', result.errorVisible);
    console.log('   错误信息:', result.errorMsg || '无');
    console.log('   当前 URL:', result.currentUrl);
    console.log('   Session 存在:', result.hasTeacherSession);

    if (result.errorVisible) {
      console.log('\n❌ 登录失败:', result.errorMsg);
    } else if (result.hasTeacherSession) {
      console.log('\n✅ 登录成功！Session 已创建');
      // 截图教师后台
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-teacher-dashboard.png', fullPage: true });
    } else {
      console.log('\n⚠️  登录状态未知');
    }

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testLogin().catch(console.error);
