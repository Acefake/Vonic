# Vonic
<<<<<<< HEAD
electron+vue
=======

基于 Electron + Vue 3 + TypeScript 的桌面应用开发框架。

## 功能特性

- **插件系统**：支持内置、外部、开发三种插件类型
- **多窗口管理**：窗口通信、懒加载
- **Vue 3 + TypeScript**：现代化技术栈
- **基础功能模块**：
  - 文件操作（读写、复制、删除）
  - 日志系统
  - 存储管理
  - 系统信息获取
  - 对话框和通知

## 项目结构

- `src/main`: Electron 主进程代码
  - `app/handlers`: 各种功能管理器（窗口、文件、日志等）
- `src/renderer`: Vue 渲染进程代码
  - `app`: App API 封装
  - `views`: 页面视图
- `src/shared`: 共享类型定义

## 开发指南

### 安装依赖

```bash
pnpm install
```

### 启动开发环境

```bash
pnpm dev
```

### 打包构建

```bash
pnpm build
```
>>>>>>> feat/new
