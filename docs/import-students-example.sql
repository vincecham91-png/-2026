-- ========================================
-- 学生数据导入脚本
-- 在 Supabase SQL Editor 中执行
-- ========================================
-- 将下面的数据替换为实际学生名单
-- ========================================

-- 批量插入学生（从 students.json 生成）
INSERT INTO students (student_id, name, class, password, completed, photo_url, photo_link, reason, status)
VALUES
  ('25024', '陈媚昕', '初二忠', '25024', false, '', '', '', 'active'),
  ('25025', '周恩昕', '初二忠', '25025', false, '', '', '', 'active'),
  ('25026', '蔡瑜暄', '初二忠', '25026', false, '', '', '', 'active')
-- ... 更多学生
ON CONFLICT (student_id) DO NOTHING;

-- 插入班级统计
INSERT INTO classes (class_name, student_count, completed_count, completion_rate)
VALUES
  ('初二忠', 35, 0, 0),
  ('初二孝', 36, 0, 0),
  ('初二仁', 35, 0, 0),
  ('初二爱', 34, 0, 0)
ON CONFLICT (class_name) DO UPDATE SET
  student_count = EXCLUDED.student_count;
