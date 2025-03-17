const jwt = require('jsonwebtoken');
const config = require('config');

/**
 * 认证中间件
 * 验证请求中的JWT令牌，并将用户信息添加到请求对象
 */
module.exports = function(req, res, next) {
  // 获取请求头中的令牌
  const token = req.header('x-auth-token');

  // 检查是否存在令牌
  if (!token) {
    return res.status(401).json({ msg: '无访问令牌，授权被拒绝' });
  }

  try {
    // 验证令牌
    const decoded = jwt.verify(token, config.get('security.jwt.secret'));
    
    // 将用户信息添加到请求对象
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: '令牌无效' });
  }
};