/**
 * Star Photo Share System
 * Convert Excel - Excel 转 JSON 工具
 * Version 1.0
 * 2026-07-17
 *
 * 功能：读取 students.xlsx → 验证 → 输出 students.json
 * 使用：node scripts/convertExcel.js
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { validateExcel } = require('./validateExcel');

// ========================================
// 主函数
// ========================================

/**
 * 将 Excel 转换为 JSON
 */
function convertExcel() {
  console.log('=== 星图照片分享系统 - Excel 转 JSON ===\n');

  // 先验证
  const { passed, errors, validStudents } = validateExcel();

  if (!passed) {
    console.log('\n❌ 验证失败，请修正错误后重试');
    console.log('如仍要强制转换，请先修正 Excel 中的错误数据');
    process.exit(1);
  }

  if (validStudents.length === 0) {
    console.log('\n❌ 没有有效数据');
    process.exit(1);
  }

  // 输出 JSON
  const jsonStr = JSON.stringify(validStudents, null, 2);
  const outputPath = path.resolve(config.JSON_OUTPUT_PATH);

  // 确保 data 目录存在
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, jsonStr, 'utf8');

  console.log('\n' + '='.repeat(50));
  console.log('转换完成');
  console.log('='.repeat(50));
  console.log(`✅ 成功转换 ${validStudents.length} 名学生`);
  console.log(`📄 输出文件: ${outputPath}`);

  // 统计班级
  const classMap = {};
  validStudents.forEach(s => {
    if (!classMap[s.class]) {
      classMap[s.class] = 0;
    }
    classMap[s.class]++;
  });

  console.log('\n--- 班级统计 ---');
  Object.entries(classMap).sort().forEach(([cls, count]) => {
    console.log(`  ${cls}: ${count} 人`);
  });

  console.log('\n✅ 转换完成！可执行 node scripts/importFirestore.js 导入 Firestore');
  return validStudents;
}

// ========================================
// 执行
// ========================================
if (require.main === module) {
  convertExcel();
}

module.exports = { convertExcel };
