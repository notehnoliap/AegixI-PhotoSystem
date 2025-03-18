const express = require('express');
const config = require('config');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const http = require('http');
const WebSocket = require('ws');

// 创建Express应用
const app = express();

// 获取配置
const serverConfig = config.get('server');
const loggingConfig = config.get('logging');
const featuresConfig = config.get('features');

// 确保日志目录存在
const logDir = path.dirname(loggingConfig.file);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 确保存储目录存在
const storageConfig = config.get('storage');
if (!fs.existsSync(storageConfig.basePath)) {
  fs.mkdirSync(storageConfig.basePath, { recursive: true });
}
if (!fs.existsSync(storageConfig.thumbnailPath)) {
  fs.mkdirSync(storageConfig.thumbnailPath, { recursive: true });
}

// 中间件
app.use(helmet()); // 安全头
app.use(cors(config.get('security.cors'))); // CORS
app.use(express.json({ limit: '50mb' })); // JSON解析
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // URL编码解析
app.use(morgan(loggingConfig.format, { 
  stream: fs.createWriteStream(loggingConfig.file, { flags: 'a' }) 
})); // 日志

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/thumbnails', express.static(path.join(__dirname, '../thumbnails')));

// API路由
app.use(`${serverConfig.apiPrefix}/users`, require('./api/routes/users'));
app.use(`${serverConfig.apiPrefix}/auth`, require('./api/routes/auth'));
app.use(`${serverConfig.apiPrefix}/photos`, require('./api/routes/photos'));

// 根据阶段启用不同的功能
if (featuresConfig.phase2.enabled || featuresConfig.phase3.enabled) {
  app.use(`${serverConfig.apiPrefix}/search`, require('./api/routes/search'));
  app.use(`${serverConfig.apiPrefix}/ai`, require('./api/routes/ai'));
}

if (featuresConfig.phase3.enabled) {
  app.use(`${serverConfig.apiPrefix}/agents`, require('./api/routes/agents'));
}

// 创建HTTP服务器
const server = http.createServer(app);

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 初始化WebSocket处理程序
const wsHandlers = require('./api/ws/websocket-handlers');
wsHandlers.initializeWebSocketServer(wss);

// 连接数据库
mongoose.connect(config.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false
})
.then(() => {
  console.log('MongoDB已连接');
  // 启动服务器
  server.listen(config.port, () => {
    console.log(`服务器运行在端口: ${config.port}`);
  });
})
.catch(err => {
  console.error('MongoDB连接错误:', err.message);
  process.exit(1);
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  // 记录错误并进行适当的清理
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  // 记录错误并进行适当的清理
});

module.exports = server;