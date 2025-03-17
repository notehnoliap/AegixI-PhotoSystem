import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { zhCN } from '@mui/material/locale';

// 组件
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import PhotoGallery from './components/photos/PhotoGallery';
import PhotoUpload from './components/photos/PhotoUpload';
import PhotoDetail from './components/photos/PhotoDetail';
import UserSettings from './components/user/UserSettings';
import NotFound from './components/layout/NotFound';

// 上下文
import { AuthProvider } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';

// 私有路由组件
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  const [darkMode, setDarkMode] = useState(false);

  // 从本地存储加载主题偏好
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode) {
      setDarkMode(JSON.parse(savedMode));
    }
  }, []);

  // 保存主题偏好到本地存储
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // 创建主题
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
    },
  }, zhCN);

  // 切换主题
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AlertProvider>
          <Router>
            <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
            <main style={{ minHeight: 'calc(100vh - 128px)', padding: '20px' }}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/photos" 
                  element={
                    <PrivateRoute>
                      <PhotoGallery />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/photos/upload" 
                  element={
                    <PrivateRoute>
                      <PhotoUpload />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/photos/:id" 
                  element={
                    <PrivateRoute>
                      <PhotoDetail />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <PrivateRoute>
                      <UserSettings />
                    </PrivateRoute>
                  } 
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </Router>
        </AlertProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;