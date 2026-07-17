# Star Photo Share System
# 04 - Student Upload System Development Specification

Version 1.0

---

# 开发目标

建立学生作品上传系统。

学生登入后只能进入自己的页面。

不能浏览其他学生资料。

不能修改其他学生资料。

所有资料储存至 Firebase。

---

# 必须建立文件

student.html

css/student.css

js/student.js

js/firebase.js

---

# 页面流程

登入成功

↓

student.html

↓

读取自己的资料

↓

显示已上传内容（如果有）

↓

修改

↓

储存

↓

更新 Firestore

---

# 页面布局

采用：

Glassmorphism

星图背景

页面分成左右两栏。

--------------------------------

左侧

个人资料

右侧

作品上传

--------------------------------

---

# 左侧

显示：

头像（预设星球）

姓名

班级

学号

上传状态

例如：

-------------------

👤

陈大文

初二忠

240301

状态：

已完成

-------------------

如果未完成：

状态：

未完成

显示黄色。

完成：

绿色。

---

# 右侧

标题：

我的作品

---

第一栏

上传照片

按钮：

【选择图片】

支持：

JPG

PNG

WEBP

JPEG

最大：

10MB

---

第二栏

图片网址

Placeholder：

https://...

如果学生上传图片：

网址可以留空。

如果填写网址：

不用上传图片。

至少必须有一个。

---

第三栏

分享原因

Textarea

限制：

1000字

Placeholder：

请分享：

为什么选择这张照片？

它有什么意义？

---

第四栏

即时预览

上传后：

立即显示图片。

如果网址：

自动载入图片。

失败：

显示：

图片无法读取。

---

第五栏

按钮

【储存】

【重新编辑】

【清空】

---

# Firebase Storage

上传图片：

Storage

路径：

images/

班级/

studentId/

photo.jpg

例如：

images/

初二忠/

240301/

photo.jpg

---

# Firestore

Collection：

works

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

completed

---

例如：

{

studentId:"240301",

name:"陈大文",

class:"初二忠",

photoURL:"https://...",

photoLink:"",

reason:"这是我和家人的旅行照片。",

completed:true,

createdAt:Timestamp,

updatedAt:Timestamp

}

---

# 自动储存

按下：

储存

↓

验证

↓

上传图片

↓

取得 URL

↓

更新 Firestore

↓

更新 students.completed

↓

Toast：

储存成功。

---

# 修改

如果：

已有资料。

页面开启：

自动读取。

学生：

可以修改：

图片

网址

分享原因

再次储存。

---

# 删除图片

点击：

删除图片

↓

Storage 删除

↓

Firestore 更新

↓

completed=false

---

# 图片压缩

上传前：

自动压缩：

最长边：

1600px

JPEG：

85%

减少流量。

---

# 上传进度

上传时：

Progress Bar

例如：

████████░░

80%

完成：

100%

自动消失。

---

# 防止重复提交

储存中：

按钮：

Disabled

显示：

上传中...

完成：

恢复。

---

# Validation

必须验证：

至少：

图片

或

网址

必须有一个。

分享原因：

不能为空。

最多：

1000字。

---

# Toast

成功：

✅ 储存成功

失败：

❌ 上传失败

警告：

⚠ 请填写分享原因

---

# student.js

必须建立：

init()

loadProfile()

loadWork()

previewImage()

previewURL()

compressImage()

uploadImage()

saveWork()

deleteImage()

validate()

clearForm()

showToast()

logout()

---

# 页面顶部

Logo

Star Photo Share

右侧：

登出

返回首页

---

# Footer

Version 1.0

Powered by Firebase

---

# 手机版

上下排列。

按钮：

100%

Textarea：

自动放大。

图片：

宽度100%。

---

# Accessibility

所有 Input：

必须 Label。

图片：

Alt。

按钮：

ARIA Label。

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

# AI Coding Rules

请直接生成：

完整 student.html

完整 student.css

完整 student.js

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

学生登入即可上传照片、

填写图片网址、

输入分享原因、

成功储存到 Firebase。
