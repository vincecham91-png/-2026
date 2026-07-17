/**
 * Star Photo Share System
 * Login JS - 学生登入逻辑
 * Version 1.0
 * 2026-07-17
 *
 * 功能：三级联登入（班级→姓名→学号）、Session 管理、自动登入、登出
 */

(function () {
  'use strict';

  const S = window.SPSS || {};

  // ========================================
  // 页面初始化
  // ========================================
  async function init() {
    console.log('[Login] 登入页面初始化');

    // 检查是否已登入
    if (checkAutoLogin()) {
      return;
    }

    // 加载班级列表
    await loadClasses();

    // 绑定事件
    bindEvents();

    console.log('[Login] 登入页面初始化完成');
  }

  // ========================================
  // 检查自动登入
  // ========================================
  function checkAutoLogin() {
    const session = S.getSession && S.getSession('studentSession');
    if (session && session.studentId) {
      console.log('[Login] 检测到有效 Session，自动跳转');
      window.location.href = 'student.html';
      return true;
    }
    return false;
  }

  // ========================================
  // 加载班级列表
  // ========================================
  async function loadClasses() {
    const classSelect = document.getElementById('classSelect');
    if (!classSelect) return;

    try {
      let classes = [];

      // 尝试 Firebase
      if (S.getAllClasses) {
        try {
          classes = await S.getAllClasses();
        } catch (e) {
          console.warn('[Login] Firebase 加载班级失败');
        }
      }

      // 本地 JSON
      if (classes.length === 0) {
        try {
          const response = await fetch('data/students.json');
          if (response.ok) {
            const students = await response.json();
            const classSet = new Set(students.map(s => s.class));
            classes = Array.from(classSet).sort();
          }
        } catch (e) {
          console.warn('[Login] 本地数据加载失败');
        }
      }

      // 默认班级
      if (classes.length === 0) {
        classes = ['初二忠', '初二孝', '初二仁', '初二爱'];
      }

      // 填充下拉选单
      classSelect.innerHTML = '<option value="">请选择班级</option>';
      classes.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls;
        option.textContent = cls;
        classSelect.appendChild(option);
      });

      // 检查 URL 参数中的班级
      const urlClass = S.getURLParam && S.getURLParam('class');
      if (urlClass && classes.includes(urlClass)) {
        classSelect.value = urlClass;
        await loadStudents(urlClass);

        // 检查是否有记住的班级
        const remembered = S.getLocal && S.getLocal('rememberedClass');
        if (remembered) {
          document.getElementById('rememberClass').checked = true;
        }
      }

      // 如果有记住的班级，优先选择
      const remembered = S.getLocal && S.getLocal('rememberedClass');
      if (remembered && classes.includes(remembered)) {
        classSelect.value = remembered;
        document.getElementById('rememberClass').checked = true;
        await loadStudents(remembered);
      }

    } catch (error) {
      console.error('[Login] 班级加载失败:', error);
      S.showToast && S.showToast('班级列表加载失败', 'error');
    }
  }

  // ========================================
  // 加载学生姓名列表
  // ========================================
  async function loadStudents(className) {
    const nameSelect = document.getElementById('nameSelect');
    if (!nameSelect) return;

    try {
      let students = [];

      // 尝试 Firebase
      if (S.getStudentsByClass) {
        try {
          students = await S.getStudentsByClass(className);
        } catch (e) {
          console.warn('[Login] Firebase 加载学生失败');
        }
      }

      // 本地 JSON
      if (students.length === 0) {
        try {
          const response = await fetch('data/students.json');
          if (response.ok) {
            const allStudents = await response.json();
            students = allStudents.filter(s => s.class === className);
          }
        } catch (e) {
          console.warn('[Login] 本地学生数据加载失败');
        }
      }

      // 填充下拉选单
      nameSelect.innerHTML = '<option value="">请选择姓名</option>';
      students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.name;
        option.dataset.studentId = student.studentId;
        option.textContent = student.name;
        nameSelect.appendChild(option);
      });

    } catch (error) {
      console.error('[Login] 学生列表加载失败:', error);
      S.showToast && S.showToast('学生名单加载失败', 'error');
    }
  }

  // ========================================
  // 验证并登入
  // ========================================
  async function login() {
    const classSelect = document.getElementById('classSelect');
    const nameSelect = document.getElementById('nameSelect');
    const passwordInput = document.getElementById('passwordInput');
    const errorDiv = document.getElementById('loginError');

    // 隐藏之前的错误
    if (errorDiv) errorDiv.classList.remove('login-error--visible');

    // 验证输入
    const className = classSelect.value;
    const name = nameSelect.value;
    const password = passwordInput.value.trim();

    if (!className) {
      showError('请选择班级');
      return;
    }
    if (!name) {
      showError('请选择姓名');
      return;
    }
    if (!password) {
      showError('请输入学号（密码）');
      return;
    }

    // 显示加载状态
    const btn = document.getElementById('loginBtn');
    if (btn) {
      btn.classList.add('btn--loading');
      btn.disabled = true;
      btn.textContent = '登入中...';
    }

    try {
      let student = null;

      // 先尝试从本地 JSON 验证
      try {
        const response = await fetch('data/students.json');
        if (response.ok) {
          const students = await response.json();
          student = students.find(s =>
            s.class === className &&
            s.name === name &&
            s.password === password
          );
        }
      } catch (e) {
        console.warn('[Login] 本地验证失败');
      }

      // 尝试 Firebase 验证
      if (!student && S.verifyStudentLogin) {
        try {
          student = await S.verifyStudentLogin(className, name, password);
        } catch (e) {
          console.warn('[Login] Firebase 验证失败');
        }
      }

      if (student) {
        // 登入成功
        const sessionData = {
          studentId: student.studentId || student.id,
          studentName: student.name,
          studentClass: student.class,
          loginTime: Date.now()
        };

        S.saveSession && S.saveSession('studentSession', sessionData);

        // 记住班级
        if (document.getElementById('rememberClass').checked) {
          S.saveLocal && S.saveLocal('rememberedClass', className);
        } else {
          S.removeLocal && S.removeLocal('rememberedClass');
        }

        // 记录日志
        if (S.addLog) {
          try {
            await S.addLog('login', student.studentId || student.id, `${student.name} 登入系统`);
          } catch (e) {}
        }

        S.showToast && S.showToast('登入成功！', 'success');
        setTimeout(() => {
          window.location.href = 'student.html';
        }, 500);
      } else {
        showError('帐号或密码错误，请确认班级、姓名和学号是否正确');
        if (btn) shakeElement(btn);
      }
    } catch (error) {
      console.error('[Login] 登入失败:', error);
      showError('登入失败，请稍后再试');
    } finally {
      if (btn) {
        btn.classList.remove('btn--loading');
        btn.disabled = false;
        btn.textContent = '登入';
      }
    }
  }

  /**
   * 显示错误信息
   * @param {string} msg - 错误消息
   */
  function showError(msg) {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
      errorDiv.textContent = msg;
      errorDiv.classList.add('login-error--visible');
      // 3秒后自动隐藏
      setTimeout(() => {
        errorDiv.classList.remove('login-error--visible');
      }, 3000);
    }
    S.showToast && S.showToast(msg, 'error');
  }

  /**
   * 摇晃元素（错误反馈）
   * @param {HTMLElement} el
   */
  function shakeElement(el) {
    el.style.animation = 'none';
    el.offsetHeight; // 强制回流
    el.style.animation = 'shake 0.5s ease';
    setTimeout(() => {
      el.style.animation = '';
    }, 500);
  }

  // ========================================
  // 登出
  // ========================================
  function logout() {
    S.clearSession && S.clearSession('studentSession');
    window.location.href = 'login.html';
  }

  // ========================================
  // 事件绑定
  // ========================================
  function bindEvents() {
    // 班级切换
    const classSelect = document.getElementById('classSelect');
    if (classSelect) {
      classSelect.addEventListener('change', async function () {
        const className = this.value;
        if (className) {
          await loadStudents(className);
        } else {
          const nameSelect = document.getElementById('nameSelect');
          if (nameSelect) {
            nameSelect.innerHTML = '<option value="">请先选择班级</option>';
          }
        }
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
      passwordInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          login();
        }
      });
    }

    // 返回首页
    const backBtn = document.getElementById('backHomeBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
      });
    }
  }

  // ========================================
  // 导出
  // ========================================
  window.SPSS.studentLogin = login;
  window.SPSS.studentLogout = logout;

  // ========================================
  // 启动
  // ========================================
  document.addEventListener('DOMContentLoaded', init);

  console.log('[SPSS] Login 模块已加载');
})();
