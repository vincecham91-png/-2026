-- ========================================
-- 修复 RLS 策略 - 允许 anon 读写
-- ========================================

-- 1. 给 anon 角色授权
GRANT INSERT, UPDATE, DELETE ON students TO anon;
GRANT INSERT, UPDATE, DELETE ON works TO anon;
GRANT INSERT, UPDATE, DELETE ON classes TO anon;
GRANT INSERT, UPDATE, DELETE ON logs TO anon;
GRANT INSERT, UPDATE, DELETE ON settings TO anon;
GRANT INSERT, UPDATE, DELETE ON announcements TO anon;

-- 2. 创建完整的读写策略
DO $$
BEGIN
  -- students 表
  DROP POLICY IF EXISTS "students_all" ON students;
  CREATE POLICY "students_all" ON students FOR ALL USING (true) WITH CHECK (true);
  
  -- works 表
  DROP POLICY IF EXISTS "works_all" ON works;
  CREATE POLICY "works_all" ON works FOR ALL USING (true) WITH CHECK (true);
  
  -- classes 表
  DROP POLICY IF EXISTS "classes_all" ON classes;
  CREATE POLICY "classes_all" ON classes FOR ALL USING (true) WITH CHECK (true);
  
  -- logs 表
  DROP POLICY IF EXISTS "logs_all" ON logs;
  CREATE POLICY "logs_all" ON logs FOR ALL USING (true) WITH CHECK (true);
  
  -- settings 表
  DROP POLICY IF EXISTS "settings_all" ON settings;
  CREATE POLICY "settings_all" ON settings FOR ALL USING (true) WITH CHECK (true);
  
  -- announcements 表
  DROP POLICY IF EXISTS "announcements_all" ON announcements;
  CREATE POLICY "announcements_all" ON announcements FOR ALL USING (true) WITH CHECK (true);
END
$$;

-- 3. 重新同步数据
-- 从 works 表同步学生完成状态
UPDATE students s
SET completed = true,
    upload_time = w.updated_at,
    photo_url = w.photo_url,
    photo_link = w.photo_link,
    reason = w.reason,
    updated_at = w.updated_at
FROM works w
WHERE s.student_id = w.student_id
AND w.completed = true;

-- 4. 重新计算班级统计
WITH class_stats AS (
  SELECT 
    class,
    COUNT(*) as total,
    COUNT(CASE WHEN completed = true THEN 1 END) as completed
  FROM students
  GROUP BY class
)
INSERT INTO classes (class_name, student_count, completed_count, completion_rate)
SELECT 
  class,
  total,
  completed,
  CASE WHEN total > 0 THEN ROUND((completed::numeric / total) * 100) ELSE 0 END
FROM class_stats
ON CONFLICT (class_name) DO UPDATE SET
  student_count = EXCLUDED.student_count,
  completed_count = EXCLUDED.completed_count,
  completion_rate = EXCLUDED.completion_rate;
