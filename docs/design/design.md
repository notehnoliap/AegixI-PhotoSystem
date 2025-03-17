# 智能照片备份系统设计文档

## 1. 设计概述

本文档详细描述智能照片备份系统的设计细节，包括组件设计、数据模型、接口设计和用户界面设计。

## 2. 组件设计

### 2.1 后端组件

#### 2.1.1 用户服务

**职责**：
- 用户注册和认证
- 用户配置管理
- 权限控制

**主要类**：
```
- UserService: 用户管理的核心服务
- AuthService: 认证和授权服务
- UserRepository: 用户数据访问层
- UserController: 用户API控制器
```

**关键算法**：
- 密码哈希和验证
- JWT令牌生成和验证
- 权限检查

#### 2.1.2 照片服务

**职责**：
- 照片上传和存储
- 缩略图生成
- 元数据提取
- 照片管理（删除、组织）

**主要类**：
```
- PhotoService: 照片管理的核心服务
- ThumbnailService: 缩略图处理服务
- MetadataService: 元数据提取服务
- StorageService: 存储接口
- PhotoRepository: 照片数据访问层
- PhotoController: 照片API控制器
```

**关键算法**：
- 图像缩放和处理
- 元数据提取和解析
- 存储优化

#### 2.1.3 AI服务

**职责**：
- 照片内容分析
- 描述生成
- 自然语言处理

**主要类**：
```
- AIService: AI功能的核心服务
- ImageAnalysisService: 图像分析服务
- DescriptionService: 描述生成服务
- NLPService: 自然语言处理服务
- ModelManager: AI模型管理
- AIController: AI API控制器
```

**关键算法**：
- 图像识别和分类
- 文本生成
- 自然语言理解
- 模型选择（本地/远程）

#### 2.1.4 代理服务

**职责**：
- AI代理管理
- 用户行为学习
- 代理间通信

**主要类**：
```
- AgentService: 代理管理的核心服务
- AgentFactory: 代理创建工厂
- BehaviorLearningService: 行为学习服务
- CommunicationService: 代理间通信服务
- AgentRepository: 代理数据访问层
- AgentController: 代理API控制器
```

**关键算法**：
- 用户行为模式识别
- 代理状态管理
- 安全通信协议

#### 2.1.5 搜索服务

**职责**：
- 照片索引
- 文本搜索
- 自然语言查询解析

**主要类**：
```
- SearchService: 搜索的核心服务
- IndexService: 索引管理服务
- QueryParserService: 查询解析服务
- SearchRepository: 搜索数据访问层
- SearchController: 搜索API控制器
```

**关键算法**：
- 全文搜索
- 语义搜索
- 查询优化

### 2.2 前端组件

#### 2.2.1 Web界面

**主要组件**：
```
- App: 应用根组件
- AuthModule: 认证相关组件
- PhotoGallery: 照片浏览组件
- UploadComponent: 照片上传组件
- SearchBar: 搜索组件
- NaturalLanguageInput: 自然语言输入组件
- PhotoDetail: 照片详情组件
- UserSettings: 用户设置组件
```

**状态管理**：
- Redux/Context API
- 本地缓存

#### 2.2.2 移动应用

**主要组件**：
```
- App: 应用根组件
- AuthScreens: 认证相关屏幕
- GalleryScreen: 照片浏览屏幕
- CameraScreen: 相机和上传屏幕
- SearchScreen: 搜索屏幕
- SettingsScreen: 设置屏幕
```

**本地存储**：
- AsyncStorage/SQLite
- 离线队列

#### 2.2.3 管理员控制台

**主要组件**：
```
- AdminApp: 管理应用根组件
- Dashboard: 系统概览组件
- UserManagement: 用户管理组件
- SystemSettings: 系统设置组件
- LogViewer: 日志查看组件
- AIModelManagement: AI模型管理组件
```

**数据可视化**：
- 图表和统计
- 实时监控

## 3. 数据模型

### 3.1 用户模型

```json
{
  "id": "用户唯一标识符",
  "username": "用户名",
  "email": "电子邮件",
  "passwordHash": "密码哈希",
  "createdAt": "创建时间",
  "updatedAt": "更新时间",
  "settings": {
    "allowMetadataProcessing": "是否允许处理元数据",
    "thumbnailSize": "缩略图尺寸",
    "language": "界面语言",
    "theme": "界面主题"
  },
  "role": "用户角色"
}
```

### 3.2 照片模型

```json
{
  "id": "照片唯一标识符",
  "userId": "所属用户ID",
  "filename": "文件名",
  "path": "存储路径",
  "size": "文件大小",
  "mimeType": "MIME类型",
  "width": "宽度",
  "height": "高度",
  "createdAt": "创建时间",
  "uploadedAt": "上传时间",
  "metadata": {
    "camera": "相机型号",
    "location": "拍摄位置",
    "timestamp": "拍摄时间",
    "exposure": "曝光信息",
    "other": "其他元数据"
  },
  "aiDescription": "AI生成的描述",
  "tags": ["标签数组"],
  "isBlurry": "是否模糊",
  "quality": "质量评分"
}
```

### 3.3 代理模型

```json
{
  "id": "代理唯一标识符",
  "userId": "所属用户ID",
  "createdAt": "创建时间",
  "updatedAt": "更新时间",
  "state": "代理状态",
  "memory": {
    "userPreferences": "用户偏好",
    "interactions": ["交互历史"],
    "knownEntities": ["已知实体"]
  },
  "permissions": ["权限列表"]
}
```

### 3.4 配置模型

```json
{
  "system": {
    "thumbnailSize": "默认缩略图尺寸",
    "storageLocation": "存储位置",
    "maxUploadSize": "最大上传大小",
    "supportedFormats": ["支持的格式"]
  },
  "ai": {
    "localModel": "本地模型配置",
    "remoteModel": "远程模型配置",
    "threshold": "模型切换阈值"
  },
  "security": {
    "tokenExpiration": "令牌过期时间",
    "passwordPolicy": "密码策略",
    "rateLimits": "速率限制"
  }
}
```

## 4. 接口设计

### 4.1 RESTful API

#### 用户API

- `POST /api/users` - 创建用户
- `GET /api/users/:id` - 获取用户信息
- `PUT /api/users/:id` - 更新用户信息
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出

#### 照片API

- `POST /api/photos` - 上传照片
- `GET /api/photos` - 获取照片列表
- `GET /api/photos/:id` - 获取照片详情
- `DELETE /api/photos/:id` - 删除照片
- `POST /api/photos/batch` - 批量操作照片

#### AI API

- `POST /api/ai/analyze` - 分析照片
- `POST /api/ai/describe` - 生成照片描述
- `POST /api/ai/query` - 处理自然语言查询

#### 代理API

- `GET /api/agents/:userId` - 获取用户代理
- `POST /api/agents/:userId/query` - 向代理发送查询
- `POST /api/agents/:userId/communicate` - 代理间通信

#### 搜索API

- `POST /api/search` - 搜索照片
- `POST /api/search/natural` - 自然语言搜索

### 4.2 WebSocket API

- `/ws/notifications` - 实时通知
- `/ws/upload-progress` - 上传进度
- `/ws/agent-communication` - 代理通信

## 5. 用户界面设计

### 5.1 Web界面

#### 主要页面

- 登录/注册页面
- 照片库页面
- 照片上传页面
- 照片详情页面
- 搜索结果页面
- 用户设置页面

#### 交互设计

- 拖放上传
- 无限滚动照片库
- 自然语言搜索框
- 照片预览和编辑
- 批量操作

### 5.2 移动应用

#### 主要页面

- 登录/注册页面
- 照片库页面
- 相机/上传页面
- 照片详情页面
- 搜索页面
- 设置页面

#### 交互设计

- 相机集成
- 下拉刷新
- 手势操作
- 离线模式
- 推送通知

### 5.3 管理员控制台

#### 主要页面

- 登录页面
- 仪表板页面
- 用户管理页面
- 系统设置页面
- 日志查看页面
- AI模型管理页面

#### 交互设计

- 数据可视化
- 批量操作
- 高级搜索
- 实时监控

## 6. 安全设计

### 6.1 认证和授权

- JWT基于令牌的认证
- 基于角色的访问控制
- 多因素认证（可选）

### 6.2 数据安全

- 传输加密（HTTPS/TLS）
- 存储加密
- 敏感数据脱敏

### 6.3 隐私保护

- 用户数据隔离
- 代理权限控制
- 元数据处理选项

## 7. 错误处理

### 7.1 错误类型

- 验证错误
- 业务逻辑错误
- 系统错误
- 网络错误

### 7.2 错误响应

- 统一错误格式
- 错误代码和消息
- 详细错误信息（开发环境）

### 7.3 错误恢复

- 自动重试机制
- 回滚操作
- 错误日志和监控

## 8. 性能优化

### 8.1 缓存策略

- 内存缓存
- Redis缓存
- CDN缓存

### 8.2 数据库优化

- 索引优化
- 查询优化
- 连接池管理

### 8.3 前端优化

- 懒加载
- 代码分割
- 资源压缩

## 9. 开发阶段设计

### 9.1 第一阶段

- 基本照片上传和存储
- 简单的Web界面
- 基本的用户认证

### 9.2 第二阶段

- AI模型集成
- 移动应用开发
- 自然语言搜索

### 9.3 第三阶段

- AI代理系统
- 代理间通信
- 高级功能完善