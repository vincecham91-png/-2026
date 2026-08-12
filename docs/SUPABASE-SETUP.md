# 🚀 Supabase 设置指南（VinceCham91-png/-2026）

> 完成以下步骤后，你的网站就能正式运行。

---

## 步骤一：创建 Supabase 项目

1. 打开 https://supabase.com/dashboard
2. 点击 **New Project**
3. 填写项目信息，记住：
   - **Project URL**：`https://dhibndbjkxzotindclei.supabase.co`
   - **anon/public key** 和 **service_role key**

---

## 步骤二：执行数据库建表 SQL

1. 打开 [Supabase SQL Editor](https://supabase.com/dashboard/project/dhibndbjkxzotindclei/sql/new)
2. 点击 **New Query**
3. 复制 [docs/full-setup.sql](../docs/full-setup.sql) 全部内容
4. 点击 **Run**

---

## 步骤三：导入学生数据

### 方法 A：使用 SQL（推荐）

1. 打开 [Supabase SQL Editor](https://supabase.com/dashboard/project/dhibndbjkxzotindclei/sql/new)
2. 复制 [docs/import-students.sql](../docs/import-students.sql) 全部内容
3. 点击 **Run**
4. 去 **Table Editor → students** 确认有 101 名学生

### 方法 B：使用 Node.js 脚本

```bash
# 需要 service_role key
npm install
node scripts/import-students.js
```

---

## 步骤四：配置 Storage

1. 在 Dashboard 点击左侧 **Storage**
2. 点击 **New Bucket**
3. 名称：`images`，Public Bucket：✅ 勾选
4. 点击 **Create Bucket**

---

## 步骤五：创建教师账号

1. 点击左侧 **Authentication → Users**
2. 点击 **Add User**
3. 填写：
   - Email：`teacher@school.edu.my`
   - Password：`12345`
4. 点击 **Create User**
5. 复制生成的 **User ID**
6. 打开 SQL Editor，执行：

```sql
INSERT INTO teachers (id, name, email, role)
VALUES ('你的UserUUID', 'Cham Chin Hong', 'teacher@school.edu.my', 'teacher');
```

---

## 步骤六：配置前端

编辑 [config.public.js](../config.public.js)：

```javascript
window.SPSS_SUPABASE_URL = 'https://dhibndbjkxzotindclei.supabase.co';
window.SPSS_SUPABASE_ANON_KEY = '你的 anon key';
```

---

## 快速验证

- [ ] 7 张表格已创建
- [ ] 101 名学生已导入
- [ ] Storage bucket `images` 已创建
- [ ] 教师账号已创建
- [ ] config.public.js 已配置

## 学生登入信息

- 班级：初二忠(36)、初二孝(26)、初二仁(22)、初二爱(17)
- 学号 = 密码（例如：25024）
- 完整名单见 [data/students.json](../data/students.json)
