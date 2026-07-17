/**
 * Star Photo Share System
 * Scripts Config - Excel 导入工具配置
 * Version 1.0
 * 2026-07-17
 *
 * 功能：定义 Excel 导入工具的全局配置
 */

module.exports = {
  // ========================================
  // 文件路径
  // ========================================
  EXCEL_PATH: './data/students.xlsx',
  JSON_OUTPUT_PATH: './data/students.json',
  ERROR_REPORT_PATH: './data/error-report.csv',
  IMPORT_REPORT_PATH: './data/import-report.txt',

  // ========================================
  // Excel 工作表配置
  // ========================================
  SHEET_NAME: '学生名單',

  // ========================================
  // 栏位映射（如果 Excel 栏位名称不同，可在此调整）
  // ========================================
  COLUMN_MAP: {
    className: '班级',
    name: '姓名',
    studentId: '学号'
    // 如果 Excel 使用不同栏位名称，改为：
    // className: '班级名称',
    // name: '学生姓名',
    // studentId: '学生编号'
  },

  // ========================================
  // 导入模式
  // 'sync'   - 同步模式（默认）：保留学生作品，更新基本资料
  // 'fresh'  - 覆盖模式：重新建立所有学生
  // 'add'    - 新增模式：仅新增不存在的学生
  // ========================================
  IMPORT_MODE: 'sync',

  // ========================================
  // Firebase 配置
  // ========================================
  FIREBASE: {
    projectId: 'starphotoshare',
    // 如果使用 service account，在此填入路径
    serviceAccountPath: './firebase-service-account.json'
  },

  // ========================================
  // 验证规则
  // ========================================
  VALIDATION: {
    studentIdPattern: /^\d{4,10}$/,  // 学号：4-10 位数字
    studentIdRequired: true,
    nameRequired: true,
    classNameRequired: true,
    checkDuplicateId: true,
    checkDuplicateName: false  // 允许同名学生
  }
};
