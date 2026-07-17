/**
 * Star Photo Share System
 * App JS - 首页控制逻辑
 * Version 1.0
 * 2026-07-17
 *
 * 功能：星空动画（Canvas）、流星、班级星球、完成率统计、页面初始化
 */

(function () {
  'use strict';

  // ========================================
  // 全局引用
  // ========================================
  const S = window.SPSS || {};

  // ========================================
  // 页面初始化
  // ========================================
  async function init() {
    console.log('[App] 首页初始化开始');

    // 创建星空背景
    createStars();

    // 创建星云
    createNebula();

    // 启动流星生成
    startMeteorShower();

    // 加载班级数据
    await loadClasses();

    // 绑定事件
    bindEvents();

    console.log('[App] 首页初始化完成');
  }

  // ========================================
  // 星空背景 (Canvas)
  // ========================================
  function createStars() {
    const canvas = document.getElementById('starCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let stars = [];
    const STAR_COUNT = 400;

    // 调整画布大小
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', debounce(resizeCanvas, 200));

    // 生成星星
    function generateStars() {
      stars = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 3 + 1,
          opacity: Math.random() * 0.7 + 0.3,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          twinklePhase: Math.random() * Math.PI * 2,
          hue: Math.random() > 0.7
            ? Math.random() * 60 + 200  // 蓝色系
            : Math.random() > 0.5
              ? 270 + Math.random() * 30  // 紫色系
              : 0  // 白色
        });
      }
    }
    generateStars();

    // 动画循环
    let animationId;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        // 闪烁效果
        const twinkle = Math.sin(star.twinklePhase) * 0.5 + 0.5;
        const alpha = star.opacity * twinkle;

        // 绘制星星
        ctx.beginPath();
        if (star.hue === 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        } else {
          ctx.fillStyle = `hsla(${star.hue}, 80%, 70%, ${alpha})`;
        }
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();

        // 大星星添加光晕
        if (star.r > 2.5) {
          ctx.beginPath();
          const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.r * 3);
          gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.5})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = gradient;
          ctx.arc(star.x, star.y, star.r * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // 更新闪烁相位
        star.twinklePhase += star.twinkleSpeed;
      });

      animationId = requestAnimationFrame(animate);
    }

    animate();

    // 清理函数
    canvas._cleanup = () => {
      cancelAnimationFrame(animationId);
    };
  }

  // ========================================
  // 生成星云
  // ========================================
  function createNebula() {
    const container = document.querySelector('.star-background');
    if (!container) return;

    const nebulaColors = [
      { class: 'nebula--1', color: 'var(--primary)' },
      { class: 'nebula--2', color: 'var(--secondary)' },
      { class: 'nebula--3', color: 'var(--accent)' },
      { class: 'nebula--4', color: 'var(--star-yellow)' },
      { class: 'nebula--5', color: 'var(--primary-light)' }
    ];

    nebulaColors.forEach(n => {
      const nebula = document.createElement('div');
      nebula.className = `nebula ${n.class}`;
      container.appendChild(nebula);
    });
  }

  // ========================================
  // 流星生成器
  // ========================================
  function startMeteorShower() {
    function createMeteor() {
      const container = document.querySelector('.meteor-container');
      if (!container) return;

      const meteor = document.createElement('div');
      meteor.className = 'meteor';

      // 随机颜色
      const colors = ['', 'meteor--blue', 'meteor--purple', 'meteor--cyan'];
      const colorClass = colors[Math.floor(Math.random() * colors.length)];
      if (colorClass) meteor.classList.add(colorClass);

      // 随机位置（从右上方出现）
      const startX = Math.random() * window.innerWidth;
      const startY = Math.random() * (window.innerHeight * 0.3);

      meteor.style.left = startX + 'px';
      meteor.style.top = startY + 'px';

      // 随机大小
      const size = Math.random() * 1.5 + 1;
      meteor.style.width = size + 'px';
      meteor.style.height = size + 'px';

      container.appendChild(meteor);

      // 动画结束后移除
      meteor.addEventListener('animationend', () => {
        if (meteor.parentNode) {
          meteor.parentNode.removeChild(meteor);
        }
      });
    }

    // 立即生成一颗流星
    createMeteor();

    // 每8~15秒生成一批流星
    function scheduleNext() {
      const delay = Math.random() * 7000 + 8000; // 8~15秒
      setTimeout(() => {
        // 生成1~3颗流星
        const count = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < count; i++) {
          setTimeout(() => createMeteor(), i * 300);
        }
        scheduleNext();
      }, delay);
    }

    scheduleNext();
  }

  // ========================================
  // 加载班级数据并渲染星球
  // ========================================
  async function loadClasses() {
    try {
      // 尝试从 Firebase 加载
      let classStats = [];
      let allStudents = [];

      if (S.getAllClassStats && S.getStudentsByClass) {
        try {
          classStats = await S.getAllClassStats();
        } catch (firebaseErr) {
          console.warn('[App] Firebase 加载班级统计失败，尝试加载本地数据');
        }
      }

      // 如果没有 Firebase 数据，尝试加载本地 JSON
      if (classStats.length === 0) {
        try {
          const response = await fetch('data/students.json');
          if (response.ok) {
            allStudents = await response.json();
            // 手动统计班级
            const classMap = {};
            allStudents.forEach(s => {
              if (!classMap[s.class]) {
                classMap[s.class] = { total: 0, completed: 0 };
              }
              classMap[s.class].total++;
              if (s.completed) classMap[s.class].completed++;
            });
            classStats = Object.entries(classMap).map(([className, stats]) => ({
              className,
              studentCount: stats.total,
              completedCount: stats.completed,
              completionRate: Math.round((stats.completed / stats.total) * 100)
            }));
          }
        } catch (localErr) {
          console.warn('[App] 本地数据加载失败');
        }
      }

      // 如果没有数据，使用示例数据
      if (classStats.length === 0) {
        classStats = [
          { className: '初二忠', studentCount: 35, completedCount: 31, completionRate: 88 },
          { className: '初二孝', studentCount: 36, completedCount: 35, completionRate: 97 },
          { className: '初二仁', studentCount: 35, completedCount: 34, completionRate: 97 },
          { className: '初二爱', studentCount: 34, completedCount: 36, completionRate: 100 }
        ];
      }

      // 渲染星球
      renderPlanets(classStats);

    } catch (error) {
      console.error('[App] 班级数据加载失败:', error);
      S.showToast && S.showToast('班级数据加载失败', 'error');
    }
  }

  /**
   * 渲染班级星球
   * @param {Array} classStats - 班级统计数据
   */
  function renderPlanets(classStats) {
    const grid = document.getElementById('planetGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const planetColors = ['blue', 'purple', 'cyan', 'gold', 'green'];

    classStats.forEach((cls, index) => {
      const color = planetColors[index % planetColors.length];
      const rate = cls.completionRate || 0;
      const stars = getStarRating(rate);

      const card = document.createElement('div');
      card.className = `planet-card glass-card planet--${color}`;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${cls.className}，完成率 ${rate}%`);
      card.setAttribute('tabindex', '0');
      card.dataset.className = cls.className;
      card.innerHTML = `
        <div class="planet-card__sphere">
          <div class="planet-card__ring"></div>
          <div class="planet-card__glow"></div>
        </div>
        <h3 class="planet-card__name">${S.escapeHTML ? S.escapeHTML(cls.className) : cls.className}</h3>
        <p class="planet-card__progress-text">
          ${cls.completedCount || 0} / ${cls.studentCount || 0}
        </p>
        <div class="planet-card__stars">${stars}</div>
        <div class="planet-card__progress">
          <div class="progress" aria-label="完成率 ${rate}%">
            <div class="progress__bar" style="width:${rate}%"></div>
          </div>
        </div>
      `;

      // 点击跳转到登入页面
      card.addEventListener('click', () => goLogin(cls.className));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goLogin(cls.className);
        }
      });

      grid.appendChild(card);
    });
  }

  /**
   * 根据完成率生成星级显示
   * @param {number} rate - 完成率 0-100
   * @returns {string} 星级字符串
   */
  function getStarRating(rate) {
    if (rate >= 100) return '★★★★★';
    if (rate >= 80) return '★★★★☆';
    if (rate >= 60) return '★★★☆☆';
    if (rate >= 40) return '★★☆☆☆';
    if (rate >= 20) return '★☆☆☆☆';
    return '☆☆☆☆☆';
  }

  // ========================================
  // 跳转登入页面
  // ========================================
  function goLogin(className) {
    window.location.href = `login.html?class=${encodeURIComponent(className)}`;
  }

  // ========================================
  // 绑定事件
  // ========================================
  function bindEvents() {
    // CTA 按钮 - 滚动到班级区域
    const ctaBtn = document.getElementById('ctaExplore');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', () => {
        const galaxy = document.getElementById('classGalaxy');
        if (galaxy) {
          galaxy.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // 滚动提示
    const scrollHint = document.querySelector('.hero__scroll-hint');
    if (scrollHint) {
      scrollHint.addEventListener('click', () => {
        const galaxy = document.getElementById('classGalaxy');
        if (galaxy) {
          galaxy.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // 教师登入按钮
    const teacherBtn = document.getElementById('teacherBtn');
    if (teacherBtn) {
      teacherBtn.addEventListener('click', () => {
        window.location.href = 'teacher-login.html';
      });
    }

    // Header 滚动效果
    window.addEventListener('scroll', throttle(() => {
      const header = document.querySelector('.header');
      if (header) {
        if (window.scrollY > 50) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }
    }, 100));
  }

  // ========================================
  // 工具函数（本地）
  // ========================================
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function throttle(fn, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => { inThrottle = false; }, limit);
      }
    };
  }

  // ========================================
  // 启动
  // ========================================
  document.addEventListener('DOMContentLoaded', init);

  console.log('[SPSS] App 首页模块已加载');
})();
