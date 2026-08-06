-- ========================================
-- 修复 RLS：允许 anon 写入（导入数据用）
-- 执行完后记得关闭！
-- ========================================

-- 方法 1：给 anon 角色授权（临时，导入后关闭）
GRANT INSERT, UPDATE, DELETE ON students TO anon;
GRANT INSERT, UPDATE, DELETE ON works TO anon;
GRANT INSERT, UPDATE, DELETE ON classes TO anon;
GRANT INSERT, UPDATE, DELETE ON logs TO anon;
GRANT INSERT, UPDATE, DELETE ON settings TO anon;
GRANT INSERT, UPDATE, DELETE ON announcements TO anon;

-- 方法 2：创建 INSERT 策略（推荐，更安全）
-- 已认证用户可插入学生
DROP POLICY IF EXISTS "认证用户可插入学生" ON students;
CREATE POLICY "认证用户可插入学生" ON students
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 已认证用户可插入作品
DROP POLICY IF EXISTS "认证用户可插入作品" ON works;
CREATE POLICY "认证用户可插入作品" ON works
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 已认证用户可插入班级统计
DROP POLICY IF EXISTS "认证用户可插入班级" ON classes;
CREATE POLICY "认证用户可插入班级" ON classes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 已认证用户可插入日志
DROP POLICY IF EXISTS "认证用户可插入日志" ON logs;
CREATE POLICY "认证用户可插入日志" ON logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 已认证用户可插入设置
DROP POLICY IF EXISTS "认证用户可插入设置" ON settings;
CREATE POLICY "认证用户可插入设置" ON settings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 已认证用户可插入公告
DROP POLICY IF EXISTS "认证用户可插入公告" ON announcements;
CREATE POLICY "认证用户可插入公告" ON announcements
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
