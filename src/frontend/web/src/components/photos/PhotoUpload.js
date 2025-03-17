import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  Container,
  Alert
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon,
  Delete as DeleteIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';

const PhotoUpload = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStatus, setUploadStatus] = useState({});
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // 文件拖放区域配置
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': []
    },
    onDrop: acceptedFiles => {
      // 添加新文件到列表，并初始化进度和状态
      const newFiles = acceptedFiles.map(file => Object.assign(file, {
        preview: URL.createObjectURL(file)
      }));
      
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
      
      // 初始化上传进度和状态
      const newProgress = { ...uploadProgress };
      const newStatus = { ...uploadStatus };
      
      newFiles.forEach(file => {
        newProgress[file.name] = 0;
        newStatus[file.name] = 'pending';
      });
      
      setUploadProgress(newProgress);
      setUploadStatus(newStatus);
    }
  });

  // 移除文件
  const removeFile = (fileName) => {
    setFiles(files.filter(file => file.name !== fileName));
    
    // 清理预览URL
    const fileToRemove = files.find(file => file.name === fileName);
    if (fileToRemove && fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    
    // 更新进度和状态
    const newProgress = { ...uploadProgress };
    const newStatus = { ...uploadStatus };
    
    delete newProgress[fileName];
    delete newStatus[fileName];
    
    setUploadProgress(newProgress);
    setUploadStatus(newStatus);
  };

  // 上传单个文件
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('photo', file);

    try {
      // 更新状态为上传中
      setUploadStatus(prev => ({ ...prev, [file.name]: 'uploading' }));
      
      // 发送请求
      const response = await axios.post('/api/photos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          // 计算上传进度
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: percentCompleted
          }));
        }
      });
      
      // 更新状态为成功
      setUploadStatus(prev => ({ ...prev, [file.name]: 'success' }));
      
      return response.data;
    } catch (err) {
      // 更新状态为失败
      setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
      
      console.error(`上传文件 ${file.name} 失败:`, err);
      throw err;
    }
  };

  // 上传所有文件
  const uploadAllFiles = async () => {
    if (files.length === 0) {
      setError('请先选择要上传的照片');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 逐个上传文件
      for (const file of files) {
        if (uploadStatus[file.name] !== 'success') {
          await uploadFile(file);
        }
      }
      
      // 所有文件上传成功后导航到照片库
      navigate('/photos');
    } catch (err) {
      setError(
        err.response && err.response.data.msg
          ? err.response.data.msg
          : '上传照片时发生错误，请稍后重试'
      );
    } finally {
      setUploading(false);
    }
  };

  // 渲染文件列表
  const fileList = (
    <List>
      {files.map((file) => (
        <React.Fragment key={file.name}>
          <ListItem
            secondaryAction={
              uploadStatus[file.name] !== 'uploading' && (
                <IconButton 
                  edge="end" 
                  aria-label="delete" 
                  onClick={() => removeFile(file.name)}
                  disabled={uploading}
                >
                  <DeleteIcon />
                </IconButton>
              )
            }
          >
            <ListItemIcon>
              {uploadStatus[file.name] === 'success' ? (
                <CheckIcon color="success" />
              ) : (
                <ImageIcon />
              )}
            </ListItemIcon>
            <ListItemText
              primary={file.name}
              secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
            />
            {uploadStatus[file.name] === 'uploading' && (
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={uploadProgress[file.name]} 
                />
              </Box>
            )}
          </ListItem>
          <Divider />
        </React.Fragment>
      ))}
    </List>
  );

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          上传照片
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box 
          {...getRootProps()} 
          sx={{
            border: '2px dashed #cccccc',
            borderRadius: 2,
            p: 3,
            mb: 3,
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: '#fafafa',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'rgba(25, 118, 210, 0.04)'
            }
          }}
        >
          <input {...getInputProps()} disabled={uploading} />
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6">
            拖放照片到此处，或点击选择照片
          </Typography>
          <Typography variant="body2" color="textSecondary">
            支持的格式: JPG, PNG, GIF 等
          </Typography>
        </Box>
        
        {files.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              已选择 {files.length} 张照片
            </Typography>
            {fileList}
          </Box>
        )}
        
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              onClick={uploadAllFiles}
              disabled={uploading || files.length === 0}
              startIcon={<CloudUploadIcon />}
            >
              {uploading ? '上传中...' : '上传所有照片'}
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              onClick={() => navigate('/photos')}
              disabled={uploading}
            >
              返回照片库
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default PhotoUpload;