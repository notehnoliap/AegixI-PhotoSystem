const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const app = require('../../../src/backend/server');
const User = require('../../../src/backend/models/User');
const Photo = require('../../../src/backend/models/Photo');
const config = require('config');

// 测试用户
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123'
};

// 测试照片路径
const testPhotoPath = path.join(__dirname, '../../fixtures/test-photo.jpg');

// 全局变量
let token;
let userId;
let photoId;

// 在所有测试之前
beforeAll(async () => {
  // 连接到测试数据库
  await mongoose.connect(config.get('database.url'), config.get('database.options'));
  
  // 清理测试数据
  await User.deleteMany({});
  await Photo.deleteMany({});
  
  // 创建测试用户
  const res = await request(app)
    .post('/api/users')
    .send(testUser);
  
  // 登录获取令牌
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: testUser.email,
      password: testUser.password
    });
  
  token = loginRes.body.token;
  
  // 获取用户ID
  const userRes = await request(app)
    .get('/api/auth/verify')
    .set('x-auth-token', token);
  
  userId = userRes.body._id;
  
  // 确保测试存储目录存在
  const userDir = path.join(config.get('storage.basePath'), userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  
  const thumbnailDir = path.join(config.get('storage.thumbnailPath'), userId);
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }
});

// 在所有测试之后
afterAll(async () => {
  // 清理测试数据
  await User.deleteMany({});
  await Photo.deleteMany({});
  
  // 断开数据库连接
  await mongoose.connection.close();
});

// 照片API测试
describe('照片API', () => {
  // 测试上传照片
  describe('POST /api/photos', () => {
    it('应该上传照片并返回照片信息', async () => {
      const res = await request(app)
        .post('/api/photos')
        .set('x-auth-token', token)
        .attach('photo', testPhotoPath);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('userId', userId);
      expect(res.body).toHaveProperty('filename');
      expect(res.body).toHaveProperty('path');
      
      // 保存照片ID用于后续测试
      photoId = res.body._id;
    });
    
    it('未认证时应该返回401错误', async () => {
      const res = await request(app)
        .post('/api/photos')
        .attach('photo', testPhotoPath);
      
      expect(res.statusCode).toEqual(401);
    });
    
    it('没有照片时应该返回400错误', async () => {
      const res = await request(app)
        .post('/api/photos')
        .set('x-auth-token', token);
      
      expect(res.statusCode).toEqual(400);
    });
  });
  
  // 测试获取照片列表
  describe('GET /api/photos', () => {
    it('应该返回用户的照片列表', async () => {
      const res = await request(app)
        .get('/api/photos')
        .set('x-auth-token', token);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('photos');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.photos).toBeInstanceOf(Array);
      expect(res.body.photos.length).toBeGreaterThan(0);
    });
    
    it('未认证时应该返回401错误', async () => {
      const res = await request(app)
        .get('/api/photos');
      
      expect(res.statusCode).toEqual(401);
    });
    
    it('应该支持分页', async () => {
      const res = await request(app)
        .get('/api/photos?page=1&limit=10')
        .set('x-auth-token', token);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('pagination.page', 1);
      expect(res.body).toHaveProperty('pagination.limit', 10);
    });
  });
  
  // 测试获取单张照片
  describe('GET /api/photos/:id', () => {
    it('应该返回照片详情', async () => {
      const res = await request(app)
        .get(`/api/photos/${photoId}`)
        .set('x-auth-token', token);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('_id', photoId);
      expect(res.body).toHaveProperty('userId', userId);
    });
    
    it('未认证时应该返回401错误', async () => {
      const res = await request(app)
        .get(`/api/photos/${photoId}`);
      
      expect(res.statusCode).toEqual(401);
    });
    
    it('照片不存在时应该返回404错误', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/photos/${fakeId}`)
        .set('x-auth-token', token);
      
      expect(res.statusCode).toEqual(404);
    });
  });
  
  // 测试更新照片
  describe('PUT /api/photos/:id', () => {
    it('应该更新照片信息', async () => {
      const updateData = {
        tags: ['测试', '示例'],
        aiDescription: '这是一张测试照片',
        isBlurry: false
      };
      
      const res = await request(app)
        .put(`/api/photos/${photoId}`)
        .set('x-auth-token', token)
        .send(updateData);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('tags', updateData.tags);
      expect(res.body).toHaveProperty('aiDescription', updateData.aiDescription);
      expect(res.body).toHaveProperty('isBlurry', updateData.isBlurry);
    });
    
    it('未认证时应该返回401错误', async () => {
      const res = await request(app)
        .put(`/api/photos/${photoId}`)
        .send({ tags: ['测试'] });
      
      expect(res.statusCode).toEqual(401);
    });
  });
  
  // 测试批量操作
  describe('POST /api/photos/batch', () => {
    it('应该批量标记照片', async () => {
      const res = await request(app)
        .post('/api/photos/batch')
        .set('x-auth-token', token)
        .send({
          operation: 'markBlurry',
          photoIds: [photoId]
        });
      
      expect(res.statusCode).toEqual(200);
      
      // 验证照片已标记为模糊
      const photoRes = await request(app)
        .get(`/api/photos/${photoId}`)
        .set('x-auth-token', token);
      
      expect(photoRes.body).toHaveProperty('isBlurry', true);
    });
    
    it('未认证时应该返回401错误', async () => {
      const res = await request(app)
        .post('/api/photos/batch')
        .send({
          operation: 'markClear',
          photoIds: [photoId]
        });
      
      expect(res.statusCode).toEqual(401);
    });
  });
  
  // 测试删除照片
  describe('DELETE /api/photos/:id', () => {
    it('应该删除照片', async () => {
      const res = await request(app)
        .delete(`/api/photos/${photoId}`)
        .set('x-auth-token', token);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('msg', '照片已删除');
      
      // 验证照片已删除
      const photoRes = await request(app)
        .get(`/api/photos/${photoId}`)
        .set('x-auth-token', token);
      
      expect(photoRes.statusCode).toEqual(404);
    });
    
    it('未认证时应该返回401错误', async () => {
      const res = await request(app)
        .delete(`/api/photos/${photoId}`);
      
      expect(res.statusCode).toEqual(401);
    });
  });
});