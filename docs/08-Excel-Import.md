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
# Star Photo Share System
# 08 - Excel Import & Student Account Generation

Version 1.0

---

# 开发目标

建立一套自动读取学校学生名单（Excel）的系统。

管理员只需要更新 Excel，即可自动：

- 建立学生帐号
- 更新学生资料
- 建立班级
- 更新人数
- 建立 Firestore Collection

整个过程不得手动修改 JSON。

---

# Excel 格式

系统采用学校提供的 Excel。

工作表名称：

学生名單

必须包含以下栏位：

班级

姓名

学号

例如：

| 班级 | 姓名 | 学号 |
|------|------|------|
| 初二忠 | 陈大文 | 240301 |
| 初二忠 | 李志豪 | 240302 |
| 初二孝 | 黄文杰 | 240401 |

如果栏位名称不同，允许在 config 中映射。

---

# 建立文件

scripts/

convertExcel.js

importFirestore.js

validateExcel.js

config.js

---

# convertExcel.js

功能：

读取：

students.xlsx

↓

验证资料

↓

输出：

students.json

---

# students.json 格式

[
    {
        "studentId":"240301",
        "name":"陈大文",
        "class":"初二忠",
        "password":"240301",
        "completed":false,
        "photoURL":"",
        "photoLink":"",
        "reason":"",
        "status":"active"
    }
]

密码：

默认使用：

学号。

以后教师后台可以修改。

---

# Validation

必须检查：

✔ 学号不能为空

✔ 姓名不能为空

✔ 班级不能为空

✔ 学号不能重复

✔ 班级格式正确

错误：

输出：

error-report.csv

内容：

第几列

错误原因

例如：

第25列

学号重复

---

# 自动建立班级

读取全部学生。

自动统计：

班级人数。

建立：

classes Collection。

例如：

初二忠

人数：

35

---

# Firestore Import

执行：

importFirestore.js

功能：

自动建立：

students

classes

Collection。

不得覆盖：

教师资料。

---

# 更新模式

提供：

新增模式

覆盖模式

同步模式

默认：

同步模式。

同步：

保留：

学生作品。

更新：

姓名

班级

帐号状态。

---

# 自动停用

如果：

Excel 已不存在某位学生。

状态：

inactive

而不是删除。

避免遗失作品。

---

# Teacher Import Page（可选）

教师后台：

增加：

导入学生名单。

支持：

拖曳 Excel

或

选择档案。

导入完成：

显示：

新增

更新

停用

错误

统计。

---

# Import Report

导入后：

自动输出：

import-report.txt

内容：

总人数

新增人数

更新人数

停用人数

错误人数

执行时间

---

# Checklist

☐ Excel 已读取

☐ 数据验证完成

☐ students.json 已建立

☐ Firestore 已同步

☐ 班级人数已更新

☐ 重复资料已处理

☐ Import Report 已输出

---

# AI Coding Rules

请直接生成：

convertExcel.js

importFirestore.js

validateExcel.js

config.js

所有代码必须完整。

不得省略。

不得出现：

TODO

Placeholder

Pseudo Code

Example Only

必须加入完整中文注释。

最终：

管理员更新 Excel 后，

只需执行：

node convertExcel.js

node importFirestore.js

即可完成全部学生帐号更新。