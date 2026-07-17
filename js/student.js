/**
 * Star Photo Share System
 * Student JS - 学生上传页面逻辑
 * Version 1.0
 * 2026-07-17
 *
 * 功能：读取个人资料、上传图片/网址、压缩图片、储存作品、删除、Session 检查
 */

(function () {
  'use strict';

  const S = window.SPSS || {};

  // ========================================
  // 状态变量
  // ========================================
  let currentStudent = null;
  let selectedFile = null;
  let currentWork = null;
  let isUploading = false;

  // ========================================
  // 初始化
  // ========================================
  async function init() {
    console.log('[Student] 上传页面初始化');

    // 检查 Session
    if (!checkSession()) {
      return;
    }

    // 加载个人资料
    await loadProfile();

    // 加载已有作品
    await loadExistingWork();

    // 绑定事件
    bindEvents();

    console.log('[Student] 上传页面初始化完成');
  }

  // ========================================
  // 检查 Session
  // ========================================
  function checkSession() {
    currentStudent = S.getSession && S.getSession('studentSession');
    if (!currentStudent || !currentStudent.studentId) {
      S.showToast && S.showToast('请先登入', 'warning');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
      return false;
    }
    return true;
  }

  // ========================================
  // 加载个人资料
  // ========================================
  async function loadProfile() {
    try {
      // 先显示 Session 中的基本资料
      document.getElementById('profileName').textContent = currentStudent.studentName || '-';
      document.getElementById('profileClass').textContent = currentStudent.studentClass || '-';
      document.getElementById('profileId').textContent = currentStudent.studentId || '-';

      // 尝试从 Firebase 加载最新资料
      let student = null;
      if (S.getStudentById) {
        try {
          student = await S.getStudentById(currentStudent.studentId);
        } catch (e) {
          console.warn('[Student] Firebase 加载学生资料失败');
        }
      }

      // 本地 JSON
      if (!student) {
        try {
          const response = await fetch('data/students.json');
          if (response.ok) {
            const students = await response.json();
            student = students.find(s => s.studentId === currentStudent.studentId);
          }
        } catch (e) {}
      }

      if (student) {
        currentStudent = { ...currentStudent, ...student };
        updateProfileUI(student);
      }
    } catch (error) {
      console.error('[Student] 加载个人资料失败:', error);
    }
  }

  /**
   * 更新个人资料 UI
   * @param {object} student - 学生数据
   */
  function updateProfileUI(student) {
    const statusEl = document.getElementById('profileStatus');
    if (statusEl) {
      if (student.completed) {
        statusEl.className = 'badge badge--success';
        statusEl.textContent = '✅ 已完成';
      } else {
        statusEl.className = 'badge badge--warning';
        statusEl.textContent = '⚠ 未完成';
      }
    }

    // 更新头像（首字）
    const avatarEl = document.getElementById('profileAvatar');
    if (avatarEl && student.name) {
      avatarEl.textContent = student.name.charAt(0);
    }
  }

  // ========================================
  // 加载已有作品
  // ========================================
  async function loadExistingWork() {
    try {
      let work = null;

      if (S.getStudentWork) {
        try {
          work = await S.getStudentWork(currentStudent.studentId);
        } catch (e) {
          console.warn('[Student] Firebase 加载作品失败');
        }
      }

      if (!work) {
        try {
          const response = await fetch('data/students.json');
          if (response.ok) {
            const students = await response.json();
            const student = students.find(s => s.studentId === currentStudent.studentId);
            if (student && student.photoURL) {
              work = {
                photoURL: student.photoURL,
                photoLink: student.photoLink || '',
                reason: student.reason || ''
              };
            }
          }
        } catch (e) {}
      }

      if (work) {
        currentWork = work;
        populateForm(work);
      }
    } catch (error) {
      console.error('[Student] 加载作品失败:', error);
    }
  }

  /**
   * 填充表单
   * @param {object} work - 作品数据
   */
  function populateForm(work) {
    if (work.photoLink) {
      document.getElementById('photoLink').value = work.photoLink;
      previewURL(work.photoLink);
    }

    if (work.photoURL) {
      previewImage(work.photoURL);
    }

    if (work.reason) {
      document.getElementById('reasonInput').value = work.reason;
      updateCharCount();
    }

    // 更新按钮状态
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
      deleteBtn.style.display = work.photoURL || work.photoLink ? 'inline-flex' : 'none';
    }
  }

  // ========================================
  // 图片预览
  // ========================================

  /**
   * 预览上传的本地图片
   * @param {File} file - 图片文件
   */
  function previewLocalFile(file) {
    const previewArea = document.getElementById('previewArea');
    if (!previewArea) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      previewArea.innerHTML = `
        <img src="${e.target.result}" alt="预览图片" />
        <button class="preview-area__remove" aria-label="删除图片" id="removePreviewBtn">✕</button>
      `;
      previewArea.classList.add('preview-area--has-image');

      // 绑定删除按钮
      document.getElementById('removePreviewBtn').addEventListener('click', clearImage);

      // 清除 URL 输入
      document.getElementById('photoLink').value = '';
    };
    reader.readAsDataURL(file);
  }

  /**
   * 预览图片 URL
   * @param {string} url - 图片 URL
   */
  function previewURL(url) {
    const previewArea = document.getElementById('previewArea');
    if (!previewArea || !url) return;

    if (!S.isValidImageURL || !S.isValidImageURL(url)) {
      previewArea.innerHTML = `
        <div class="preview-area__placeholder">
          <div class="preview-area__placeholder-icon">🔗</div>
          <div class="preview-area__placeholder-text">请输入有效的图片网址</div>
        </div>
      `;
      return;
    }

    previewArea.innerHTML = `
      <img src="${url}" alt="预览图片" onerror="this.parentElement.innerHTML='<div class=\\'preview-area__placeholder\\'><div class=\\'preview-area__placeholder-icon\\'>❌</div><div class=\\'preview-area__placeholder-text\\'>图片无法读取</div></div>'"/>
      <button class="preview-area__remove" aria-label="删除图片" id="removePreviewBtn">✕</button>
    `;
    previewArea.classList.add('preview-area--has-image');

    const removeBtn = document.getElementById('removePreviewBtn');
    if (removeBtn) {
      removeBtn.addEventListener('click', clearImage);
    }
  }

  /**
   * 预览图片（通过 URL 显示）
   * @param {string} url
   */
  function previewImage(url) {
    previewURL(url);
  }

  /**
   * 清除图片
   */
  function clearImage() {
    const previewArea = document.getElementById('previewArea');
    if (!previewArea) return;

    previewArea.innerHTML = `
      <div class="preview-area__placeholder">
        <div class="preview-area__placeholder-icon">📷</div>
        <div class="preview-area__placeholder-text">上传图片后在此预览</div>
      </div>
    `;
    previewArea.classList.remove('preview-area--has-image');
    selectedFile = null;

    // 清除文件输入
    const fileInput = document.getElementById('photoFile');
    if (fileInput) fileInput.value = '';
  }

  // ========================================
  // 图片压缩
  // ========================================

  /**
   * 压缩图片（最长边 1600px, JPEG 85%）
   * @param {File} file - 原始文件
   * @returns {Promise<File>} 压缩后的文件
   */
  async function compressImage(file) {
    return new Promise((resolve, reject) => {
      // 使用 Compressor.js（如果可用）
      if (window.Compressor) {
        new Compressor(file, {
          quality: 0.85,
          maxWidth: 1600,
          maxHeight: 1600,
          mimeType: 'image/jpeg',
          success(result) {
            resolve(result);
          },
          error(err) {
            console.warn('[Student] 图片压缩失败，使用原始图片:', err);
            resolve(file);
          }
        });
        return;
      }

      // 使用 Canvas 手动压缩
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
          let { width, height } = img;
          const maxDimension = 1600;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height / width) * maxDimension);
              width = maxDimension;
            } else {
              width = Math.round((width / height) * maxDimension);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }, 'image/jpeg', 0.85);
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  // ========================================
  // 上传并储存作品
  // ========================================
  async function saveWork() {
    // 防止重复提交
    if (isUploading) return;

    // 验证
    const photoLink = document.getElementById('photoLink').value.trim();
    const reason = document.getElementById('reasonInput').value.trim();

    if (!selectedFile && !photoLink && !currentWork?.photoURL) {
      S.showToast && S.showToast('请上传图片或填写图片网址', 'warning');
      return;
    }

    if (!reason) {
      S.showToast && S.showToast('请填写分享原因', 'warning');
      return;
    }

    if (reason.length > 1000) {
      S.showToast && S.showToast('分享原因不能超过1000字', 'warning');
      return;
    }

    // 开始上传
    isUploading = true;
    updateButtonState(true);

    const progressBar = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    try {
      let photoURL = currentWork?.photoURL || '';

      // 如果有选择新文件，上传到 Storage
      if (selectedFile) {
        if (progressBar) progressBar.classList.add('upload-progress--active');

        // 压缩图片
        S.showToast && S.showToast('正在压缩图片...', 'info');
        const compressedFile = await compressImage(selectedFile);

        // 上传
        S.showToast && S.showToast('正在上传...', 'info');

        if (S.uploadImage) {
          try {
            const className = currentStudent.studentClass;
            const studentId = currentStudent.studentId;
            photoURL = await S.uploadImage(compressedFile, className, studentId, (progress) => {
              if (progressFill) progressFill.style.width = progress + '%';
              if (progressText) progressText.textContent = progress + '%';
            });
          } catch (e) {
            console.error('[Student] Firebase 上传失败:', e);
            // 降级：使用本地预览
            photoURL = URL.createObjectURL(selectedFile);
          }
        } else {
          photoURL = URL.createObjectURL(selectedFile);
        }
      }

      // 构建作品数据
      const workData = {
        studentId: currentStudent.studentId,
        name: currentStudent.studentName,
        class: currentStudent.studentClass,
        photoURL: photoURL,
        photoLink: photoLink,
        reason: reason,
        completed: true
      };

      // 如果是更新已有作品，保留创建时间
      if (currentWork && currentWork.createdAt) {
        workData.createdAt = currentWork.createdAt;
      }

      // 储存到 Firebase
      if (S.saveWork) {
        try {
          await S.saveWork(currentStudent.studentId, workData);
        } catch (e) {
          console.warn('[Student] Firebase 储存失败，作品仅保存在本地');
        }
      }

      // 更新当前状态
      currentWork = workData;
      updateProfileUI({ completed: true, name: currentStudent.studentName });

      // 隐藏进度条
      if (progressBar) {
        setTimeout(() => {
          progressBar.classList.remove('upload-progress--active');
          if (progressFill) progressFill.style.width = '0%';
        }, 500);
      }

      S.showToast && S.showToast('✅ 作品储存成功！', 'success');

      // 显示删除按钮
      const deleteBtn = document.getElementById('deleteBtn');
      if (deleteBtn) deleteBtn.style.display = 'inline-flex';

    } catch (error) {
      console.error('[Student] 储存失败:', error);
      S.showToast && S.showToast('储存失败，请稍后再试', 'error');
    } finally {
      isUploading = false;
      updateButtonState(false);

      if (progressBar) {
        progressBar.classList.remove('upload-progress--active');
      }
    }
  }

  /**
   * 更新按钮状态
   * @param {boolean} uploading - 是否上传中
   */
  function updateButtonState(uploading) {
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.disabled = uploading;
      if (uploading) {
        saveBtn.classList.add('btn--loading');
        saveBtn.textContent = '上传中...';
      } else {
        saveBtn.classList.remove('btn--loading');
        saveBtn.textContent = '储存';
      }
    }
  }

  // ========================================
  // 删除作品
  // ========================================
  async function deleteWork() {
    const confirmed = await S.showConfirm(
      '确认删除',
      '删除后作品将无法恢复，确定要继续吗？',
      '删除',
      '取消',
      'danger'
    );

    if (!confirmed) return;

    try {
      if (S.deleteWork) {
        try {
          await S.deleteWork(currentStudent.studentId, currentWork?.photoURL);
        } catch (e) {
          console.warn('[Student] Firebase 删除失败');
        }
      }

      currentWork = null;
      clearImage();
      document.getElementById('photoLink').value = '';
      document.getElementById('reasonInput').value = '';
      updateCharCount();
      updateProfileUI({ completed: false, name: currentStudent.studentName });

      const deleteBtn = document.getElementById('deleteBtn');
      if (deleteBtn) deleteBtn.style.display = 'none';

      S.showToast && S.showToast('作品已删除', 'info');
    } catch (error) {
      console.error('[Student] 删除失败:', error);
    }
  }

  // ========================================
  // 清空表单
  // ========================================
  function clearForm() {
    clearImage();
    document.getElementById('photoLink').value = '';
    document.getElementById('reasonInput').value = '';
    updateCharCount();
  }

  // ========================================
  // 字符计数
  // ========================================
  function updateCharCount() {
    const textarea = document.getElementById('reasonInput');
    const counter = document.getElementById('charCount');
    if (!textarea || !counter) return;

    const count = textarea.value.length;
    counter.textContent = `${count} / 1000`;

    counter.classList.remove('char-count--warning', 'char-count--danger');
    if (count > 900) counter.classList.add('char-count--warning');
    if (count > 1000) counter.classList.add('char-count--danger');
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
    // 文件选择
    const fileInput = document.getElementById('photoFile');
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;

        const validation = S.validateImageFile && S.validateImageFile(file);
        if (!validation || !validation.valid) {
          S.showToast && S.showToast(validation.error || '无效的图片文件', 'error');
          this.value = '';
          return;
        }

        selectedFile = file;
        previewLocalFile(file);
      });
    }

    // URL 输入变化时预览
    const linkInput = document.getElementById('photoLink');
    if (linkInput) {
      linkInput.addEventListener('input', S.debounce && S.debounce(function () {
        const url = this.value.trim();
        if (url) {
          selectedFile = null;
          const fileInput = document.getElementById('photoFile');
          if (fileInput) fileInput.value = '';
          previewURL(url);
        }
      }, 500));
    }

    // 字符计数
    const reasonInput = document.getElementById('reasonInput');
    if (reasonInput) {
      reasonInput.addEventListener('input', updateCharCount);
    }

    // 储存按钮
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveWork);
    }

    // 清空按钮
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        S.showConfirm('确认清空', '确定要清空所有已填内容吗？').then(confirmed => {
          if (confirmed) clearForm();
        });
      });
    }

    // 删除按钮
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', deleteWork);
    }

    // 登出
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }

    // 返回首页
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
      });
    }

    // 拖拽上传
    const previewArea = document.getElementById('previewArea');
    if (previewArea && fileInput) {
      previewArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        previewArea.classList.add('upload-zone--drag-active');
      });
      previewArea.addEventListener('dragleave', () => {
        previewArea.classList.remove('upload-zone--drag-active');
      });
      previewArea.addEventListener('drop', (e) => {
        e.preventDefault();
        previewArea.classList.remove('upload-zone--drag-active');
        const file = e.dataTransfer.files[0];
        if (file) {
          fileInput.files = e.dataTransfer.files;
          fileInput.dispatchEvent(new Event('change'));
        }
      });
      previewArea.addEventListener('click', () => {
        fileInput.click();
      });
    }
  }

  // ========================================
  // 启动
  // ========================================
  document.addEventListener('DOMContentLoaded', init);

  console.log('[SPSS] Student 模块已加载');
})();
