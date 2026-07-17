# Star Photo Share System
# 13 - Testing & Quality Assurance (QA) Specification

Version 1.0

---

# 文件目的

本文件定义 Star Photo Share System 的完整测试计划（Testing Plan）与品质保证（Quality Assurance）。

所有开发完成后，必须依照本文件进行测试，确保系统达到学校正式上线标准。

---

# 测试目标

确保系统：

- 功能正确
- 数据正确
- 权限正确
- 速度符合要求
- 可长期维护
- 支援多平台
- 无重大 Bug

---

# 测试阶段

Project Testing

↓

Unit Test

↓

Integration Test

↓

System Test

↓

User Acceptance Test (UAT)

↓

Production Release

---

# Test Environment

开发环境

- Windows 11
- macOS
- Ubuntu

浏览器

- Chrome（最新版）
- Edge（最新版）
- Firefox（最新版）
- Safari（最新版）

手机

- Android 12+
- Android 13+
- Android 14+
- iPhone iOS 17+
- iPadOS

---

# 测试帐号

## 教师帐号

Email

teacher@school.edu.my

Password

********

Role

Teacher

---

## 学生帐号

姓名

陈大文

班级

初二忠

密码

240301

---

# Unit Test

每一个 JavaScript Function 必须独立测试。

例如：

✔ login()

✔ logout()

✔ uploadImage()

✔ saveWork()

✔ searchStudent()

✔ calculateProgress()

✔ updatePlanet()

✔ compressImage()

✔ loadGallery()

✔ loadDashboard()

---

# Login Test

| Test ID | 测试内容 | 预期结果 |
|----------|----------|----------|
| LOGIN-001 | 正确登入 | 成功进入 Student Page |
| LOGIN-002 | 错误密码 | Toast 提示 |
| LOGIN-003 | 错误班级 | Toast 提示 |
| LOGIN-004 | 错误姓名 | Toast 提示 |
| LOGIN-005 | Session 已存在 | 自动登入 |
| LOGIN-006 | 登出 | 返回 Login |

---

# Student Upload Test

| Test ID | 测试内容 | 预期结果 |
|----------|----------|----------|
| STU-001 | 上传 JPG | 成功 |
| STU-002 | 上传 PNG | 成功 |
| STU-003 | 上传 WEBP | 成功 |
| STU-004 | 上传超过10MB | 拒绝上传 |
| STU-005 | 未填写分享原因 | 无法储存 |
| STU-006 | 图片网址 | 成功显示 |
| STU-007 | 修改作品 | 成功更新 |
| STU-008 | 删除图片 | Storage 删除 |

---

# Gallery Test

测试：

✔ 读取全部作品

✔ 切换班级

✔ 搜寻学生

✔ 全屏

✔ 上一位

✔ 下一位

✔ ESC

✔ 星图模式

---

# Teacher Dashboard Test

测试：

✔ Dashboard

✔ Statistics

✔ Chart

✔ Search

✔ Filter

✔ Download CSV

✔ Download Excel

✔ Present Mode

✔ Logout

---

# Firebase Test

测试：

✔ Authentication

✔ Firestore

✔ Storage

✔ Security Rules

✔ Offline Cache

✔ Auto Sync

---

# Firestore Test

新增

读取

修改

删除

Query

Index

全部测试。

---

# Storage Test

图片上传

图片删除

重复上传

压缩

缩图

下载

---

# Excel Import Test

测试：

正常 Excel

空白 Excel

重复学号

重复姓名

错误班级

空白班级

空白姓名

空白学号

输出：

Error Report

---

# Permission Test

学生：

✔ 只能看自己

✔ 不能看别人

✔ 不能修改别人

教师：

✔ 查看全部

✔ 修改全部

Admin：

✔ 全部权限

---

# Responsive Test

Desktop

1440

1200

992

Tablet

768

576

Mobile

480

360

全部完成。

---

# Browser Test

Chrome

Edge

Firefox

Safari

Android

iPhone

全部正常。

---

# Accessibility Test

Keyboard

Screen Reader

Tab Order

ARIA

Contrast

Focus

WCAG AA

全部测试。

---

# Performance Test

首页

<2 秒

Gallery

<1 秒

Teacher Dashboard

<2 秒

图片

Lazy Load

Animation

60FPS

---

# Load Test

学生：

100

300

500

1000

同时登入。

测试：

系统稳定。

---

# Stress Test

连续上传：

500 张图片。

检查：

Storage

Firestore

Memory

CPU

---

# Network Test

WiFi

4G

5G

网络中断

恢复网络

离线缓存

重新同步

---

# Security Test

SQL Injection

XSS

CSRF

非法登入

暴力破解

Storage 未授权

Firestore 未授权

全部测试。

---

# Regression Test

修正 Bug 后：

重新测试：

Login

Upload

Gallery

Teacher

Firebase

确保：

没有影响旧功能。

---

# UAT

教师确认：

□ 可以登入

□ 可以浏览作品

□ 可以放大

□ 可以统计

□ 可以下载

学生确认：

□ 可以登入

□ 可以上传

□ 可以修改

□ 可以查看作品

---

# Bug Priority

P1

系统无法使用

立即修复

P2

主要功能异常

24小时内修复

P3

一般 Bug

下一版本修复

P4

UI 优化

未来版本

---

# Bug Report Template

Bug ID

标题

发生时间

页面

浏览器

装置

步骤

预期结果

实际结果

截图

负责人

状态

---

# Acceptance Criteria

系统必须达到：

✔ 无 Console Error

✔ 无 JavaScript Error

✔ Firebase 正常

✔ Firestore 正常

✔ Storage 正常

✔ Responsive 完成

✔ Accessibility 合格

✔ Lighthouse ≥ 90

✔ 无重大 Bug

---

# QA Checklist

## Login

☐ 学生登入

☐ 教师登入

☐ 登出

☐ Session

---

## Upload

☐ 图片

☐ 图片网址

☐ 分享原因

☐ 修改

☐ 删除

---

## Gallery

☐ 全屏

☐ 搜寻

☐ 上一位

☐ 下一位

☐ 星图

---

## Teacher

☐ Dashboard

☐ Statistics

☐ Download

☐ Search

☐ Present Mode

---

## Firebase

☐ Firestore

☐ Storage

☐ Authentication

☐ Rules

---

## Responsive

☐ Desktop

☐ Tablet

☐ Mobile

---

## Browser

☐ Chrome

☐ Edge

☐ Firefox

☐ Safari

---

## Accessibility

☐ ARIA

☐ Keyboard

☐ Contrast

☐ Screen Reader

---

## Performance

☐ Homepage <2s

☐ Gallery <1s

☐ Dashboard <2s

☐ Lazy Load

☐ 60FPS

---

# AI Testing Rules

AI 完成所有代码后必须：

1. 自动检查 HTML Validity
2. 自动检查 CSS Validity
3. 自动检查 JavaScript Syntax
4. 检查 Broken Links
5. 检查 Firebase Query
6. 检查 Console Error
7. 检查 Accessibility
8. 检查 Responsive
9. 检查 Loading Performance
10. 输出 Testing Report

不得交付未经测试的代码。

---

# Deliverables

最终必须提供：

- Test Report
- Bug List
- QA Checklist
- Lighthouse Report
- Browser Compatibility Report
- Firebase Security Test Report
- User Acceptance Test Report

---

# Version History

Version 1.0

- 建立完整 Testing Plan
- 建立 QA Checklist
- 建立 Bug Priority
- 建立 UAT 标准
- 建立 Performance Benchmark

Last Update

2026-07-17
