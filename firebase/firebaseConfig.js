/**
 * Star Photo Share System
 * Firebase 配置文件
 * Version 1.0
 * 2026-07-17
 *
 * 功能：初始化 Firebase 服务（Firestore, Storage, Authentication）
 * 所有页面统一引用此文件
 */

// ========================================
// Firebase 配置
// ========================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// ========================================
// 初始化 Firebase
// ========================================
let firebaseApp;
let firestoreDB;
let firebaseStorage;
let firebaseAuth;

try {
  // 初始化 Firebase App
  firebaseApp = firebase.initializeApp(firebaseConfig);

  // 初始化 Firestore
  firestoreDB = firebase.firestore();

  // 初始化 Storage
  firebaseStorage = firebase.storage();

  // 初始化 Authentication
  firebaseAuth = firebase.auth();

  // 开启 Firestore 离线缓存（可选）
  firestoreDB.enablePersistence({ synchronizeTabs: true })
    .then(() => {
      console.log('[Firebase] 离线缓存已启用');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('[Firebase] 多个标签页开启，离线缓存无法启用');
      } else if (err.code === 'unimplemented') {
        console.warn('[Firebase] 浏览器不支持离线缓存');
      }
    });

  console.log('[Firebase] 初始化成功');
} catch (error) {
  console.error('[Firebase] 初始化失败:', error);
}

// ========================================
// Firestore 集合名称常量
// ========================================
const COLLECTIONS = {
  STUDENTS: 'students',
  WORKS: 'works',
  CLASSES: 'classes',
  TEACHERS: 'teachers',
  SETTINGS: 'settings',
  LOGS: 'logs',
  ANNOUNCEMENTS: 'announcements',
  STATISTICS: 'statistics'
};

// ========================================
// 教师本地帐号配置
// ========================================
const TEACHER_CONFIG = {
  username: 'Cham Chin Hong',
  email: 'teacher@school.edu.my',
  password: '12345',
  displayName: 'Cham Chin Hong',
  role: 'teacher'
};

// ========================================
// Storage 路径常量
// ========================================
const STORAGE_PATHS = {
  IMAGES: 'images'
};

// ========================================
// 教师角色常量
// ========================================
const ROLES = {
  TEACHER: 'teacher',
  ADMIN: 'admin'
};

// ========================================
// 导出（供其他模块使用）
// ========================================
// 通过全局对象暴露，所有页面可直接使用
window.SPSS = window.SPSS || {};
window.SPSS.firebaseApp = firebaseApp;
window.SPSS.firestoreDB = firestoreDB;
window.SPSS.firebaseStorage = firebaseStorage;
window.SPSS.firebaseAuth = firebaseAuth;
window.SPSS.COLLECTIONS = COLLECTIONS;
window.SPSS.STORAGE_PATHS = STORAGE_PATHS;
window.SPSS.ROLES = ROLES;
window.SPSS.TEACHER_CONFIG = TEACHER_CONFIG;
