# 星图网页（Star Photo Share System）

> Production Ready 学校照片分享系统。目标不是 Demo，不是 Prototype，是可部署到学校使用的正式系统。

## 技术栈

- **前端**：HTML5 + CSS3 + Vanilla JavaScript（ES6 Modules）
- **后端**：Supabase（Database + Auth + Storage + Realtime）
- **部署**：Vercel + GitHub Pages
- **无 Build Tool**：所有代码直接可执行（无需 Vite/Webpack）
- **允许的库**：Supabase JS Client、Chart.js、SheetJS、Compressor.js

## 架构约束

### 文件组织
```
├── index.html          ← 首页
├── login.html          ← 学生登录
├── student.html        ← 学生仪表板
├── gallery.html        ← 作品画廊
├── teacher-login.html  ← 教师登录
├── teacher.html        ← 教师仪表板
├── css/                ← 每个页面独立 CSS 文件
├── js/                 ← 每个页面独立 JS 模块
├── firebase/           ← Supabase 配置与初始化
├── data/               ← 静态数据（students.json）
├── scripts/            ← 工具脚本（Excel 导入等）
└── docs/               ← 项目文档
```

### 关键规则
- **JS 必须模块化**：每个页面一个 JS 文件，不得全写在 HTML 中
- **Supabase 统一初始化**：所有页面 import `firebase/supabaseConfig.js`，禁止重复初始化
- **权限分离**：学生只能访问自己的数据；教师通过 Supabase Auth + Role Check
- **Session 检查**：禁止直接 URL 进入 `student.html`，必须先登录

## UI 设计系统

- **主题**：星空 × 银河 × 星球 × Glassmorphism
- **参考**：Apple VisionOS / NASA / Windows Fluent Design
- **统一 Design System**：所有页面使用相同的 CSS Variables、颜色、字体、按钮样式
- **响应式**：Desktop + Tablet + Mobile 全部覆盖
- **Glassmorphism**：CSS backdrop-filter + 半透明 + 模糊
- **深色主题**：现代化深色介面

## 编码规则

### 页面规则
- 每次输出最多一个功能模块（一个 folder 或一个完整页面），不要一次输出所有代码
- 文件超过 1000 行自动在下一次回复中继续
- 不得重新生成已完成的旧文件

### 数据库
- Supabase Tables：`students`、`works`、`classes`、`teachers`、`settings`、`logs`、`announcements`
- Storage Bucket：`images`
- Schema 规范统一，全部使用常量定义表名称

### 图片处理
- 支持格式：JPG、PNG、WEBP、JPEG
- 压缩：最长边 1600px，品质 85%
- Storage：统一使用 Supabase Storage（优先）→ Worker R2（备用）→ base64（降级）

## 禁止事项

- ❌ TODO / FIXME / Placeholder / Coming Soon / 省略 / 略
- ❌ `alert()` / `confirm()` / `prompt()` —— 统一使用 Toast Component
- ❌ Magic String —— Supabase Table/Path 统一用常量
- ❌ 不同页面不同 Design Token —— 统一 Design System
- ❌ 只做 Desktop —— 必须 Responsive 三端

## 迁移注意事项（Firebase → Supabase）

1. 所有 Firebase CDN 已替换为 Supabase CDN
2. `firebase/firebaseConfig.js` → `firebase/supabaseConfig.js`
3. `js/firebase.js` → `js/supabase.js`
4. 学生密码仍存储在 Supabase `students` 表中（前端比对）
5. 教师认证使用 Supabase Auth（email/password）
6. 实时监听使用 `subscribeWorks()` 替代 Firestore `onSnapshot()`
7. 保持 localStorage 降级方案（Supabase 不可用时自动切换）

## 部署准备

1. 在 Supabase Dashboard 创建项目
2. 执行 `docs/supabase-setup.sql` 创建表格和权限
3. 在 `firebase/supabaseConfig.js` 中填入 URL 和 anon key
4. 使用 `scripts/importSupabase.js` 导入学生数据
5. 部署到 Vercel（已配置 `vercel.json`）

## 文档索引

Agent 应按需使用 Read 工具读取以下文档，不要一次性加载所有：

| 需求 | 读取 |
|------|------|
| 了解整体架构 | `docs/01-Project-Structure.md` |
| 首页开发 | `docs/02-Homepage.md` |
| 登录系统 | `docs/03-Login-System.md` |
| 学生系统 | `docs/04-Student-System.md` |
| 画廊系统 | `docs/05-Gallery-System.md` |
| 教师系统 | `docs/06-Teacher-System.md` |
| Firebase 配置 | `docs/07-Firebase-System.md` |
| Excel 导入 | `docs/08-Excel-Import.md` |
| GitHub 部署 | `docs/09-GitHub-Deployment.md` |
| UI 设计细节 | `docs/10-UI-Design-System.md` |
| 完整编码规范 | `docs/11-AI-Developer-Rules.md` |
| 数据库 Schema | `docs/12-Database-Schema.md` |
| 测试检查清单 | `docs/13-Testing-QA.md` |
| 部署流程 | `docs/14-Deployment-Manual.md` |
| **Supabase 迁移指南** | `docs/Supabase-Migration-Guide.md` |
| **数据库建表 SQL** | `docs/supabase-setup.sql` |

## 安全规则

- Database RLS（Row Level Security）必须启用
- Storage Policies 必须启用
- 教师：Role Check（Supabase Auth + JWT Claims）
- 学生：只能读取和修改自己的数据
- 所有错误：Console + Log 表双记录
