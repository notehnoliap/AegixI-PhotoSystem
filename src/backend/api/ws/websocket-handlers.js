/**
 * WebSocket处理程序
 * 实现设计文档中定义的WebSocket接口
 */

const jwt = require('jsonwebtoken');
const config = require('../../../config/config');

// 存储活跃的WebSocket连接
const activeConnections = {
  notifications: new Map(), // userId -> websocket
  uploadProgress: new Map() // userId -> Map(uploadId -> websocket)
};

/**
 * 验证WebSocket连接的JWT令牌
 * @param {string} token - JWT令牌
 * @returns {Object|null} - 已验证的用户对象或null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    console.error('WebSocket令牌验证失败:', err.message);
    return null;
  }
}

/**
 * 初始化WebSocket服务
 * @param {Object} wss - WebSocket服务器实例
 */
function initializeWebSocketServer(wss) {
  wss.on('connection', (ws, req) => {
    // 解析URL路径
    const url = new URL(req.url, `http://${req.headers.host}`);
    const endpoint = url.pathname.split('/').pop();
    const token = url.searchParams.get('token');

    // 验证令牌
    const user = verifyToken(token);
    if (!user) {
      sendErrorAndClose(ws, '未授权', 4401);
      return;
    }

    // 根据不同端点设置处理程序
    switch (endpoint) {
      case 'notifications':
        handleNotificationsConnection(ws, user);
        break;
      case 'upload-progress':
        handleUploadProgressConnection(ws, user);
        break;
      default:
        sendErrorAndClose(ws, '未知端点', 4404);
    }
  });

  // 设置周期性检查，清理断开的连接
  setInterval(cleanupConnections, 60000); // 每分钟检查一次
}

/**
 * 处理通知WebSocket连接
 * @param {Object} ws - WebSocket连接对象
 * @param {Object} user - 已验证的用户对象
 */
function handleNotificationsConnection(ws, user) {
  console.log(`用户 ${user.id} 建立了通知WebSocket连接`);
  
  // 存储连接
  activeConnections.notifications.set(user.id, ws);
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'connection_established',
    message: '通知服务连接已建立',
    userId: user.id,
    timestamp: new Date()
  }));

  // 设置消息处理程序
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleNotificationMessage(ws, user, data);
    } catch (err) {
      console.error('无效的WebSocket消息格式:', err.message);
      ws.send(JSON.stringify({
        type: 'error',
        error: '无效的消息格式',
        message: '消息必须是有效的JSON格式'
      }));
    }
  });

  // 设置关闭处理程序
  ws.on('close', () => {
    console.log(`用户 ${user.id} 的通知WebSocket连接已关闭`);
    activeConnections.notifications.delete(user.id);
  });

  // 设置错误处理程序
  ws.on('error', (err) => {
    console.error(`用户 ${user.id} 的通知WebSocket错误:`, err.message);
  });
}

/**
 * 处理上传进度WebSocket连接
 * @param {Object} ws - WebSocket连接对象
 * @param {Object} user - 已验证的用户对象
 */
function handleUploadProgressConnection(ws, user) {
  console.log(`用户 ${user.id} 建立了上传进度WebSocket连接`);
  
  // 获取上传ID
  const url = new URL(ws.upgradeReq.url, `http://${ws.upgradeReq.headers.host}`);
  const uploadId = url.searchParams.get('uploadId');
  
  // 存储连接
  if (!activeConnections.uploadProgress.has(user.id)) {
    activeConnections.uploadProgress.set(user.id, new Map());
  }
  activeConnections.uploadProgress.get(user.id).set(uploadId, ws);
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'connection_established',
    message: '上传进度服务连接已建立',
    userId: user.id,
    uploadId: uploadId,
    timestamp: new Date()
  }));

  // 设置消息处理程序
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleUploadProgressMessage(ws, user, uploadId, data);
    } catch (err) {
      console.error('无效的WebSocket消息格式:', err.message);
      ws.send(JSON.stringify({
        type: 'error',
        error: '无效的消息格式',
        message: '消息必须是有效的JSON格式'
      }));
    }
  });

  // 设置关闭处理程序
  ws.on('close', () => {
    console.log(`用户 ${user.id} 的上传进度WebSocket连接已关闭`);
    if (activeConnections.uploadProgress.has(user.id)) {
      activeConnections.uploadProgress.get(user.id).delete(uploadId);
      if (activeConnections.uploadProgress.get(user.id).size === 0) {
        activeConnections.uploadProgress.delete(user.id);
      }
    }
  });

  // 设置错误处理程序
  ws.on('error', (err) => {
    console.error(`用户 ${user.id} 的上传进度WebSocket错误:`, err.message);
  });
}

/**
 * 处理通知WebSocket消息
 * @param {Object} ws - WebSocket连接对象
 * @param {Object} user - 已验证的用户对象
 * @param {Object} data - 消息数据
 */
function handleNotificationMessage(ws, user, data) {
  switch (data.action) {
    case 'subscribe':
      // 处理订阅请求
      if (data.channels && Array.isArray(data.channels)) {
        // TODO: 实现频道订阅逻辑
        ws.send(JSON.stringify({
          type: 'subscription_success',
          channels: data.channels,
          message: '成功订阅通知频道'
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          error: '无效的订阅请求',
          message: '缺少channels字段或格式不正确'
        }));
      }
      break;
      
    case 'acknowledge':
      // 处理通知确认
      if (data.notificationId) {
        // TODO: 实现通知确认逻辑
        ws.send(JSON.stringify({
          type: 'acknowledge_success',
          notificationId: data.notificationId
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          error: '无效的确认请求',
          message: '缺少notificationId字段'
        }));
      }
      break;
      
    case 'ping':
      // 心跳消息
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date()
      }));
      break;
      
    default:
      ws.send(JSON.stringify({
        type: 'error',
        error: '未知操作',
        message: `不支持的操作: ${data.action}`
      }));
  }
}

/**
 * 处理上传进度WebSocket消息
 * @param {Object} ws - WebSocket连接对象
 * @param {Object} user - 已验证的用户对象
 * @param {string} uploadId - 上传ID
 * @param {Object} data - 消息数据
 */
function handleUploadProgressMessage(ws, user, uploadId, data) {
  switch (data.action) {
    case 'cancel':
      // 处理取消上传请求
      // TODO: 实现取消上传逻辑
      ws.send(JSON.stringify({
        type: 'cancel_acknowledged',
        uploadId: uploadId,
        message: '上传取消请求已接收',
        timestamp: new Date()
      }));
      break;
      
    case 'pause':
      // 处理暂停上传请求
      // TODO: 实现暂停上传逻辑
      ws.send(JSON.stringify({
        type: 'pause_acknowledged',
        uploadId: uploadId,
        message: '上传暂停请求已接收',
        timestamp: new Date()
      }));
      break;
      
    case 'resume':
      // 处理恢复上传请求
      // TODO: 实现恢复上传逻辑
      ws.send(JSON.stringify({
        type: 'resume_acknowledged',
        uploadId: uploadId,
        message: '上传恢复请求已接收',
        timestamp: new Date()
      }));
      break;
      
    case 'ping':
      // 心跳消息
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date()
      }));
      break;
      
    default:
      ws.send(JSON.stringify({
        type: 'error',
        error: '未知操作',
        message: `不支持的操作: ${data.action}`
      }));
  }
}

/**
 * 发送错误消息并关闭WebSocket连接
 * @param {Object} ws - WebSocket连接对象
 * @param {string} message - 错误消息
 * @param {number} code - 关闭代码
 */
function sendErrorAndClose(ws, message, code) {
  ws.send(JSON.stringify({
    type: 'error',
    error: message
  }));
  ws.close(code, message);
}

/**
 * 清理断开的连接
 */
function cleanupConnections() {
  // 清理通知连接
  for (const [userId, ws] of activeConnections.notifications.entries()) {
    if (ws.readyState === ws.CLOSED || ws.readyState === ws.CLOSING) {
      activeConnections.notifications.delete(userId);
    }
  }
  
  // 清理上传进度连接
  for (const [userId, uploadsMap] of activeConnections.uploadProgress.entries()) {
    for (const [uploadId, ws] of uploadsMap.entries()) {
      if (ws.readyState === ws.CLOSED || ws.readyState === ws.CLOSING) {
        uploadsMap.delete(uploadId);
      }
    }
    if (uploadsMap.size === 0) {
      activeConnections.uploadProgress.delete(userId);
    }
  }
}

/**
 * 发送通知给指定用户
 * @param {string} userId - 用户ID
 * @param {Object} notification - 通知对象
 * @returns {boolean} - 是否成功发送
 */
function sendNotification(userId, notification) {
  const ws = activeConnections.notifications.get(userId);
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({
      type: 'notification',
      data: notification,
      timestamp: new Date()
    }));
    return true;
  }
  return false;
}

/**
 * 发送上传进度更新给指定用户的指定上传
 * @param {string} userId - 用户ID
 * @param {string} uploadId - 上传ID
 * @param {Object} progress - 进度对象
 * @returns {boolean} - 是否成功发送
 */
function sendUploadProgress(userId, uploadId, progress) {
  const userUploads = activeConnections.uploadProgress.get(userId);
  if (userUploads) {
    const ws = userUploads.get(uploadId);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'progress_update',
        uploadId: uploadId,
        data: progress,
        timestamp: new Date()
      }));
      return true;
    }
  }
  return false;
}

/**
 * 广播消息给所有已连接的用户
 * @param {string} channel - 通知频道
 * @param {Object} message - 消息对象
 */
function broadcastToAll(channel, message) {
  for (const [userId, ws] of activeConnections.notifications.entries()) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'broadcast',
        channel: channel,
        data: message,
        timestamp: new Date()
      }));
    }
  }
}

module.exports = {
  initializeWebSocketServer,
  sendNotification,
  sendUploadProgress,
  broadcastToAll
}; 