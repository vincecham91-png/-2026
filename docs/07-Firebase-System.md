# Star Photo Share System
# 07 - Firebase System Development Specification

Version 1.0

---

# 开发目标

建立完整 Firebase 云端架构。

整个系统的数据必须储存在 Firebase。

学生不用安装 App，只需打开网页即可。

教师可以即时查看所有学生上传内容。

系统采用：

- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Hosting（可选）

---

# Firebase Project

Project Name：

StarPhotoShare

Region：

asia-southeast1（Singapore）

Authentication：

Enable

Cloud Firestore：

Native Mode

Storage：

Enable

Hosting：

Enable（可选）

---

# Firebase Authentication

## 教师登入

使用：

Email + Password

例如：

teacher@school.edu.my

********

Teacher 登录后：

teacher.html

---

## 学生登入

学生不使用 Firebase Authentication。

学生帐号来自：

students Collection

登入验证：

studentId

name

class

password

登入成功：

Session Storage

---

# Firestore Collections

必须建立：

students

works

classes

teachers

settings

logs

---

# students Collection

Document ID：

studentId

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

lastLogin

status

---

Example

{

"studentId":"240301",

"name":"陈大文",

"class":"初二忠",

"password":"240301",

"completed":false,

"photoURL":"",

"photoLink":"",

"reason":"",

"uploadTime":null,

"lastLogin":null,

"status":"active"

}

---

# works Collection

Document：

studentId

字段：

studentId

name

class

photoURL

photoLink

reason

createdAt

updatedAt

---

# classes Collection

Document：

className

字段：

className

studentCount

completedCount

completionRate

teacher

---

Example

{

"className":"初二忠",

"studentCount":35,

"completedCount":31,

"completionRate":88

}

---

# teachers Collection

Document：

Teacher UID

字段：

name

email

role

lastLogin

---

Example

{

"name":"Teacher",

"email":"teacher@school.edu.my",

"role":"teacher"

}

---

# settings Collection

保存：

School Name

Logo

Academic Year

Deadline

Theme

AllowUpload

---

# logs Collection

记录：

登入

上传

修改

删除

方便管理员审查。

---

# Firebase Storage

Bucket：

images

目录：

images/

↓

Class

↓

Student ID

↓

photo.jpg

Example

images/

初二忠/

240301/

photo.jpg

---

# 上传流程

Student

↓

选择图片

↓

图片压缩

↓

Storage

↓

取得 Download URL

↓

Firestore 更新

↓

completed=true

↓

首页自动更新

---

# Firestore Security Rules

students

只能读取：

自己的资料。

只能修改：

自己的作品。

Teacher：

可以读取全部。

Admin：

拥有全部权限。

---

Example Rules

Student：

Read：

Own Document

Write：

Own Document

Teacher：

Read：

All

Write：

All

---

# Storage Rules

学生：

只能上传：

自己的图片。

教师：

全部读取。

管理员：

全部权限。

---

# Firebase Config

建立：

firebase/firebaseConfig.js

包含：

initializeApp()

getFirestore()

getStorage()

getAuth()

所有页面统一引用。

---

# students.json

学校提供：

students.xlsx

自动转换：

students.json

格式：

[
  {
    "studentId":"240301",
    "name":"陈大文",
    "class":"初二忠",
    "password":"240301"
  }
]

---

# Excel Import

建立：

Node.js Script

convertExcel.js

功能：

读取：

students.xlsx

输出：

students.json

再导入 Firestore。

---

# Batch Import

建立：

importStudents.js

功能：

读取：

students.json

自动建立：

students Collection

classes Collection

---

# Firebase Functions（预留）

未来可扩充：

上传通知

Email

Deadline Lock

自动统计

自动备份

---

# Hosting

Firebase Hosting

网址：

https://starphotoshare.web.app

或

GitHub Pages

---

# Error Handling

所有 Firebase 操作：

必须：

try...catch

Toast

Loading

Retry

---

# Offline Support（可选）

开启：

Firestore Offline Cache

学生网络恢复后：

自动同步。

---

# Performance

图片：

Lazy Loading

Firestore：

分页读取

避免一次读取全部。

---

# Checklist

完成后必须确认：

☐ Firebase Project 已建立

☐ Firestore 已启用

☐ Storage 已启用

☐ Authentication 已启用

☐ students Collection 已建立

☐ works Collection 已建立

☐ classes Collection 已建立

☐ teachers Collection 已建立

☐ settings Collection 已建立

☐ logs Collection 已建立

☐ students.json 已导入

☐ 图片成功上传

☐ Firestore 自动更新

☐ 首页完成率同步更新

☐ Gallery 自动更新

☐ Teacher Dashboard 自动更新

---

# AI Coding Rules

请直接生成：

firebaseConfig.js

Firestore Rules

Storage Rules

convertExcel.js

importStudents.js

所有代码必须完整。

不得出现：

TODO

Placeholder

Pseudo Code

Example Only

所有代码必须可直接执行。

所有函数必须加入完整中文注释。

最终：

学生上传图片后，

资料自动同步至 Firebase，

教师后台即时更新，

首页完成率即时变化。