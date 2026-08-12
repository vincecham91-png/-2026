-- ========================================
-- Star Photo Share System
-- Supabase Database Setup
-- Version 1.0
-- 2026-08-05
-- ========================================
--
-- 请在 Supabase Dashboard 的 SQL Editor 中执行以下 SQL
-- 依次执行每个部分（或整体复制粘贴执行）
-- ========================================

-- ========================================
-- 1. 创建表格
-- ========================================

-- 学生表
CREATE TABLE IF NOT EXISTS students (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  class         TEXT NOT NULL,
  password      TEXT NOT NULL DEFAULT '',
  completed     BOOLEAN DEFAULT FALSE,
  photo_url     TEXT DEFAULT '',
  photo_link    TEXT DEFAULT '',
  reason        TEXT DEFAULT '',
  upload_time   TIMESTAMPTZ,
  last_login    TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 作品表
CREATE TABLE IF NOT EXISTS works (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  class         TEXT NOT NULL,
  photo_url     TEXT DEFAULT '',
  photo_link    TEXT DEFAULT '',
  reason        TEXT DEFAULT '',
  completed     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 班级统计表
CREATE TABLE IF NOT EXISTS classes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name      TEXT NOT NULL UNIQUE,
  student_count   INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  completion_rate INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 教师表
CREATE TABLE IF NOT EXISTS teachers (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'teacher',
  last_login  TIMESTAMPTZ
);

-- 设置表（系统配置）
CREATE TABLE IF NOT EXISTS settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  value       JSONB DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 日志表
CREATE TABLE IF NOT EXISTS logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL,
  user_id     TEXT,
  message     TEXT,
  timestamp   TIMESTAMPTZ DEFAULT now(),
  user_agent  TEXT
);

-- 公告表
CREATE TABLE IF NOT EXISTS announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- 2. 创建索引
-- ========================================

CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
CREATE INDEX IF NOT EXISTS idx_students_password ON students(password);

CREATE INDEX IF NOT EXISTS idx_works_class ON works(class);
CREATE INDEX IF NOT EXISTS idx_works_student_id ON works(student_id);
CREATE INDEX IF NOT EXISTS idx_works_updated_at ON works(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_type ON logs(type);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);

-- ========================================
-- 3. 启用 RLS（行级安全）
-- ========================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 4. 创建安全策略
-- ========================================

-- 学生表策略
DROP POLICY IF EXISTS "所有人可读学生名单" ON students;
CREATE POLICY "所有人可读学生名单" ON students
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "学生可更新自己的资料" ON students;
CREATE POLICY "学生可更新自己的资料" ON students
  FOR UPDATE USING (auth.uid()::text = student_id);

-- 作品表策略
DROP POLICY IF EXISTS "所有人可读作品" ON works;
CREATE POLICY "所有人可读作品" ON works
  FOR SELECT USING (true);

-- 允许已认证用户和匿名用户读写作品
DROP POLICY IF EXISTS "已认证用户可读写作品" ON works;
CREATE POLICY "已认证用户可读写作品" ON works
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 允许匿名用户读取作品（用于画廊展示）
DROP POLICY IF EXISTS "匿名可读作品" ON works;
CREATE POLICY "匿名可读作品" ON works
  FOR SELECT USING (true);

-- 班级表策略
DROP POLICY IF EXISTS "所有人可读班级" ON classes;
CREATE POLICY "所有人可读班级" ON classes
  FOR SELECT USING (true);

-- 教师表策略
DROP POLICY IF EXISTS "仅教师可读" ON teachers;
CREATE POLICY "仅教师可读" ON teachers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'teacher'
    )
  );

-- 日志表策略（仅教师可读）
DROP POLICY IF EXISTS "仅教师可读日志" ON logs;
CREATE POLICY "仅教师可读日志" ON logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'teacher'
    )
  );

-- 设置表策略（仅教师可读）
DROP POLICY IF EXISTS "仅教师可读设置" ON settings;
CREATE POLICY "仅教师可读设置" ON settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'teacher'
    )
  );

-- 公告表策略（所有人可读）
DROP POLICY IF EXISTS "所有人可读公告" ON announcements;
CREATE POLICY "所有人可读公告" ON announcements
  FOR SELECT USING (true);

-- ========================================
-- 5. 创建 Storage Bucket
-- ========================================

-- 创建 images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- 创建 Storage 策略
DROP POLICY IF EXISTS "所有人可读取图片" ON storage.objects;
CREATE POLICY "所有人可读取图片" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

-- 允许任何人读取公开 bucket
DROP POLICY IF EXISTS "公开读取图片" ON storage.objects;
CREATE POLICY "公开读取图片" ON storage.objects
  FOR SELECT TO PUBLIC USING (bucket_id = 'images');

DROP POLICY IF EXISTS "认证用户可上传图片" ON storage.objects;
CREATE POLICY "认证用户可上传图片" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'images'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "认证用户可删除图片" ON storage.objects;
CREATE POLICY "认证用户可删除图片" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'images'
    AND auth.uid() IS NOT NULL
  );

-- ========================================
-- 6. 创建实时监听触发器
-- ========================================

-- 启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE works;
ALTER PUBLICATION supabase_realtime ADD TABLE students;

-- ========================================
-- 7. 插入默认教师（可选）
-- ========================================

-- 如果需要在 Supabase Auth 中创建教师账号，请使用以下方式：
-- 1. 在 Supabase Dashboard → Authentication → Users 中手动创建
-- 2. 或在 SQL 中执行以下命令（需要先手动创建用户）：
--
-- INSERT INTO teachers (id, name, email, role)
-- VALUES ('用户UUID', 'Cham Chin Hong', 'teacher@school.edu.my', 'teacher');
