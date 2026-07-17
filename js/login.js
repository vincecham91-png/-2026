/**
 * Star Photo Share System
 * Login JS - 学生登入逻辑（点击名字卡片版本）
 * Version 1.0
 * 2026-07-17
 *
 * 功能：班级标签切换 → 点击名字卡片 → 输入学号 → 登入
 */

(function () {
  'use strict';

  const S = window.SPSS || {};

  let allStudents = [];
  let selectedStudent = null;

  // ========================================
  // 初始化
  // ========================================
  async function init() {
    console.log('[Login] 登入页面初始化');

    if (checkAutoLogin()) return;

    await loadAllStudents();
    await renderClassTabs();
    bindEvents();

    console.log('[Login] 登入页面初始化完成');
  }

  // ========================================
  // 检查自动登入
  // ========================================
  function checkAutoLogin() {
    const session = S.getSession && S.getSession('studentSession');
    if (session && session.studentId) {
      console.log('[Login] 有效 Session，自动跳转');
      window.location.href = 'student.html';
      return true;
    }
    return false;
  }

  // ========================================
  // 加载所有学生
  // ========================================
  async function loadAllStudents() {
    try {
      // 从本地 JSON 加载
      const response = await fetch('data/students.json');
      if (response.ok) {
        allStudents = await response.json();
        console.log('[Login] 加载到 ' + allStudents.length + ' 名学生');
        return;
      }
    } catch (e) {
      console.warn('[Login] 本地加载失败');
    }

    // 尝试 Firebase
    if (S.getAllClasses) {
      try {
        const classes = await S.getAllClasses();
        for (const cls of classes) {
          if (S.getStudentsByClass) {
            const students = await S.getStudentsByClass(cls);
            allStudents.push(...students);
          }
        }
      } catch (e) {}
    }

    allStudents = [];
  }

  // ========================================
  // 渲染班级标签按钮
  // ========================================
  async function renderClassTabs() {
    const container = document.getElementById('classTabs');
    if (!container) return;

    // 自动提取所有班级
    const classSet = new Set();
    allStudents.forEach(s => { if (s.class) classSet.add(s.class); });
    const classes = Array.from(classSet).sort();

    if (classes.length === 0) {
      container.innerHTML = '<span style="color:var(--text-muted)">暂无班级数据</span>';
      return;
    }

    container.innerHTML = classes.map(cls =>
      `<button type="button" class="class-tab" data-class="${S.escapeHTML(cls)}">${S.escapeHTML(cls)}</button>`
    ).join('');

    // 默认选中 URL 参数中的班级或记忆的班级
    const urlClass = S.getURLParam && S.getURLParam('class');
    const remembered = S.getLocal && S.getLocal('rememberedClass');
    const defaultClass = urlClass || remembered || classes[0];

    if (defaultClass) {
      const tab = container.querySelector(`[data-class="${defaultClass}"]`);
      if (tab) tab.click();
    }
  }

  // ========================================
  // 渲染姓名卡片网格
  // ========================================
  function renderNameGrid(className) {
    const grid = document.getElementById('nameGrid');
    const info = document.getElementById('selectedStudentInfo');
    if (!grid) return;

    selectedStudent = null;
    if (info) info.classList.remove('selected-student-info--visible');
    document.getElementById('passwordInput').value = '';

    const classStudents = allStudents.filter(s => s.class === className);

    if (classStudents.length === 0) {
      grid.innerHTML = '<span style="color:var(--text-muted);font-size:var(--font-size-sm);grid-column:1/-1;text-align:center;padding:20px">该班级暂无学生</span>';
      return;
    }

    grid.innerHTML = classStudents.map(s =>
      `<button type="button" class="name-card" data-id="${s.studentId}" data-name="${S.escapeHTML(s.name)}">
        ${S.escapeHTML(s.name)}
      </button>`
    ).join('');
  }

  // ========================================
  // 选中学生
  // ========================================
  function selectStudent(studentId, name, cardEl) {
    // 更新选中状态
    document.querySelectorAll('.name-card').forEach(c => c.classList.remove('name-card--selected'));
    if (cardEl) cardEl.classList.add('name-card--selected');

    // 查找学生数据
    selectedStudent = allStudents.find(s => s.studentId === studentId) || null;

    // 显示选中信息
    const info = document.getElementById('selectedStudentInfo');
    const nameDisplay = document.getElementById('selectedName');
    const idDisplay = document.getElementById('selectedId');

    if (info) info.classList.add('selected-student-info--visible');
    if (nameDisplay) nameDisplay.textContent = '👤 ' + name;
    if (idDisplay) idDisplay.textContent = '学号: ' + studentId;

    // 聚焦密码框
    document.getElementById('passwordInput').focus();
  }

  // ========================================
  // 验证并登入
  // ========================================
  async function login() {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) errorDiv.classList.remove('login-error--visible');

    if (!selectedStudent) {
      showError('请先点击你的名字');
      return;
    }

    const password = document.getElementById('passwordInput').value.trim();
    if (!password) {
      showError('请输入学号（密码）');
      return;
    }

    const btn = document.getElementById('loginBtn');
    btn.classList.add('btn--loading');
    btn.disabled = true;
    btn.textContent = '登入中...';

    try {
      // 验证密码（学号）
      if (selectedStudent.password !== password) {
        showError('学号（密码）错误，请重试');
        btn.classList.remove('btn--loading');
        btn.disabled = false;
        btn.textContent = '登入 🚀';
        btn.style.animation = 'none';
        btn.offsetHeight;
        btn.style.animation = 'shake 0.5s ease';
        return;
      }

      // 登入成功
      const sessionData = {
        studentId: selectedStudent.studentId,
        studentName: selectedStudent.name,
        studentClass: selectedStudent.class,
        loginTime: Date.now()
      };

      S.saveSession && S.saveSession('studentSession', sessionData);

      // 记住班级
      if (document.getElementById('rememberClass').checked) {
        S.saveLocal && S.saveLocal('rememberedClass', selectedStudent.class);
      } else {
        S.removeLocal && S.removeLocal('rememberedClass');
      }

      if (S.addLog) {
        try { await S.addLog('login', selectedStudent.studentId, selectedStudent.name + ' 登入系统'); } catch(e) {}
      }

      S.showToast && S.showToast('登入成功！欢迎 ' + selectedStudent.name, 'success');
      setTimeout(() => { window.location.href = 'student.html'; }, 500);

    } catch (error) {
      console.error('[Login] 登入失败:', error);
      showError('登入失败，请稍后再试');
      btn.classList.remove('btn--loading');
      btn.disabled = false;
      btn.textContent = '登入 🚀';
    }
  }

  function showError(msg) {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
      errorDiv.textContent = msg;
      errorDiv.classList.add('login-error--visible');
      setTimeout(() => errorDiv.classList.remove('login-error--visible'), 3000);
    }
    S.showToast && S.showToast(msg, 'error');
  }

  // ========================================
  // 事件绑定
  // ========================================
  function bindEvents() {
    // 班级标签点击
    const classTabs = document.getElementById('classTabs');
    if (classTabs) {
      classTabs.addEventListener('click', function(e) {
        const tab = e.target.closest('.class-tab');
        if (!tab) return;

        // 更新标签 active
        classTabs.querySelectorAll('.class-tab').forEach(t => t.classList.remove('class-tab--active'));
        tab.classList.add('class-tab--active');

        // 渲染该班学生姓名卡片
        renderNameGrid(tab.dataset.class);
      });
    }

    // 姓名卡片点击
    const nameGrid = document.getElementById('nameGrid');
    if (nameGrid) {
      nameGrid.addEventListener('click', function(e) {
        const card = e.target.closest('.name-card');
        if (!card) return;

        selectStudent(card.dataset.id, card.dataset.name, card);
      });
    }

    // 登入按钮
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', login);
    }

    // 回车键登入
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
      passwordInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); login(); }
      });
    }

    // 返回首页
    const backBtn = document.getElementById('backHomeBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => { window.location.href = 'index.html'; });
    }
  }

  // ========================================
  // 导出
  // ========================================
  window.SPSS.studentLogin = login;
  window.SPSS.studentLogout = function() {
    S.clearSession && S.clearSession('studentSession');
    window.location.href = 'login.html';
  };

  document.addEventListener('DOMContentLoaded', init);
  console.log('[SPSS] Login 模块已加载');
})();
