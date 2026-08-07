-- ========================================
-- 修复教师登录问题 - 完整策略
-- ========================================

-- 1. 给 anon 角色授权读取 auth.users
GRANT SELECT ON auth.users TO anon;
GRANT SELECT ON auth.refresh_tokens TO anon;

-- 2. 给 anon 角色授权教师表
GRANT INSERT, SELECT, UPDATE, DELETE ON teachers TO anon;

-- 3. 创建完整的教师表策略
DROP POLICY IF EXISTS "teachers_all" ON teachers;
CREATE POLICY "teachers_all" ON teachers
  FOR ALL USING (true) WITH CHECK (true);

-- 4. 确保教师记录存在
INSERT INTO teachers (id, name, email, role)
VALUES ('5d0b2ad1-9127-4e4d-a1d6-1b58b5f7d3d8', 'Cham Chin Hong', 'teacher@school.edu.my', 'teacher')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role;

-- 5. 验证
SELECT id, name, email, role FROM teachers;
