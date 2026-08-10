-- ========================================
-- 星图系统 RLS 策略完全修复
-- 执行步骤：
-- 1. 打开 https://supabase.com/dashboard/project/wqxpnpcgydyblktktigv
-- 2. 点击左侧 SQL Editor
-- 3. 点击 New query
-- 4. 复制下方全部 SQL 并粘贴
-- 5. 点击 Run
-- ========================================

-- 1. 授予 anon 角色完整权限
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 2. 删除所有现有策略（清理旧策略）
DROP POLICY IF EXISTS "enable_all" ON students;
DROP POLICY IF EXISTS "enable_all" ON works;
DROP POLICY IF EXISTS "enable_all" ON classes;
DROP POLICY IF EXISTS "enable_all" ON logs;
DROP POLICY IF EXISTS "enable_all" ON settings;
DROP POLICY IF EXISTS "enable_all" ON announcements;
DROP POLICY IF EXISTS "enable_all" ON teachers;
DROP POLICY IF EXISTS "students_all" ON students;
DROP POLICY IF EXISTS "works_all" ON works;
DROP POLICY IF EXISTS "classes_all" ON classes;
DROP POLICY IF EXISTS "logs_all" ON logs;
DROP POLICY IF EXISTS "settings_all" ON settings;
DROP POLICY IF EXISTS "announcements_all" ON announcements;
DROP POLICY IF EXISTS "import_insert" ON students;
DROP POLICY IF EXISTS "import_insert" ON works;
DROP POLICY IF EXISTS "import_insert" ON classes;
DROP POLICY IF EXISTS "teacher_select" ON teachers;

-- 3. 创建新的完整策略（允许所有操作）
CREATE POLICY "enable_all" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "enable_all" ON works FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "enable_all" ON classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "enable_all" ON logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "enable_all" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "enable_all" ON announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "enable_all" ON teachers FOR ALL USING (true) WITH CHECK (true);

-- 4. 同步学生完成状态（从 works 表）
UPDATE students s
SET
  completed = true,
  upload_time = w.updated_at,
  photo_url = w.photo_url,
  photo_link = COALESCE(w.photo_link, ''),
  reason = COALESCE(w.reason, ''),
  updated_at = w.updated_at
FROM works w
WHERE s.student_id = w.student_id
AND w.completed = true;

-- 5. 清空并重建班级统计
DELETE FROM classes;
INSERT INTO classes (class_name, student_count, completed_count, completion_rate)
SELECT
  class,
  COUNT(*) as student_count,
  COUNT(CASE WHEN completed = true THEN 1 END) as completed_count,
  ROUND(
    COUNT(CASE WHEN completed = true THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100,
    0
  ) as completion_rate
FROM students
GROUP BY class;

-- 6. 验证结果
SELECT '✅ 学生完成状态:' as info;
SELECT student_id, name, class, completed FROM students WHERE completed = true ORDER BY student_id LIMIT 10;

SELECT '✅ 班级统计:' as info;
SELECT * FROM classes ORDER BY class_name;

SELECT '✅ 总完成统计:' as info;
SELECT
  COUNT(*) as total_students,
  COUNT(CASE WHEN completed = true THEN 1 END) as completed_count,
  ROUND(COUNT(CASE WHEN completed = true THEN 1 END)::numeric / COUNT(*) * 100, 2) as completion_rate_pct
FROM students;
