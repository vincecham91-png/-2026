-- ========================================
-- 星图系统 RLS 策略完全修复
-- 执行步骤：
-- 1. 复制全部 SQL
-- 2. 打开 Supabase Dashboard → SQL Editor
-- 3. 粘贴并执行
-- ========================================

-- 1. 授予 anon 角色权限
GRANT INSERT, UPDATE, DELETE ON students TO anon;
GRANT INSERT, UPDATE, DELETE ON works TO anon;
GRANT INSERT, UPDATE, DELETE ON classes TO anon;
GRANT INSERT, UPDATE, DELETE ON logs TO anon;

-- 2. 删除所有旧策略
DROP POLICY IF EXISTS "students_all" ON students;
DROP POLICY IF EXISTS "works_all" ON works;
DROP POLICY IF EXISTS "classes_all" ON classes;
DROP POLICY IF EXISTS "logs_all" ON logs;
DROP POLICY IF EXISTS "import_insert" ON students;
DROP POLICY IF EXISTS "import_insert" ON works;
DROP POLICY IF EXISTS "import_insert" ON classes;
DROP POLICY IF EXISTS "teacher_select" ON teachers;

-- 3. 创建新的完整策略
CREATE POLICY "students_all" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "works_all" ON works FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "classes_all" ON classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "logs_all" ON logs FOR ALL USING (true) WITH CHECK (true);

-- 4. 同步学生完成状态
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

-- 6. 验证
SELECT '学生完成状态:' as info;
SELECT student_id, name, class, completed FROM students WHERE completed = true LIMIT 10;

SELECT '班级统计:' as info;
SELECT * FROM classes ORDER BY class_name;
