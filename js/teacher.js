/**
 * Star Photo Share System
 * Teacher JS - 教师后台逻辑
 * Version 3.0
 * 2026-08-04
 *
 * 功能：Dashboard 统计、学生列表、作品查看、搜索、CSV 下载、呈堂模式
 * v3: 重構初始化流程 — 本地 JSON + Supabase works 為數據源，過濾診斷文檔
 */

(function () {
  'use strict';

  const S = window.SPSS || {};

  // ========================================
  // 状态变量
  // ========================================
  let currentTeacher = null;
  let allStudents = [];
  let allWorks = [];
  let allClassStats = [];
  let filteredStudents = [];
  let presentIndex = -1;
  let isPresenting = false;
  let charts = {};

  // ========================================
  // DOM 輔助：設定元素文字
  // ========================================
  function setVal(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ========================================
  // 初始化
  // ========================================
  async function init() {
    console.log('[Teacher] 教师后台初始化 v3');

    // 检查权限
    var hasPermission = await checkPermission();
    if (!hasPermission) return;

    // 先綁定事件，確保 UI 立即可互動
    bindEvents();

    // 加載數據（逐步執行，確保每個步驟完成）
    try {
      await loadStudents();    // 1. 先載入學生列表（從本地 JSON + works）
      await loadWorks();       // 2. 載入作品列表（從 Supabase）
      await mergeWorksToStudents(); // 3. 將作品完成狀態合併到學生列表
      await loadDashboardStats();   // 4. 計算並渲染儀表板統計
      await loadClassStats();       // 5. 計算班級統計
    } catch (e) {
      console.error('[Teacher] 初始化失敗:', e);
    }

    // 啟動即時監聽（學生上傳後儀表板自動更新）
    listenToWorks();

    // 渲染
    renderCharts();
    renderStudentsTable(filteredStudents);

    console.log('[Teacher] 初始化完成，已完成學生:', filteredStudents.filter(function(s){return s.completed||s.photoURL||s.photoLink;}).length);
  }

  // ========================================
  // 权限检查
  // ========================================
  async function checkPermission() {
    // 检查本地帐号配置
    var cfg = S.TEACHER_CONFIG;
    var session = S.getSession && S.getSession('teacherSession');

    // 检查 Supabase Auth
    if (S.getCurrentTeacher) {
      try {
        currentTeacher = await S.getCurrentTeacher();
        if (currentTeacher) {
          updateTeacherUI();
          return true;
        }
      } catch (e) {
        console.warn('[Teacher] Supabase Auth 检查失败');
      }
    }

    // 检查本地 Session
    if (session) {
      currentTeacher = session;
      updateTeacherUI();
      return true;
    }

    // 本地教师帐号（开发模式自动登入）
    if (cfg) {
      currentTeacher = {
        uid: 'local-teacher-001',
        email: cfg.email,
        name: cfg.displayName,
        role: cfg.role
      };
      updateTeacherUI();
      return true;
    }

    console.warn('[Teacher] 无权限，请先登入');
    window.location.href = 'teacher-login.html';
    return false;
  }

  function updateTeacherUI() {
    const nameEl = document.getElementById('teacherName');
    const roleEl = document.getElementById('teacherRole');
    if (nameEl) nameEl.textContent = currentTeacher?.name || '教师';
    if (roleEl) roleEl.textContent = currentTeacher?.role || 'teacher';
  }

  // ========================================
  // 加载 Dashboard 统计
  // ========================================
  async function loadDashboardStats() {
    try {
      var totalStudents = allStudents.length;
      var completedCount = 0;

      // 從 allWorks 計算實際完成人數（過濾診斷文檔）
      if (allWorks && allWorks.length > 0) {
        var ids = {};
        allWorks.forEach(function(w) {
          var sid = w.studentId || w.id;
          if (sid && !sid.startsWith('__')) ids[sid] = true;
        });
        completedCount = Object.keys(ids).length;
        console.log('[Teacher] ✅ works 集合統計: ' + completedCount + ' 人已完成');
      }

      // 計算未完成人数和完成率
      var incompleteCount = totalStudents - completedCount;
      var rate = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

      // 更新 UI
      setVal('statTotalStudents', totalStudents);
      setVal('statCompleted', completedCount);
      setVal('statRate', rate + '%');
      setVal('statIncomplete', incompleteCount);

      console.log('[Teacher] 儀表板: ' + totalStudents + ' 學生, ' + completedCount + ' 已完成, ' + rate + '%');

    } catch (error) {
      console.error('[Teacher] 统计加载失败:', error);
    }
  }

  // ========================================
  // 加载班级统计
  // ========================================
  async function loadClassStats() {
    try {
      if (S.getAllClassStats) {
        try {
          allClassStats = await S.getAllClassStats();
          console.log('[Teacher] ✅ 班级统计加载完成:', allClassStats.length + ' 个班级');
        } catch (e) {
          console.error('[Teacher] ❌ getAllClassStats 失败:', e);
          allClassStats = [];
        }
      }

      if (allClassStats.length === 0) {
        // 从 students.json 计算班级统计（仅当 Supabase 不可用时）
        try {
          const response = await fetch('data/students.json');
          if (response.ok) {
            const students = await response.json();
            const classMap = {};
            students.forEach(s => {
              if (!classMap[s.class]) classMap[s.class] = { total: 0, completed: 0 };
              classMap[s.class].total++;
            });
            allClassStats = Object.entries(classMap).map(([cls, data]) => ({
              className: cls,
              studentCount: data.total,
              completedCount: 0,
              completionRate: 0
            }));
          }
        } catch (e) {
          console.warn('[Teacher] 本地班级统计加载失败:', e);
        }
      }

      renderClassProgress(allClassStats);

    } catch (error) {
      console.error('[Teacher] 班级统计加载失败:', error);
    }
  }

  function renderClassProgress(stats) {
    const container = document.getElementById('classProgressList');
    if (!container) return;

    if (stats.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center">暂无数据</p>';
      return;
    }

    container.innerHTML = stats.map(cls => `
      <div class="class-progress-item" data-class="${cls.className}" tabindex="0" role="button" aria-label="${cls.className} 完成率 ${cls.completionRate}%">
        <span class="class-progress-item__name">${S.escapeHTML ? S.escapeHTML(cls.className) : cls.className}</span>
        <span class="class-progress-item__count">${cls.completedCount} / ${cls.studentCount}</span>
        <div class="class-progress-item__bar">
          <div class="progress" aria-hidden="true">
            <div class="progress__bar" style="width:${cls.completionRate}%"></div>
          </div>
        </div>
        <span class="class-progress-item__rate">${cls.completionRate}%</span>
      </div>
    `).join('');

    // 点击跳转到班级 Gallery
    container.querySelectorAll('.class-progress-item').forEach(item => {
      item.addEventListener('click', () => {
        window.location.href = `gallery.html?class=${encodeURIComponent(item.dataset.class)}`;
      });
    });
  }

  // ========================================
  // 加载学生列表
  // ========================================
  async function loadStudents() {
    try {
      // 從本地 JSON 加載（Supabase students 集合可能為空）
      var response = await fetch('data/students.json');
      if (!response.ok) {
        console.warn('[Teacher] 無法載入 students.json');
        allStudents = [];
        filteredStudents = [];
        return;
      }

      var rawStudents = await response.json();

      // 合併云端作品状态
      allStudents = rawStudents.map(function(s) {
        return Object.assign({}, s, { id: s.studentId });
      });

      filteredStudents = allStudents.slice();
      console.log('[Teacher] ✅ 學生載入: ' + allStudents.length + ' 人');

    } catch (error) {
      console.error('[Teacher] 学生列表加载失败:', error);
      allStudents = [];
      filteredStudents = [];
    }
  }

  /**
   * 將 Supabase works 的完成狀態合併到 allStudents
   * 雲端數據優先
   */
  function mergeWorksToStudents() {
    if (!allWorks || allWorks.length === 0) return;

    var mergedCount = 0;
    allWorks.forEach(function(w) {
      // 兼容驼峰和下划线两种字段名
      var sid = w.studentId || w.student_id || w.id;
      if (!sid || sid.startsWith('__')) return;

      var student = allStudents.find(function(s) { return s.studentId === sid; });
      if (student) {
        if (!student.completed) mergedCount++;
        student.completed = true;
        // 兼容驼峰和下划线字段名
        student.photoURL = student.photoURL || w.photoURL || w.photo_url || '';
        student.photoLink = student.photoLink || w.photo_link || '';
        student.reason = student.reason || w.reason || '';
        student.uploadTime = student.uploadTime || w.uploadTime || w.updatedAt || w.updated_at || '';
      }
    });

    if (mergedCount > 0) {
      console.log('[Teacher] ✅ works 合併: ' + mergedCount + ' 名學生標記為完成');
    }

    // 同步更新 filteredStudents
    filteredStudents = allStudents.slice();
  }

  // ========================================
  // 加载作品列表
  // ========================================
  async function loadWorks() {
    try {
      if (S.getAllWorks) {
        try {
          var works = await S.getAllWorks();
          // 過濾診斷文檔
          allWorks = works.filter(function(w) {
            var sid = w.studentId || w.id || '';
            return !sid.startsWith('__');
          });
          console.log('[Teacher] ✅ 作品載入: ' + allWorks.length + ' 件');
          // 立即合并作品状态
          mergeWorksToStudents();
        } catch (e) {
          console.error('[Teacher] ❌ getAllWorks 失败:', e);
          allWorks = [];
        }
      }
    } catch (error) {
      console.error('[Teacher] 作品加载失败:', error);
    }
  }

  /**
   * 實時監聽作品變更 — 學生上傳後教師儀表板自動更新
   * 使用 Supabase Realtime（替代旧版 Firestore onSnapshot）
   */
  function listenToWorks() {
    if (!S.isSupabaseAvailable) {
      console.warn('[Teacher] Supabase 未初始化，使用輪詢備援');
      // 備援：每 10 秒輪詢（加快速率）
      setInterval(async function() {
        try {
          var works = await S.getAllWorks();
          allWorks = works.filter(function(w) {
            var sid = w.studentId || w.id || '';
            return !sid.startsWith('__');
          });
          mergeWorksToStudents();
          updateDashboardFromWorks();
          renderStudentsTable(filteredStudents);
        } catch(e) {}
      }, 10000);
      return;
    }

    try {
      const unsubscribe = S.subscribeWorks(function(payload) {
        var data = payload.new || payload.old;
        if (!data) return;

        // 過濾診斷文檔
        var sid = data.student_id || data.studentId || data.id || '';
        if (sid.startsWith('__')) return;

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          var workData = {
            id: sid,
            studentId: data.student_id || sid,
            name: data.name,
            class: data.class,
            photoURL: data.photo_url || data.photoURL || '',
            photoLink: data.photo_link || data.photoLink || '',
            reason: data.reason,
            completed: data.completed,
            createdAt: data.created_at || data.createdAt,
            updatedAt: data.updated_at || data.updatedAt
          };

          var existingIdx = -1;
          for (var i = 0; i < allWorks.length; i++) {
            if (allWorks[i].id === sid) { existingIdx = i; break; }
          }
          if (existingIdx >= 0) {
            allWorks[existingIdx] = workData;
          } else {
            allWorks.push(workData);
          }
          mergeWorksToStudents();
          updateDashboardFromWorks();
          renderStudentsTable(filteredStudents);
          console.log('[Teacher] 🔄 即時更新作品:', workData.name || sid);
        } else if (payload.eventType === 'DELETE') {
          allWorks = allWorks.filter(function(w) { return w.id !== sid; });
          mergeWorksToStudents();
          updateDashboardFromWorks();
          renderStudentsTable(filteredStudents);
        }
      });
      console.log('[Teacher] 🔄 Supabase 即時監聽已啟動');
    } catch(e) {
      console.warn('[Teacher] 無法啟動即時監聽:', e.message);
    }
  }

  /**
   * 從 works 集合更新儀表板統計
   */
  function updateDashboardFromWorks() {
    var completedIds = {};
    allWorks.forEach(function(w) {
      var sid = w.studentId || w.id;
      if (sid && !sid.startsWith('__')) completedIds[sid] = true;
    });
    var completedCount = Object.keys(completedIds).length;
    var total = allStudents.length || 101;

    setVal('statCompleted', completedCount);
    setVal('statIncomplete', total - completedCount);
    setVal('statRate', total > 0 ? Math.round((completedCount / total) * 100) + '%' : '0%');
    setVal('statTotalStudents', total);
  }

  // ========================================
  // 渲染学生表格
  // ========================================
  function renderStudentsTable(students) {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    if (students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px">没有符合条件的学生</td></tr>';
      return;
    }

    tbody.innerHTML = students.map(s => {
      const isCompleted = s.completed || s.photoURL || s.photoLink;
      return `
        <tr>
          <td>${S.escapeHTML ? S.escapeHTML(s.name) : s.name}</td>
          <td style="font-family:var(--font-mono);font-size:var(--font-size-sm)">${s.studentId || '-'}</td>
          <td>${S.escapeHTML ? S.escapeHTML(s.class) : s.class}</td>
          <td>
            <span class="badge ${isCompleted ? 'badge--success' : 'badge--warning'}">
              ${isCompleted ? '已完成' : '未完成'}
            </span>
          </td>
          <td style="font-size:var(--font-size-xs)">${S.formatTime ? S.formatTime(s.uploadTime || s.lastLogin) : '-'}</td>
          <td>
            <button class="table-action-btn view-student-btn" data-student-id="${s.studentId || ''}" aria-label="查看 ${s.name} 的作品" title="查看作品">👁</button>
          </td>
        </tr>
      `;
    }).join('');

    // 绑定查看按钮
    tbody.querySelectorAll('.view-student-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const studentId = this.dataset.studentId;
        openStudentWork(studentId);
      });
    });
  }

  // ========================================
  // 查看学生作品
  // ========================================
  function openStudentWork(studentId) {
    const work = allWorks.find(w => w.studentId === studentId || w.id === studentId);
    const student = allStudents.find(s => s.studentId === studentId);

    if (!student) return;

    const imageSrc = work?.photoURL || work?.photoLink || student?.photoURL || student?.photoLink || '';
    const timeStr = S.formatTime ? S.formatTime(work?.updatedAt || student?.uploadTime) : '';

    S.showModal({
      title: student.name,
      content: `
        <div class="work-preview">
          ${imageSrc
            ? `<img src="${imageSrc}" alt="${student.name}的作品" class="work-preview__image" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"/>`
            : ''
          }
          <div style="display:${imageSrc ? 'none' : 'block'};text-align:center;padding:40px;color:var(--text-muted)">📷 暂无作品图片</div>
          <div class="work-preview__info">
            <div class="work-preview__info-item">
              <span class="work-preview__info-label">班级</span>
              <span class="work-preview__info-value">${S.escapeHTML ? S.escapeHTML(student.class) : student.class}</span>
            </div>
            <div class="work-preview__info-item">
              <span class="work-preview__info-label">学号</span>
              <span class="work-preview__info-value" style="font-family:var(--font-mono)">${student.studentId || '-'}</span>
            </div>
            <div class="work-preview__info-item">
              <span class="work-preview__info-label">状态</span>
              <span class="work-preview__info-value">${student.completed || work?.completed ? '✅ 已完成' : '⚠ 未完成'}</span>
            </div>
            ${timeStr ? `<div class="work-preview__info-item"><span class="work-preview__info-label">上传时间</span><span class="work-preview__info-value">${timeStr}</span></div>` : ''}
          </div>
          ${work?.reason || student.reason ? `
            <div style="margin-top:16px;text-align:left">
              <p style="color:var(--text-muted);font-size:var(--font-size-sm);margin-bottom:8px">分享原因：</p>
              <p style="color:var(--text-secondary);font-size:var(--font-size-sm);line-height:1.6">${S.escapeHTML ? S.escapeHTML(work?.reason || student.reason) : (work?.reason || student.reason)}</p>
            </div>
          ` : ''}
        </div>
      `,
      footer: `
        ${imageSrc ? '<button class="btn btn--primary present-current-btn">⛶ 呈堂展示</button>' : ''}
        <button class="btn btn--ghost close-modal-btn">关闭</button>
      `,
      size: 'lg'
    });

    // 呈堂按钮
    setTimeout(() => {
      const presentBtn = document.querySelector('.present-current-btn');
      if (presentBtn) {
        presentBtn.addEventListener('click', () => {
          document.querySelector('.modal-overlay')?.remove();
          startPresentMode(studentId);
        });
      }
    }, 100);
  }

  // ========================================
  // 呈堂展示
  // ========================================
  function startPresentMode(studentId) {
    const idx = filteredStudents.findIndex(s => s.studentId === studentId);
    presentIndex = idx >= 0 ? idx : 0;
    isPresenting = true;
    showPresentSlide();
  }

  function showPresentSlide() {
    // 移除旧的呈堂画面
    const old = document.getElementById('teacherPresentMode');
    if (old) old.remove();

    const student = filteredStudents[presentIndex];
    if (!student) return;

    const work = allWorks.find(w => w.studentId === student.studentId);
    const imageSrc = work?.photoURL || work?.photoLink || student?.photoURL || student?.photoLink || '';

    const el = document.createElement('div');
    el.className = 'present-mode';
    el.id = 'teacherPresentMode';
    el.innerHTML = `
      <button class="present-mode__close" id="tPresentCloseBtn">ESC 退出</button>
      ${imageSrc
        ? `<img src="${imageSrc}" alt="${student.name}的作品" class="present-mode__image" onerror="this.style.display='none'"/>`
        : '<div class="present-mode__empty">📷</div>'
      }
      <div class="present-mode__info">
        <h2 class="present-mode__name">${S.escapeHTML ? S.escapeHTML(student.name) : student.name}</h2>
        <p class="present-mode__class">${S.escapeHTML ? S.escapeHTML(student.class) : student.class}</p>
        ${work?.reason || student.reason ? `<p class="present-mode__reason">${S.escapeHTML ? S.escapeHTML(work?.reason || student.reason) : (work?.reason || student.reason)}</p>` : ''}
      </div>
      <div class="present-controls">
        <button class="present-controls__btn" id="tPresentPrevBtn" aria-label="上一位" ${presentIndex <= 0 ? 'disabled' : ''}>&larr;</button>
        <span style="color:var(--text-muted);font-size:var(--font-size-sm);display:flex;align-items:center">${presentIndex + 1} / ${filteredStudents.length}</span>
        <button class="present-controls__btn" id="tPresentNextBtn" aria-label="下一位" ${presentIndex >= filteredStudents.length - 1 ? 'disabled' : ''}>&rarr;</button>
      </div>
    `;

    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';

    document.getElementById('tPresentCloseBtn').addEventListener('click', exitPresentMode);
    const prevBtn = document.getElementById('tPresentPrevBtn');
    const nextBtn = document.getElementById('tPresentNextBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => {
      if (presentIndex > 0) { presentIndex--; showPresentSlide(); }
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      if (presentIndex < filteredStudents.length - 1) { presentIndex++; showPresentSlide(); }
    });

    document.addEventListener('keydown', teacherPresentKeyHandler);
  }

  function exitPresentMode() {
    const el = document.getElementById('teacherPresentMode');
    if (el) el.remove();
    isPresenting = false;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', teacherPresentKeyHandler);
  }

  function teacherPresentKeyHandler(e) {
    switch (e.key) {
      case 'Escape':
        exitPresentMode();
        break;
      case 'ArrowLeft':
        if (presentIndex > 0) { presentIndex--; showPresentSlide(); }
        break;
      case 'ArrowRight':
        if (presentIndex < filteredStudents.length - 1) { presentIndex++; showPresentSlide(); }
        break;
      case 'f':
      case 'F':
        const el = document.getElementById('teacherPresentMode');
        if (el) {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            el.requestFullscreen();
          }
        }
        break;
    }
  }

  // ========================================
  // 搜索
  // ========================================
  function searchStudent(query) {
    if (!query) {
      filteredStudents = [...allStudents];
    } else {
      const q = query.toLowerCase();
      filteredStudents = allStudents.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.studentId && s.studentId.includes(q)) ||
        s.class.includes(q)
      );
    }
    renderStudentsTable(filteredStudents);
  }

  // ========================================
  // 筛选
  // ========================================
  function filterByStatus(status) {
    switch (status) {
      case 'completed':
        filteredStudents = allStudents.filter(s => s.completed || s.photoURL || s.photoLink);
        break;
      case 'incomplete':
        filteredStudents = allStudents.filter(s => !s.completed && !s.photoURL && !s.photoLink);
        break;
      default:
        filteredStudents = [...allStudents];
        break;
    }
    renderStudentsTable(filteredStudents);
  }

  // ========================================
  // CSV 下载
  // ========================================
  function downloadCSV() {
    const headers = ['姓名', '学号', '班级', '状态', '上传时间'];
    const rows = filteredStudents.map(s => [
      s.name,
      s.studentId || '',
      s.class,
      (s.completed || s.photoURL || s.photoLink) ? '已完成' : '未完成',
      S.formatTime ? S.formatTime(s.uploadTime).replace(',', ' ') : ''
    ]);

    const BOM = '﻿';
    const csvContent = BOM + [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `students_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    S.showToast && S.showToast('CSV 下载完成', 'success');
  }

  // ========================================
  // Excel 下载（CSV 格式兼容）
  // ========================================
  function downloadExcel() {
    downloadCSV(); // 导出 CSV 兼容 Excel
  }

  // ========================================
  // 图表渲染
  // ========================================
  function renderCharts() {
    renderCompletionChart();
    renderClassBarChart();
  }

  function renderCompletionChart() {
    const canvas = document.getElementById('completionChart');
    if (!canvas) return;

    // 销毁旧图表
    if (charts.completion) charts.completion.destroy();

    const completed = allStudents.filter(s => s.completed || s.photoURL || s.photoLink).length;
    const incomplete = allStudents.length - completed;

    if (typeof Chart !== 'undefined') {
      charts.completion = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: ['已完成', '未完成'],
          datasets: [{
            data: [completed, incomplete],
            backgroundColor: ['rgba(34, 197, 94, 0.7)', 'rgba(245, 158, 11, 0.7)'],
            borderColor: ['rgba(34, 197, 94, 1)', 'rgba(245, 158, 11, 1)'],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#ffffff' }
            }
          }
        }
      });
    } else {
      // 无 Chart.js 时的简易展示
      canvas.parentElement.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><p style="font-size:48px;margin-bottom:8px">${completed}/${allStudents.length}</p><p>完成率: ${allStudents.length > 0 ? Math.round(completed/allStudents.length*100) : 0}%</p></div>`;
    }
  }

  function renderClassBarChart() {
    const canvas = document.getElementById('classBarChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (charts.classBar) charts.classBar.destroy();

    const labels = allClassStats.map(c => c.className);
    const completedData = allClassStats.map(c => c.completedCount);
    const incompleteData = allClassStats.map(c => c.studentCount - c.completedCount);

    charts.classBar = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '已完成',
            data: completedData,
            backgroundColor: 'rgba(34, 197, 94, 0.7)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 1
          },
          {
            label: '未完成',
            data: incompleteData,
            backgroundColor: 'rgba(245, 158, 11, 0.7)',
            borderColor: 'rgba(245, 158, 11, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: {
            stacked: true,
            ticks: { color: '#ffffff' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          },
          y: {
            stacked: true,
            ticks: { color: '#ffffff' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#ffffff' }
          }
        }
      }
    });
  }

  // ========================================
  // 事件绑定
  // ========================================
  function bindEvents() {
    // 搜索
    const searchInput = document.getElementById('teacherSearch');
    if (searchInput) {
      const debouncedSearch = S.debounce
        ? S.debounce((q) => searchStudent(q), 300)
        : (q) => searchStudent(q);
      searchInput.addEventListener('input', function () {
        debouncedSearch(this.value.trim());
      });
    }

    // 状态筛选
    const filterSelect = document.getElementById('statusFilter');
    if (filterSelect) {
      filterSelect.addEventListener('change', function () {
        filterByStatus(this.value);
      });
    }

    // 下载按钮
    const csvBtn = document.getElementById('downloadCSVBtn');
    const excelBtn = document.getElementById('downloadExcelBtn');
    if (csvBtn) csvBtn.addEventListener('click', downloadCSV);
    if (excelBtn) excelBtn.addEventListener('click', downloadExcel);

    // 侧边栏导航
    document.querySelectorAll('.sidebar__link[data-section]').forEach(link => {
      link.addEventListener('click', function () {
        const section = this.dataset.section;

        // 更新 active 状态
        document.querySelectorAll('.sidebar__link').forEach(l => l.classList.remove('sidebar__link--active'));
        this.classList.add('sidebar__link--active');

        // 显示对应区块
        document.querySelectorAll('.dashboard-section').forEach(s => s.style.display = 'none');
        const target = document.getElementById(`section-${section}`);
        if (target) target.style.display = 'block';
      });
    });

    // 登出
    const logoutBtn = document.getElementById('teacherLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (S.teacherLogout) {
          try { await S.teacherLogout(); } catch (e) {}
        }
        S.clearSession && S.clearSession('teacherSession');
        window.location.href = 'teacher-login.html';
      });
    }
  }

  // ========================================
  // 导出
  // ========================================
  window.SPSS.teacherSearchStudent = searchStudent;
  window.SPSS.teacherFilterStatus = filterByStatus;
  window.SPSS.teacherDownloadCSV = downloadCSV;
  window.SPSS.teacherDownloadExcel = downloadExcel;

  // ========================================
  // 启动
  // ========================================
  document.addEventListener('DOMContentLoaded', init);

  console.log('[SPSS] Teacher 模块已加载');
})();
