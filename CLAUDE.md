# 星图照片分享系统 · Star Photo Share

> 🌌 学校专用照片分享平台 | 4 班 101 学生 | Supabase + Cloudflare

## 部署地址

| 组件 | URL | 部署方式 |
|------|-----|----------|
| **前端** | `*.YOUR_PROJECT.pages.dev` | `npx wrangler pages deploy . --project-name=YOUR_PROJECT` |
| **Worker** | `YOUR_PROJECT.workers.dev` | `cd worker && npx wrangler deploy` |
| **Supabase** | `YOUR_PROJECT_ID_HERE.supabase.co` | MCP `execute_sql` |

## 技术栈

- **前端**：HTML5 + CSS3 + Vanilla JS，无构建工具
- **后端数据库**：Supabase（PostgreSQL + Auth + Storage + Realtime）
- **后端 API**：Cloudflare Worker + KV（图片上传 base64 备用）
- **部署**：Cloudflare Pages（前端）+ Cloudflare Workers（API）

## 项目结构

```
-2026/
├── index.html              ← 首页（班级星球 + 完成率）
├── login.html              ← 学生登录
├── student.html            ← 学生上传作品
├── gallery.html            ← 作品画廊
├── teacher-login.html      ← 教师登入（Supabase Auth）
├── teacher.html            ← 教师仪表盘
├── config.public.js        ← Supabase URL + anon key（全部页面必须加载）
├── css/                    ← 样式表
├── js/                     ← JS 模块（util.js, supabase.js, api.js, app.js…）
├── firebase/               ← Supabase 配置（supabaseConfig.js）【历史命名，实际是 Supabase】
├── data/                   ← students.json（101 名学生）
├── worker/                 ← Cloudflare Worker 源码
│   ├── src/index.js        ← Worker 主代码
│   ├── wrangler.toml       ← KV binding + 部署配置
│   └── src/init-kv.js      ← KV 初始化脚本
├── scripts/                ← 工具脚本
│   ├── run-sql.js          ← 直连 PG 执行多语句 SQL
│   └── import-students-pg.js ← 批量导入学生到 Supabase
└── docs/                   ← 文档
    └── supabase-setup.sql  ← 数据库建表 SQL（55 条语句）
```

## 数据库（Supabase）

### 表结构（7 张表，全部启用 RLS）

| 表 | 行数 | 说明 |
|------|------|------|
| `students` | 101 | 学生（student_id, name, class, password, photo_url, status） |
| `works` | 0 | 作品（student_id, photo_url, photo_link, reason） |
| `classes` | 4 | 班级统计（class_name, student_count, completed_count） |
| `teachers` | 1 | 教师（FK → auth.users.id） |
| `settings` | 0 | 系统配置（key/value JSONB） |
| `logs` | 0 | 操作日志 |
| `announcements` | 0 | 公告 |

### 学生数据

| 班级 | 人数 |
|------|------|
| 初二忠 | 36 |
| 初二孝 | 26 |
| 初二仁 | 22 |
| 初二爱 | 17 |

- 学生密码 = 各自学号
- 教师：Cham Chin Hong / `teacher@school.edu.my` / `12345`（Supabase Auth）

### Storage

- Bucket: `images`（公开读取，认证用户可上传/删除）

### Realtime

- `works` 表 + `students` 表已启用

## 前端页面加载顺序（重要！）

所有 HTML 必须按此顺序加载脚本：
```html
<script src="config.public.js"></script>              <!-- 1. Supabase 凭证 -->
<script src="https://...supabase-js@2"></script>      <!-- 2. Supabase SDK -->
<script src="firebase/supabaseConfig.js"></script>     <!-- 3. 初始化客户端 -->
<script src="js/..."></script>                         <!-- 4. 业务模块 -->
```

**config.public.js 必须在 Supabase SDK 之前**，否则 Supabase 客户端初始化为空。

## 认证方式

- **教师**：Supabase Auth（email/password），JWT token
- **学生**：Worker API 验证（学号 + 密码比对 students 表 / KV）
- **图片上传**：Worker `Authorization: Bearer <API_KEY>`

## 部署命令

```bash
# 前端
cd d:/AIgames/-2026
npx wrangler pages deploy . --project-name=YOUR_PROJECT --branch=main

# Worker
cd d:/AIgames/-2026/worker
npx wrangler deploy
```

Cloudflare Pages 绑定 GitHub `vincecham91-png/-2026`（私有），push main 自动构建。

## 修复过的坑

1. **config.public.js 只在 teacher-login.html 加载** → 其他 5 个页面 Supabase 客户端为空。已加到全部页面。
2. **Worker CORS 写死 `YOUR_GITHUB_USERNAME.github.io`** → Cloudflare Pages 域名被拦。改为动态检测 Origin。
3. **Supabase MCP OAuth 不可用** → 改用 PAT（Personal Access Token），见根目录 `.mcp.json`。
4. **`supabase db query` 不支持多语句** → 写 `scripts/run-sql.js` 直连 PG 逐条执行。
5. **Pooler DNS 解析失败** → 直连 `db.YOUR_PROJECT_ID_HERE.supabase.co:5432`，不用 pooler。

## Supabase 凭证速查

- Project ref: `YOUR_PROJECT_ID_HERE`
- Anon key: `YOUR_SUPABASE_ANON_KEY`（前端用）
- Service role: `YOUR_SERVICE_ROLE_KEY`（脚本/Admin API）
- DB password: `YOUR_DB_PASSWORD`（直连 PG 紧急备用）
- Dashboard: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID_HERE`
