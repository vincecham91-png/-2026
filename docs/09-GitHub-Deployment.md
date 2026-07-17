# Star Photo Share System
# 09 - GitHub Deployment Specification

Version 1.0

---

# 开发目标

建立完整 Git 与 GitHub 开发流程。

整个 Star Photo Share System 必须使用 Git 管理版本，并部署到 GitHub。

完成后必须达到：

✔ 多人协作开发

✔ 自动版本管理

✔ 自动部署

✔ 自动备份

✔ Rollback

✔ Release Version

---

# Repository

Repository Name

StarPhotoShare

建议：

Public（教学用途）

如果学校资料涉及隐私：

Private

---

# Branch Strategy

必须建立：

main

开发完成才能 Merge。

develop

日常开发。

feature/

每个功能一个 Branch。

例如：

feature/login

feature/gallery

feature/student-upload

feature/firebase

feature/dashboard

feature/excel-import

fix/

Bug 修复。

例如：

fix/login-error

hotfix/

线上紧急修复。

---

# Git Ignore

建立：

.gitignore

必须忽略：

node_modules/

firebase-debug.log

.env

.vscode/

.idea/

dist/

build/

coverage/

*.log

.DS_Store

Thumbs.db

---

# README

必须建立：

README.md

包含：

项目介绍

系统架构

安装方式

Firebase 配置

GitHub 部署

GitHub Pages

教师帐号

学生登入方式

目录结构

版本说明

授权

维护人员

未来开发计划

---

# LICENSE

建议：

MIT License

学校若有规定：

可改：

Apache 2.0

GPL

---

# Git 初始化

第一次建立：

git init

git add .

git commit -m "Initial Project"

---

# Git Remote

新增：

git remote add origin https://github.com/<username>/StarPhotoShare.git

确认：

git remote -v

---

# Push

第一次：

git branch -M main

git push -u origin main

之后：

git add .

git commit -m "Update"

git push

---

# Commit Rules

Commit Message 必须规范。

例如：

feat: add student upload

feat: create gallery page

feat: add teacher dashboard

fix: login validation

fix: upload error

style: update UI

docs: update README

refactor: optimize gallery

chore: update dependencies

---

# Pull Request

开发流程：

feature/login

↓

Commit

↓

Push

↓

Create Pull Request

↓

Review

↓

Merge develop

↓

Merge main

---

# Tag

每次正式版本：

git tag v1.0.0

git push origin v1.0.0

---

# GitHub Release

每个版本：

建立 Release。

内容：

Version

更新项目

修正 Bug

新增功能

升级 Firebase

---

# GitHub Pages

建立：

Settings

↓

Pages

Source：

GitHub Actions

或

Deploy from Branch

main

/docs

或

root

---

# 自订 Domain（可选）

例如：

star.school.edu.my

支持：

HTTPS

SSL

---

# GitHub Actions

建立：

.github/

workflows/

deploy.yml

功能：

Push main

↓

Install

↓

Build

↓

Deploy

↓

Success

---

# Workflow

必须包含：

Checkout

Setup Node.js

Install

Build

Deploy

---

# Firebase Hosting

建立：

firebase.json

.firebaserc

执行：

firebase login

firebase init

firebase deploy

部署：

https://starphotoshare.web.app

---

# GitHub Secrets

建立：

FIREBASE_TOKEN

FIREBASE_PROJECT_ID

FIREBASE_API_KEY

FIREBASE_APP_ID

FIREBASE_AUTH_DOMAIN

FIREBASE_STORAGE_BUCKET

FIREBASE_MESSAGING_SENDER_ID

---

# CI/CD

Push

↓

GitHub Actions

↓

Deploy Firebase

↓

Website Online

无需人工上传。

---

# Rollback

如果部署失败：

可以：

Rollback

Version

例如：

v1.0.0

恢复：

git checkout v1.0.0

重新部署。

---

# Branch Protection

main

必须开启：

Require Pull Request

Require Review

禁止直接 Push

---

# Issue

建立：

Bug

Feature Request

Improvement

Question

Documentation

---

# Project Board

建立：

To Do

In Progress

Review

Done

---

# Milestone

建议：

Version 1.0

完成：

首页

登入

上传

Gallery

Teacher

Firebase

---

# Wiki

GitHub Wiki：

建立：

系统说明

Firebase 教学

部署教学

教师使用说明

学生使用说明

---

# Security

开启：

Dependabot

Secret Scanning

Code Scanning

---

# Backup

每周：

GitHub Release

Firebase Export

Storage Backup

---

# Folder Structure

StarPhotoShare/

.github/

workflows/

deploy.yml

docs/

README.md

LICENSE

firebase.json

.gitignore

---

# Deployment Flow

Developer

↓

Commit

↓

Push

↓

GitHub

↓

Action

↓

Firebase Hosting

↓

Website Updated

---

# Production URL

正式：

https://starphotoshare.web.app

测试：

https://starphotoshare-staging.web.app

---

# Checklist

☐ Git Repository 已建立

☐ README 已完成

☐ LICENSE 已加入

☐ .gitignore 已建立

☐ GitHub Repository 已建立

☐ Remote 已连接

☐ Push 成功

☐ GitHub Pages 已启用

☐ Firebase Hosting 已部署

☐ GitHub Actions 正常执行

☐ Release 已建立

☐ Version Tag 已建立

☐ Dependabot 已启用

☐ Branch Protection 已启用

☐ Project Board 已建立

---

# AI Coding Rules

AI 必须自动建立：

README.md

LICENSE

.gitignore

.github/workflows/deploy.yml

firebase.json

.firebaserc

不得省略任何档案。

所有 YAML、JSON、Markdown 必须符合官方格式。

不得出现：

TODO

Placeholder

Pseudo Code

Example Only

所有内容必须可以直接使用。

---

# 最终目标

开发者执行：

git push

即可自动：

✔ 上传 GitHub

✔ 自动部署

✔ 更新网站

✔ 保留版本纪录

整个部署流程无需手动上传服务器。