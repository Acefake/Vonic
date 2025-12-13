# SysML v2 建模工具 - 完整架构设计

## 📋 目录
1. [系统概述](#系统概述)
2. [前端架构](#前端架构)
3. [后端架构](#后端架构)
4. [数据架构](#数据架构)
5. [协作架构](#协作架构)
6. [验证架构](#验证架构)
7. [集成架构](#集成架构)
8. [部署架构](#部署架构)
9. [安全架构](#安全架构)
10. [扩展架构](#扩展架构)
11. [性能优化](#性能优化)
12. [监控体系](#监控体系)
13. [测试架构](#测试架构)
14. [灾难恢复](#灾难恢复)
15. [开发流程](#开发流程)

---

## 系统概述

### 🎯 设计目标

**SysML v2 建模工具**是一个基于 Vue 3 + CS 架构的企业级系统建模平台，专注于：

- ✅ **标准兼容**：完全支持 OMG SysML v2 规范
- ✅ **图形化建模**：直观的拖拽式建模界面
- ✅ **团队协作**：实时多用户协作编辑
- ✅ **模型验证**：自动约束检查和规则验证
- ✅ **扩展性**：插件化架构支持定制需求
- ✅ **企业级**：高可用性、可扩展性、安全性

### 🏗️ 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    SysML v2 建模工具                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   前端应用      │  │   协作服务      │  │  验证服务   │ │
│  │  (Vue 3)       │  │  (WebSocket)    │  │  (规则引擎) │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   API 网关      │  │   业务服务      │  │  数据服务   │ │
│  │  (REST/GraphQL)│  │  (微服务)       │  │  (数据库)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   存储层        │  │   缓存层        │  │  搜索服务   │ │
│  │  (PostgreSQL)  │  │  (Redis)        │  │  (ES)       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   消息队列      │  │   文件存储      │  │  外部集成   │ │
│  │  (Kafka)       │  │  (MinIO)        │  │  (API)      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 前端架构

### 🎨 技术栈

```
前端应用 (Vue 3 + TypeScript)
├── 图形层 (AntV X6)
│   ├── 节点渲染器 (SysML元素)
│   ├── 边渲染器 (关系连接)
│   ├── 交互控制器 (拖拽/选择/缩放)
│   └── 布局引擎 (自动布局算法)
│
├── UI 层 (Ant Design Vue)
│   ├── 工具栏 (操作面板)
│   ├── 属性面板 (元素属性)
│   ├── 导航面板 (项目结构)
│   ├── 控制台 (日志/错误)
│   └── 状态栏 (状态信息)
│
├── 状态管理 (Pinia)
│   ├── 项目状态 (当前项目)
│   ├── 图表状态 (当前图表)
│   ├── 用户状态 (权限/偏好)
│   ├── 协作状态 (在线用户)
│   └── 历史状态 (撤销重做)
│
├── 路由层 (Vue Router)
│   ├── 项目路由 (/project/:id)
│   ├── 图表路由 (/diagram/:id)
│   ├── 协作路由 (/collab/:session)
│   └── 管理路由 (/admin/*)
│
└── 网络层 (Axios + WebSocket)
    ├── REST API 客户端
    ├── 实时协作客户端
    ├── 文件上传客户端
    └── 缓存管理器
```

### 📱 组件架构

```
App.vue (根组件)
├── Layout.vue (主布局)
│   ├── Header.vue (顶部导航栏)
│   │   ├── ProjectSelector.vue (项目选择器)
│   │   ├── Toolbar.vue (主工具栏)
│   │   └── UserMenu.vue (用户菜单)
│   │
│   ├── Sidebar.vue (侧边栏)
│   │   ├── ProjectExplorer.vue (项目浏览器)
│   │   ├── ElementPalette.vue (元素面板)
│   │   └── PropertyPanel.vue (属性面板)
│   │
│   └── MainArea.vue (主工作区)
│       ├── CanvasContainer.vue (画布容器)
│       │   ├── SysMLCanvas.vue (SysML画布)
│       │   │   ├── NodeRenderer.vue (节点渲染器)
│       │   │   ├── EdgeRenderer.vue (边渲染器)
│       │   │   └── InteractionLayer.vue (交互层)
│       │   │
│       │   ├── MiniMap.vue (小地图)
│       │   ├── Ruler.vue (标尺)
│       │   └── Grid.vue (网格)
│       │
│       └── TabContainer.vue (标签页容器)
│           ├── DiagramTab.vue (图表标签页)
│           └── ConsoleTab.vue (控制台标签页)
│
└── ModalContainer.vue (模态框容器)
    ├── CreateProjectModal.vue (创建项目)
    ├── ImportModal.vue (导入模型)
    ├── ExportModal.vue (导出模型)
    └── SettingsModal.vue (设置)
```

### 🔄 状态管理设计

```typescript
// stores/project.ts
interface ProjectState {
  currentProject: Project | null
  projects: Project[]
  loading: boolean
  error: string | null
}

// stores/diagram.ts
interface DiagramState {
  currentDiagram: SysMLDiagram | null
  diagrams: SysMLDiagram[]
  selectedElements: SysMLElement[]
  clipboard: SysMLElement[]
  undoStack: Action[]
  redoStack: Action[]
}

// stores/collaboration.ts
interface CollaborationState {
  sessionId: string | null
  onlineUsers: User[]
  cursors: Cursor[]
  pendingChanges: Change[]
  conflicts: Conflict[]
}

// stores/user.ts
interface UserState {
  currentUser: User | null
  preferences: UserPreferences
  permissions: Permission[]
}
```

---

## 后端架构

### 🏢 微服务架构

```
API 网关 (Spring Cloud Gateway)
├── 路由分发
├── 负载均衡
├── 认证授权
├── 限流熔断
└── 日志监控

用户服务 (User Service)
├── 用户管理
├── 权限控制
├── 组织架构
└── 单点登录

项目服务 (Project Service)
├── 项目 CRUD
├── 成员管理
├── 权限分配
└── 项目模板

建模服务 (Modeling Service)
├── SysML 元模型
├── 图表管理
├── 元素操作
└── 关系管理

协作服务 (Collaboration Service)
├── 实时同步
├── 冲突解决
├── 版本控制
└── 会话管理

验证服务 (Validation Service)
├── 语法验证
├── 语义验证
├── 约束检查
└── 规则引擎

文件服务 (File Service)
├── 文件上传
├── 版本管理
├── 格式转换
└── 存储管理

集成服务 (Integration Service)
├── 外部工具集成
├── API 适配器
├── 数据导入导出
└── 插件管理
```

### 📡 API 设计

#### REST API 规范

```typescript
// 项目管理 API
GET / api / v1 / projects // 获取项目列表
POST / api / v1 / projects // 创建项目
GET / api / v1 / projects / { id } // 获取项目详情
PUT / api / v1 / projects / { id } // 更新项目
DELETE / api / v1 / projects / { id } // 删除项目

// 图表管理 API
GET / api / v1 / projects / { id } / diagrams // 获取项目图表
POST / api / v1 / projects / { id } / diagrams // 创建图表
GET / api / v1 / diagrams / { id } // 获取图表详情
PUT / api / v1 / diagrams / { id } // 更新图表
DELETE / api / v1 / diagrams / { id } // 删除图表

// 元素操作 API
GET / api / v1 / diagrams / { id } / elements // 获取图表元素
POST / api / v1 / diagrams / { id } / elements // 创建元素
PUT / api / v1 / elements / { id } // 更新元素
DELETE / api / v1 / elements / { id } // 删除元素

// 协作 API
GET / api / v1 / diagrams / { id } / sessions // 获取协作会话
POST / api / v1 / diagrams / { id } / sessions // 创建会话
WS / api / v1 / ws / collab / { sessionId } // WebSocket 协作
```

#### GraphQL API (可选)

```graphql
type Query {
  project(id: ID!): Project
  projects(filter: ProjectFilter): [Project!]!
  diagram(id: ID!): Diagram
  diagrams(projectId: ID!): [Diagram!]!
}

type Mutation {
  createProject(input: CreateProjectInput!): Project!
  updateProject(id: ID!, input: UpdateProjectInput!): Project!
  createDiagram(projectId: ID!, input: CreateDiagramInput!): Diagram!
  updateElement(id: ID!, input: UpdateElementInput!): Element!
}

type Subscription {
  diagramUpdated(diagramId: ID!): DiagramUpdate!
  elementChanged(diagramId: ID!): ElementChange!
  userJoined(sessionId: ID!): UserEvent!
}
```

---

## 数据架构

### 🗄️ 数据模型

#### SysML v2 元模型

```typescript
// 核心元素类型
interface SysMLElement {
  id: string
  type: SysMLElementType
  name: string
  description?: string
  properties: Record<string, any>
  relationships: Relationship[]
  stereotypes: Stereotype[]
  constraints: Constraint[]
  metadata: ElementMetadata
}

// SysML 元素类型枚举
enum SysMLElementType {
  PACKAGE = 'package',
  CLASS = 'class',
  INTERFACE = 'interface',
  ACTOR = 'actor',
  USECASE = 'usecase',
  ACTIVITY = 'activity',
  STATE = 'state',
  SEQUENCE = 'sequence',
  REQUIREMENT = 'requirement',
  BLOCK = 'block',
  PORT = 'port',
  FLOW = 'flow'
}

// 关系类型
interface Relationship {
  id: string
  type: RelationshipType
  sourceId: string
  targetId: string
  properties: Record<string, any>
  stereotypes: Stereotype[]
}

// 项目结构
interface Project {
  id: string
  name: string
  description?: string
  ownerId: string
  members: ProjectMember[]
  diagrams: Diagram[]
  libraries: Library[]
  settings: ProjectSettings
  createdAt: Date
  updatedAt: Date
}

// 图表结构
interface Diagram {
  id: string
  name: string
  type: DiagramType
  projectId: string
  elements: SysMLElement[]
  relationships: Relationship[]
  viewport: Viewport
  layout: LayoutSettings
  version: number
  createdAt: Date
  updatedAt: Date
}
```

### 🗃️ 数据库设计

#### PostgreSQL 表结构

```sql
-- 项目表
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL,
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 图表表
CREATE TABLE diagrams (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  project_id UUID REFERENCES projects(id),
  data JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 元素表
CREATE TABLE elements (
  id UUID PRIMARY KEY,
  diagram_id UUID REFERENCES diagrams(id),
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  data JSONB NOT NULL,
  position JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 关系表
CREATE TABLE relationships (
  id UUID PRIMARY KEY,
  diagram_id UUID REFERENCES diagrams(id),
  type VARCHAR(50) NOT NULL,
  source_id UUID REFERENCES elements(id),
  target_id UUID REFERENCES elements(id),
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  profile JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 协作会话表
CREATE TABLE collaboration_sessions (
  id UUID PRIMARY KEY,
  diagram_id UUID REFERENCES diagrams(id),
  user_id UUID REFERENCES users(id),
  cursor_position JSONB,
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP
);
```

### 🔍 搜索架构

#### Elasticsearch 索引设计

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "type": { "type": "keyword" },
      "name": {
        "type": "text",
        "analyzer": "ik_max_word",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "ik_max_word"
      },
      "properties": { "type": "object" },
      "project_id": { "type": "keyword" },
      "diagram_id": { "type": "keyword" },
      "created_at": { "type": "date" },
      "updated_at": { "type": "date" }
    }
  }
}
```

---

## 协作架构

### 🔄 实时协作设计

```
协作流程：
1. 用户加入协作会话
2. 建立 WebSocket 连接
3. 同步当前图表状态
4. 监听其他用户的操作
5. 广播本地操作变更
6. 处理冲突和合并
7. 维护操作历史
```

#### 操作转换算法 (OT)

```typescript
interface Operation {
  type: 'insert' | 'update' | 'delete'
  elementId: string
  path: string[]
  value: any
  timestamp: number
  userId: string
}

class OperationalTransformation {
  // 转换两个并发操作
  transform(op1: Operation, op2: Operation): [Operation, Operation] {
    // 实现 OT 算法
  }

  // 应用操作到模型
  apply(operation: Operation, model: SysMLModel): SysMLModel {
    // 应用操作逻辑
  }
}
```

#### 冲突解决策略

```typescript
enum ConflictResolution {
  LAST_WRITE_WINS = 'last_write_wins',
  MANUAL_MERGE = 'manual_merge',
  VERSION_BRANCH = 'version_branch'
}

interface Conflict {
  id: string
  operation1: Operation
  operation2: Operation
  resolution: ConflictResolution
  resolvedBy?: string
  resolvedAt?: Date
}
```

### 📊 版本控制

#### Git-like 版本管理

```typescript
interface Commit {
  id: string
  parentIds: string[]
  message: string
  author: string
  timestamp: Date
  changes: Change[]
  diagramState: DiagramSnapshot
}

interface Branch {
  name: string
  commitId: string
  createdBy: string
  createdAt: Date
}

class VersionControl {
  // 创建提交
  commit(diagramId: string, message: string, changes: Change[]): Commit

  // 创建分支
  createBranch(diagramId: string, name: string, fromCommitId: string): Branch

  // 合并分支
  merge(fromBranch: string, toBranch: string): Commit

  // 解决冲突
  resolveConflicts(conflicts: Conflict[]): Commit
}
```

---

## 验证架构

### ✅ SysML 验证引擎

#### 验证规则类型

```typescript
enum ValidationRuleType {
  SYNTAX = 'syntax', // 语法验证
  SEMANTIC = 'semantic', // 语义验证
  CONSTRAINT = 'constraint', // 约束验证
  COMPLETENESS = 'completeness' // 完整性验证
}

interface ValidationRule {
  id: string
  name: string
  type: ValidationRuleType
  description: string
  condition: string // 规则表达式
  severity: 'error' | 'warning' | 'info'
  category: string
}

interface ValidationResult {
  ruleId: string
  elementId: string
  message: string
  severity: 'error' | 'warning' | 'info'
  location?: Location
  suggestions?: string[]
}
```

#### 规则引擎实现

```typescript
class ValidationEngine {
  private rules: Map<string, ValidationRule> = new Map()

  // 注册验证规则
  registerRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule)
  }

  // 执行验证
  async validate(model: SysMLModel): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    for (const rule of this.rules.values()) {
      const ruleResults = await this.executeRule(rule, model)
      results.push(...ruleResults)
    }

    return results
  }

  // 执行单个规则
  private async executeRule(rule: ValidationRule, model: SysMLModel): Promise<ValidationResult[]> {
    // 规则执行逻辑
  }
}
```

### 🔍 约束检查

#### OCL (Object Constraint Language) 支持

```ocl
-- 类必须有名称
context Class
inv: self.name <> null and self.name.size() > 0

-- 接口只能有操作，不能有属性
context Interface
inv: self.ownedAttribute->isEmpty()

-- 关联端必须指定 multiplicity
context Association
inv: self.memberEnd->forAll(e | e.lower <> null and e.upper <> null)
```

---

## 集成架构

### 🔗 外部工具集成

#### 导入导出格式

```typescript
enum ExchangeFormat {
  XMI = 'xmi', // OMG XMI 标准
  JSON = 'json', // SysML v2 JSON
  XML = 'xml', // 自定义 XML
  CSV = 'csv', // 表格数据
  EXCEL = 'excel' // Excel 格式
}

interface ImportExportHandler {
  format: ExchangeFormat
  canImport: boolean
  canExport: boolean

  import: (data: Buffer, options?: ImportOptions) => Promise<SysMLModel>
  export: (model: SysMLModel, options?: ExportOptions) => Promise<Buffer>
}
```

#### 工具集成适配器

```typescript
interface ToolAdapter {
  name: string
  version: string
  capabilities: ToolCapability[]

  // 连接到外部工具
  connect: (config: ConnectionConfig) => Promise<void>

  // 同步模型
  syncModel: (model: SysMLModel) => Promise<SyncResult>

  // 执行分析
  analyze: (model: SysMLModel) => Promise<AnalysisResult>
}

enum ToolCapability {
  MODEL_IMPORT = 'model_import',
  MODEL_EXPORT = 'model_export',
  SIMULATION = 'simulation',
  ANALYSIS = 'analysis',
  CODE_GENERATION = 'code_generation'
}
```

### 📦 插件系统

#### 插件架构

```typescript
interface Plugin {
  id: string
  name: string
  version: string
  description: string
  author: string

  // 插件类型
  type: PluginType

  // 激活插件
  activate: (context: PluginContext) => Promise<void>

  // 停用插件
  deactivate: () => Promise<void>
}

enum PluginType {
  UI_EXTENSION = 'ui_extension', // UI 扩展
  VALIDATION_RULE = 'validation_rule', // 验证规则
  EXPORT_FORMAT = 'export_format', // 导出格式
  TOOL_INTEGRATION = 'tool_integration', // 工具集成
  CUSTOM_ELEMENT = 'custom_element' // 自定义元素
}

interface PluginContext {
  // 访问系统服务
  services: SystemServices

  // 注册扩展点
  registerExtensionPoint: (type: string, handler: any) => void

  // 获取配置
  getConfig: () => PluginConfig
}
```

---

## 部署架构

### 🐳 容器化部署

#### Docker Compose 配置

```yaml
version: '3.8'

services:
  # API 网关
  gateway:
    image: sysml-gateway:latest
    ports:
      - '8080:8080'
    environment:
      - SPRING_PROFILES_ACTIVE=prod

  # 用户服务
  user-service:
    image: sysml-user-service:latest
    environment:
      - DATABASE_URL=postgresql://...
    depends_on:
      - postgres

  # 建模服务
  modeling-service:
    image: sysml-modeling-service:latest
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - elasticsearch

  # 前端应用
  frontend:
    image: sysml-frontend:latest
    ports:
      - '80:80'
    depends_on:
      - gateway

  # 数据库
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=sysml
      - POSTGRES_USER=sysml
      - POSTGRES_PASSWORD=secret
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # 缓存
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  # 搜索
  elasticsearch:
    image: elasticsearch:8.11
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - es_data:/usr/share/elasticsearch/data

  # 文件存储
  minio:
    image: minio/minio:latest
    environment:
      - MINIO_ACCESS_KEY=sysml
      - MINIO_SECRET_KEY=sysml-secret
    command: server /data
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  es_data:
  minio_data:
```

### ☁️ 云原生部署

#### Kubernetes 配置

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sysml-modeling-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sysml-modeling-service
  template:
    metadata:
      labels:
        app: sysml-modeling-service
    spec:
      containers:
        - name: modeling-service
          image: sysml-modeling-service:latest
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: url
            - name: REDIS_URL
              valueFrom:
                configMapKeyRef:
                  name: redis-config
                  key: url
          resources:
            requests:
              memory: 256Mi
              cpu: 250m
            limits:
              memory: 512Mi
              cpu: 500m
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
```

---

## 安全架构

### 🔐 认证授权

#### JWT + OAuth2 认证

```typescript
interface AuthToken {
  userId: string
  username: string
  roles: string[]
  permissions: string[]
  exp: number
  iat: number
}

class AuthService {
  // 生成访问令牌
  generateAccessToken(user: User): string

  // 验证访问令牌
  validateAccessToken(token: string): AuthToken | null

  // 刷新令牌
  refreshAccessToken(refreshToken: string): string

  // 验证权限
  hasPermission(user: User, resource: string, action: string): boolean
}
```

#### RBAC 权限模型

```typescript
enum Role {
  ADMIN = 'admin',
  PROJECT_OWNER = 'project_owner',
  PROJECT_EDITOR = 'project_editor',
  PROJECT_VIEWER = 'project_viewer',
  GUEST = 'guest'
}

enum Permission {
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',
  DIAGRAM_CREATE = 'diagram:create',
  DIAGRAM_EDIT = 'diagram:edit',
  COLLABORATE = 'collaborate',
  EXPORT = 'export'
}

interface UserRole {
  userId: string
  projectId: string
  role: Role
  grantedBy: string
  grantedAt: Date
}
```

### 🛡️ 数据安全

#### 数据加密

```typescript
class DataEncryption {
  // 加密敏感数据
  encrypt(data: string, key?: string): string

  // 解密数据
  decrypt(encryptedData: string, key?: string): string

  // 生成密钥
  generateKey(): string

  // 哈希密码
  hashPassword(password: string): string

  // 验证密码
  verifyPassword(password: string, hash: string): boolean
}
```

#### API 安全

```typescript
class APISecurity {
  // 请求频率限制
  rateLimit(req: Request, limit: number, window: number): boolean

  // 输入验证
  validateInput(data: any, schema: Schema): ValidationResult

  // SQL 注入防护
  sanitizeQuery(query: string): string

  // XSS 防护
  sanitizeHTML(html: string): string

  // CSRF 防护
  validateCSRFToken(token: string): boolean
}
```

---

## 扩展架构

### 🔌 插件生态

#### 插件市场

```typescript
interface PluginMarket {
  // 搜索插件
  searchPlugins: (query: PluginSearchQuery) => Promise<PluginInfo[]>

  // 下载插件
  downloadPlugin: (pluginId: string) => Promise<PluginPackage>

  // 安装插件
  installPlugin: (pluginPackage: PluginPackage) => Promise<void>

  // 卸载插件
  uninstallPlugin: (pluginId: string) => Promise<void>

  // 更新插件
  updatePlugin: (pluginId: string) => Promise<void>
}

interface PluginInfo {
  id: string
  name: string
  version: string
  description: string
  author: string
  category: PluginCategory
  rating: number
  downloads: number
  tags: string[]
  screenshots: string[]
}
```

### 🌐 API 扩展

#### Webhook 支持

```typescript
interface Webhook {
  id: string
  url: string
  events: WebhookEvent[]
  secret: string
  active: boolean
  createdAt: Date
}

enum WebhookEvent {
  PROJECT_CREATED = 'project.created',
  PROJECT_UPDATED = 'project.updated',
  DIAGRAM_CREATED = 'diagram.created',
  DIAGRAM_UPDATED = 'diagram.updated',
  ELEMENT_CREATED = 'element.created',
  ELEMENT_UPDATED = 'element.updated',
  COLLABORATION_STARTED = 'collaboration.started',
  VALIDATION_FAILED = 'validation.failed'
}

class WebhookService {
  // 注册 Webhook
  registerWebhook(webhook: Webhook): Promise<void>

  // 触发事件
  triggerEvent(event: WebhookEvent, data: any): Promise<void>

  // 验证签名
  verifySignature(payload: string, signature: string, secret: string): boolean
}
```

### 📊 分析扩展

#### 模型分析插件

```typescript
interface ModelAnalyzer {
  name: string
  description: string

  // 分析模型
  analyze: (model: SysMLModel) => Promise<AnalysisResult>

  // 生成报告
  generateReport: (analysis: AnalysisResult) => Promise<Report>
}

interface AnalysisResult {
  metrics: ModelMetrics
  issues: Issue[]
  recommendations: Recommendation[]
  diagrams: AnalysisDiagram[]
}

interface ModelMetrics {
  elementCount: number
  relationshipCount: number
  complexityScore: number
  completenessScore: number
  consistencyScore: number
}
```

---

## 总结

### 🎯 架构优势

1. **模块化设计**：微服务架构保证高可扩展性
2. **标准化支持**：完全兼容 SysML v2 规范
3. **实时协作**：WebSocket + OT 算法支持多用户协作
4. **企业级安全**：JWT + RBAC + 数据加密
5. **插件化扩展**：丰富的插件生态和 API 扩展
6. **云原生部署**：容器化 + Kubernetes 支持

### 🚀 技术选型亮点

- **前端**：Vue 3 + AntV X6 + TypeScript
- **后端**：Spring Boot + PostgreSQL + Redis
- **协作**：WebSocket + 操作转换算法
- **验证**：规则引擎 + OCL 约束语言
- **部署**：Docker + Kubernetes + 云服务

### 📈 扩展性保证

- **水平扩展**：微服务架构支持水平扩展
- **垂直扩展**：插件系统支持功能扩展
- **集成扩展**：标准 API 支持外部工具集成
- **数据扩展**：灵活的数据模型支持自定义扩展

这个架构设计既满足了 SysML v2 建模的复杂需求，又保证了系统的可扩展性、可维护性和企业级特性。

---

## 性能优化

### ⚡ 前端性能优化

#### 图形渲染优化

```typescript
class GraphicsOptimizer {
  // 虚拟化渲染 - 只渲染可见区域
  private virtualRenderer = {
    viewportBuffer: 200, // 视口缓冲区像素

    getVisibleElements(viewport: Viewport, elements: Element[]): Element[] {
      const { x, y, width, height } = viewport
      return elements.filter(el =>
        this.isInViewport(el, x - this.viewportBuffer, y - this.viewportBuffer, width + 2 * this.viewportBuffer, height + 2 * this.viewportBuffer)
      )
    }
  }

  // 节点合并渲染
  private batchRenderer = {
    batchSize: 100,
    renderQueue: [] as RenderTask[],

    addTask(task: RenderTask): void {
      this.renderQueue.push(task)
      if (this.renderQueue.length >= this.batchSize) {
        this.flush()
      }
    },

    flush(): void {
      requestAnimationFrame(() => {
        this.renderQueue.forEach(task => task.execute())
        this.renderQueue = []
      })
    }
  }

  // LOD (Level of Detail) 策略
  private lodStrategy = {
    getDetailLevel(zoomLevel: number): DetailLevel {
      if (zoomLevel < 0.3)
        return 'low'
      if (zoomLevel < 0.7)
        return 'medium'
      return 'high'
    },

    renderElement(element: Element, level: DetailLevel): void {
      switch (level) {
        case 'low':
          this.renderSimplified(element)
          break
        case 'medium':
          this.renderNormal(element)
          break
        case 'high':
          this.renderDetailed(element)
          break
      }
    }
  }

  // 离屏渲染
  private offscreenCanvas = {
    cache: new Map<string, OffscreenCanvas>(),

    getCachedRender(elementId: string): OffscreenCanvas | null {
      return this.cache.get(elementId) || null
    },

    cacheRender(elementId: string, canvas: OffscreenCanvas): void {
      this.cache.set(elementId, canvas)
      // 限制缓存大小
      if (this.cache.size > 500) {
        const firstKey = this.cache.keys().next().value
        this.cache.delete(firstKey)
      }
    }
  }
}
```

#### 数据加载优化

```typescript
class DataLoadOptimizer {
  // 懒加载策略
  async lazyLoadDiagram(diagramId: string): Promise<DiagramData> {
    // 1. 先加载基本信息和可见元素
    const basicData = await this.loadBasicInfo(diagramId)

    // 2. 后台加载完整数据
    this.loadFullDataInBackground(diagramId)

    return basicData
  }

  // 增量加载
  private incrementalLoader = {
    pageSize: 50,
    currentPage: 0,

    async loadNextPage(diagramId: string): Promise<Element[]> {
      const elements = await api.getElements(diagramId, {
        offset: this.currentPage * this.pageSize,
        limit: this.pageSize
      })
      this.currentPage++
      return elements
    }
  }

  // 预加载策略
  private preloader = {
    preloadQueue: [] as string[],

    schedulePreload(diagramId: string): void {
      if (!this.preloadQueue.includes(diagramId)) {
        this.preloadQueue.push(diagramId)
        this.processQueue()
      }
    },

    async processQueue(): Promise<void> {
      if (this.preloadQueue.length === 0)
        return

      const diagramId = this.preloadQueue.shift()!
      await this.preloadDiagram(diagramId)

      // 继续处理队列
      setTimeout(() => this.processQueue(), 1000)
    }
  }
}
```

#### 缓存策略

```typescript
class CacheManager {
  // 多层缓存架构
  private memoryCache = new Map<string, CacheEntry>() // L1: 内存缓存
  private indexedDB: IDBDatabase // L2: IndexedDB

  // 智能缓存策略
  async get<T>(key: string): Promise<T | null> {
    // 1. 检查内存缓存
    const memCache = this.memoryCache.get(key)
    if (memCache && !this.isExpired(memCache)) {
      return memCache.data as T
    }

    // 2. 检查 IndexedDB
    const dbCache = await this.getFromIndexedDB(key)
    if (dbCache) {
      // 写回内存缓存
      this.memoryCache.set(key, dbCache)
      return dbCache.data as T
    }

    return null
  }

  async set<T>(key: string, data: T, ttl: number = 3600000): Promise<void> {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl
    }

    // 写入内存缓存
    this.memoryCache.set(key, entry)

    // 异步写入 IndexedDB
    this.setToIndexedDB(key, entry)
  }

  // LRU 驱逐策略
  private evictLRU(): void {
    if (this.memoryCache.size < 100)
      return

    const sorted = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)

    // 删除最旧的 20%
    const toDelete = Math.floor(sorted.length * 0.2)
    for (let i = 0; i < toDelete; i++) {
      this.memoryCache.delete(sorted[i][0])
    }
  }
}
```

### 🚀 后端性能优化

#### 数据库优化

```sql
-- 索引优化
CREATE INDEX idx_diagrams_project_id ON diagrams(project_id);
CREATE INDEX idx_elements_diagram_id ON elements(diagram_id);
CREATE INDEX idx_elements_type ON elements(type);
CREATE INDEX idx_relationships_source_target ON relationships(source_id, target_id);

-- JSONB 索引 (PostgreSQL)
CREATE INDEX idx_elements_data_gin ON elements USING GIN (data);

-- 分区表 (按时间分区)
CREATE TABLE diagrams (
  id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL,
  -- ... 其他字段
) PARTITION BY RANGE (created_at);

CREATE TABLE diagrams_2025 PARTITION OF diagrams
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- 物化视图 (加速复杂查询)
CREATE MATERIALIZED VIEW project_statistics AS
SELECT
  p.id AS project_id,
  COUNT(DISTINCT d.id) AS diagram_count,
  COUNT(DISTINCT e.id) AS element_count,
  MAX(d.updated_at) AS last_updated
FROM projects p
LEFT JOIN diagrams d ON d.project_id = p.id
LEFT JOIN elements e ON e.diagram_id = d.id
GROUP BY p.id;

CREATE UNIQUE INDEX ON project_statistics (project_id);

-- 定期刷新
REFRESH MATERIALIZED VIEW CONCURRENTLY project_statistics;
```

#### 查询优化

```typescript
class QueryOptimizer {
  // N+1 查询优化 - 使用 DataLoader
  private diagramLoader = new DataLoader<string, Diagram>(
    async (ids: readonly string[]) => {
      const diagrams = await db.query(
        'SELECT * FROM diagrams WHERE id = ANY($1)',
        [ids]
      )
      return ids.map(id => diagrams.find(d => d.id === id))
    },
    { cache: true, maxBatchSize: 100 }
  )

  // 批量查询
  async getDiagramsWithElements(diagramIds: string[]): Promise<DiagramWithElements[]> {
    // 一次查询获取所有数据
    const result = await db.query(`
      SELECT
        d.*,
        json_agg(e.*) as elements
      FROM diagrams d
      LEFT JOIN elements e ON e.diagram_id = d.id
      WHERE d.id = ANY($1)
      GROUP BY d.id
    `, [diagramIds])

    return result.rows
  }

  // 分页优化 - 游标分页
  async getCursorPaginatedElements(
    diagramId: string,
    cursor: string | null,
    limit: number
  ): Promise<PaginatedResult<Element>> {
    const query = cursor
      ? 'SELECT * FROM elements WHERE diagram_id = $1 AND id > $2 ORDER BY id LIMIT $3'
      : 'SELECT * FROM elements WHERE diagram_id = $1 ORDER BY id LIMIT $2'

    const params = cursor ? [diagramId, cursor, limit] : [diagramId, limit]
    const elements = await db.query(query, params)

    return {
      data: elements.rows,
      nextCursor: elements.rows.length === limit
        ? elements.rows[elements.rows.length - 1].id
        : null
    }
  }
}
```

#### 缓存架构

```typescript
class CacheArchitecture {
  // Redis 缓存策略
  private redis: RedisClient

  // 1. 查询结果缓存
  async getCachedDiagram(diagramId: string): Promise<Diagram | null> {
    const cacheKey = `diagram:${diagramId}`
    const cached = await this.redis.get(cacheKey)

    if (cached) {
      return JSON.parse(cached)
    }

    const diagram = await db.getDiagram(diagramId)
    if (diagram) {
      await this.redis.setex(cacheKey, 3600, JSON.stringify(diagram))
    }

    return diagram
  }

  // 2. 会话缓存
  async getCachedSession(sessionId: string): Promise<Session | null> {
    return await this.redis.hgetall(`session:${sessionId}`)
  }

  // 3. 分布式锁
  async acquireLock(key: string, ttl: number = 10): Promise<boolean> {
    const lockKey = `lock:${key}`
    const acquired = await this.redis.set(lockKey, '1', 'EX', ttl, 'NX')
    return acquired === 'OK'
  }

  async releaseLock(key: string): Promise<void> {
    await this.redis.del(`lock:${key}`)
  }

  // 4. 缓存预热
  async warmupCache(projectId: string): Promise<void> {
    const diagrams = await db.getDiagramsByProject(projectId)

    await Promise.all(diagrams.map(async (diagram) => {
      const cacheKey = `diagram:${diagram.id}`
      await this.redis.setex(cacheKey, 3600, JSON.stringify(diagram))
    }))
  }

  // 5. 缓存失效策略
  async invalidateCache(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }
}
```

#### 并发控制

```typescript
class ConcurrencyControl {
  // 乐观锁
  async updateWithOptimisticLock(
    diagramId: string,
    updates: Partial<Diagram>,
    expectedVersion: number
  ): Promise<Diagram> {
    const result = await db.query(`
      UPDATE diagrams
      SET
        data = $1,
        version = version + 1,
        updated_at = NOW()
      WHERE id = $2 AND version = $3
      RETURNING *
    `, [updates.data, diagramId, expectedVersion])

    if (result.rows.length === 0) {
      throw new OptimisticLockError('版本冲突，请刷新后重试')
    }

    return result.rows[0]
  }

  // 悲观锁
  async updateWithPessimisticLock(
    diagramId: string,
    updates: Partial<Diagram>
  ): Promise<Diagram> {
    return await db.transaction(async (trx) => {
      // 行级锁
      const locked = await trx.query(
        'SELECT * FROM diagrams WHERE id = $1 FOR UPDATE',
        [diagramId]
      )

      const updated = await trx.query(`
        UPDATE diagrams
        SET data = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [updates.data, diagramId])

      return updated.rows[0]
    })
  }

  // 分布式锁
  async executeWithDistributedLock<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const lock = await this.acquireLock(key)
    if (!lock) {
      throw new Error('无法获取锁')
    }

    try {
      return await operation()
    }
    finally {
      await this.releaseLock(key)
    }
  }
}
```

### 📊 负载均衡

#### 服务负载均衡

```yaml
# Nginx 配置
upstream backend {
  least_conn;  # 最少连接算法

  server backend1:8080 weight=3 max_fails=3 fail_timeout=30s;
  server backend2:8080 weight=2 max_fails=3 fail_timeout=30s;
  server backend3:8080 weight=1 max_fails=3 fail_timeout=30s;

  # 健康检查
  check interval=3000 rise=2 fall=3 timeout=1000;
}

server {
  listen 80;

  location /api/ {
    proxy_pass http://backend;
    proxy_next_upstream error timeout http_500 http_502 http_503;

    # 连接池
    proxy_http_version 1.1;
    proxy_set_header Connection "";

    # 缓存
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
  }
}
```

#### WebSocket 负载均衡

```typescript
class WebSocketLoadBalancer {
  // 基于用户会话的粘性路由
  private sessionMap = new Map<string, string>() // sessionId -> serverId

  getServerForSession(sessionId: string): string {
    // 检查是否已有绑定
    if (this.sessionMap.has(sessionId)) {
      return this.sessionMap.get(sessionId)!
    }

    // 选择负载最小的服务器
    const server = this.selectLeastLoadedServer()
    this.sessionMap.set(sessionId, server)

    return server
  }

  private selectLeastLoadedServer(): string {
    // 实现负载评估逻辑
    const servers = this.getServerStats()
    return servers.reduce((min, server) =>
      server.connections < min.connections ? server : min
    ).id
  }
}
```

---

## 监控体系

### 📈 可观测性架构

```
监控体系
├── 日志系统 (ELK Stack)
│   ├── Elasticsearch (日志存储)
│   ├── Logstash (日志处理)
│   ├── Kibana (可视化)
│   └── Filebeat (日志收集)
│
├── 指标监控 (Prometheus + Grafana)
│   ├── 应用指标 (JVM、请求、错误率)
│   ├── 系统指标 (CPU、内存、磁盘)
│   ├── 业务指标 (用户数、项目数)
│   └── 告警规则 (AlertManager)
│
├── 链路追踪 (Jaeger)
│   ├── 请求追踪
│   ├── 性能分析
│   ├── 依赖分析
│   └── 错误定位
│
└── APM (Application Performance Monitoring)
    ├── New Relic / Datadog
    ├── 用户体验监控
    ├── 实时性能监控
    └── 智能告警
```

### 📊 监控指标

#### 应用层指标

```typescript
class MetricsCollector {
  // 请求指标
  private requestMetrics = {
    totalRequests: new Counter('http_requests_total'),
    requestDuration: new Histogram('http_request_duration_seconds'),
    requestErrors: new Counter('http_request_errors_total')
  }

  // 业务指标
  private businessMetrics = {
    activeUsers: new Gauge('active_users'),
    diagramCreated: new Counter('diagrams_created_total'),
    collaborationSessions: new Gauge('collaboration_sessions_active'),
    validationErrors: new Counter('validation_errors_total')
  }

  // 系统指标
  private systemMetrics = {
    cpuUsage: new Gauge('system_cpu_usage'),
    memoryUsage: new Gauge('system_memory_usage'),
    dbConnections: new Gauge('db_connections_active'),
    cacheHitRate: new Gauge('cache_hit_rate')
  }

  // 自定义指标
  recordRequest(method: string, path: string, status: number, duration: number): void {
    this.requestMetrics.totalRequests.inc({ method, path, status })
    this.requestMetrics.requestDuration.observe({ method, path }, duration)

    if (status >= 400) {
      this.requestMetrics.requestErrors.inc({ method, path, status })
    }
  }

  recordBusinessEvent(event: BusinessEvent): void {
    switch (event.type) {
      case 'diagram_created':
        this.businessMetrics.diagramCreated.inc()
        break
      case 'user_online':
        this.businessMetrics.activeUsers.inc()
        break
      case 'collaboration_started':
        this.businessMetrics.collaborationSessions.inc()
        break
    }
  }
}
```

#### Prometheus 配置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: sysml-backend
    static_configs:
      - targets: ['backend1:8080', 'backend2:8080', 'backend3:8080']

  - job_name: sysml-database
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: sysml-redis
    static_configs:
      - targets: ['redis-exporter:9121']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - alerts.yml
```

#### 告警规则

```yaml
# alerts.yml
groups:
  - name: sysml_alerts
    interval: 30s
    rules:
      # 高错误率告警
      - alert: HighErrorRate
        expr: rate(http_request_errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: '高错误率: {{ $value | humanizePercentage }}'
          description: '服务 {{ $labels.instance }} 错误率超过 5%'

      # 响应时间告警
      - alert: HighLatency
        expr: histogram_quantile(0.99, http_request_duration_seconds) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'P99 延迟: {{ $value }}s'
          description: 服务响应时间过长

      # 数据库连接告警
      - alert: DatabaseConnectionsHigh
        expr: db_connections_active > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: '数据库连接数: {{ $value }}'
          description: 数据库连接数接近上限

      # 内存使用告警
      - alert: HighMemoryUsage
        expr: system_memory_usage > 0.85
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: '内存使用率: {{ $value | humanizePercentage }}'
          description: '系统内存使用率超过 85%'
```

### 🔍 链路追踪

```typescript
class DistributedTracing {
  // OpenTelemetry 集成
  private tracer = trace.getTracer('sysml-service')

  async traceDiagramOperation(operation: string, fn: () => Promise<any>): Promise<any> {
    const span = this.tracer.startSpan(operation, {
      attributes: {
        'service.name': 'modeling-service',
        'operation.type': 'diagram'
      }
    })

    try {
      const result = await fn()
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    }
    catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      })
      span.recordException(error)
      throw error
    }
    finally {
      span.end()
    }
  }

  // 自动追踪 HTTP 请求
  createHttpTracingMiddleware(): Middleware {
    return async (req, res, next) => {
      const span = this.tracer.startSpan(`HTTP ${req.method} ${req.path}`, {
        attributes: {
          'http.method': req.method,
          'http.url': req.url,
          'http.user_agent': req.headers['user-agent']
        }
      })

      // 传播 trace context
      const ctx = trace.setSpan(context.active(), span)

      res.on('finish', () => {
        span.setAttribute('http.status_code', res.statusCode)
        span.end()
      })

      await next()
    }
  }
}
```

### 📱 前端监控

```typescript
class FrontendMonitoring {
  // 性能监控
  collectPerformanceMetrics(): void {
    if (window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

      this.sendMetric('page_load_time', navigation.loadEventEnd - navigation.fetchStart)
      this.sendMetric('dom_ready_time', navigation.domContentLoadedEventEnd - navigation.fetchStart)
      this.sendMetric('first_paint', performance.getEntriesByName('first-paint')[0]?.startTime || 0)
    }
  }

  // 错误监控
  setupErrorTracking(): void {
    window.addEventListener('error', (event) => {
      this.reportError({
        type: 'javascript_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        type: 'unhandled_promise_rejection',
        reason: event.reason
      })
    })
  }

  // 用户行为追踪
  trackUserAction(action: string, properties?: Record<string, any>): void {
    this.sendEvent('user_action', {
      action,
      timestamp: Date.now(),
      url: window.location.href,
      ...properties
    })
  }

  // 资源加载监控
  monitorResourceLoading(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming

          if (resource.duration > 3000) {
            this.reportSlowResource({
              url: resource.name,
              duration: resource.duration,
              size: resource.transferSize
            })
          }
        }
      }
    })

    observer.observe({ entryTypes: ['resource'] })
  }
}
```

---

## 测试架构

### 🧪 测试金字塔

```
测试金字塔
├── E2E 测试 (5%)
│   ├── Playwright / Cypress
│   ├── 关键业务流程
│   └── 跨浏览器测试
│
├── 集成测试 (20%)
│   ├── API 测试
│   ├── 数据库测试
│   └── 服务间测试
│
└── 单元测试 (75%)
    ├── 前端单元测试 (Vitest)
    ├── 后端单元测试 (JUnit)
    └── 覆盖率目标: 80%+
```

### 🎯 单元测试

#### 前端单元测试

```typescript
// tests/unit/DiagramEditor.spec.ts
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import DiagramEditor from '@/components/DiagramEditor.vue'

describe('DiagramEditor', () => {
  it('应该正确渲染画布', () => {
    const wrapper = mount(DiagramEditor, {
      props: {
        diagramId: 'test-diagram'
      }
    })

    expect(wrapper.find('.diagram-canvas').exists()).toBe(true)
  })

  it('应该处理元素创建', async () => {
    const wrapper = mount(DiagramEditor)
    const createSpy = vi.spyOn(wrapper.vm, 'createElement')

    await wrapper.vm.createElement({ type: 'class', position: { x: 100, y: 100 } })

    expect(createSpy).toHaveBeenCalled()
    expect(wrapper.vm.elements).toHaveLength(1)
  })

  it('应该支持撤销重做', async () => {
    const wrapper = mount(DiagramEditor)

    // 创建元素
    await wrapper.vm.createElement({ type: 'class' })
    expect(wrapper.vm.elements).toHaveLength(1)

    // 撤销
    await wrapper.vm.undo()
    expect(wrapper.vm.elements).toHaveLength(0)

    // 重做
    await wrapper.vm.redo()
    expect(wrapper.vm.elements).toHaveLength(1)
  })
})
```

#### 后端单元测试

```java
// src/test/java/com/sysml/service/DiagramServiceTest.java
@SpringBootTest
public class DiagramServiceTest {
    @Autowired
    private DiagramService diagramService;

    @MockBean
    private DiagramRepository diagramRepository;

    @Test
    public void testCreateDiagram() {
        // Arrange
        CreateDiagramRequest request = new CreateDiagramRequest();
        request.setName("Test Diagram");
        request.setType(DiagramType.CLASS);

        Diagram expected = new Diagram();
        expected.setId(UUID.randomUUID());
        expected.setName("Test Diagram");

        when(diagramRepository.save(any())).thenReturn(expected);

        // Act
        Diagram result = diagramService.createDiagram(request);

        // Assert
        assertNotNull(result.getId());
        assertEquals("Test Diagram", result.getName());
        verify(diagramRepository, times(1)).save(any());
    }

    @Test
    public void testValidateDiagram() {
        // Arrange
        Diagram diagram = createTestDiagram();

        // Act
        ValidationResult result = diagramService.validate(diagram);

        // Assert
        assertTrue(result.isValid());
        assertEquals(0, result.getErrors().size());
    }
}
```

### 🔗 集成测试

```typescript
import request from 'supertest'
// tests/integration/api.spec.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '@/server'

describe('API Integration Tests', () => {
  let authToken: string
  let projectId: string

  beforeAll(async () => {
    // 登录获取 token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'testpass' })

    authToken = loginRes.body.token
  })

  describe('Project API', () => {
    it('应该创建项目', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Project', description: 'Test' })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('id')
      projectId = res.body.id
    })

    it('应该获取项目列表', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toBeInstanceOf(Array)
    })
  })

  describe('Diagram API', () => {
    it('应该在项目中创建图表', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/diagrams`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Diagram', type: 'class' })

      expect(res.status).toBe(201)
      expect(res.body.projectId).toBe(projectId)
    })
  })

  afterAll(async () => {
    // 清理测试数据
    await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${authToken}`)
  })
})
```

### 🎭 E2E 测试

```typescript
// tests/e2e/modeling.spec.ts
import { expect, test } from '@playwright/test'

test.describe('建模工作流', () => {
  test('完整的建模流程', async ({ page }) => {
    // 1. 登录
    await page.goto('http://localhost:3000/login')
    await page.fill('[data-testid="username"]', 'testuser')
    await page.fill('[data-testid="password"]', 'testpass')
    await page.click('[data-testid="login-button"]')

    await expect(page).toHaveURL('/dashboard')

    // 2. 创建项目
    await page.click('[data-testid="create-project"]')
    await page.fill('[data-testid="project-name"]', 'E2E Test Project')
    await page.click('[data-testid="confirm-create"]')

    await expect(page.locator('[data-testid="project-card"]')).toBeVisible()

    // 3. 创建图表
    await page.click('[data-testid="project-card"]')
    await page.click('[data-testid="new-diagram"]')
    await page.selectOption('[data-testid="diagram-type"]', 'class')
    await page.fill('[data-testid="diagram-name"]', 'Class Diagram')
    await page.click('[data-testid="create-diagram"]')

    // 4. 添加元素
    await page.click('[data-testid="element-palette-class"]')
    await page.click('.diagram-canvas', { position: { x: 200, y: 200 } })

    await expect(page.locator('.sysml-class-node')).toBeVisible()

    // 5. 编辑元素属性
    await page.click('.sysml-class-node')
    await page.fill('[data-testid="property-name"]', 'Car')
    await page.click('[data-testid="add-attribute"]')
    await page.fill('[data-testid="attribute-name"]', 'brand')
    await page.fill('[data-testid="attribute-type"]', 'String')

    // 6. 保存
    await page.click('[data-testid="save-diagram"]')

    await expect(page.locator('[data-testid="save-success"]')).toBeVisible()
  })

  test('协作编辑', async ({ browser }) => {
    // 创建两个浏览器上下文模拟多用户
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    // 用户1 登录并打开图表
    await page1.goto('http://localhost:3000/login')
    await page1.fill('[data-testid="username"]', 'user1')
    await page1.fill('[data-testid="password"]', 'pass1')
    await page1.click('[data-testid="login-button"]')
    await page1.goto('/diagram/test-diagram')

    // 用户2 登录并加入协作
    await page2.goto('http://localhost:3000/login')
    await page2.fill('[data-testid="username"]', 'user2')
    await page2.fill('[data-testid="password"]', 'pass2')
    await page2.click('[data-testid="login-button"]')
    await page2.goto('/diagram/test-diagram')

    // 验证协作指示器
    await expect(page1.locator('[data-testid="online-user-user2"]')).toBeVisible()
    await expect(page2.locator('[data-testid="online-user-user1"]')).toBeVisible()

    // 用户1 创建元素
    await page1.click('[data-testid="element-palette-class"]')
    await page1.click('.diagram-canvas', { position: { x: 100, y: 100 } })

    // 验证用户2 能看到新元素
    await expect(page2.locator('.sysml-class-node')).toBeVisible()
  })
})
```

### 📊 性能测试

```typescript
// tests/performance/load-test.ts
import autocannon from 'autocannon'

async function runLoadTest() {
  const result = await autocannon({
    url: 'http://localhost:8080',
    connections: 100,
    duration: 60,
    requests: [
      {
        method: 'GET',
        path: '/api/projects'
      },
      {
        method: 'GET',
        path: '/api/diagrams/test-diagram'
      },
      {
        method: 'POST',
        path: '/api/elements',
        body: JSON.stringify({ type: 'class', name: 'TestClass' }),
        headers: {
          'Content-Type': 'application/json'
        }
      }
    ]
  })

  console.log('负载测试结果:')
  console.log(`平均请求/秒: ${result.requests.average}`)
  console.log(`平均延迟: ${result.latency.mean}ms`)
  console.log(`P99 延迟: ${result.latency.p99}ms`)
  console.log(`错误率: ${(result.errors / result.requests.total * 100).toFixed(2)}%`)
}

runLoadTest()
```

---

## 灾难恢复

### 💾 备份策略

#### 数据备份

```bash
#!/bin/bash
# backup.sh - 数据库备份脚本

BACKUP_DIR="/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="sysml"

# 1. 全量备份
pg_dump -h localhost -U sysml -F c -b -v -f "${BACKUP_DIR}/full_${DATE}.dump" ${DB_NAME}

# 2. 增量备份 (WAL 归档)
pg_basebackup -h localhost -U replication -D "${BACKUP_DIR}/wal_${DATE}" -Ft -z -P

# 3. 上传到云存储
aws s3 cp "${BACKUP_DIR}/full_${DATE}.dump" s3://sysml-backups/postgresql/

# 4. 清理旧备份 (保留30天)
find ${BACKUP_DIR} -name "*.dump" -mtime +30 -delete

# 5. 备份验证
pg_restore --list "${BACKUP_DIR}/full_${DATE}.dump" > /dev/null
if [ $? -eq 0 ]; then
  echo "备份验证成功"
else
  echo "备份验证失败!" | mail -s "备份失败告警" admin@example.com
fi
```

#### 应用状态备份

```typescript
class StateBackup {
  // 定期备份应用状态
  async backupApplicationState(): Promise<void> {
    const state = {
      timestamp: Date.now(),
      activeSessions: await this.getActiveSessions(),
      collaborationStates: await this.getCollaborationStates(),
      cacheSnapshots: await this.getCacheSnapshots()
    }

    // 写入持久化存储
    await this.saveToStorage('state-backup', state)

    // 上传到对象存储
    await this.uploadToS3('state-backups', state)
  }

  // 恢复应用状态
  async restoreApplicationState(timestamp: number): Promise<void> {
    const backup = await this.loadBackup(timestamp)

    // 恢复会话
    for (const session of backup.activeSessions) {
      await this.restoreSession(session)
    }

    // 恢复协作状态
    for (const collab of backup.collaborationStates) {
      await this.restoreCollaboration(collab)
    }
  }
}
```

### 🔄 高可用架构

#### 数据库高可用

```yaml
# PostgreSQL 主从复制 + Patroni
patroni:
  scope: sysml-cluster
  namespace: /service/
  name: postgresql-1

postgresql:
  listen: 0.0.0.0:5432
  connect_address: postgresql-1:5432
  data_dir: /var/lib/postgresql/data

  authentication:
    replication:
      username: replicator
      password: repl-password
    superuser:
      username: postgres
      password: super-password

  parameters:
    max_connections: 200
    shared_buffers: 256MB
    wal_level: replica
    max_wal_senders: 10
    hot_standby: on

  # 自动故障转移
  failover:
    mode: automatic
    maximum_lag_on_failover: 1048576
```

#### 服务高可用

```typescript
class HighAvailability {
  // 健康检查
  async healthCheck(): Promise<HealthStatus> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkDiskSpace(),
      this.checkMemory()
    ])

    const healthy = checks.every(check => check.status === 'healthy')

    return {
      status: healthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: Date.now()
    }
  }

  // 优雅降级
  async gracefulDegradation(): Promise<void> {
    // 检测服务状态
    const health = await this.healthCheck()

    if (health.status === 'unhealthy') {
      // 启用降级模式
      this.enableDegradedMode()

      // 限制功能
      this.disableNonCriticalFeatures()

      // 通知用户
      this.notifyUsers('系统进入降级模式，部分功能暂时不可用')
    }
  }

  // 断路器模式
  private circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 3000,
    resetTimeout: 30000,

    onOpen: () => {
      console.log('断路器打开，服务降级')
      this.enableFallback()
    },

    onClose: () => {
      console.log('断路器关闭，服务恢复')
      this.disableFallback()
    }
  })
}
```

### 🚨 故障恢复流程

```typescript
class DisasterRecovery {
  // 故障检测
  async detectFailure(): Promise<FailureType | null> {
    const checks = {
      database: await this.checkDatabaseConnection(),
      redis: await this.checkRedisConnection(),
      fileSystem: await this.checkFileSystemHealth(),
      network: await this.checkNetworkConnectivity()
    }

    for (const [component, status] of Object.entries(checks)) {
      if (!status.healthy) {
        return {
          component,
          severity: status.severity,
          message: status.message
        }
      }
    }

    return null
  }

  // 自动恢复
  async autoRecover(failure: FailureType): Promise<boolean> {
    console.log(`检测到故障: ${failure.component}`)

    switch (failure.component) {
      case 'database':
        return await this.recoverDatabase()

      case 'redis':
        return await this.recoverRedis()

      case 'fileSystem':
        return await this.recoverFileSystem()

      default:
        return false
    }
  }

  // 数据库恢复
  private async recoverDatabase(): Promise<boolean> {
    try {
      // 1. 尝试重连
      await this.reconnectDatabase()

      // 2. 验证连接
      const isHealthy = await this.verifyDatabaseHealth()
      if (isHealthy)
        return true

      // 3. 故障转移到从库
      await this.failoverToSlave()

      // 4. 通知管理员
      this.notifyAdmins('数据库已故障转移到从库')

      return true
    }
    catch (error) {
      console.error('数据库恢复失败:', error)
      return false
    }
  }

  // 灾难恢复演练
  async runDRDrill(): Promise<DRDrillReport> {
    const startTime = Date.now()
    const steps: DRStep[] = []

    try {
      // 1. 模拟故障
      steps.push(await this.simulateFailure())

      // 2. 检测故障
      steps.push(await this.testFailureDetection())

      // 3. 自动恢复
      steps.push(await this.testAutoRecovery())

      // 4. 数据完整性验证
      steps.push(await this.verifyDataIntegrity())

      // 5. 恢复正常
      steps.push(await this.restoreNormalOperation())

      return {
        success: true,
        duration: Date.now() - startTime,
        steps
      }
    }
    catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        steps,
        error: error.message
      }
    }
  }
}
```

---

## 开发流程

### 👨‍💻 开发规范

#### Git 工作流

```
main (生产)
├── develop (开发)
│   ├── feature/diagram-editor (功能分支)
│   ├── feature/collaboration (功能分支)
│   └── feature/validation (功能分支)
├── release/v1.0.0 (发布分支)
└── hotfix/security-patch (热修复分支)
```

#### 提交规范

```bash
# Conventional Commits
<type>(<scope>): <subject>

<body>

<footer>

# 类型
feat:     新功能
fix:      修复 bug
docs:     文档变更
style:    代码格式
refactor: 重构
perf:     性能优化
test:     测试
chore:    构建/工具变更

# 示例
feat(diagram): 添加类图自动布局功能

实现了基于力导向图的自动布局算法，支持:
- 节点自动排列
- 边的智能路由
- 交互式调整

Closes #123
```

#### 代码审查检查清单

```markdown
## Code Review Checklist

### 功能性
- [ ] 功能是否按需求实现
- [ ] 边界条件是否处理
- [ ] 错误处理是否完善
- [ ] 单元测试是否覆盖

### 代码质量
- [ ] 代码是否符合规范
- [ ] 变量命名是否清晰
- [ ] 是否有重复代码
- [ ] 注释是否充分

### 性能
- [ ] 是否有性能问题
- [ ] 数据库查询是否优化
- [ ] 是否有内存泄漏风险

### 安全性
- [ ] 输入验证是否完善
- [ ] SQL 注入防护
- [ ] XSS 防护
- [ ] 敏感数据是否加密

### 可维护性
- [ ] 代码结构是否清晰
- [ ] 是否易于扩展
- [ ] 文档是否更新
```

### 🚀 CI/CD 流程

#### GitHub Actions 配置

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # 代码检查
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  # 单元测试
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  # 集成测试
  integration-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: sysml_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration

  # E2E 测试
  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e

  # 构建
  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: build
          path: dist/

  # 构建 Docker 镜像
  docker-build:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest

  # 部署到测试环境
  deploy-staging:
    needs: docker-build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Deploy to Staging
        run: |
          kubectl set image deployment/sysml-app \
            app=ghcr.io/${{ github.repository }}:${{ github.sha }} \
            --namespace=staging

  # 部署到生产环境
  deploy-production:
    needs: docker-build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://sysml.example.com
    steps:
      - name: Deploy to Production
        run: |
          kubectl set image deployment/sysml-app \
            app=ghcr.io/${{ github.repository }}:${{ github.sha }} \
            --namespace=production
      - name: Verify Deployment
        run: |
          kubectl rollout status deployment/sysml-app \
            --namespace=production
```

### 📦 发布流程

```bash
#!/bin/bash
# release.sh - 发布脚本

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "请指定版本号: ./release.sh v1.0.0"
  exit 1
fi

echo "开始发布 ${VERSION}..."

# 1. 确保在 develop 分支
git checkout develop
git pull origin develop

# 2. 运行所有测试
npm run test:all
if [ $? -ne 0 ]; then
  echo "测试失败，发布中止"
  exit 1
fi

# 3. 创建发布分支
git checkout -b release/${VERSION}

# 4. 更新版本号
npm version ${VERSION} --no-git-tag-version

# 5. 生成 CHANGELOG
npm run changelog

# 6. 提交变更
git add .
git commit -m "chore(release): ${VERSION}"

# 7. 合并到 main
git checkout main
git merge release/${VERSION}
git tag -a ${VERSION} -m "Release ${VERSION}"

# 8. 推送到远程
git push origin main --tags

# 9. 合并回 develop
git checkout develop
git merge release/${VERSION}
git push origin develop

# 10. 删除发布分支
git branch -d release/${VERSION}

echo "发布完成: ${VERSION}"
```

这个架构设计既满足了 SysML v2 建模的复杂需求，又保证了系统的可扩展性、可维护性和企业级特性。
