# Star Photo Share System
# 05 - Gallery System Development Specification

Version 1.0

---

# 开发目标

建立班级作品展示系统（Gallery）。

Gallery 是整个系统最重要的页面之一。

主要用途：

- 课堂呈堂
- 展示学生作品
- 浏览全部作品
- 搜寻作品
- 全屏展示

所有资料来自 Firebase Firestore。

---

# 必须建立文件

gallery.html

css/gallery.css

js/gallery.js

---

# 页面流程

首页

↓

选择班级

↓

gallery.html?class=初二忠

↓

读取 Firebase

↓

显示全班作品

↓

点击学生

↓

进入全屏展示

---

# 页面布局

整体采用：

银河 × 星空 × Glassmorphism

页面分成：

① Header

② Gallery

③ Preview

④ Footer

---

# Header

左侧：

Star Photo Share

右侧：

返回首页

教师后台

全屏模式

搜寻

---

# Gallery

读取：

works Collection

依照：

班级

排序：

姓名

每位学生显示一张卡片。

---

# Student Card

每张卡片包含：

────────────────

⭐

姓名

班级

状态

照片缩图

────────────────

例如：

⭐⭐⭐⭐⭐⭐⭐⭐

陈大文

初二忠

✅ 已完成

📷

⭐⭐⭐⭐⭐⭐⭐⭐

如果未完成：

☆☆☆☆☆☆☆☆

王小明

初二忠

❌ 未完成

没有照片。

---

# 已完成

卡片：

蓝紫色

发光

Hover：

放大

Glow

---

# 未完成

卡片：

灰色

透明

Hover：

轻微放大

不发光

---

# 点击卡片

开启：

Preview Modal

动画：

Fade + Scale

---

# Preview

显示：

────────────────────

姓名

班级

照片（大图）

分享原因

上传时间

────────────────────

按钮：

上一位

下一位

关闭

全屏

---

# 全屏模式

点击：

全屏

整个画面：

只有：

照片

姓名

班级

分享原因

背景：

黑色

ESC：

退出。

---

# 上一位

点击：

←

切换上一位学生。

---

# 下一位

点击：

→

切换下一位学生。

---

# Keyboard

支援：

←

→

ESC

Space

---

# 搜寻

输入：

学生姓名

自动过滤。

---

# 班级

顶部：

Dropdown

切换班级：

立即重新载入。

---

# 排序

支持：

姓名

上传时间

完成状态

---

# 图片

点击：

放大。

双击：

全屏。

---

# 图片比例

保持：

object-fit: contain

不得裁切。

---

# 分享原因

显示：

完整文字。

如果超过：

自动卷动。

---

# 上传时间

格式：

2026-05-12 14:30

---

# 星图模式（Galaxy View）

增加切换：

普通模式

★

星图模式

星图模式：

每位学生：

一颗星。

完成：

亮星。

未完成：

暗星。

点击星星：

打开作品。

星星随机分布：

Canvas

不得重叠。

---

# Animation

卡片：

Fade In

星星：

Twinkle

背景：

Nebula

Meteor

---

# Responsive

电脑：

4~5栏。

平板：

3栏。

手机：

1栏。

---

# gallery.js

必须建立：

init()

loadWorks()

renderGallery()

renderGalaxy()

openPreview()

closePreview()

nextStudent()

previousStudent()

toggleFullscreen()

searchStudent()

filterClass()

sortGallery()

bindKeyboard()

showToast()

---

# Firebase

读取：

Collection：

works

依：

class

查询。

---

# Firestore Query

where("class","==",selectedClass)

orderBy("name")

---

# Performance

图片：

Lazy Loading

缩图：

先载入。

大图：

点击后载入。

---

# Accessibility

所有图片：

Alt

所有按钮：

ARIA Label

Keyboard Navigation

Focus Style

---

# Browser

Chrome

Edge

Firefox

Safari

Android

iPhone

全部支援。

---

# UI

颜色：

蓝

紫

青

玻璃拟态

Glow

Shadow

Blur

---

# AI Coding Rules

请直接生成：

完整 gallery.html

完整 gallery.css

完整 gallery.js

不得省略。

不得出现：

TODO

Placeholder

Example

Pseudo Code

所有代码必须可以直接执行。

所有函数必须加入完整中文注释。

完成后：

可以浏览全部学生作品，

点击放大，

左右切换，

全屏展示，

并支援星图模式。