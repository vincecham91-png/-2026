# Star Photo Share System
# Project Structure Specification
Version 1.0

---

# 项目目标

建立一套适合学校使用的「星图照片分享系统」。

学生可以：

- 登录
- 上传照片
- 输入照片链接
- 分享照片原因
- 修改自己的作品

老师可以：

- 查看完成率
- 浏览所有作品
- 搜索学生
- 搜索班级
- 放大作品
- 全屏展示
- 下载作品

整个系统采用：

HTML5
CSS3
JavaScript
Firebase

开发。

---

# 系统目录

StarPhotoShare/

```
StarPhotoShare/

│

├── index.html

├── login.html

├── student.html

├── gallery.html

├── teacher.html

│

├── css/

│      style.css

│      star.css

│      login.css

│      student.css

│      gallery.css

│      teacher.css

│

├── js/

│      app.js

│      login.js

│      student.js

│      gallery.js

│      teacher.js

│      firebase.js

│      util.js

│

├── assets/

│      background/

│      icons/

│      planets/

│      stars/

│

├── data/

│      students.json

│

├── firebase/

│      firebaseConfig.js

│

├── README.md

├── firebase.json

├── firestore.rules

├── storage.rules

├── .gitignore

└── LICENSE

```

---

# HTML 页面说明

## index.html

系统首页。

负责：

- 星空动画
- 星球
- 班级选择
- 完成率
- 跳转登录

---

## login.html

学生登录。

功能：

选择班级

↓

选择姓名

↓

输入学号

↓

登入

---

## student.html

学生上传页面。

包含：

照片上传

照片网址

分享原因

储存按钮

修改按钮

---

## gallery.html

班级作品展示。

显示：

所有学生

完成状态

点击作品

放大全屏

---

## teacher.html

教师后台。

功能：

统计完成率

查看作品

查看未完成

搜索

课堂展示

---

# CSS 模块

style.css

负责：

基础样式

字体

颜色

RWD

---

star.css

负责：

星空背景

流星

银河

动画

---

login.css

负责：

登入页面

---

student.css

负责：

上传页面

---

gallery.css

负责：

作品展示

---

teacher.css

负责：

后台介面

---

# JavaScript

app.js

首页控制。

负责：

初始化

读取 Firebase

统计完成率

更新星球

动画

---

login.js

负责：

登入验证

班级切换

姓名读取

密码验证

---

student.js

负责：

上传图片

上传网址

储存原因

更新资料

---

gallery.js

负责：

读取作品

放大

上一位

下一位

---

teacher.js

负责：

后台

统计

搜索

导出

---

firebase.js

负责：

Firebase 初始化

Authentication

Firestore

Storage

---

util.js

共用函数。

例如：

日期

Toast

Modal

Loading

---

# Assets

background/

放置：

银河

背景

---

icons/

图示

SVG

PNG

---

planets/

班级星球

---

stars/

星星素材

---

# Firebase

Authentication

学生登录

教师登录

---

Firestore

Collection：

students

works

classes

teachers

---

Storage

保存：

照片

缩图

---

# students Collection

字段：

studentId

name

class

password

completed

photoURL

photoLink

reason

uploadTime

---

# classes Collection

字段：

className

studentCount

completedCount

---

# teachers Collection

字段：

username

password

role

---

# works Collection

字段：

studentId

image

reason

createdAt

updatedAt

---

# GitHub

建立：

README.md

LICENSE

.gitignore

.github/workflows/deploy.yml

---

# Git Ignore

必须忽略：

node_modules

.firebase

.env

---

# AI 编码规范

所有代码：

必须完整

不得省略

不得出现：

TODO

Placeholder

Pseudo Code

Example Only

所有 HTML

CSS

JavaScript

必须可以直接执行。

---

# Coding Style

HTML

语义化标签

ARIA

Accessibility

SEO

---

CSS

Flex

Grid

Glassmorphism

Animation

Responsive

---

JavaScript

ES6+

Module

Async Await

Promise

Event Delegation

---

# 浏览器

Chrome

Edge

Firefox

Safari

必须支援。

---

# 手机

Android

iPhone

平板

必须支援。

---

下一份：

02-Homepage.md

将开始详细定义：

- 星空首页 UI
- 星空动画
- 星球互动
- 班级按钮
- 完成率显示
- 手机版排版
- 首页 HTML、CSS、JavaScript 的开发规范