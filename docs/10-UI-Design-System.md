# Star Photo Share System
# 10 - UI Design System Specification

Version 1.0

---

# 设计目标

建立整个 Star Photo Share System 的统一 UI Design System。

所有页面必须遵循同一套设计规范，确保：

- 美观
- 一致性
- 易于维护
- 响应式
- 无障碍（Accessibility）
- 教育场景友好

设计主题：

> 🌌 星空 × 银河 × 星球 × Glassmorphism × Modern Education

设计风格参考：

- Apple VisionOS
- macOS Sonoma
- Windows Fluent Design
- NASA Deep Space
- Material Design 3（适度参考）

---

# Design Principle

整个系统必须符合：

✔ 简洁

✔ 一致

✔ 易阅读

✔ 动画自然

✔ 深色模式

✔ 高对比

✔ 教师投影友好

---

# Color System

## Primary

Galaxy Blue

HEX

#2563EB

RGB

37 99 235

---

Nebula Purple

#7C3AED

---

Cosmic Cyan

#06B6D4

---

Star Yellow

#FFD54F

---

Success Green

#22C55E

---

Warning Orange

#F59E0B

---

Danger Red

#EF4444

---

Background

Deep Space

#050816

---

Secondary Background

#0F172A

---

Card Background

rgba(255,255,255,0.08)

---

Border

rgba(255,255,255,0.15)

---

# Typography

字体：

中文：

Noto Sans TC

Noto Sans SC

Microsoft JhengHei

英文：

Inter

Roboto

Arial

---

标题

48px

Bold

---

副标题

30px

SemiBold

---

Section

24px

Bold

---

Body

18px

Regular

---

Small

14px

---

Caption

12px

---

# Font Weight

Regular

400

Medium

500

SemiBold

600

Bold

700

---

# Border Radius

Small

8px

Medium

16px

Large

24px

Extra Large

32px

Circle

999px

---

# Shadow

Card

0 10px 30px rgba(0,0,0,.2)

Hover

0 20px 50px rgba(37,99,235,.4)

Modal

0 40px 80px rgba(0,0,0,.6)

---

# Glassmorphism

Background

rgba(255,255,255,.08)

Backdrop

blur(20px)

Border

1px solid rgba(255,255,255,.15)

---

# Spacing

4

8

12

16

20

24

32

40

48

64

80

96

统一采用 8pt Grid。

---

# Layout

Desktop

Max Width

1440px

Content

1280px

Sidebar

280px

Header

80px

Footer

60px

---

Tablet

768px

双栏

---

Mobile

480px

单栏

---

# Button

Primary

蓝紫渐层

Hover

Glow

Scale

1.03

Active

Scale

0.97

Disabled

Opacity

50%

Cursor

not-allowed

---

Secondary

透明

Border

Primary Color

Hover

Blur

---

Danger

Red

Hover

Dark Red

---

Button Height

48px

Radius

16px

---

# Input

高度

48px

Radius

14px

Border

1px

Placeholder

灰色

Focus

蓝色 Glow

Error

红色 Border

---

# Textarea

Radius

16px

Min Height

180px

Resizable

Vertical

---

# Dropdown

统一样式

Arrow Icon

Hover

Background Blur

---

# Card

Radius

24px

Padding

24px

Glass Effect

Hover

Lift

Glow

---

# Student Card

包含：

头像

姓名

班级

状态

缩图

Hover：

放大

阴影

Glow

---

# Planet Card

首页：

班级星球

大小：

220px

Hover：

Rotate

Glow

Floating

---

# Modal

Radius

28px

Blur

Dark Overlay

Animation：

Scale + Fade

---

# Animation

Duration

0.3s

Ease

ease-in-out

---

Hover

Scale

TranslateY

Glow

---

Page Transition

Fade

300ms

---

Loading

Spinner

Skeleton

Shimmer

---

# Star Animation

星星数量：

300~500

Twinkle

随机

---

Meteor

每

8~15秒

随机出现

---

Nebula

缓慢移动

---

Planet

Floating

Rotate

Glow

---

# Icons

统一：

Heroicons

或

Material Symbols

尺寸：

20

24

32

48

---

# Image

Border Radius

20px

Object Fit

cover

Lazy Load

必须开启

---

# Progress Bar

Height

10px

Radius

999px

Gradient

Blue → Purple

---

# Toast

位置：

右上角

持续：

3秒

颜色：

Success

Warning

Error

Info

---

# Table

Header

Sticky

Hover

Highlight

Stripe

开启

---

# Chart

Chart.js

统一颜色：

Blue

Purple

Green

Orange

---

# Empty State

使用：

星球插图

文字：

目前尚未上传作品。

---

# Error Page

404

星空背景

太空人插图

按钮：

返回首页

---

# Login UI

中央 Glass Card

宽：

420px

Logo

标题

输入框

登入按钮

教师登入

---

# Student UI

左右布局

左：

个人资料

右：

上传作品

---

# Teacher UI

Sidebar

Dashboard

Statistics

Gallery

Chart

---

# Gallery UI

Grid

Desktop：

4 Columns

Tablet：

3 Columns

Mobile：

1 Column

---

# Present Mode

背景：

黑色

图片：

90%

姓名：

底部

字体：

36px

分享原因：

Scroll

---

# Accessibility

Contrast

WCAG AA

Keyboard

Support

ARIA

Required

Focus

Visible

---

# Responsive Breakpoints

1440

1200

992

768

576

480

360

---

# Dark Mode

默认开启

未来可切换：

Light

Dark

System

---

# Logo

设计元素：

星星

银河

相机

书本

颜色：

Blue + Purple + Yellow

SVG

---

# UI Components

必须建立：

Button

Input

Textarea

Select

Card

Modal

Toast

Loading

Avatar

Badge

Progress

Table

Sidebar

Navbar

Footer

Pagination

Search Box

Dialog

Confirm Box

Image Viewer

---

# CSS Structure

base.css

variables.css

layout.css

components.css

animations.css

responsive.css

theme.css

---

# CSS Variables

必须全部使用：

:root

例如：

--primary

--secondary

--radius

--shadow

--spacing

--background

不得直接写颜色。

---

# Naming Convention

CSS

BEM

JavaScript

camelCase

HTML

Semantic Tags

---

# Performance

CSS

<150KB

JavaScript

Code Split

图片：

WebP

Lazy Loading

Animation：

60FPS

---

# UI Checklist

☐ 深色模式

☐ 星空背景

☐ Glass Card

☐ Responsive

☐ Hover Animation

☐ Planet Animation

☐ Modal

☐ Toast

☐ Progress

☐ Image Preview

☐ Loading

☐ Error Page

☐ Accessibility

☐ Keyboard Support

☐ WCAG AA

---

# AI Coding Rules

AI 必须：

建立完整 UI Design System。

建立：

base.css

variables.css

components.css

layout.css

animations.css

responsive.css

theme.css

所有页面必须引用相同 Design System。

不得复制样式。

必须使用 CSS Variables。

不得出现：

TODO

Placeholder

Pseudo Code

Example Only

所有 CSS 必须可直接使用。

所有组件必须具备：

Hover

Focus

Disabled

Loading

Responsive

Accessibility

---

# 最终目标

整个 Star Photo Share System 的所有页面（首页、学生、教师、作品展示）均采用统一设计语言，达到现代教育平台的专业品质，适合电脑、平板与手机，并能在课堂投影时保持清晰、美观、易读。