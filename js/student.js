/**
 * Star Photo Share System
 * Student JS - 學生上傳頁面邏輯
 * Version 1.1
 * 2026-08-03
 *
 * 功能：讀取個人資料、上傳圖片/網址、壓縮圖片、儲存作品、刪除、Session 檢查
 * v1.1: Storage CORS 失敗時降級到 base64 直存 Firestore（跨設備可存取）
 */

(function () {
  'use strict';

  const S = window.SPSS || {};

  // ========================================
  // 狀態變數
  // ========================================
  let currentStudent = null;
  let selectedFile = null;
  let currentWork = null;
  let isUploading = false;

  // ========================================
  // 初始化
  // ========================================
  async function init() {
    console.log('[Student] 上傳頁面初始化 v1.1');

    // 檢查 Session
    if (!checkSession()) {
      return;
    }

    // 先綁定事件，確保頁面立即可互動（不等待 Firebase）
    bindEvents();

    // 再載入資料（Firebase 查詢不阻塞 UI）
    await loadProfile();
    await loadExistingWork();

    console.log('[Student] 上傳頁面初始化完成');
  }

  // ========================================
  // 檢查 Session
  // ========================================
  function checkSession() {
    currentStudent = S.getSession && S.getSession('studentSession');
    if (!currentStudent || !currentStudent.studentId) {
      S.showToast && S.showToast('請先登入', 'warning');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
      return false;
    }
    return true;
  }

  // ========================================
  // 載入個人資料
  // ========================================
  async function loadProfile() {
    try {
      // 先顯示 Session 中的基本資料
      document.getElementById('profileName').textContent = currentStudent.studentName || '-';
      document.getElementById('profileClass').textContent = currentStudent.studentClass || '-';
      document.getElementById('profileId').textContent = currentStudent.studentId || '-';

      // 嘗試從 Firebase 載入最新資料
      let student = null;
      if (S.getStudentById) {
        try {
          student = await S.getStudentById(currentStudent.studentId);
        } catch (e) {
          console.warn('[Student] Firebase 載入學生資料失敗');
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
      console.error('[Student] 載入個人資料失敗:', error);
    }
  }

  /**
   * 更新個人資料 UI
   * @param {object} student - 學生資料
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

    // 更新頭像（首字）
    const avatarEl = document.getElementById('profileAvatar');
    if (avatarEl && student.name) {
      avatarEl.textContent = student.name.charAt(0);
    }
  }

  // ========================================
  // 載入已有作品
  // ========================================
  async function loadExistingWork() {
    try {
      let work = null;

      if (S.getStudentWork) {
        try {
          work = await S.getStudentWork(currentStudent.studentId);
        } catch (e) {
          console.warn('[Student] Firebase 載入作品失敗');
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
      console.error('[Student] 載入作品失敗:', error);
    }
  }

  /**
   * 填充表單
   * @param {object} work - 作品資料
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

    // 更新按鈕狀態
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
      deleteBtn.style.display = work.photoURL || work.photoLink ? 'inline-flex' : 'none';
    }
  }

  // ========================================
  // 圖片預覽
  // ========================================

  /**
   * 預覽上傳的本地圖片
   * @param {File} file - 圖片檔案
   */
  function previewLocalFile(file) {
    const previewArea = document.getElementById('previewArea');
    if (!previewArea) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      previewArea.innerHTML = `
        <img src="${e.target.result}" alt="預覽圖片" />
        <button class="preview-area__remove" aria-label="刪除圖片" id="removePreviewBtn">✕</button>
      `;
      previewArea.classList.add('preview-area--has-image');

      // 綁定刪除按鈕
      document.getElementById('removePreviewBtn').addEventListener('click', clearImage);

      // 清除 URL 輸入
      document.getElementById('photoLink').value = '';
    };
    reader.readAsDataURL(file);
  }

  /**
   * 預覽圖片 URL
   * @param {string} url - 圖片 URL
   */
  function previewURL(url) {
    const previewArea = document.getElementById('previewArea');
    if (!previewArea || !url) return;

    if (!S.isValidImageURL || !S.isValidImageURL(url)) {
      previewArea.innerHTML = `
        <div class="preview-area__placeholder">
          <div class="preview-area__placeholder-icon">🔗</div>
          <div class="preview-area__placeholder-text">請輸入有效的圖片網址</div>
        </div>
      `;
      return;
    }

    previewArea.innerHTML = `
      <img src="${url}" alt="預覽圖片" onerror="this.parentElement.innerHTML='<div class=\\'preview-area__placeholder\\'><div class=\\'preview-area__placeholder-icon\\'>❌</div><div class=\\'preview-area__placeholder-text\\'>圖片無法讀取</div></div>'"/>
      <button class="preview-area__remove" aria-label="刪除圖片" id="removePreviewBtn">✕</button>
    `;
    previewArea.classList.add('preview-area--has-image');

    const removeBtn = document.getElementById('removePreviewBtn');
    if (removeBtn) {
      removeBtn.addEventListener('click', clearImage);
    }
  }

  /**
   * 預覽圖片（通過 URL 顯示）
   * @param {string} url
   */
  function previewImage(url) {
    previewURL(url);
  }

  /**
   * 清除圖片
   */
  function clearImage() {
    const previewArea = document.getElementById('previewArea');
    if (!previewArea) return;

    previewArea.innerHTML = `
      <div class="preview-area__placeholder">
        <div class="preview-area__placeholder-icon">📷</div>
        <div class="preview-area__placeholder-text">上傳圖片後在此預覽</div>
      </div>
    `;
    previewArea.classList.remove('preview-area--has-image');
    selectedFile = null;

    // 清除檔案輸入
    const fileInput = document.getElementById('photoFile');
    if (fileInput) fileInput.value = '';
  }

  // ========================================
  // 圖片壓縮
  // ========================================

  /**
   * 壓縮圖片（最長邊 1600px, JPEG 85%）
   * 用於 Firebase Storage 上傳
   * @param {File} file - 原始檔案
   * @returns {Promise<File>} 壓縮後的檔案
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
            console.warn('[Student] 圖片壓縮失敗，使用原始圖片:', err);
            resolve(file);
          }
        });
        return;
      }

      // 使用 Canvas 手動壓縮
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
        img.onerror = () => reject(new Error('圖片載入失敗'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('檔案讀取失敗'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 壓縮圖片為小尺寸 base64，用於 Firestore 直存（繞過 Storage CORS）
   * 目標：最長邊 800px、JPEG 70%、base64 約 50-100KB（遠低於 Firestore 1MB 上限）
   * @param {File} file - 原始檔案
   * @param {HTMLElement} progressFill - 進度條填充元素
   * @param {HTMLElement} progressText - 進度文字元素
   * @returns {Promise<string>} base64 data URL
   */
  async function compressAndEncodeForFirestore(file, progressFill, progressText) {
    console.log('[Student] 🔧 使用 base64 降級方案（繞過 Storage CORS）');
    if (progressFill) progressFill.style.width = '30%';
    if (progressText) progressText.textContent = '正在壓縮...';

    return new Promise((resolve, reject) => {
      // 使用 Compressor.js 壓縮到更小尺寸
      if (window.Compressor) {
        new Compressor(file, {
          quality: 0.7,
          maxWidth: 800,
          maxHeight: 800,
          mimeType: 'image/jpeg',
          success(result) {
            if (progressFill) progressFill.style.width = '60%';
            if (progressText) progressText.textContent = '正在編碼...';
            fileToBase64(result).then(base64 => {
              console.log('[Student] base64 編碼完成:', (base64.length / 1024).toFixed(1) + 'KB');
              if (progressFill) progressFill.style.width = '100%';
              if (progressText) progressText.textContent = '100%';
              resolve(base64);
            }).catch(reject);
          },
          error(err) {
            console.warn('[Student] Compressor 降級壓縮失敗:', err);
            // 最後手段：Canvas 手動壓縮
            canvasCompressAndEncode(file, 800, 0.7, progressFill, progressText).then(resolve).catch(reject);
          }
        });
        return;
      }

      // 無 Compressor.js：Canvas 手動壓縮
      canvasCompressAndEncode(file, 800, 0.7, progressFill, progressText).then(resolve).catch(reject);
    });
  }

  /**
   * Canvas 手動壓縮並轉 base64
   * @param {File} file - 原始檔案
   * @param {number} maxDim - 最長邊像素
   * @param {number} quality - JPEG 品質 (0-1)
   * @param {HTMLElement} progressFill - 進度條
   * @param {HTMLElement} progressText - 進度文字
   * @returns {Promise<string>} base64 data URL
   */
  function canvasCompressAndEncode(file, maxDim, quality, progressFill, progressText) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height / width) * maxDim);
              width = maxDim;
            } else {
              width = Math.round((width / height) * maxDim);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataURL = canvas.toDataURL('image/jpeg', quality);
          console.log('[Student] Canvas 降級 base64:', (dataURL.length / 1024).toFixed(1) + 'KB');
          if (progressFill) progressFill.style.width = '100%';
          if (progressText) progressText.textContent = '100%';
          resolve(dataURL);
        };
        img.onerror = () => reject(new Error('圖片載入失敗'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('檔案讀取失敗'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 將 File 轉為 base64 data URL
   * @param {File|Blob} file - 檔案
   * @returns {Promise<string>} base64 data URL
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('檔案讀取失敗'));
      reader.readAsDataURL(file);
    });
  }

  // ========================================
  // 上傳並儲存作品
  // ========================================
  async function saveWork() {
    // 防止重複提交
    if (isUploading) return;

    // 驗證
    const photoLink = document.getElementById('photoLink').value.trim();
    const reason = document.getElementById('reasonInput').value.trim();

    if (!selectedFile && !photoLink && !currentWork?.photoURL) {
      S.showToast && S.showToast('請上傳圖片或填寫圖片網址', 'warning');
      return;
    }

    if (!reason) {
      S.showToast && S.showToast('請填寫分享原因', 'warning');
      return;
    }

    if (reason.length > 1000) {
      S.showToast && S.showToast('分享原因不能超過1000字', 'warning');
      return;
    }

    // 開始上傳
    isUploading = true;
    updateButtonState(true);

    const progressBar = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    try {
      let photoURL = currentWork?.photoURL || '';

      // 如果有選擇新檔案：直接壓縮為 base64 存入 Firestore
      // （Firebase Storage 因 CORS 不可用，base64 直存是最可靠的路徑）
      if (selectedFile) {
        if (progressBar) progressBar.classList.add('upload-progress--active');

        S.showToast && S.showToast('正在處理圖片...', 'info');
        photoURL = await compressAndEncodeForFirestore(selectedFile, progressFill, progressText);
        console.log('[Student] ✅ base64 編碼完成:', (photoURL.length / 1024).toFixed(1) + 'KB');
      }

      // 步驟 4：構建作品資料
      const workData = {
        studentId: currentStudent.studentId,
        name: currentStudent.studentName,
        class: currentStudent.studentClass,
        photoURL: photoURL,
        photoLink: photoLink,
        reason: reason,
        completed: true
      };

      // 如果是更新已有作品，保留創建時間
      if (currentWork && currentWork.createdAt) {
        workData.createdAt = currentWork.createdAt;
      }

      // 步驟 5：儲存到 Firestore / localStorage（firebase.js 自動降級）
      if (S.saveWork) {
        try {
          await S.saveWork(currentStudent.studentId, workData);
          console.log('[Student] ✅ 作品儲存成功');
        } catch (e) {
          console.error('[Student] ❌ 儲存失敗（雲端與本地皆無法儲存）:', e);
          // 如果 Firestore 寫入因文件過大失敗，嘗試再次壓縮
          if (e.message && (e.message.includes('too large') || e.message.includes('size'))) {
            S.showToast && S.showToast('圖片過大，正在重新壓縮...', 'info');
            photoURL = await compressAndEncodeForFirestore(selectedFile, progressFill, progressText);
            workData.photoURL = photoURL;
            try {
              await S.saveWork(currentStudent.studentId, workData);
              console.log('[Student] ✅ 重壓縮後儲存成功');
            } catch (e2) {
              console.error('[Student] ❌ 重壓縮後仍失敗:', e2);
              throw new Error('儲存失敗，請嘗試使用較小的圖片');
            }
          } else {
            throw new Error('儲存失敗，請檢查網路連線');
          }
        }
      } else {
        console.warn('[Student] 無儲存模組，作品僅保存在記憶體');
      }

      // 更新當前狀態（強制更新 UI）
      currentWork = workData;
      currentStudent = { ...currentStudent, completed: true, photoURL: photoURL, photoLink: photoLink, reason: reason };

      // 直接操作 DOM 更新狀態徽章（確保 UI 必定更新）
      const statusEl = document.getElementById('profileStatus');
      if (statusEl) {
        statusEl.innerHTML = '<span class="badge badge--success">✅ 已完成</span>';
      }

      // 隱藏進度條
      if (progressBar) {
        setTimeout(() => {
          progressBar.classList.remove('upload-progress--active');
          if (progressFill) progressFill.style.width = '0%';
        }, 500);
      }

      S.showToast && S.showToast('✅ 作品儲存成功！', 'success');

      // 顯示刪除按鈕
      const deleteBtn = document.getElementById('deleteBtn');
      if (deleteBtn) deleteBtn.style.display = 'inline-flex';

    } catch (error) {
      console.error('[Student] 儲存失敗:', error);
      S.showToast && S.showToast(error.message || '儲存失敗，請稍後再試', 'error');
    } finally {
      isUploading = false;
      updateButtonState(false);

      if (progressBar) {
        progressBar.classList.remove('upload-progress--active');
      }
    }
  }

  /**
   * 更新按鈕狀態
   * @param {boolean} uploading - 是否上傳中
   */
  function updateButtonState(uploading) {
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.disabled = uploading;
      if (uploading) {
        saveBtn.classList.add('btn--loading');
        saveBtn.textContent = '上傳中...';
      } else {
        saveBtn.classList.remove('btn--loading');
        saveBtn.textContent = '💾 儲存';
      }
    }
  }

  // ========================================
  // 刪除作品
  // ========================================
  async function deleteWork() {
    const confirmed = await S.showConfirm(
      '確認刪除',
      '刪除後作品將無法恢復，確定要繼續嗎？',
      '刪除',
      '取消',
      'danger'
    );

    if (!confirmed) return;

    try {
      if (S.deleteWork) {
        try {
          await S.deleteWork(currentStudent.studentId, currentWork?.photoURL);
        } catch (e) {
          console.warn('[Student] Firebase 刪除失敗');
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

      S.showToast && S.showToast('作品已刪除', 'info');
    } catch (error) {
      console.error('[Student] 刪除失敗:', error);
    }
  }

  // ========================================
  // 清空表單
  // ========================================
  function clearForm() {
    clearImage();
    document.getElementById('photoLink').value = '';
    document.getElementById('reasonInput').value = '';
    updateCharCount();
  }

  // ========================================
  // 字元計數
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
  // 事件綁定
  // ========================================
  function bindEvents() {
    // 檔案選擇
    const fileInput = document.getElementById('photoFile');
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;

        const validation = S.validateImageFile && S.validateImageFile(file);
        if (!validation || !validation.valid) {
          S.showToast && S.showToast(validation.error || '無效的圖片檔案', 'error');
          this.value = '';
          return;
        }

        selectedFile = file;
        previewLocalFile(file);
      });
    }

    // URL 輸入變化時預覽（如有已選檔案則不覆蓋，兩者獨立）
    const linkInput = document.getElementById('photoLink');
    if (linkInput) {
      linkInput.addEventListener('input', S.debounce && S.debounce(function () {
        const url = this.value.trim();
        if (url && !selectedFile) {
          // 只有在沒有選擇檔案時才顯示 URL 預覽
          previewURL(url);
        }
        // 如果有選擇檔案 + 輸入連結，保留檔案預覽，兩者都儲存
      }, 500));
    }

    // 字元計數
    const reasonInput = document.getElementById('reasonInput');
    if (reasonInput) {
      reasonInput.addEventListener('input', updateCharCount);
    }

    // 儲存按鈕
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveWork);
    }

    // 清空按鈕
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        S.showConfirm('確認清空', '確定要清空所有已填內容嗎？').then(confirmed => {
          if (confirmed) clearForm();
        });
      });
    }

    // 刪除按鈕
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', deleteWork);
    }

    // 登出
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }

    // 返回首頁
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
      });
    }

    // 拖曳上傳
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
  // 啟動
  // ========================================
  document.addEventListener('DOMContentLoaded', init);

  console.log('[SPSS] Student v1.1 模組已載入（含 Firestore 降級方案）');
})();
