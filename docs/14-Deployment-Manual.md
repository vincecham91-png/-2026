# Star Photo Share System
# 14 - Deployment Manual

Version 1.0

---

# 文件目的

本手册提供 Star Photo Share System 从零开始部署到正式上线的完整流程。

适用对象：

- 学校教师
- 学校资讯管理员
- 开发人员
- 系统维护人员

完成本手册后，可完成：

✅ 本机开发

✅ Firebase 建立

✅ GitHub 建立

✅ GitHub 自动部署

✅ Firebase Hosting

✅ 学生名单导入

✅ 教师帐号建立

✅ 正式上线

---

# 系统需求

## 开发环境

Windows 11

macOS

Ubuntu Linux

---

## 必须安装

Google Chrome

Git

Node.js LTS

Visual Studio Code

Firebase CLI

GitHub Desktop（可选）

---

# 安装 Node.js

下载：

https://nodejs.org/

安装完成后：

检查版本

```bash
node -v

npm -v
```

建议：

Node.js 22 LTS

---

# 安装 Git

下载：

https://git-scm.com/

安装完成：

```bash
git --version
```

---

# 安装 VS Code

下载：

https://code.visualstudio.com/

建议安装插件：

GitHub Copilot

Prettier

ESLint

Live Server

Firebase Explorer

---

# 建立专案

```bash
mkdir StarPhotoShare

cd StarPhotoShare
```

打开：

```bash
code .
```

---

# 初始化 Git

```bash
git init
```

加入：

```bash
git add .
```

第一次 Commit

```bash
git commit -m "Initial Project"
```

---

# GitHub Repository

建立 Repository：

StarPhotoShare

Public

或

Private

连接：

```bash
git remote add origin https://github.com/USERNAME/StarPhotoShare.git
```

Push：

```bash
git branch -M main

git push -u origin main
```

---

# 建立 Firebase

进入：

https://console.firebase.google.com/

建立：

New Project

名称：

StarPhotoShare

Region：

asia-southeast1

---

# 开启 Firestore

Firebase Console

↓

Firestore Database

↓

Create Database

模式：

Production

---

# 开启 Storage

Storage

↓

Get Started

↓

Asia Southeast

---

# 开启 Authentication

Authentication

↓

Sign In Method

↓

Email Password

Enable

---

# 安装 Firebase CLI

```bash
npm install -g firebase-tools
```

登入：

```bash
firebase login
```

检查：

```bash
firebase --version
```

---

# Firebase Init

进入专案：

```bash
firebase init
```

选择：

Hosting

Firestore

Storage

Functions（可选）

---

# Firebase Config

建立：

firebase/firebaseConfig.js

填入：

apiKey

authDomain

projectId

storageBucket

messagingSenderId

appId

---

# Firestore Rules

部署：

```bash
firebase deploy --only firestore:rules
```

---

# Storage Rules

部署：

```bash
firebase deploy --only storage
```

---

# 建立教师帐号

Authentication

↓

Users

↓

Add User

例如：

teacher@school.edu.my

Password：

12345678

第一次登入后建议修改密码。

---

# 导入学生名单

准备：

students.xlsx

执行：

```bash
node scripts/convertExcel.js
```

输出：

students.json

然后：

```bash
node scripts/importFirestore.js
```

自动建立：

students

classes

Collection

---

# 检查 Firestore

确认：

students

works

classes

teachers

settings

logs

均已建立。

---

# 上传图片测试

登入：

学生帐号

上传：

JPG

PNG

WEBP

确认：

Storage：

images/

Firestore：

works

completed：

true

---

# GitHub Actions

Push：

```bash
git add .

git commit -m "Deploy"

git push
```

GitHub 自动执行：

Deploy Workflow

---

# Firebase Hosting

部署：

```bash
firebase deploy
```

成功：

例如：

https://starphotoshare.web.app

---

# GitHub Pages（可选）

Settings

↓

Pages

↓

Deploy from GitHub Actions

完成：

https://USERNAME.github.io/StarPhotoShare/

---

# 正式上线检查

首页：

✔ 星空背景

✔ 班级按钮

✔ 完成率

---

学生：

✔ 登入

✔ 上传

✔ 修改

✔ 登出

---

教师：

✔ Dashboard

✔ Gallery

✔ Search

✔ Download

✔ Present Mode

---

Firebase：

✔ Firestore

✔ Storage

✔ Authentication

---

GitHub：

✔ Actions

✔ Release

✔ README

---

# 建议目录

```
StarPhotoShare/

assets/

css/

js/

firebase/

scripts/

data/

docs/

README.md

LICENSE

firebase.json

.gitignore
```

---

# 系统维护

每周：

备份 Firestore

备份 Storage

建立 GitHub Release

更新 README

检查 Firebase Usage

---

# 更新学生名单

步骤：

① 更新 students.xlsx

↓

② 执行：

```bash
node scripts/convertExcel.js
```

↓

③ 执行：

```bash
node scripts/importFirestore.js
```

↓

④ 完成

学生帐号自动更新。

---

# 常见问题

## 无法登入

检查：

Authentication

Teacher Collection

Password

---

## 图片无法上传

检查：

Storage Rules

Storage Bucket

图片大小

网络

---

## 首页没有班级

检查：

students Collection

classes Collection

students.json

---

## 教师后台为空

检查：

works Collection

Firestore Rules

Teacher Role

---

## GitHub 无法部署

检查：

Actions

Secrets

Workflow

Branch

---

## Firebase Deploy 失败

重新登入：

```bash
firebase logout

firebase login
```

再执行：

```bash
firebase deploy
```

---

# 更新流程

开发

↓

Commit

↓

Push

↓

GitHub Actions

↓

Firebase Hosting

↓

正式网站更新

---

# 灾难恢复

如果系统异常：

1.

恢复 GitHub Release

2.

恢复 Firestore Backup

3.

恢复 Storage Backup

4.

重新 Deploy

预计恢复时间：

30 分钟以内。

---

# 上线验收 Checklist

## Git

☐ Git Repository

☐ GitHub

☐ Actions

☐ Release

---

## Firebase

☐ Authentication

☐ Firestore

☐ Storage

☐ Rules

☐ Hosting

---

## Student

☐ Login

☐ Upload

☐ Edit

☐ Logout

---

## Teacher

☐ Dashboard

☐ Statistics

☐ Gallery

☐ Present Mode

---

## UI

☐ Homepage

☐ Responsive

☐ Accessibility

☐ Dark Mode

---

## Performance

☐ Homepage <2s

☐ Gallery <1s

☐ Dashboard <2s

☐ Lazy Loading

☐ No Console Error

---

# 项目最终交付

交付内容：

✅ 完整源码

✅ Firebase 配置

✅ Firestore Rules

✅ Storage Rules

✅ GitHub Repository

✅ GitHub Actions

✅ README

✅ Deployment Manual

✅ Database Schema

✅ Testing QA

✅ Excel Import Tool

✅ students.json

✅ LICENSE

✅ .gitignore

✅ 教师使用说明

✅ 学生使用说明

---

# Version History

Version 1.0

发布日期：

2026-07-17

维护单位：

Star Photo Share System Development Team

项目状态：

Production Ready