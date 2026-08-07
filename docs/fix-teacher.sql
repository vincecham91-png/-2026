-- ========================================
-- 修复教师登录问题
-- ========================================

-- 1. 插入教师记录（如果不存在）
INSERT INTO teachers (id, name, email, role)
VALUES ('5d0b2ad1-9127-4e4d-a1d6-1b58b5f7d3d8', 'Cham Chin Hong', 'teacher@school.edu.my', 'teacher')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role;

-- 2. 允许 anon 读取教师表（仅 SELECT）
GRANT SELECT ON teachers TO anon;

-- 3. 创建读取策略（更安全的做法）
DROP POLICY IF EXISTS "teacher_select" ON teachers;
CREATE POLICY "teacher_select" ON teachers
  FOR SELECT USING (true);
