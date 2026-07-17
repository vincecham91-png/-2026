/**
 * Star Photo Share System
 * Import Firestore - 批量导入学生到 Firestore
 * Version 1.0
 * 2026-07-17
 *
 * 功能：读取 students.json → 导入 Firebase Firestore
 * 使用：node scripts/importFirestore.js
 *
 * 注意：此脚本需要 Firebase Admin SDK 或 Service Account
 * 如果无法使用 Admin SDK，请在 Firebase Console 手动导入
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

// ========================================
// 初始化 Firebase Admin
// ========================================
let admin;
let firestoreDB;

async function initFirebase() {
  try {
    // 尝试加载 Firebase Admin SDK
    admin = require('firebase-admin');

    const serviceAccountPath = path.resolve(config.FIREBASE.serviceAccountPath);

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      // 使用应用默认凭证
      admin.initializeApp({
        projectId: config.FIREBASE.projectId
      });
    }

    firestoreDB = admin.firestore();
    console.log('✅ Firebase Admin 初始化成功');
    return true;
  } catch (error) {
    console.warn('⚠️  无法初始化 Firebase Admin SDK:', error.message);
    console.log('\n替代方案：请使用以下方式导入学生数据：');
    console.log('1. 在 Firebase Console 手动导入 students.json');
    console.log('2. 或使用 Firebase CLI: firebase firestore:import');
    console.log('3. 或使用 npx -p @firebase-tools firebase-tools firestore:import');
    return false;
  }
}

// ========================================
// 主函数
// ========================================

async function importFirestore() {
  console.log('=== 星图照片分享系统 - Firestore 导入 ===\n');

  // 读取 students.json
  const jsonPath = path.resolve(config.JSON_OUTPUT_PATH);

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ students.json 不存在: ${jsonPath}`);
    console.log('请先执行: node scripts/convertExcel.js');
    process.exit(1);
  }

  const students = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`📄 读取到 ${students.length} 名学生\n`);

  // 初始化 Firebase
  const initialized = await initFirebase();

  if (!initialized) {
    // 输出手动导入指南
    console.log('\n--- 手动导入指南 ---');
    console.log('1. 前往 Firebase Console → Firestore');
    console.log('2. 点击 "导入"');
    console.log('3. 选择 data/students.json');
    console.log('4. 文档 ID 使用 studentId 字段');
    console.log('\n或者使用 Firebase CLI:');
    console.log('  firebase firestore:import --collection=students data/students.json');
    return;
  }

  // 批量导入
  console.log('🔄 正在导入 Firestore...\n');

  const batch = firestoreDB.batch();
  const BATCH_SIZE = 500;
  let importedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const docRef = firestoreDB.collection('students').doc(student.studentId);

    try {
      if (config.IMPORT_MODE === 'sync') {
        // 同步模式：使用 set + merge
        await docRef.set({
          studentId: student.studentId,
          name: student.name,
          class: student.class,
          password: student.password,
          status: student.status || 'active',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        updatedCount++;

      } else if (config.IMPORT_MODE === 'fresh') {
        // 覆盖模式
        await docRef.set({
          studentId: student.studentId,
          name: student.name,
          class: student.class,
          password: student.password,
          completed: false,
          photoURL: '',
          photoLink: '',
          reason: '',
          status: 'active',
          uploadTime: null,
          lastLogin: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        importedCount++;

      } else {
        // 新增模式：仅新增不存在的
        const existing = await docRef.get();
        if (!existing.exists) {
          await docRef.set({
            studentId: student.studentId,
            name: student.name,
            class: student.class,
            password: student.password,
            completed: false,
            photoURL: '',
            photoLink: '',
            reason: '',
            status: 'active',
            uploadTime: null,
            lastLogin: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          importedCount++;
        } else {
          updatedCount++;
        }
      }

      // 进度显示
      if ((i + 1) % 10 === 0 || i === students.length - 1) {
        process.stdout.write(`\r  进度: ${i + 1} / ${students.length}`);
      }
    } catch (error) {
      errorCount++;
      console.error(`\n❌ 导入失败: ${student.name} (${student.studentId}): ${error.message}`);
    }
  }

  process.stdout.write('\n');

  // 自动建立班级 Collection
  console.log('\n🔄 更新班级统计...');
  const classMap = {};
  students.forEach(s => {
    if (!classMap[s.class]) classMap[s.class] = 0;
    classMap[s.class]++;
  });

  for (const [className, count] of Object.entries(classMap)) {
    try {
      await firestoreDB.collection('classes').doc(className).set({
        className,
        studentCount: count,
        completedCount: 0,
        completionRate: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log(`  ✅ ${className}: ${count} 人`);
    } catch (error) {
      console.error(`  ❌ ${className}: ${error.message}`);
    }
  }

  // 输出导入报告
  const reportTime = new Date().toISOString();
  const report = [
    '=== Firestore 导入报告 ===',
    `执行时间: ${reportTime}`,
    `导入模式: ${config.IMPORT_MODE}`,
    `总人数: ${students.length}`,
    `新增: ${importedCount}`,
    `更新: ${updatedCount}`,
    `错误: ${errorCount}`,
    `班级数: ${Object.keys(classMap).length}`
  ].join('\n');

  console.log('\n' + '='.repeat(50));
  console.log(report);
  console.log('='.repeat(50));

  // 保存报告
  const reportPath = path.resolve(config.IMPORT_REPORT_PATH);
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`\n📝 导入报告已保存: ${reportPath}`);
  console.log('✅ 导入完成！');
}

// ========================================
// 执行
// ========================================
if (require.main === module) {
  importFirestore().catch(console.error);
}

module.exports = { importFirestore };
