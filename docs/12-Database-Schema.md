# Star Photo Share System
# 12 - Database Schema Specification

Version 1.0

---

# 文件目的

本文件定义 Star Photo Share System 的数据库结构（Database Schema）。

本系统采用：

- Firebase Firestore
- Firebase Storage
- Firebase Authentication

所有开发人员及 AI 必须严格遵循本数据库设计。

---

# Database Architecture

```

Firebase Project

│

├── Authentication

│ └── Teachers

│

├── Firestore

│ ├── students

│ ├── works

│ ├── classes

│ ├── teachers

│ ├── settings

│ ├── logs

│ ├── announcements

│ └── statistics

│

└── Storage

└── images/
