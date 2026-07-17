# Star Photo Share System · 星图照片分享系统

> 🌌 星空 × 银河 × 星球 × Glassmorphism — 学校专用照片分享平台

---

## 📖 项目简介

Star Photo Share System 是一套供学校使用的学生照片分享平台。

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
- ☁️ Firebase 云端储存，即时同步

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| 后端 | Firebase Firestore, Firebase Storage |
| 认证 | Firebase Authentication (教师), 学生名单验证 |
| 部署 | GitHub Pages / Firebase Hosting |
| CI/CD | GitHub Actions |
| 工具 | Node.js, Chart.js, SheetJS, Compressor.js |

---

## 📁 项目结构

```
StarPhotoShare/
├── index.html                 # 星空首页
├── login.html                 # 学生登入
├── student.html               # 学生上传
├── gallery.html               # 作品展示
├── teacher.html               # 教师后台
├── teacher-login.html         # 教师登入
├── css/                       # 样式表
├── js/                        # JavaScript 模块
├── firebase/                  # Firebase 配置
├── data/                      # 资料文件
├── scripts/                   # Node.js 脚本
├── assets/                    # 静态资源
├── .github/workflows/         # CI/CD
├── firebase.json              # Firebase Hosting 配置
├── firestore.rules            # Firestore 安全规则
├── storage.rules              # Storage 安全规则
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

### 2. 配置 Firebase

编辑 `firebase/firebaseConfig.js`，填入你的 Firebase 项目配置。

### 3. 导入学生名单

```bash
node scripts/convertExcel.js
node scripts/importFirestore.js
```

### 4. 本地预览

直接用浏览器打开 `index.html`，或使用 Live Server。

### 5. 部署

```bash
firebase deploy
```

或 Push 到 GitHub，GitHub Actions 自动部署。

---

## 👩‍🏫 教师帐号

教师需要在 Firebase Authentication 中手动建立帐号：

1. 进入 Firebase Console → Authentication → Users
2. Add User → Email: `teacher@school.edu.my`，设定密码
3. 在 Firestore `teachers` Collection 中建立对应 Document

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

- Firebase Console: https://console.firebase.google.com/
- GitHub Repository: https://github.com/vincecham91-png/-2026

---

**Star Photo Share System v1.0** · Production Ready · © 2026
