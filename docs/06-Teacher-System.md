# Star Photo Share System
# 06 - Teacher Management System Development Specification

Version 1.0

---

# 开发目标

建立完整教师后台（Teacher Dashboard）。

教师拥有系统最高权限。

可以：

- 查看所有班级
- 查看所有学生
- 查看所有作品
- 查看完成率
- 搜索学生
- 编辑作品（可选）
- 删除违规作品（可选）
- 呈堂展示
- 下载统计资料

教师后台必须独立于学生系统。

学生无法进入。

---

# 建立文件

teacher-login.html

teacher.html

css/teacher.css

js/teacher.js

---

# 教师登入

登入方式：

Email

Password

Authentication：

Firebase Authentication

登入成功：

teacher.html

登入失败：

Toast：

帐号或密码错误

---

# 权限

Role：

Teacher

Admin

只有 Teacher 或 Admin 可以进入后台。

否则：

返回 login.html

---

# Teacher Dashboard

画面采用：

Glassmorphism

银河背景

固定 Header

左侧 Sidebar

右侧 Dashboard

--------------------------------

Sidebar

Dashboard

--------------------------------

---

# Sidebar

Logo

Star Photo Share

---------------------

首页

作品

班级

统计

学生

设定

登出

---------------------

---

# Dashboard

上方：

四个统计卡。

--------------------------------

总学生人数

完成人数

完成率

未完成人数

--------------------------------

例如：

学生

145

完成

132

91%

未完成

13

---

# 班级统计

显示所有班级：

例如：

初二忠

32 / 35

██████████░

91%

初二孝

35 / 36

97%

初二仁

34 / 35

97%

初二爱

36 / 36

100%

点击：

进入班级作品。

---

# 图表

使用：

Chart.js

显示：

完成率

长条图

圆饼图

折线图（上传趋势）

---

# 搜寻

可以输入：

学生姓名

学号

班级

即时过滤。

---

# 学生清单

Table

栏位：

姓名

学号

班级

状态

上传时间

按钮

例如：

姓名

陈大文

学号

240301

班级

初二忠

状态

完成

操作：

查看

---

# 查看作品

点击：

查看

开启：

Modal

显示：

姓名

班级

大图

分享原因

上传时间

按钮：

上一位

下一位

关闭

全屏

---

# 呈堂模式

教师点击：

Present Mode

进入：

全屏展示。

画面：

只有：

照片

姓名

班级

分享原因

背景：

纯黑。

快捷键：

←

上一位

→

下一位

ESC

退出

F

全屏

---

# 未完成名单

显示：

所有未完成学生。

例如：

初二忠

王小明

李志豪

......

按钮：

提醒

（可预留未来扩充）

---

# 下载

教师可以：

下载：

CSV

Excel

PDF（可预留）

内容：

姓名

班级

完成状态

上传时间

---

# 排序

支持：

姓名

班级

完成状态

上传时间

---

# Filter

支持：

全部

完成

未完成

---

# Statistics

统计：

今日上传人数

本周上传人数

完成率

班级排名

---

# Firebase

Collection：

students

works

classes

teachers

读取：

Firestore

Storage

Authentication

---

# teacher.js

必须建立：

init()

checkPermission()

loadDashboard()

loadClasses()

loadStudents()

loadWorks()

renderStatistics()

renderCharts()

searchStudent()

filterStatus()

openWork()

closeWork()

nextWork()

previousWork()

togglePresentMode()

downloadCSV()

downloadExcel()

logout()

showToast()

---

# UI

颜色：

蓝

紫

青

深色模式

Glassmorphism

Blur

Glow

Shadow

动画：

Fade

Slide

Scale

---

# Accessibility

所有按钮：

ARIA Label

Table：

Keyboard Navigation

Focus：

明显

---

# 手机版

Sidebar：

自动收合。

Dashboard：

单栏。

图表：

自适应。

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

# Security

只有 Teacher Role：

可进入。

Firestore Rules：

限制：

学生不能读取全部作品。

教师：

可以读取全部。

---

# AI Coding Rules

请直接生成：

完整 teacher-login.html

完整 teacher.html

完整 teacher.css

完整 teacher.js

不得省略。

不得出现：

TODO

Placeholder

Pseudo Code

Example Only

所有代码必须可直接执行。

所有函数必须加入完整中文注释。

完成后：

教师可以：

查看所有学生、

查看所有作品、

统计完成率、

课堂展示、

下载名单。