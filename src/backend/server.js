const express = require('express');
const config = require('config');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

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
app.use(express.json()); // JSON解析
app.use(express.urlencoded({ extended: true })); // URL编码解析
app.use(morgan(loggingConfig.format, { 
  stream: fs.createWriteStream(loggingConfig.file, { flags: 'a' }) 
})); // 日志

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

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      message: '服务器内部错误',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    }
  });
});

// 启动服务器
const PORT = process.env.PORT || serverConfig.port;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://${serverConfig.host}:${PORT}`);
  console.log(`API前缀: ${serverConfig.apiPrefix}`);
  console.log(`环境: ${config.get('system.environment')}`);
  
  // 显示启用的功能
  console.log('启用的功能:');
  console.log(`- 第一阶段功能: ${featuresConfig.phase1.enabled ? '是' : '否'}`);
  console.log(`- 第二阶段功能: ${featuresConfig.phase2.enabled ? '是' : '否'}`);
  console.log(`- 第三阶段功能: ${featuresConfig.phase3.enabled ? '是' : '否'}`);
});

module.exports = app; // 导出供测试使用