# Star Photo Share System - Supabase 部署指南

> 项目：cortjiuduqdpiouqwgzp.supabase.co
> 最后更新：2026-08-10

---

## 1. Supabase 项目配置

### 1.1 数据库初始化

1. 打开 https://supabase.com/dashboard/project/cortjiuduqdpiouqwgzp
2. 前往 **SQL Editor**
3. 复制 [docs/supabase-setup.sql](docs/supabase-setup.sql) 内容
4. 执行 SQL 创建表格和 RLS 策略

### 1.2 创建教师账号

在 Supabase Dashboard → **Authentication → Users** 中手动创建：

| 字段 | 值 |
|------|-----|
| Email | teacher@school.edu.my |
| Password | 12345 |
| Email Confirm | ✅ 已确认 |

然后在 **SQL Editor** 执行：

```sql
-- 插入教师记录（替换为实际用户 ID）
INSERT INTO teachers (id, name, email, role)
VALUES ('用户UUID', 'Cham Chin Hong', 'teacher@school.edu.my', 'teacher');
```

### 1.3 导入学生数据

从 Supabase Dashboard → **Table Editor → students** → **Import**
- 文件格式：CSV
- 列：student_id, name, class, password, status
- 导入 [data/students.json](data/students.json) 转换为 CSV

---

## 2. 前端配置

### 2.1 获取 Anon Key

1. 前往 **Settings → API**
2. 复制 `anon` / `public` key

### 2.2 更新配置文件

编辑 `config.local.js`（本地开发）：

```javascript
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // 替换为实际 key
```

编辑 `config.public.js`（生产环境）：

```javascript
window.SPSS_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // 替换为实际 key
```

---

## 3. 部署

### 3.1 Cloudflare Pages 部署

```bash
npx wrangler pages deploy . --project-name=chewyenhan-star-photo-share --branch=main
```

### 3.2 Vercel 部署（可选）

1. 连接 GitHub 仓库
2. 框架预设选择 **Other**
3. 部署即可

---

## 4. 问题排查

### 4.1 403 错误

检查 RLS 策略：

```sql
-- 检查 students 表策略
SELECT * FROM pg_policies WHERE tablename = 'students';

-- 修复：允许 anon 读取
DROP POLICY IF EXISTS "Allow anon read students" ON students;
CREATE POLICY "Allow anon read students" ON students
  FOR SELECT USING (true);
```

### 4.2 Storage 中文路径问题

**已修复！** `js/supabase.js` 已添加 `classNameToStoragePath()` 函数，将中文班级名转换为 ASCII 路径。

例如：`初二忠` → `class-02-zhong`

### 4.3 静默失败

对比数据库字段名和 JS 代码字段名：

| 数据库字段 | JS 代码 | 状态 |
|-----------|---------|------|
| `student_id` | `student_id` | ✅ 一致 |
| `photo_url` | `photoURL` (JavaScript) | ✅ 映射正确 |
| `class` | `class` | ✅ 一致 |

---

## 5. 教师登录测试

- 地址：https://[部署地址]/teacher-login.html
- 账号：teacher@school.edu.my
- 密码：12345

---

## 6. 学生登录测试

- 地址：https://[部署地址]/login.html
- 班级：初二忠
- 姓名：选择任意学生
- 密码：学生学号（如 25024）
