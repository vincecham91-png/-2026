-- 插入班级统计
INSERT INTO classes (class_name, student_count, completed_count, completion_rate)
VALUES
  ('初二忠', 36, 0, 0),
  ('初二孝', 26, 0, 0),
  ('初二仁', 22, 0, 0),
  ('初二爱', 17, 0, 0)
ON CONFLICT (class_name) DO UPDATE SET student_count = EXCLUDED.student_count;