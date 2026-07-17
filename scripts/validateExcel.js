/**
 * Star Photo Share System
 * Validate Excel - Excel 数据验证工具
 * Version 1.0
 * 2026-07-17
 *
 * 功能：验证 Excel 中的学生数据，检查必填项、重复学号等
 * 使用：node scripts/validateExcel.js
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// ========================================
// 主函数
// ========================================

/**
 * 验证 Excel 中的学生数据
 */
function validateExcel() {
  console.log('=== 星图照片分享系统 - Excel 数据验证 ===\n');

  const excelPath = path.resolve(config.EXCEL_PATH);

  // 检查 Excel 文件是否存在
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Excel 文件不存在: ${excelPath}`);
    console.log('请将 students.xlsx 放到 data/ 目录下');
    process.exit(1);
  }

  console.log(`📄 读取文件: ${excelPath}`);

  // 读取 Excel
  const workbook = XLSX.readFile(excelPath);
  const sheetName = config.SHEET_NAME;

  if (!workbook.SheetNames.includes(sheetName)) {
    console.error(`❌ 找不到工作表 "${sheetName}"`);
    console.log(`可用的工作表: ${workbook.SheetNames.join(', ')}`);
    process.exit(1);
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet);

  if (rows.length === 0) {
    console.error('❌ 工作表中没有数据');
    process.exit(1);
  }

  console.log(`📋 读取到 ${rows.length} 行数据\n`);

  // 列映射
  const colClass = config.COLUMN_MAP.className;
  const colName = config.COLUMN_MAP.name;
  const colId = config.COLUMN_MAP.studentId;

  // 验证每一行
  const errors = [];
  const studentIds = new Set();
  const validStudents = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // Excel 行号（第1行是标题）
    const className = String(row[colClass] || '').trim();
    const name = String(row[colName] || '').trim();
    const studentId = String(row[colId] || '').trim();

    // 验证班级
    if (config.VALIDATION.classNameRequired && !className) {
      errors.push({ row: rowNum, field: colClass, error: '班级不能为空' });
    }

    // 验证姓名
    if (config.VALIDATION.nameRequired && !name) {
      errors.push({ row: rowNum, field: colName, error: '姓名不能为空' });
    }

    // 验证学号
    if (config.VALIDATION.studentIdRequired && !studentId) {
      errors.push({ row: rowNum, field: colId, error: '学号不能为空' });
    } else if (studentId) {
      // 检查学号格式
      if (!config.VALIDATION.studentIdPattern.test(studentId)) {
        errors.push({ row: rowNum, field: colId, error: `学号格式不正确（需要${config.VALIDATION.studentIdPattern}）` });
      }

      // 检查重复学号
      if (config.VALIDATION.checkDuplicateId) {
        if (studentIds.has(studentId)) {
          errors.push({ row: rowNum, field: colId, error: '学号重复' });
        } else {
          studentIds.add(studentId);
        }
      }
    }

    // 添加有效记录
    if (!errors.some(e => e.row === rowNum)) {
      validStudents.push({
        studentId,
        name,
        class: className,
        password: studentId,
        completed: false,
        photoURL: '',
        photoLink: '',
        reason: '',
        status: 'active'
      });
    }
  });

  // 输出验证结果
  console.log('='.repeat(50));
  console.log('验证结果');
  console.log('='.repeat(50));
  console.log(`总行数:       ${rows.length}`);
  console.log(`有效:         ${validStudents.length}`);
  console.log(`错误:         ${errors.length}`);
  console.log(`重复学号:     ${rows.length - validStudents.length - errors.filter(e => e.error === '学号重复').length}`);

  if (errors.length > 0) {
    console.log('\n--- 错误详情 ---');
    errors.forEach(e => {
      console.log(`  第 ${e.row} 行 - ${e.field}: ${e.error}`);
    });

    // 输出错误报告 CSV
    const errorCSV = '行号,栏位,错误原因\n' +
      errors.map(e => `${e.row},${e.field},${e.error}`).join('\n');

    const errorPath = path.resolve(config.ERROR_REPORT_PATH);
    fs.writeFileSync(errorPath, '﻿' + errorCSV, 'utf8');
    console.log(`\n📝 错误报告已输出: ${errorPath}`);
  }

  if (validStudents.length > 0) {
    console.log('\n--- 前5条有效记录 ---');
    validStudents.slice(0, 5).forEach(s => {
      console.log(`  ${s.class} - ${s.name} (${s.studentId})`);
    });
    if (validStudents.length > 5) {
      console.log(`  ... 共 ${validStudents.length} 条`);
    }
  }

  // 返回验证结果
  const passed = errors.length === 0;
  console.log(`\n${passed ? '✅ 所有数据验证通过！' : '⚠️  存在错误，请修正后重新验证'}`);
  return { passed, errors, validStudents };
}

// ========================================
// 执行
// ========================================
if (require.main === module) {
  validateExcel();
}

module.exports = { validateExcel };
