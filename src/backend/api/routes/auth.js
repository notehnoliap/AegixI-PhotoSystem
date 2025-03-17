const express = require('express');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    用户登录并获取令牌
// @access  Public
router.post(
  '/login',
  [
    check('email', '请包含有效的电子邮件').isEmail(),
    check('password', '密码是必需的').exists()
  ],
  async (req, res) => {
    // 验证请求
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // 检查用户是否存在
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ 
          errors: [{ msg: '无效的凭据' }] 
        });
      }

      // 验证密码
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ 
          errors: [{ msg: '无效的凭据' }] 
        });
      }

      // 创建JWT负载
      const payload = {
        user: {
          id: user.id,
          role: user.role
        }
      };

      // 签署令牌
      jwt.sign(
        payload,
        config.get('security.jwt.secret'),
        { expiresIn: config.get('security.jwt.expiresIn') },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('服务器错误');
    }
  }
);

// @route   POST /api/auth/logout
// @desc    用户登出（客户端实现）
// @access  Private
router.post('/logout', auth, (req, res) => {
  // 注意：JWT是无状态的，实际的登出在客户端实现
  // 这个端点主要用于记录和一致性
  res.json({ msg: '登出成功' });
});

// @route   GET /api/auth/verify
// @desc    验证令牌并返回用户信息
// @access  Private
router.get('/verify', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: '未找到用户' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST /api/auth/change-password
// @desc    更改用户密码
// @access  Private
router.post(
  '/change-password',
  [
    auth,
    [
      check('currentPassword', '当前密码是必需的').exists(),
      check('newPassword', '请输入6个或更多字符的新密码').isLength({ min: 6 })
    ]
  ],
  async (req, res) => {
    // 验证请求
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      // 获取用户
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ msg: '未找到用户' });
      }

      // 验证当前密码
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ 
          errors: [{ msg: '当前密码不正确' }] 
        });
      }

      // 更新密码
      user.password = newPassword;
      await user.save();

      res.json({ msg: '密码已更新' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('服务器错误');
    }
  }
);

module.exports = router;