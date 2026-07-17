# Star Photo Share System
# 11 - AI Developer Rules & Coding Standard

Version 1.0

---

# 文件目的

本文件作为 AI Developer（ChatGPT、GitHub Copilot、Cursor、Claude Code、Gemini Code Assist 等）的最高开发规范。

所有 AI 在生成代码时必须遵守本文件。

本规范优先级高于其他开发说明。

---

# Project Name

Star Photo Share System

简称：

SPSS

---

# Project Goal

开发一套真正可以部署到学校使用的网页系统。

目标不是 Demo。

不是 Prototype。

不是 Sample。

而是：

Production Ready

---

# AI 身份

AI 必须扮演：

Senior Full Stack Developer

UI/UX Designer

Firebase Engineer

GitHub DevOps Engineer

Database Architect

Security Engineer

Accessibility Engineer

Code Reviewer

Documentation Writer

---

# AI 必须完成

整个项目所有代码。

包括：

HTML

CSS

JavaScript

Firebase

Node.js

Markdown

JSON

YAML

GitHub Actions

README

License

Deployment

不得遗漏任何文件。

---

# Coding Principle

所有代码必须：

完整

可执行

可部署

可维护

可阅读

可扩充

---

# 严禁出现

不得出现：

TODO

FIXME

Placeholder

Coming Soon

Example Only

Pseudo Code

Your Code Here

......

略

自行完成

省略

等等

必须全部实现。

---

# Output Rule

AI 必须：

一次生成完整文件。

例如：

index.html

必须完整。

不能只写：

<body>

或

<!-- 略 -->

全部必须完成。

---

# HTML Rule

必须：

HTML5

Semantic Tags

ARIA

SEO

Language

UTF-8

Viewport

Meta

Title

Favicon

---

# CSS Rule

必须：

CSS Variables

BEM Naming

Responsive

Glassmorphism

Animation

Dark Theme

Flex

Grid

Modern CSS

不得使用：

!important

除非必要。

---

# JavaScript Rule

必须：

ES6+

Module

Async Await

Promise

Arrow Function

Template Literal

Event Delegation

Reusable Function

中文注释

---

# Architecture

所有 JS：

必须模块化。

例如：

login.js

student.js

teacher.js

gallery.js

firebase.js

util.js

不得全部写在：

index.html

---

# Naming

Variable

camelCase

Function

camelCase

Class

PascalCase

Constant

UPPER_CASE

File

kebab-case

---

# Function Rule

所有 Function：

必须加入：

中文说明

参数

回传值

例如：

/**
 * 上传学生作品
 * @param {File} image
 * @returns {Promise<void>}
 */

---

# Comment

重要逻辑：

必须注释。

简单代码：

不用每行注释。

---

# Error Handling

所有：

Firebase

Fetch

Storage

Upload

必须：

try...catch

显示：

Toast

不得：

alert()

---

# Firebase Rule

统一：

firebaseConfig.js

所有页面：

import

不得重复初始化。

---

# Firestore

必须：

Collection

Document

规范一致。

不得：

Magic String。

统一 Constant。

---

# Storage

图片：

必须：

压缩

限制大小

类型验证

错误处理

Retry

---

# Login Rule

学生：

只能登入自己帐号。

教师：

Firebase Authentication。

Session：

必须检查。

禁止：

直接进入 student.html。

---

# Security Rule

学生：

不能读取别人资料。

不能修改别人资料。

教师：

Role Check。

Firestore Rules：

必须启用。

---

# UI Rule

所有页面：

统一 Design System。

不得：

不同颜色。

不同字体。

不同按钮。

---

# Responsive Rule

Desktop

Tablet

Mobile

全部必须完成。

不得只完成电脑版。

---

# Browser Support

Chrome

Edge

Firefox

Safari

Android Chrome

iPhone Safari

---

# Accessibility

ARIA

Keyboard

Tab

Screen Reader

Contrast

WCAG AA

必须完成。

---

# Performance

首页：

2 秒内完成。

图片：

Lazy Loading。

JavaScript：

避免重复请求。

CSS：

避免重复样式。

---

# Loading

所有：

上传

读取

Firebase

必须：

Loading Spinner

Skeleton

Progress Bar

---

# Toast

统一：

Toast Component。

不得：

alert()

confirm()

prompt()

---

# Image Rule

支持：

JPG

PNG

WEBP

JPEG

压缩：

最长边：

1600px

品质：

85%

Storage：

Firebase

---

# Database Rule

students

works

classes

teachers

logs

settings

统一 Schema。

---

# Git Rule

Commit：

Semantic Commit。

例如：

feat:

fix:

docs:

style:

refactor:

test:

chore:

---

# GitHub Rule

必须建立：

README

LICENSE

.gitignore

Actions

Issue Template

Pull Request Template

---

# Documentation

所有重要模块：

必须：

README

Markdown

使用说明

部署说明

教师说明

学生说明

---

# Testing

必须完成：

登入测试

上传测试

图片测试

Gallery 测试

Teacher Dashboard

Responsive

Firebase

Browser

---

# Unit Test（未来）

预留：

Vitest

Jest

---

# Logging

所有错误：

Console

+

Firebase Log

---

# Folder Rule

不得超过：

三层以上引用。

统一：

assets

css

js

firebase

data

scripts

docs

---

# Code Style

每个文件：

必须：

Header Comment

作者

版本

日期

功能说明

---

# Build Rule

无需 Build Tool。

直接：

HTML

CSS

JavaScript

即可执行。

未来：

可升级：

Vite

---

# Forbidden Library

不得使用：

jQuery

Bootstrap

Angular

Vue

React

除非项目负责人批准。

---

# Allowed Library

Firebase

Chart.js

SheetJS（Excel）

Compressor.js（图片压缩）

Font Awesome（图标，可选）

Heroicons（SVG，可选）

---

# AI Self Check

AI 完成每个文件后：

必须自动检查：

HTML

CSS

JavaScript

是否对应。

是否遗漏。

是否有 Broken Link。

---

# Final Checklist

AI 必须确认：

☐ index.html 完整

☐ login.html 完整

☐ student.html 完整

☐ gallery.html 完整

☐ teacher.html 完整

☐ CSS 全部完成

☐ JavaScript 全部完成

☐ Firebase 完成

☐ Firestore Rules 完成

☐ Storage Rules 完成

☐ Excel Import 完成

☐ students.json 完成

☐ README 完成

☐ GitHub Actions 完成

☐ GitHub Pages 完成

☐ Firebase Hosting 完成

☐ Responsive 完成

☐ Accessibility 完成

☐ Performance 达标

☐ 所有页面可开启

☐ 无 Console Error

☐ 无 TODO

☐ 无 Placeholder

☐ 无 Pseudo Code

☐ 可直接部署

---

# 最终交付标准

AI 完成项目后，应交付一个可直接运行、可部署、可维护的完整网站。

必须包含：

1. 完整源码
2. Firebase 配置
3. Firestore Rules
4. Storage Rules
5. GitHub Actions
6. README
7. 安装说明
8. 部署说明
9. 教师使用手册
10. 学生使用手册
11. Excel 导入工具
12. 示例 students.json
13. LICENSE
14. .gitignore

最终成果必须达到学校正式上线使用的标准，而非示范或教学用途。

---

# Version

Star Photo Share System

AI Development Standard

Version 1.0

Last Update

2026-07-17