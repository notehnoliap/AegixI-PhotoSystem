const mongoose = require('mongoose');

const PhotoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  width: {
    type: Number
  },
  height: {
    type: Number
  },
  metadata: {
    camera: String,
    make: String,
    model: String,
    location: {
      latitude: Number,
      longitude: Number,
      altitude: Number
    },
    timestamp: Date,
    exposure: String,
    aperture: String,
    iso: Number,
    focalLength: String,
    other: mongoose.Schema.Types.Mixed
  },
  aiDescription: {
    type: String,
    default: ''
  },
  tags: [{
    type: String
  }],
  isBlurry: {
    type: Boolean,
    default: false
  },
  quality: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  processed: {
    type: Boolean,
    default: false
  },
  thumbnailGenerated: {
    type: Boolean,
    default: false
  },
  thumbnailPath: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间中间件
PhotoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 索引
PhotoSchema.index({ userId: 1 });
PhotoSchema.index({ tags: 1 });
PhotoSchema.index({ aiDescription: 'text' });
PhotoSchema.index({ 'metadata.timestamp': 1 });
PhotoSchema.index({ isBlurry: 1 });

module.exports = mongoose.model('Photo', PhotoSchema);