/**
 * 管理员中间件
 * 检查用户是否具有管理员角色
 * 必须在auth中间件之后使用
 */
module.exports = function(req, res, next) {
  // 检查用户是否存在
  if (!req.user) {
    return res.status(401).json({ msg: '未授权' });
  }

  // 检查用户角色
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: '访问被拒绝，需要管理员权限' });
  }

  next();
};