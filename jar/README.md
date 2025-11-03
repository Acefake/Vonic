# Java 后端服务目录

## 当前文件

- `javaSever.jar` - Java 后端服务包（17MB）

## 说明

此目录用于存放 Java 后端服务的 JAR 包。

### 开发环境
Electron 应用启动时会自动从此目录加载 `javaSever.jar`

### 生产环境
打包时会自动将此目录下的所有文件复制到 `resources/jar/`

### 配置

在 `src/main/index.ts` 中配置：

```typescript
const javaManager = createJavaProcessManager({
  port: 8080, // 后端服务端口
  jvmArgs: ['-Xmx512m', '-Xms256m'], // JVM 参数
  startupTimeout: 30000, // 启动超时
})
```

### 更新 JAR 文件

直接替换此目录下的 `javaSever.jar` 文件即可。
