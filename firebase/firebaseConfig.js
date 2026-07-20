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
// （设为 null 表示使用本地模式，不连接 Firebase）
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
// 判断是否配置了真实 Firebase
// ========================================
const IS_FIREBASE_CONFIGURED =
  firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
  firebaseConfig.projectId !== 'YOUR_PROJECT_ID';

// ========================================
// 初始化 Firebase（仅在已配置时）
// ========================================
let firebaseApp = null;
let firestoreDB = null;
let firebaseStorage = null;
let firebaseAuth = null;

if (IS_FIREBASE_CONFIGURED && typeof firebase !== 'undefined') {
  try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firestoreDB = firebase.firestore();
    firebaseStorage = firebase.storage();
    firebaseAuth = firebase.auth();

    firestoreDB.enablePersistence({ synchronizeTabs: true })
      .then(() => console.log('[Firebase] 离线缓存已启用'))
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('[Firebase] 多标签离线缓存跳过');
        } else if (err.code === 'unimplemented') {
          console.warn('[Firebase] 浏览器不支持离线缓存');
        }
      });

    console.log('[Firebase] 初始化成功');
  } catch (error) {
    console.warn('[Firebase] 初始化失败，使用本地模式:', error.message);
  }
} else {
  console.log('[Firebase] 未配置，使用本地数据模式');
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
