/**
 * Star Photo Share System
 * Util JS - 通用工具函数库
 * Version 1.0
 * 2026-07-17
 *
 * 功能：日期格式化、Toast通知、Modal、Loading、本地储存等通用工具
 */

// ========================================
// 命名空间
// ========================================
window.SPSS = window.SPSS || {};

// ========================================
// Toast 通知
// ========================================

/**
 * 显示 Toast 通知
 * @param {string} message - 通知消息
 * @param {string} type - 类型: success | error | warning | info
 * @param {number} duration - 显示时长（毫秒），默认3000
 */
function showToast(message, type = 'info', duration = 3000) {
  // 确保 Toast 容器存在
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // 图标映射
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  // 创建 Toast 元素
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${icons[type] || icons.info}</span>
    <span class="toast__message">${escapeHTML(message)}</span>
    <button class="toast__close" aria-label="关闭通知">&times;</button>
  `;

  // 点击关闭
  const closeBtn = toast.querySelector('.toast__close');
  closeBtn.addEventListener('click', () => removeToast(toast));

  // 自动移除
  const timer = setTimeout(() => removeToast(toast), duration);

  // 添加到容器
  container.appendChild(toast);

  // 移除 Toast
  function removeToast(el) {
    clearTimeout(timer);
    if (el.parentNode) {
      el.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      }, 300);
    }
  }
}

/**
 * HTML 转义，防止 XSS
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * 解码 HTML 实体
 * @param {string} html - 含 HTML 实体的字符串
 * @returns {string} 解码后的字符串
 */
function decodeHTML(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

// ========================================
// Modal 弹窗
// ========================================

/**
 * 创建并显示 Modal
 * @param {object} options - { title, content, footer, size, onClose }
 * @returns {HTMLElement} Modal 外层元素
 */
function showModal(options = {}) {
  const {
    title = '',
    content = '',
    footer = '',
    size = '',
    onClose = null
  } = options;

  // 创建 Overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title || '弹窗');

  // 创建 Modal
  const modal = document.createElement('div');
  modal.className = `modal modal--${size}`;
  modal.innerHTML = `
    <div class="modal__header">
      <h3 class="modal__title">${title}</h3>
      <button class="modal__close" aria-label="关闭">&times;</button>
    </div>
    <div class="modal__body">${content}</div>
    ${footer ? `<div class="modal__footer">${footer}</div>` : ''}
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // 阻止背景滚动
  document.body.style.overflow = 'hidden';

  // 关闭事件
  const closeModal = () => {
    overlay.style.animation = 'fadeOut 0.2s ease forwards';
    modal.style.animation = 'scaleOut 0.2s ease forwards';
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      document.body.style.overflow = '';
      if (onClose) onClose();
    }, 200);
  };

  // 点击关闭按钮
  const closeBtn = modal.querySelector('.modal__close');
  closeBtn.addEventListener('click', closeModal);

  // 点击 Overlay 背景关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  // ESC 关闭
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // 存储关闭函数
  modal._closeModal = closeModal;

  return overlay;
}

/**
 * 关闭 Modal
 * @param {HTMLElement} overlay - Modal overlay 元素
 */
function closeModal(overlay) {
  if (overlay && overlay.querySelector('.modal')) {
    const modal = overlay.querySelector('.modal');
    if (modal._closeModal) {
      modal._closeModal();
    }
  }
}

// ========================================
// 确认对话框
// ========================================

/**
 * 显示确认对话框
 * @param {string} title - 标题
 * @param {string} message - 内容
 * @param {string} confirmText - 确认按钮文字
 * @param {string} cancelText - 取消按钮文字
 * @param {string} type - 类型: danger | warning | info
 * @returns {Promise<boolean>} 用户确认返回 true，取消返回 false
 */
function showConfirm(title, message, confirmText = '确认', cancelText = '取消', type = 'info') {
  return new Promise((resolve) => {
    const icons = {
      danger: '⚠️',
      warning: '⚡',
      info: 'ℹ️'
    };

    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.innerHTML = `
      <div class="dialog__icon">${icons[type] || icons.info}</div>
      <h3 class="dialog__title">${escapeHTML(title)}</h3>
      <p class="dialog__text">${escapeHTML(message)}</p>
      <div class="dialog__actions">
        <button class="btn btn--ghost dialog__cancel">${escapeHTML(cancelText)}</button>
        <button class="btn btn--${type === 'danger' ? 'danger' : 'primary'} dialog__confirm">${escapeHTML(confirmText)}</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const closeDialog = (result) => {
      overlay.style.animation = 'fadeOut 0.2s ease forwards';
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(result);
      }, 200);
    };

    dialog.querySelector('.dialog__confirm').addEventListener('click', () => closeDialog(true));
    dialog.querySelector('.dialog__cancel').addEventListener('click', () => closeDialog(false));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDialog(false);
    });
  });
}

// ========================================
// Loading 加载
// ========================================

/**
 * 显示全局 Loading
 * @param {string} message - 提示文字
 * @returns {HTMLElement} Loading 元素
 */
function showLoading(message = '加载中...') {
  const loading = document.createElement('div');
  loading.className = 'modal-overlay';
  loading.style.zIndex = '9999';
  loading.innerHTML = `
    <div style="text-align:center;color:var(--text-primary)">
      <div class="spinner spinner--lg" style="margin:0 auto 16px"></div>
      <p style="font-size:var(--font-size-sm);color:var(--text-secondary)">${escapeHTML(message)}</p>
    </div>
  `;
  document.body.appendChild(loading);
  return loading;
}

/**
 * 隐藏 Loading
 * @param {HTMLElement} loadingEl - Loading 元素
 */
function hideLoading(loadingEl) {
  if (loadingEl && loadingEl.parentNode) {
    loadingEl.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => {
      if (loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
      }
    }, 300);
  }
}

// ========================================
// 日期时间格式化
// ========================================

/**
 * 格式化时间戳为可读字符串
 * @param {Date|FirebaseTimestamp|string} timestamp - 时间戳
 * @param {string} format - 格式: 'full' | 'date' | 'time' | 'datetime'
 * @returns {string} 格式化后的字符串
 */
function formatTime(timestamp, format = 'datetime') {
  if (!timestamp) return '-';

  let date;
  // 处理 Firebase Timestamp
  if (timestamp && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) return '-';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  switch (format) {
    case 'date':
      return `${year}-${month}-${day}`;
    case 'time':
      return `${hours}:${minutes}:${seconds}`;
    case 'full':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case 'datetime':
    default:
      return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
}

/**
 * 获取相对时间（如"3分钟前"）
 * @param {Date|FirebaseTimestamp} timestamp - 时间戳
 * @returns {string} 相对时间字符串
 */
function timeAgo(timestamp) {
  if (!timestamp) return '-';

  let date;
  if (timestamp && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`;
  return formatTime(timestamp, 'date');
}

// ========================================
// 数据验证
// ========================================

/**
 * 验证图片文件
 * @param {File} file - 文件对象
 * @returns {object} { valid: boolean, error: string }
 */
function validateImageFile(file) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!file) {
    return { valid: false, error: '请选择文件' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: '只支持 JPG、PNG、WEBP 格式' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: '图片大小不能超过 10MB' };
  }

  return { valid: true, error: null };
}

/**
 * 验证图片 URL
 * @param {string} url - 图片 URL
 * @returns {boolean} 是否为有效 URL
 */
function isValidImageURL(url) {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 验证学号格式
 * @param {string} studentId - 学号
 * @returns {boolean}
 */
function isValidStudentId(studentId) {
  return /^\d{4,10}$/.test(studentId);
}

// ========================================
// Session Storage
// ========================================

/**
 * 保存到 Session Storage
 * @param {string} key
 * @param {*} value
 */
function saveSession(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[Session] 存储失败:', e);
  }
}

/**
 * 从 Session Storage 读取
 * @param {string} key
 * @returns {*} 读取的值，不存在返回 null
 */
function getSession(key) {
  try {
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('[Session] 读取失败:', e);
    return null;
  }
}

/**
 * 清除 Session Storage
 * @param {string} key - 可选，不传则清除所有
 */
function clearSession(key) {
  if (key) {
    sessionStorage.removeItem(key);
  } else {
    sessionStorage.clear();
  }
}

// ========================================
// Local Storage
// ========================================

/**
 * 保存到 Local Storage
 * @param {string} key
 * @param {*} value
 */
function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[Local] 存储失败:', e);
  }
}

/**
 * 从 Local Storage 读取
 * @param {string} key
 * @returns {*}
 */
function getLocal(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('[Local] 读取失败:', e);
    return null;
  }
}

/**
 * 删除 Local Storage
 * @param {string} key
 */
function removeLocal(key) {
  localStorage.removeItem(key);
}

// ========================================
// 防抖节流
// ========================================

/**
 * 防抖函数
 * @param {Function} fn - 要执行的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 节流函数
 * @param {Function} fn - 要执行的函数
 * @param {number} limit - 间隔时间（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(fn, limit = 300) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

// ========================================
// URL 参数
// ========================================

/**
 * 获取 URL 查询参数
 * @param {string} name - 参数名
 * @returns {string|null} 参数值
 */
function getURLParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * 设置 URL 查询参数（不刷新页面）
 * @param {object} params - 参数键值对
 */
function setURLParams(params) {
  const url = new URL(window.location);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });
  window.history.replaceState({}, '', url);
}

// ========================================
// DOM 工具
// ========================================

/**
 * 安全获取 DOM 元素
 * @param {string} selector - CSS 选择器
 * @param {HTMLElement} parent - 父元素
 * @returns {HTMLElement|null}
 */
function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * 安全获取所有 DOM 元素
 * @param {string} selector - CSS 选择器
 * @param {HTMLElement} parent - 父元素
 * @returns {NodeList}
 */
function $$(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

/**
 * 创建 DOM 元素
 * @param {string} tag - 标签名
 * @param {object} attrs - 属性对象
 * @param {string|HTMLElement} children - 子元素
 * @returns {HTMLElement}
 */
function createEl(tag, attrs = {}, children = '') {
  const el = document.createElement(tag);

  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([k, v]) => {
        el.dataset[k] = v;
      });
    } else if (key.startsWith('on')) {
      const event = key.slice(2).toLowerCase();
      el.addEventListener(event, value);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else {
      el.setAttribute(key, value);
    }
  });

  if (typeof children === 'string') {
    el.innerHTML = children;
  } else if (children instanceof HTMLElement) {
    el.appendChild(children);
  }

  return el;
}

// ========================================
// 复制到剪贴板
// ========================================

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 是否成功
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('已复制到剪贴板', 'success');
    return true;
  } catch (err) {
    // 降级方案
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('已复制到剪贴板', 'success');
      return true;
    } catch {
      showToast('复制失败，请手动复制', 'error');
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

// ========================================
// 导出到全局
// ========================================
window.SPSS.showToast = showToast;
window.SPSS.showModal = showModal;
window.SPSS.closeModal = closeModal;
window.SPSS.showConfirm = showConfirm;
window.SPSS.showLoading = showLoading;
window.SPSS.hideLoading = hideLoading;
window.SPSS.formatTime = formatTime;
window.SPSS.timeAgo = timeAgo;
window.SPSS.validateImageFile = validateImageFile;
window.SPSS.isValidImageURL = isValidImageURL;
window.SPSS.isValidStudentId = isValidStudentId;
window.SPSS.saveSession = saveSession;
window.SPSS.getSession = getSession;
window.SPSS.clearSession = clearSession;
window.SPSS.saveLocal = saveLocal;
window.SPSS.getLocal = getLocal;
window.SPSS.removeLocal = removeLocal;
window.SPSS.debounce = debounce;
window.SPSS.throttle = throttle;
window.SPSS.getURLParam = getURLParam;
window.SPSS.setURLParams = setURLParams;
window.SPSS.$ = $;
window.SPSS.$$ = $$;
window.SPSS.createEl = createEl;
window.SPSS.copyToClipboard = copyToClipboard;
window.SPSS.escapeHTML = escapeHTML;

console.log('[SPSS] Util 工具库已加载');
