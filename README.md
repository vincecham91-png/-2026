# Star Photo Share System · 星图照片分享系统

> 🌌 星空 × 银河 × 星球 × Glassmorphism — 学校专用照片分享平台

---

## 📖 项目简介

星图照片分享系统是一套供学校使用的学生照片分享平台。

- **学生**：使用学校提供的帐号登入系统，上传照片、填写照片链接，并分享拍摄原因
- **老师**：查看学生完成情况，在课堂中直接展示学生作品
- **管理员**：管理学生名单，导入 Excel，系统维护

---

## ✨ 系统特色

- 🌟 动态星空背景 + 流星动画 + 银河特效
- 🪐 班级以星球方式显示，完成率显示于星球外围
- 🔐 学生三级联登入（班级 → 姓名 → 学号）
- 📤 支持本地上传 & 图片网址两种方式
- 🖼️ 课堂呈堂模式，全屏展示作品
- 📊 教师后台统计图表，完成率一目了然
- 📱 响应式设计，手机电脑平板皆可使用
- ☁️ Supabase 云端储存，即时同步

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| 后端 | Cloudflare Worker (KV) + Supabase (DB/Storage/Auth/Realtime) |
| 认证 | Supabase Auth (教师), 学生名单验证 |
| 部署 | GitHub Pages / Cloudflare Pages |
| CI/CD | GitHub Actions |
| 工具 | Node.js, Chart.js, SheetJS, Compressor.js |

---

## 📁 项目结构

```
-2026/
├── index.html                 # 星空首页
├── login.html                 # 学生登入
├── student.html               # 学生上传
├── gallery.html               # 作品展示
├── teacher.html               # 教师后台
├── teacher-login.html         # 教师登入
├── css/                       # 样式表
├── js/                        # JavaScript 模块
├── firebase/                  # Supabase 配置与初始化
├── data/                      # 学生数据 (students.json)
├── scripts/                   # Node.js 脚本
├── docs/                      # 项目文档
├── worker/                    # Cloudflare Worker 源码
├── .github/workflows/         # CI/CD
├── vercel.json                # Vercel 部署配置
├── package.json               # Node.js 配置
├── README.md                  # 项目说明
├── LICENSE                    # MIT 授权
└── .gitignore                 # Git 忽略
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Supabase

1. 前往 https://supabase.com 创建项目
2. 执行 [docs/supabase-setup.sql](docs/supabase-setup.sql) 创建表格
3. 编辑 `firebase/supabaseConfig.js`，填入你的 Supabase URL 和 anon key
4. 或编辑 `config.public.js` 覆盖全局配置

### 3. 导入学生名单

```bash
node scripts/convertExcel.js    # 生成 data/students.json
node scripts/importSupabase.js  # 导入 Supabase
```

### 4. 本地预览

直接用浏览器打开 `index.html`，或使用 Live Server。

### 5. 部署 Cloudflare Worker

```bash
cd worker
# 更新 wrangler.toml 中的 KV namespace ID
npx wrangler login
npx wrangler deploy
```

### 6. 部署前端

#### 6.1 GitHub Pages（推荐）
1. 前往 GitHub → Settings → Pages
2. Source 选择 `main` 分支
3. 部署到 `https://YOUR_GITHUB_USERNAME.github.io/`

#### 6.2 Vercel 部署
1. 登录 Vercel，连接 GitHub 仓库 `vincecham91-png/-2026`
2. 选择项目根目录作为部署目录
3. 构建命令留空，输出目录留空
4. 直接部署静态站点

---

## 🤖 教师帐号

| 项目 | 内容 |
|------|------|
| 用户名 | **Cham Chin Hong** |
| 密码 | **12345** |
| Email | teacher@school.edu.my |

> 教师通过 Supabase Auth 登入。

---

## 👨‍🎓 学生登入方式

1. 首页选择班级
2. 选择姓名
3. 输入学号（密码）
4. 登入成功后进入上传页面

---

## 📄 授权

MIT License — 详见 [LICENSE](LICENSE)

---

## 🔗 相关连结

- Supabase Dashboard: https://supabase.com/dashboard
- Cloudflare Dashboard: https://dash.cloudflare.com
- GitHub Repository: https://github.com/vincecham91-png/-2026

---

**星图照片分享系统 v1.0** · Production Ready · © 2026 CHEW YEN HAN
