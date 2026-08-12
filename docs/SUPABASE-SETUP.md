# 🚀 Supabase 设置指南（ VinceCham91-png/-2026 ）

> 完成以下步骤后，你的网站就能正式运行。

---

## 步骤一：创建 Supabase 项目

1. 打开 https://supabase.com/dashboard
2. 点击 **New Project**
3. 填写：
   - Organization：选择你的组织
   - Name：`star-photo-share`（或任意名字）
   - Database Password：设为 `VinceCham123!`（记住这个密码）
   - Region：选 `Southeast Asia`（东南亚，最快）
4. 点击 **Create New Project**
5. 等待 2-3 分钟项目创建完成
6. 记录以下信息：
   - **Project URL**：格式为 `https://xxxxxxx.supabase.co`（复制这个 URL）
   - **API Keys**：点击左侧 **Settings → API**，复制：
     - `anon/public` key（前端用）
     - `service_role` key（管理用）

---

## 步骤二：执行数据库建表 SQL

1. 在 Supabase Dashboard 中点击左侧 **SQL Editor**
2. 点击 **New Query**
3. 打开本仓库的 [docs/supabase-setup.sql](../docs/supabase-setup.sql)
4. 复制全部内容，粘贴到 SQL Editor
5. 点击 **Run**（或按 Ctrl+Enter）
6. 确认所有表格创建成功

---

## 步骤三：导入学生数据

### 方法 A：使用 SQL（推荐）

1. 在 Supabase Dashboard → **SQL Editor**
2. 打开本仓库的 [docs/full-import.sql](../docs/full-import.sql)
3. 复制全部内容，粘贴到 SQL Editor
4. 点击 **Run**
5. 去 **Table Editor → students** 确认有 101 名学生

### 方法 B：使用 Node.js 脚本（可选）

```bash
# 安装依赖
npm install

# 配置脚本（编辑 scripts/config.js 填入你的 key）
node scripts/importSupabase.js
```

---

## 步骤四：配置 Storage（图片存储）

1. 在 Supabase Dashboard 点击左侧 **Storage**
2. 点击 **New Bucket**
3. 名称：`images`
4. 权限设置：
   - Public Bucket：✅ 勾选（公开读取）
   - 上传权限：只有认证用户可以上传
   - 删除权限：只有认证用户可以删除
5. 点击 **Create Bucket**

---

## 步骤五：配置 Supabase Auth（教师登入）

1. 在 Supabase Dashboard 点击左侧 **Authentication → Users**
2. 点击 **Add User**
3. 填写：
   - Email：`teacher@school.edu.my`
   - Password：`12345`
   - 不发送确认邮件：✅ 勾选
4. 点击 **Create User**
5. 复制生成的 User ID（UUID 格式）
6. 打开 **SQL Editor**，执行以下 SQL 创建教师记录：

```sql
INSERT INTO teachers (id, name, email, role)
VALUES ('YOUR_USER_UUID_HERE', 'Cham Chin Hong', 'teacher@school.edu.my', 'teacher');
```

---

## 步骤六：更新配置文件

编辑项目根目录的 [config.public.js](../config.public.js)：

```javascript
window.SPSS_SUPABASE_URL = 'https://你的项目ID.supabase.co';
window.SPSS_SUPABASE_ANON_KEY = '你的 anon/public key';
```

> ⚠️ **不要**把 service_role key 填进去！只能用 anon key！

---

## 步骤七：本地测试

```bash
# 安装依赖
npm install

# 启动本地服务器
npx serve .
```

打开浏览器访问 http://localhost:3000

---

## 步骤八：部署前端（GitHub Pages）

1. 在 GitHub 上进入你的仓库 https://github.com/vincecham91-png/-2026
2. 点击 **Settings → Pages**
3. Source：选择 **GitHub Actions**
4. 点击 **View workflow** 查看自动部署日志

或者手动部署：

```bash
# 使用 Vercel 一键部署（推荐）
npx vercel --prod
```

---

## 常见问题

### Q: 学生登入提示「找不到此学生」？
A: 检查 students 表是否有数据，确认班级名称拼写正确（初二忠/初二孝/初二仁/初二爱）。

### Q: 图片上传失败？
A: 确认 Storage bucket `images` 已创建，且 RLS 策略已启用（步骤二的 SQL 里已包含）。

### Q: 教师登入失败？
A: 确认已在 Authentication 中创建了教师用户，并在 teachers 表中有对应记录。

### Q: 实时功能不工作？
A: Supabase Realtime 需要 Pro 计划。免费计划可改用轮询方案（代码已内置 fallback）。

---

## 学生登入信息

- 班级：初二忠、初二孝、初二孝、初二爱
- 学号 = 密码（例如：25024）
- 完整学生名单见 [data/students.json](../data/students.json)

---

## 快速验证清单

- [ ] Supabase 项目已创建
- [ ] 7 张表格已创建（students/works/classes/teachers/settings/logs/announcements）
- [ ] 101 名学生已导入
- [ ] Storage bucket `images` 已创建
- [ ] config.public.js 已填入正确的 URL 和 anon key
- [ ] 教师账号已创建
- [ ] 首页能正常打开并显示班级星球
