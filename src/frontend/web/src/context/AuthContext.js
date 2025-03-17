import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// 创建上下文
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 从本地存储加载令牌
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // 设置默认请求头
        axios.defaults.headers.common['x-auth-token'] = token;
        
        // 验证令牌并获取用户信息
        const res = await axios.get('/api/auth/verify');
        
        setUser(res.data);
        setError(null);
      } catch (err) {
        console.error('加载用户失败:', err);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['x-auth-token'];
        setError('会话已过期，请重新登录');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // 注册用户
  const register = async (userData) => {
    try {
      setLoading(true);
      const res = await axios.post('/api/users', userData);
      
      // 注册成功后自动登录
      return await login({ email: userData.email, password: userData.password });
    } catch (err) {
      setError(
        err.response && err.response.data.errors
          ? err.response.data.errors[0].msg
          : '注册失败，请稍后重试'
      );
      setLoading(false);
      throw err;
    }
  };

  // 登录用户
  const login = async (credentials) => {
    try {
      setLoading(true);
      const res = await axios.post('/api/auth/login', credentials);
      
      // 保存令牌到本地存储
      localStorage.setItem('token', res.data.token);
      
      // 设置默认请求头
      axios.defaults.headers.common['x-auth-token'] = res.data.token;
      
      // 获取用户信息
      const userRes = await axios.get('/api/auth/verify');
      
      setUser(userRes.data);
      setError(null);
      setLoading(false);
      return userRes.data;
    } catch (err) {
      setError(
        err.response && err.response.data.errors
          ? err.response.data.errors[0].msg
          : '登录失败，请检查您的凭据'
      );
      setLoading(false);
      throw err;
    }
  };

  // 登出用户
  const logout = async () => {
    try {
      // 调用登出API（可选）
      if (user) {
        await axios.post('/api/auth/logout');
      }
    } catch (err) {
      console.error('登出错误:', err);
    } finally {
      // 清除本地存储和状态
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['x-auth-token'];
      setUser(null);
    }
  };

  // 更新用户信息
  const updateUser = async (userData) => {
    try {
      setLoading(true);
      const res = await axios.put('/api/users/me', userData);
      setUser(res.data);
      setError(null);
      return res.data;
    } catch (err) {
      setError(
        err.response && err.response.data.errors
          ? err.response.data.errors[0].msg
          : '更新用户信息失败'
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 更改密码
  const changePassword = async (passwordData) => {
    try {
      setLoading(true);
      await axios.post('/api/auth/change-password', passwordData);
      setError(null);
    } catch (err) {
      setError(
        err.response && err.response.data.errors
          ? err.response.data.errors[0].msg
          : '更改密码失败'
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        register,
        login,
        logout,
        updateUser,
        changePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};