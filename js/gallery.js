/**
 * Star Photo Share System
 * Gallery JS - 班级作品展示页面逻辑
 * Version 1.0
 * 2026-07-17
 *
 * 功能：作品网格/星图模式、全屏展示、搜索、班级切换、键盘导航
 */

(function () {
  'use strict';

  const S = window.SPSS || {};

  // ========================================
  // 状态变量
  // ========================================
  let currentClass = '';
  let allWorks = [];
  let filteredWorks = [];
  let currentViewIndex = -1;
  let isPresentMode = false;
  let isGalaxyView = false;
  let viewMode = 'grid'; // 'grid' | 'galaxy'

  // ========================================
  // 初始化
  // ========================================
  async function init() {
    console.log('[Gallery] 作品展示初始化');

    // 读取 URL 参数中的班级
    currentClass = S.getURLParam && S.getURLParam('class') || '';

    // 加载班级列表
    await loadClassFilter();

    // 加载作品
    await loadWorks();

    // 绑定事件
    bindEvents();

    console.log('[Gallery] 作品展示初始化完成');
  }

  // ========================================
  // 加载班级下拉选单
  // ========================================
  async function loadClassFilter() {
    const select = document.getElementById('galleryClassSelect');
    if (!select) return;

    try {
      let classes = [];

      if (S.getAllClasses) {
        try {
          classes = await S.getAllClasses();
        } catch (e) {}
      }

      if (classes.length === 0) {
        try {
          const response = await fetch('data/students.json');
          if (response.ok) {
            const students = await response.json();
            const classSet = new Set(students.map(s => s.class));
            classes = Array.from(classSet).sort();
          }
        } catch (e) {}
      }

      if (classes.length === 0) {
        classes = ['初二忠', '初二孝', '初二仁', '初二爱'];
      }

      select.innerHTML = '<option value="">全部班级</option>';
      classes.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls;
        option.textContent = cls;
        select.appendChild(option);
      });

      if (currentClass) {
        select.value = currentClass;
      }
    } catch (error) {
      console.error('[Gallery] 班级加载失败:', error);
    }
  }

  // ========================================
  // 加载作品（合并学生名单与作品数据）
  // ========================================
  async function loadWorks() {
    const container = document.getElementById('galleryGrid');
    if (!container) return;

    container.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';

    try {
      let students = [];
      let worksMap = {};

      // 1. 加载所有学生名单
      if (S.getStudentsByClass && currentClass) {
        try {
          students = await S.getStudentsByClass(currentClass);
        } catch (e) { console.warn('[Gallery] Firebase 学生加载失败'); }
      }

      // 本地降级
      if (students.length === 0) {
        try {
          const response = await fetch('data/students.json');
          if (response.ok) {
            let allStudents = await response.json();
            if (currentClass) {
              allStudents = allStudents.filter(s => s.class === currentClass);
            }
            students = allStudents;
          }
        } catch (e) { console.warn('[Gallery] 本地学生数据加载失败'); }
      }

      // 2. 加载作品数据并建立映射
      try {
        let works = [];
        if (S.getWorksByClass && currentClass) {
          works = await S.getWorksByClass(currentClass);
        }
        works.forEach(w => {
          worksMap[w.studentId || w.id] = w;
        });
      } catch (e) { console.warn('[Gallery] 作品数据加载失败'); }

      // 3. 合并：所有学生都显示，有作品的显示作品信息
      allWorks = students.map(s => {
        const work = worksMap[s.studentId];
        return {
          id: s.studentId,
          studentId: s.studentId,
          name: s.name,
          class: s.class,
          photoURL: work ? (work.photoURL || '') : (s.photoURL || ''),
          photoLink: work ? (work.photoLink || '') : (s.photoLink || ''),
          reason: work ? (work.reason || '') : (s.reason || ''),
          completed: !!(work || s.completed || s.photoURL || s.photoLink),
          updatedAt: work ? (work.updatedAt || work.createdAt) : (s.uploadTime || null)
        };
      });

      filteredWorks = [...allWorks];
      renderGallery(filteredWorks);

    } catch (error) {
      console.error('[Gallery] 作品加载失败:', error);
      container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">❌</div><p class="empty-state__title">加载失败</p></div>';
    }
  }

  // ========================================
  // 渲染作品网格
  // ========================================
  function renderGallery(works) {
    const container = document.getElementById('galleryGrid');
    if (!container) return;

    if (viewMode === 'galaxy') {
      renderGalaxyView(works);
      return;
    }

    container.className = 'gallery-grid';

    if (works.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state__icon">🪐</div>
          <p class="empty-state__title">暂无作品</p>
          <p class="empty-state__text">该班级尚未有学生上传作品</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    works.forEach((work, index) => {
      const isCompleted = work.photoURL || work.photoLink;
      const card = document.createElement('div');
      card.className = `student-card glass-card ${isCompleted ? 'student-card--completed' : 'student-card--incomplete'}`;
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${work.name}，${isCompleted ? '已完成' : '未完成'}`);
      card.dataset.index = index;

      card.innerHTML = `
        <div class="student-card__header">
          <div class="student-card__avatar">${(work.name || '?').charAt(0)}</div>
          <div class="student-card__info">
            <div class="student-card__name">${S.escapeHTML ? S.escapeHTML(work.name) : work.name}</div>
            <div class="student-card__class">${S.escapeHTML ? S.escapeHTML(work.class) : work.class}</div>
          </div>
        </div>
        <div class="student-card__status">
          ${isCompleted
            ? '<span class="badge badge--success">✅ 已完成</span>'
            : '<span class="badge badge--neutral">❌ 未完成</span>'}
        </div>
        ${isCompleted
          ? `<div class="student-card__thumbnail">
              <img src="${work.photoURL || work.photoLink}" alt="${work.name}的作品" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'student-card__thumbnail--empty\\'>📷</div>'"/>
            </div>`
          : `<div class="student-card__thumbnail--empty">📷</div>`
        }
        ${work.reason
          ? `<div class="student-card__reason">${S.escapeHTML ? S.escapeHTML(work.reason.substring(0, 100)) : work.reason.substring(0, 100)}</div>`
          : ''}
      `;

      card.addEventListener('click', () => openPreview(index));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPreview(index);
        }
      });

      container.appendChild(card);
    });
  }

  // ========================================
  // 星图模式（Galaxy View / Canvas）
  // ========================================
  function renderGalaxyView(works) {
    const container = document.getElementById('galleryGrid');
    if (!container) return;

    container.className = 'galaxy-view';
    container.innerHTML = '<canvas id="galaxyCanvas"></canvas>';

    const canvas = document.getElementById('galaxyCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight || 500;

    // 星星位置数据
    const starPoints = [];
    const padding = 80;

    works.forEach((work, i) => {
      // 随机但避免重叠的位置
      let x, y, overlapping;
      let attempts = 0;
      do {
        x = Math.random() * (canvas.width - padding * 2) + padding;
        y = Math.random() * (canvas.height - padding * 2) + padding;
        overlapping = starPoints.some(p =>
          Math.hypot(p.x - x, p.y - y) < 60
        );
        attempts++;
      } while (overlapping && attempts < 50);

      starPoints.push({
        x, y,
        work,
        index: i,
        completed: work.photoURL || work.photoLink
      });
    });

    // 绘制
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      starPoints.forEach((point, i) => {
        const time = Date.now() / 1000;
        const twinkle = Math.sin(time * (2 + i * 0.5) + i) * 0.3 + 0.7;

        // 星点
        ctx.beginPath();
        const alpha = point.completed ? twinkle * 0.9 : 0.3;
        const color = point.completed ? '#FFD54F' : '#666666';
        const radius = point.completed ? 4 : 3;

        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // 光晕（已完成的学生）
        if (point.completed) {
          const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 15);
          gradient.addColorStop(0, 'rgba(255, 213, 79, 0.4)');
          gradient.addColorStop(1, 'rgba(255, 213, 79, 0)');
          ctx.fillStyle = gradient;
          ctx.arc(point.x, point.y, 15, 0, Math.PI * 2);
          ctx.fill();
        }

        // 名字标签
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(point.work.name, point.x, point.y - 12);

        ctx.globalAlpha = 1;
      });

      requestAnimationFrame(draw);
    }

    draw();

    // 点击事件
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      starPoints.forEach(point => {
        if (Math.hypot(point.x - mouseX, point.y - mouseY) < 20) {
          openPreview(point.index);
        }
      });
    });

    // 保存引用
    canvas._starPoints = starPoints;
  }

  // ========================================
  // 打开作品预览
  // ========================================
  function openPreview(index) {
    currentViewIndex = index;
    const work = filteredWorks[index];
    if (!work) return;

    const isCompleted = work.photoURL || work.photoLink;
    const imageSrc = work.photoURL || work.photoLink;
    const timeStr = S.formatTime ? S.formatTime(work.updatedAt || work.createdAt) : '';

    S.showModal({
      title: work.name,
      content: `
        <div class="work-preview">
          ${imageSrc
            ? `<img src="${imageSrc}" alt="${work.name}的作品" class="work-preview__image" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22150%22><rect fill=%22%23333%22 width=%22200%22 height=%22150%22/><text fill=%22%23999%22 x=%22100%22 y=%2275%22 text-anchor=%22middle%22>图片无法载入</text></svg>'"/>`
            : `<div class="empty-state__icon">📷</div><p class="empty-state__text">暂无作品图片</p>`
          }
          <div class="work-preview__info">
            <div class="work-preview__info-item">
              <span class="work-preview__info-label">班级</span>
              <span class="work-preview__info-value">${S.escapeHTML ? S.escapeHTML(work.class) : work.class}</span>
            </div>
            <div class="work-preview__info-item">
              <span class="work-preview__info-label">状态</span>
              <span class="work-preview__info-value">${isCompleted ? '✅ 已完成' : '❌ 未完成'}</span>
            </div>
            ${timeStr ? `<div class="work-preview__info-item"><span class="work-preview__info-label">上传时间</span><span class="work-preview__info-value">${timeStr}</span></div>` : ''}
          </div>
          ${work.reason ? `
            <div style="margin-top:16px;text-align:left">
              <p style="color:var(--text-muted);font-size:var(--font-size-sm);margin-bottom:8px">分享原因：</p>
              <p style="color:var(--text-secondary);font-size:var(--font-size-sm);line-height:1.6">${S.escapeHTML ? S.escapeHTML(work.reason) : work.reason}</p>
            </div>
          ` : ''}
          <div class="modal-nav">
            <button class="modal-nav__btn" id="modalPrevBtn" aria-label="上一位">&larr;</button>
            <span class="modal-nav__counter">${index + 1} / ${filteredWorks.length}</span>
            <button class="modal-nav__btn" id="modalNextBtn" aria-label="下一位">&rarr;</button>
          </div>
        </div>
      `,
      footer: `
        ${isCompleted ? '<button class="btn btn--primary" id="modalFullscreenBtn">⛶ 全屏展示</button>' : ''}
        <button class="btn btn--ghost" id="modalCloseBtn">关闭</button>
      `,
      size: 'lg',
      onClose: () => {
        document.removeEventListener('keydown', galleryKeyHandler);
      }
    });

    // 绑定 Modal 内按钮
    setTimeout(() => {
      const prevBtn = document.getElementById('modalPrevBtn');
      const nextBtn = document.getElementById('modalNextBtn');
      const fsBtn = document.getElementById('modalFullscreenBtn');
      const closeBtn = document.getElementById('modalCloseBtn');

      if (prevBtn) prevBtn.addEventListener('click', () => {
        if (currentViewIndex > 0) {
          document.querySelector('.modal-overlay')?.remove();
          document.body.style.overflow = '';
          openPreview(currentViewIndex - 1);
        }
      });
      if (nextBtn) nextBtn.addEventListener('click', () => {
        if (currentViewIndex < filteredWorks.length - 1) {
          document.querySelector('.modal-overlay')?.remove();
          document.body.style.overflow = '';
          openPreview(currentViewIndex + 1);
        }
      });
      if (fsBtn) fsBtn.addEventListener('click', togglePresentMode);
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          const overlay = document.querySelector('.modal-overlay');
          if (overlay) S.closeModal && S.closeModal(overlay);
        });
      }

      document.addEventListener('keydown', galleryKeyHandler);
    }, 100);
  }

  // ========================================
  // 全屏展示模式
  // ========================================
  function togglePresentMode() {
    if (isPresentMode) {
      exitPresentMode();
      return;
    }

    const work = filteredWorks[currentViewIndex];
    if (!work) return;

    // 先关闭 Modal
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    isPresentMode = true;

    const presentEl = document.createElement('div');
    presentEl.className = 'present-mode';
    presentEl.id = 'presentMode';
    presentEl.innerHTML = `
      <button class="present-mode__close" aria-label="退出全屏" id="presentCloseBtn">ESC 退出</button>
      ${work.photoURL || work.photoLink
        ? `<img src="${work.photoURL || work.photoLink}" alt="${work.name}的作品" class="present-mode__image" onerror="this.style.display='none';document.getElementById('presentEmpty').style.display='block'"/>`
        : ''
      }
      <div class="present-mode__empty" id="presentEmpty" style="display:${work.photoURL || work.photoLink ? 'none' : 'block'}">📷</div>
      <div class="present-mode__info">
        <h2 class="present-mode__name">${S.escapeHTML ? S.escapeHTML(work.name) : work.name}</h2>
        <p class="present-mode__class">${S.escapeHTML ? S.escapeHTML(work.class) : work.class}</p>
        ${work.reason ? `<p class="present-mode__reason">${S.escapeHTML ? S.escapeHTML(work.reason) : work.reason}</p>` : ''}
      </div>
      ${filteredWorks.length > 1 ? `
        <button class="present-mode__nav present-mode__nav--prev" aria-label="上一位" id="presentPrevBtn">&larr;</button>
        <button class="present-mode__nav present-mode__nav--next" aria-label="下一位" id="presentNextBtn">&rarr;</button>
        <div class="present-mode__counter">${currentViewIndex + 1} / ${filteredWorks.length}</div>
      ` : ''}
    `;

    document.body.appendChild(presentEl);
    document.body.style.overflow = 'hidden';

    // 绑定事件
    document.getElementById('presentCloseBtn').addEventListener('click', exitPresentMode);
    const prevBtn = document.getElementById('presentPrevBtn');
    const nextBtn = document.getElementById('presentNextBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => {
      if (currentViewIndex > 0) {
        currentViewIndex--;
        refreshPresentMode();
      }
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      if (currentViewIndex < filteredWorks.length - 1) {
        currentViewIndex++;
        refreshPresentMode();
      }
    });

    document.addEventListener('keydown', presentKeyHandler);
  }

  function refreshPresentMode() {
    exitPresentMode(true);
    togglePresentMode();
  }

  function exitPresentMode(silent = false) {
    const el = document.getElementById('presentMode');
    if (el) {
      el.style.animation = 'presentOut 0.3s ease forwards';
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 300);
    }
    isPresentMode = false;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', presentKeyHandler);

    if (!silent) {
      S.showToast && S.showToast('已退出全屏模式', 'info');
    }
  }

  // ========================================
  // 键盘处理
  // ========================================
  function galleryKeyHandler(e) {
    if (isPresentMode) return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (currentViewIndex > 0) {
          document.querySelector('.modal-overlay')?.remove();
          document.body.style.overflow = '';
          openPreview(currentViewIndex - 1);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (currentViewIndex < filteredWorks.length - 1) {
          document.querySelector('.modal-overlay')?.remove();
          document.body.style.overflow = '';
          openPreview(currentViewIndex + 1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        const overlay = document.querySelector('.modal-overlay');
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
          document.body.style.overflow = '';
        }
        break;
    }
  }

  function presentKeyHandler(e) {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        exitPresentMode();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (currentViewIndex > 0) {
          currentViewIndex--;
          refreshPresentMode();
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (currentViewIndex < filteredWorks.length - 1) {
          currentViewIndex++;
          refreshPresentMode();
        }
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.getElementById('presentMode')?.requestFullscreen();
        }
        break;
    }
  }

  // ========================================
  // 搜索
  // ========================================
  function searchStudent(query) {
    if (!query) {
      filteredWorks = [...allWorks];
    } else {
      const q = query.toLowerCase();
      filteredWorks = allWorks.filter(w =>
        w.name.toLowerCase().includes(q) ||
        (w.studentId && w.studentId.includes(q))
      );
    }
    renderGallery(filteredWorks);
  }

  // ========================================
  // 排序
  // ========================================
  function sortGallery(sortBy) {
    switch (sortBy) {
      case 'name':
        filteredWorks.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'time':
        filteredWorks.sort((a, b) => {
          const ta = a.updatedAt || a.createdAt || 0;
          const tb = b.updatedAt || b.createdAt || 0;
          return (tb?.seconds || 0) - (ta?.seconds || 0);
        });
        break;
      case 'status':
        filteredWorks.sort((a, b) => {
          const ca = a.photoURL || a.photoLink ? 1 : 0;
          const cb = b.photoURL || b.photoLink ? 1 : 0;
          return cb - ca;
        });
        break;
      default:
        break;
    }
    renderGallery(filteredWorks);
  }

  // ========================================
  // 事件绑定
  // ========================================
  function bindEvents() {
    // 班级切换
    const classSelect = document.getElementById('galleryClassSelect');
    if (classSelect) {
      classSelect.addEventListener('change', function () {
        currentClass = this.value;
        S.setURLParams && S.setURLParams({ class: currentClass || null });
        loadWorks();
      });
    }

    // 搜索
    const searchInput = document.getElementById('gallerySearch');
    if (searchInput) {
      const debouncedSearch = S.debounce
        ? S.debounce((q) => searchStudent(q), 300)
        : (q) => searchStudent(q);

      searchInput.addEventListener('input', function () {
        debouncedSearch(this.value.trim());
      });
    }

    // 排序
    const sortSelect = document.getElementById('gallerySort');
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        sortGallery(this.value);
      });
    }

    // 视图切换
    const gridViewBtn = document.getElementById('viewGridBtn');
    const galaxyViewBtn = document.getElementById('galaxyViewBtn');
    if (gridViewBtn) {
      gridViewBtn.addEventListener('click', () => {
        viewMode = 'grid';
        gridViewBtn.classList.add('view-toggle__btn--active');
        galaxyViewBtn?.classList.remove('view-toggle__btn--active');
        renderGallery(filteredWorks);
      });
    }
    if (galaxyViewBtn) {
      galaxyViewBtn.addEventListener('click', () => {
        viewMode = 'galaxy';
        galaxyViewBtn.classList.add('view-toggle__btn--active');
        gridViewBtn?.classList.remove('view-toggle__btn--active');
        renderGallery(filteredWorks);
      });
    }

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (isPresentMode) {
        presentKeyHandler(e);
      }
    });

    // 返回首页
    const homeBtn = document.getElementById('galleryHomeBtn');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
      });
    }
  }

  // ========================================
  // 导出
  // ========================================
  window.SPSS.gallerySearchStudent = searchStudent;

  // ========================================
  // 启动
  // ========================================
  document.addEventListener('DOMContentLoaded', init);

  console.log('[SPSS] Gallery 模块已加载');
})();
