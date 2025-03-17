const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('config');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请提供有效的电子邮件地址']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  settings: {
    allowMetadataProcessing: {
      type: Boolean,
      default: true
    },
    thumbnailSize: {
      type: Number,
      default: config.get('thumbnails.width')
    },
    language: {
      type: String,
      default: 'zh-CN'
    },
    theme: {
      type: String,
      default: 'light'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间中间件
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 密码哈希中间件
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(config.get('security.bcrypt.saltRounds'));
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 验证密码方法
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 隐藏敏感字段
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', UserSchema);