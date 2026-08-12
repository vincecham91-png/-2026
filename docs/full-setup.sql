-- ========================================
-- Star Photo Share System - Supabase 完整设置脚本
-- 项目：https://supabase.com/dashboard/project/dhibndbjkxzotindclei
-- ========================================
--
-- 使用说明：
-- 1. 打开 Supabase Dashboard → SQL Editor
-- 2. 复制以下全部内容
-- 3. 点击 Run（或 Ctrl+Enter）
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

-- 学生表
CREATE POLICY "所有人可读学生名单" ON students FOR SELECT USING (true);
CREATE POLICY "学生可更新自己的资料" ON students FOR UPDATE USING (auth.uid()::text = student_id);

-- 作品表
CREATE POLICY "所有人可读作品" ON works FOR SELECT USING (true);
CREATE POLICY "认证用户可读写作品" ON works FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 班级表
CREATE POLICY "所有人可读班级" ON classes FOR SELECT USING (true);

-- 教师表（仅教师可读）
CREATE POLICY "仅教师可读教师表" ON teachers FOR SELECT USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid())
);

-- 日志表（仅教师可读）
CREATE POLICY "仅教师可读日志" ON logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid())
);

-- 设置表（仅教师可读）
CREATE POLICY "仅教师可读设置" ON settings FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid())
);

-- 公告表
CREATE POLICY "所有人可读公告" ON announcements FOR SELECT USING (true);

-- ========================================
-- 5. 创建 Storage Bucket
-- ========================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage 策略
CREATE POLICY "公开读取图片" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

CREATE POLICY "认证用户可上传图片" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'images'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "认证用户可删除图片" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'images'
    AND auth.uid() IS NOT NULL
  );

-- ========================================
-- 6. 启用 Realtime
-- ========================================

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS works;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS students;

-- ========================================
-- 7. 插入默认教师账号
-- ========================================
-- 注意：教师账号需要先通过 Supabase Auth 创建
-- 步骤：Dashboard → Authentication → Users → Add User
-- 邮箱：teacher@school.edu.my，密码：12345
-- 创建后复制 User ID 并执行下面的 SQL：
--
-- INSERT INTO teachers (id, name, email, role)
-- VALUES ('你的UserUUID', 'Cham Chin Hong', 'teacher@school.edu.my', 'teacher');
