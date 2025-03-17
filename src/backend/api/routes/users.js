const express = require('express');
const { check, validationResult } = require('express-validator');
const User = require('../../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/users
// @desc    注册用户
// @access  Public
router.post(
  '/',
  [
    check('username', '用户名是必需的').not().isEmpty(),
    check('username', '用户名长度应在3-50个字符之间').isLength({ min: 3, max: 50 }),
    check('email', '请包含有效的电子邮件').isEmail(),
    check('password', '请输入6个或更多字符的密码').isLength({ min: 6 })
  ],
  async (req, res) => {
    // 验证请求
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
      // 检查用户是否已存在
      let user = await User.findOne({ $or: [{ email }, { username }] });
      if (user) {
        return res.status(400).json({ 
          errors: [{ msg: '用户已存在' }] 
        });
      }

      // 创建新用户
      user = new User({
        username,
        email,
        password
      });

      // 保存用户
      await user.save();

      // 返回用户数据（不包含密码）
      res.status(201).json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('服务器错误');
    }
  }
);

// @route   GET /api/users/me
// @desc    获取当前用户信息
// @access  Private
router.get('/me', auth, async (req, res) => {
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

// @route   PUT /api/users/me
// @desc    更新当前用户信息
// @access  Private
router.put(
  '/me',
  [
    auth,
    [
      check('username', '用户名长度应在3-50个字符之间').optional().isLength({ min: 3, max: 50 }),
      check('email', '请包含有效的电子邮件').optional().isEmail()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, settings } = req.body;
    const updateFields = {};
    
    if (username) updateFields.username = username;
    if (email) updateFields.email = email;
    if (settings) updateFields.settings = settings;

    try {
      // 检查用户名或电子邮件是否已被其他用户使用
      if (username || email) {
        const query = { _id: { $ne: req.user.id } };
        if (username) query.username = username;
        if (email) query.email = email;
        
        const existingUser = await User.findOne(query);
        if (existingUser) {
          return res.status(400).json({ 
            errors: [{ msg: '用户名或电子邮件已被使用' }] 
          });
        }
      }

      // 更新用户
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateFields },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ msg: '未找到用户' });
      }

      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('服务器错误');
    }
  }
);

// @route   DELETE /api/users/me
// @desc    删除当前用户
// @access  Private
router.delete('/me', auth, async (req, res) => {
  try {
    // 删除用户
    await User.findByIdAndDelete(req.user.id);
    
    // TODO: 删除用户的照片和相关数据

    res.json({ msg: '用户已删除' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET /api/users/:id
// @desc    获取用户信息（仅管理员）
// @access  Private/Admin
router.get('/:id', [auth, require('../middleware/admin')], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: '未找到用户' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: '未找到用户' });
    }
    res.status(500).send('服务器错误');
  }
});

// @route   GET /api/users
// @desc    获取所有用户（仅管理员）
// @access  Private/Admin
router.get('/', [auth, require('../middleware/admin')], async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

module.exports = router;