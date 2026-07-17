# Star Photo Share System
# 02 - Homepage Development Specification

Version 1.0

---

# 开发目标

建立整个系统的首页（index.html）。

首页必须成为整个网站的入口。

设计主题：

> 星空 × 银河 × 星球 × Glassmorphism

整体风格参考：

Apple VisionOS

NASA

Windows Fluent Design

现代化深色介面

---

# 必须建立的文件

index.html

css/style.css

css/star.css

js/app.js

---

# 首页布局

整个网页分成四个区域：

① Header

② Hero

③ Class Galaxy

④ Footer

---

# Header

高度：

80px

固定顶部

背景：

透明 + Blur

左侧：

LOGO

Star Photo Share

右侧：

教师登入

关于系统

帮助

---

# Hero

整个画面中央。

显示：

★★★★★★★★★★

星图照片分享系统

Star Photo Share System

★★★★★★★★★★

下面显示：

"记录生活，分享感动。"

再下面：

开始探索

按钮。

点击后：

自动滑到班级区域。

---

# Class Galaxy

使用 CSS Grid。

电脑：

四个星球。

手机：

一直排。

例如：

                🪐

          初二忠

🌍                      🌕

初二孝              初二仁

            ⭐

         初二爱

每颗星球：

有发光。

会缓慢旋转。

鼠标移过去：

放大

发光

阴影

点击：

进入：

login.html?class=班级

例如：

login.html?class=初二忠

---

# 星球资讯

每颗星球显示：

班级

完成人数

完成率

例如：

初二忠

31 / 34

91%

外围显示：

★★★★☆

完成率计算：

100%

★★★★★

80%

★★★★☆

60%

★★★☆☆

40%

★★☆☆☆

20%

★☆☆☆☆

---

# 星空背景

背景必须动态。

禁止静态图片。

必须使用：

CSS Animation

Canvas

随机生成：

300~500颗星星。

大小：

1~4px

透明度：

随机。

闪烁：

随机。

---

# 流星

每8~15秒：

随机出现。

数量：

1~3颗。

长度：

80~150px。

角度：

45°

动画：

0.8秒。

---

# 银河

背景加入：

渐层。

颜色：

#050816

↓

#111a3c

↓

#1e2b6b

加入：

Blur

Noise

Opacity

营造银河效果。

---

# 星云

加入：

3~5个。

颜色：

蓝

紫

青

透明度：

15%

缓慢移动。

---

# Glass Card

所有资讯采用：

Glassmorphism

CSS：

backdrop-filter

blur(20px)

透明白色

边框

阴影

圆角：

24px

---

# Hover Animation

滑鼠进入：

Scale

1.08

Glow

Rotate

2°

Shadow

增加。

---

# Click Animation

点击：

缩小

95%

0.2秒

恢复。

---

# 手机版

宽度：

768以下：

自动改单栏。

星球：

上下排列。

按钮：

放大。

---

# Footer

显示：

Version 1.0

© 2026 School

Powered by Firebase

---

# JavaScript

app.js

负责：

初始化。

读取：

students.json

统计：

每班人数。

统计：

完成率。

更新：

星球。

绑定：

点击事件。

产生：

流星。

产生：

星星。

---

# Functions

必须建立：

init()

loadStudents()

calculateProgress()

updatePlanet()

createStars()

createMeteor()

bindEvents()

goLogin()

---

# Coding Rules

禁止：

jQuery

Bootstrap

Vue

React

全部使用：

HTML

CSS

Vanilla JavaScript

---

# CSS

必须：

Flex

Grid

Animation

Variables

Dark Theme

Responsive

---

# Accessibility

按钮：

Keyboard Support

ARIA Label

Focus Style

---

# Browser

Chrome

Edge

Firefox

Safari

全部支援。

---

# Performance

首页：

首次载入：

小于2秒。

动画：

60FPS。

---

# AI Coding Rules

请直接生成：

完整 index.html

完整 css/style.css

完整 css/star.css

完整 js/app.js

不得省略任何代码。

不得出现：

TODO

Placeholder

Example

Pseudo Code

所有代码必须可以直接执行。

每个文件必须有完整中文注释。

完成后确保可以直接开启 index.html 浏览。
