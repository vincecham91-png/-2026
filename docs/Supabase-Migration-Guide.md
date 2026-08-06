# Star Photo Share System
# 迁移指南：Firebase → Supabase

Version 1.0
2026-08-05

---

# 迁移概述

本项目已从 Firebase（Firestore + Storage + Auth）迁移到 Supabase。

**主要变更：**
- Firestore → Supabase Database（PostgreSQL）
- Firebase Storage → Supabase Storage
- Firebase Auth → Supabase Auth
- onSnapshot → Supabase Realtime（PostgreSQL Changes）

---

# 快速开始

## 1. 创建 Supabase 项目

1. 前往 https://supabase.com 注册并创建新项目
2. 复制项目 URL（格式：`https://xxxxxxxx.supabase.co`）
3. 前往 Settings → API，复制 `anon/public` key

## 2. 执行数据库初始化

1. 前往 Supabase Dashboard → SQL Editor
2. 复制并执行 [docs/supabase-setup.sql](supabase-setup.sql)
3. 确认表格、索引、RLS 策略、Storage Bucket 创建成功

## 3. 配置前端

1. 打开 `firebase/supabaseConfig.js`
2. 替换以下两个值：
   ```javascript
   const SUPABASE_URL = 'https://你的项目.supabase.co';
   const SUPABASE_ANON_KEY = '你的anon_key';
   ```

## 4. 导入学生数据

### 方法 A：Excel 导入（推荐）
```bash
node scripts/convertExcel.js    # 生成 students.json
node scripts/importSupabase.js  # 导入 Supabase
```

### 方法 B：手动导入
1. 将 students.json 转换为 CSV
2. 在 Supabase Dashboard → Table Editor → students
3. 使用 Import 功能

---

# 文件变更清单

| 文件 | 变更 |
|------|------|
| `firebase/supabaseConfig.js` | **新增** — Supabase 客户端配置 |
| `js/supabase.js` | **新增** — 替代 firebase.js |
| `js/api.js` | **更新** — 优先使用 Supabase Storage |
| `index.html` | **更新** — 替换 CDN 引用 |
| `login.html` | **更新** — 替换 CDN 引用 |
| `student.html` | **更新** — 替换 CDN 引用 |
| `teacher.html` | **更新** — 替换 CDN 引用 |
| `teacher-login.html` | **更新** — 替换 CDN 引用 |
| `gallery.html` | **更新** — 替换 CDN 引用 |
| `js/teacher.js` | **更新** — 使用 Realtime 替代 onSnapshot |

---

# API 对照表

## Firestore → Supabase

| Firebase | Supabase |
|----------|----------|
| `db.collection('works').doc(id).get()` | `sb.from('works').select('*').eq('student_id', id).single()` |
| `db.collection('works').doc(id).set(data, {merge:true})` | `sb.from('works').upsert(data, {onConflict: 'student_id'})` |
| `db.collection('works').doc(id).delete()` | `sb.from('works').delete().eq('student_id', id)` |
| `db.collection('works').where('class','==',cls).get()` | `sb.from('works').select('*').eq('class', cls)` |
| `collection('works').onSnapshot(fn)` | `sb.channel('works_changes').on('postgres_changes', {...}, fn).subscribe()` |
| `firebase.firestore.FieldValue.serverTimestamp()` | `new Date().toISOString()` |

## Storage → Supabase

| Firebase | Supabase |
|----------|----------|
| `storage.ref(path).put(file)` | `sb.storage.from('images').upload(path, file)` |
| `ref.getDownloadURL()` | `sb.storage.from('images').getPublicUrl(path).data.publicUrl` |
| `storage.refFromURL(url).delete()` | 从 URL 反推 path → `sb.storage.from('images').remove([path])` |

## Auth → Supabase

| Firebase | Supabase |
|----------|----------|
| `auth.signInWithEmailAndPassword(email, pass)` | `sb.auth.signInWithPassword({email, password})` |
| `auth.signOut()` | `sb.auth.signOut()` |
| `auth.currentUser` | `sb.auth.getUser()` |

---

# 数据库表结构

## students
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| student_id | TEXT UNIQUE | 学号（文档 ID） |
| name | TEXT | 姓名 |
| class | TEXT | 班级 |
| password | TEXT | 密码（学号） |
| completed | BOOLEAN | 是否完成 |
| photo_url | TEXT | 图片 URL |
| photo_link | TEXT | 图片网址 |
| reason | TEXT | 分享原因 |
| upload_time | TIMESTAMPTZ | 上传时间 |
| last_login | TIMESTAMPTZ | 最后登入 |
| status | TEXT | 状态（active/inactive） |

## works
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| student_id | TEXT UNIQUE | 学号（文档 ID） |
| name | TEXT | 姓名 |
| class | TEXT | 班级 |
| photo_url | TEXT | 图片 URL |
| photo_link | TEXT | 图片网址 |
| reason | TEXT | 分享原因 |
| completed | BOOLEAN | 是否完成 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

## classes
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| class_name | TEXT UNIQUE | 班级名（文档 ID） |
| student_count | INTEGER | 学生总数 |
| completed_count | INTEGER | 已完成数 |
| completion_rate | INTEGER | 完成率（0-100） |
| updated_at | TIMESTAMPTZ | 更新时间 |

## teachers
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 外键 → auth.users.id |
| name | TEXT | 姓名 |
| email | TEXT | 邮箱 |
| role | TEXT | 角色 |
| last_login | TIMESTAMPTZ | 最后登入 |

---

# 部署

## Vercel 部署
项目已配置 `vercel.json`，可直接从 GitHub 自动部署。

## 注意事项
1. Supabase Realtime 需要付费计划才能使用 PostgreSQL Changes（免费版仅限开发测试）
2. 如果 Realtime 不可用，系统会自动降级为 30 秒轮询
3. 图片上传优先级：Supabase Storage → Worker R2 → base64 降级

---

# 常见问题

## Q: 如何迁移现有 Firebase 数据？
A: 使用 Supabase 内置的 Firebase 迁移工具，或导出 JSON 后手动导入 CSV。

## Q: 学生密码如何迁移？
A: 学生密码存储在 Firestore 中，迁移到 Supabase 后直接对应 password 字段。

## Q: 实时同步还能用吗？
A: 可以。使用 `js/supabase.js` 中的 `subscribeWorks()` 函数替代 `onSnapshot()`。

## Q: 本地开发需要 Supabase 吗？
A: 不需要。系统有完整的 localStorage 降级方案，无网络时仍可正常工作。
