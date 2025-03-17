const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('config');
const sharp = require('sharp');
const auth = require('../middleware/auth');
const Photo = require('../../models/Photo');

const router = express.Router();

// 配置存储
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // 确保用户目录存在
    const userDir = path.join(config.get('storage.basePath'), req.user.id);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: function(req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 接受图像文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图像文件'), false);
  }
};

// 配置上传
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.get('storage.maxUploadSize')
  },
  fileFilter: fileFilter
});

// 生成缩略图
async function generateThumbnail(photo) {
  try {
    // 确保缩略图目录存在
    const thumbnailDir = path.join(config.get('storage.thumbnailPath'), photo.userId.toString());
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }

    // 缩略图路径
    const thumbnailPath = path.join(thumbnailDir, `thumb_${path.basename(photo.path)}`);
    
    // 生成缩略图
    await sharp(photo.path)
      .resize(
        config.get('thumbnails.width'),
        config.get('thumbnails.height'),
        { fit: 'inside', withoutEnlargement: true }
      )
      .jpeg({ quality: config.get('thumbnails.quality') })
      .toFile(thumbnailPath);

    // 更新照片记录
    photo.thumbnailPath = thumbnailPath;
    photo.thumbnailGenerated = true;
    await photo.save();

    return thumbnailPath;
  } catch (error) {
    console.error('生成缩略图失败:', error);
    throw error;
  }
}

// @route   POST /api/photos
// @desc    上传照片
// @access  Private
router.post('/', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: '未提供照片' });
    }

    // 获取图像尺寸
    const metadata = await sharp(req.file.path).metadata();

    // 创建照片记录
    const photo = new Photo({
      userId: req.user.id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype,
      width: metadata.width,
      height: metadata.height
    });

    // 保存照片记录
    await photo.save();

    // 生成缩略图（异步）
    generateThumbnail(photo).catch(err => console.error('缩略图生成失败:', err));

    // TODO: 在第二阶段和第三阶段，将缩略图发送给AI模型进行分析

    res.status(201).json(photo);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET /api/photos
// @desc    获取用户的照片
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // 查询参数
    const query = { userId: req.user.id };
    
    // 过滤模糊照片
    if (req.query.blurry === 'true') {
      query.isBlurry = true;
    } else if (req.query.blurry === 'false') {
      query.isBlurry = false;
    }

    // 获取照片总数
    const total = await Photo.countDocuments(query);

    // 获取照片
    const photos = await Photo.find(query)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      photos,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET /api/photos/:id
// @desc    获取单张照片
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({ msg: '未找到照片' });
    }

    // 检查权限
    if (photo.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: '无权访问此照片' });
    }

    res.json(photo);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: '未找到照片' });
    }
    res.status(500).send('服务器错误');
  }
});

// @route   DELETE /api/photos/:id
// @desc    删除照片
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({ msg: '未找到照片' });
    }

    // 检查权限
    if (photo.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: '无权删除此照片' });
    }

    // 删除文件
    if (fs.existsSync(photo.path)) {
      fs.unlinkSync(photo.path);
    }

    // 删除缩略图
    if (photo.thumbnailPath && fs.existsSync(photo.thumbnailPath)) {
      fs.unlinkSync(photo.thumbnailPath);
    }

    // 删除数据库记录
    await photo.deleteOne();

    res.json({ msg: '照片已删除' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: '未找到照片' });
    }
    res.status(500).send('服务器错误');
  }
});

// @route   PUT /api/photos/:id
// @desc    更新照片信息
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({ msg: '未找到照片' });
    }

    // 检查权限
    if (photo.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: '无权更新此照片' });
    }

    // 可更新的字段
    const { tags, aiDescription, isBlurry, quality } = req.body;
    
    // 更新字段
    if (tags !== undefined) photo.tags = tags;
    if (aiDescription !== undefined) photo.aiDescription = aiDescription;
    if (isBlurry !== undefined) photo.isBlurry = isBlurry;
    if (quality !== undefined) photo.quality = quality;

    // 保存更新
    await photo.save();

    res.json(photo);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: '未找到照片' });
    }
    res.status(500).send('服务器错误');
  }
});

// @route   POST /api/photos/batch
// @desc    批量操作照片
// @access  Private
router.post('/batch', auth, async (req, res) => {
  try {
    const { operation, photoIds } = req.body;

    if (!operation || !photoIds || !Array.isArray(photoIds)) {
      return res.status(400).json({ msg: '无效的请求参数' });
    }

    // 检查所有照片是否属于当前用户
    const photos = await Photo.find({
      _id: { $in: photoIds },
      userId: req.user.id
    });

    if (photos.length !== photoIds.length) {
      return res.status(403).json({ msg: '无权操作某些照片' });
    }

    // 执行批量操作
    switch (operation) {
      case 'delete':
        // 删除文件和记录
        for (const photo of photos) {
          if (fs.existsSync(photo.path)) {
            fs.unlinkSync(photo.path);
          }
          if (photo.thumbnailPath && fs.existsSync(photo.thumbnailPath)) {
            fs.unlinkSync(photo.thumbnailPath);
          }
        }
        await Photo.deleteMany({ _id: { $in: photoIds } });
        return res.json({ msg: `已删除 ${photos.length} 张照片` });

      case 'markBlurry':
        await Photo.updateMany(
          { _id: { $in: photoIds } },
          { $set: { isBlurry: true } }
        );
        return res.json({ msg: `已将 ${photos.length} 张照片标记为模糊` });

      case 'markClear':
        await Photo.updateMany(
          { _id: { $in: photoIds } },
          { $set: { isBlurry: false } }
        );
        return res.json({ msg: `已将 ${photos.length} 张照片标记为清晰` });

      default:
        return res.status(400).json({ msg: '不支持的操作' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

module.exports = router;