# Star Photo Share System
# 03 - Login System Development Specification

Version 1.0

---

# 开发目标

建立完整学生与教师登录系统。

整个系统采用：

HTML5
CSS3
Vanilla JavaScript
Firebase Authentication（教师）
Firestore（学生资料）

学生帐号来自学校名单。

教师帐号由 Firebase 管理。

---

# 必须建立文件

login.html

css/login.css

js/login.js

js/firebase.js

data/students.json

---

# 登录流程

首页

↓

点击班级

↓

login.html?class=初二忠

↓

自动载入该班学生

↓

选择姓名

↓

输入学号

↓

登入

↓

student.html

---

# Login UI

整个画面采用：

Glassmorphism

星空背景

中央登入卡片

--------------------------------

星图照片分享系统

Student Login

--------------------------------

班级

▼ 初二忠

姓名

▼ 陈大文

学号（密码）

_____________

☑ 记住班级（可选）

【登入】

--------------------------------

教师登入

--------------------------------

---

# 班级

自动读取：

students.json

取得所有班级。

例如：

初二忠

初二孝

初二仁

初二爱

排序：

依班级名称。

---

# 姓名

选择班级后：

自动更新姓名。

例如：

初二忠

↓

陈大文

李小明

黄伟杰

......

不得显示其它班学生。

---

# 密码

密码：

学生学号。

例如：

学生：

陈大文

学号：

240301

密码：

240301

---

# 登录验证

读取：

students.json

验证：

姓名

班级

密码

全部符合：

登入成功。

否则：

显示：

帐号或密码错误。

---

# 登录成功

写入：

sessionStorage

studentId

studentName

studentClass

loginTime

然后：

跳转：

student.html

---

# 自动登入

如果：

sessionStorage

存在。

直接进入：

student.html

不用重新登入。

---

# 登出

删除：

sessionStorage

返回：

login.html

---

# 教师登入

页面底部：

教师登入

点击：

teacher-login.html

教师帐号：

Firebase Authentication

Email

Password

例如：

teacher@school.edu

********

登入成功：

teacher.html

---

# Forgot Password

学生：

不提供。

教师：

Firebase Reset Password。

---

# 登录失败

错误：

帐号错误

密码错误

班级错误

必须 Toast 提示。

禁止：

alert()

---

# 登录限制

学生：

只能登入自己的帐号。

不能查看别人资料。

不能修改别人资料。

---

# Security

所有资料：

Firestore Rules 控制。

学生只能读取：

自己的资料。

只能修改：

自己的作品。

---

# students.json

格式：

[
  {
    "studentId":"240301",
    "name":"陈大文",
    "class":"初二忠",
    "password":"240301",
    "completed":false
  }
]

以后：

Firebase Import。

---

# login.js

必须建立：

init()

loadClass()

loadStudents()

verifyLogin()

login()

logout()

rememberClass()

showToast()

---

# UI

颜色：

蓝紫银河。

按钮：

渐层。

Hover：

发光。

Input：

圆角。

Focus：

蓝色外框。

---

# 手机版

登入卡片：

宽度：

95%

按钮：

全宽。

字体：

18px

---

# Accessibility

所有 Input：

必须 Label。

Button：

ARIA Label。

Tab：

顺序正确。

---

# Browser

Chrome

Edge

Firefox

Safari

全部支援。

---

# AI Coding Rules

请直接生成：

完整 login.html

完整 login.css

完整 login.js

完整 firebase.js

不得省略。

不得出现：

TODO

Placeholder

Pseudo Code

Example Only

所有代码必须可直接执行。

所有函数必须加入中文注释。

完成后：

直接可以登入学生帐号。
