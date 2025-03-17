import React, { useState, useEffect, useContext } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardMedia,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Pagination,
  Paper,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  BlurOn as BlurOnIcon,
  BlurOff as BlurOffIcon
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';

const PhotoGallery = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const { user } = useContext(AuthContext);

  // 加载照片
  useEffect(() => {
    const fetchPhotos = async () => {
      setLoading(true);
      try {
        // 构建查询参数
        let url = `/api/photos?page=${page}&limit=12`;
        if (currentFilter === 'blurry') {
          url += '&blurry=true';
        } else if (currentFilter === 'clear') {
          url += '&blurry=false';
        }

        const res = await axios.get(url);
        setPhotos(res.data.photos);
        setTotalPages(res.data.pagination.pages);
        setError(null);
      } catch (err) {
        console.error('获取照片失败:', err);
        setError('加载照片失败，请稍后重试');
        setPhotos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [page, currentFilter]);

  // 处理页面变化
  const handlePageChange = (event, value) => {
    setPage(value);
    // 清除选择
    setSelectedPhotos([]);
  };

  // 处理照片选择
  const handleSelectPhoto = (photoId) => {
    setSelectedPhotos(prev => {
      if (prev.includes(photoId)) {
        return prev.filter(id => id !== photoId);
      } else {
        return [...prev, photoId];
      }
    });
  };

  // 处理全选/取消全选
  const handleSelectAll = () => {
    if (selectedPhotos.length === photos.length) {
      setSelectedPhotos([]);
    } else {
      setSelectedPhotos(photos.map(photo => photo._id));
    }
  };

  // 打开筛选菜单
  const handleFilterMenuOpen = (event) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  // 关闭筛选菜单
  const handleFilterMenuClose = () => {
    setFilterMenuAnchor(null);
  };

  // 应用筛选
  const applyFilter = (filter) => {
    setCurrentFilter(filter);
    setPage(1);
    setSelectedPhotos([]);
    handleFilterMenuClose();
  };

  // 打开操作菜单
  const handleActionMenuOpen = (event) => {
    if (selectedPhotos.length > 0) {
      setActionMenuAnchor(event.currentTarget);
    }
  };

  // 关闭操作菜单
  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
  };

  // 打开删除确认对话框
  const handleDeleteDialogOpen = () => {
    setDeleteDialogOpen(true);
    handleActionMenuClose();
  };

  // 关闭删除确认对话框
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };

  // 批量删除照片
  const handleDeletePhotos = async () => {
    try {
      await axios.post('/api/photos/batch', {
        operation: 'delete',
        photoIds: selectedPhotos
      });

      // 更新照片列表
      setPhotos(photos.filter(photo => !selectedPhotos.includes(photo._id)));
      setSelectedPhotos([]);
      handleDeleteDialogClose();
    } catch (err) {
      console.error('删除照片失败:', err);
      setError('删除照片失败，请稍后重试');
    }
  };

  // 标记照片为模糊/清晰
  const handleMarkPhotos = async (isBlurry) => {
    try {
      await axios.post('/api/photos/batch', {
        operation: isBlurry ? 'markBlurry' : 'markClear',
        photoIds: selectedPhotos
      });

      // 更新照片列表
      setPhotos(photos.map(photo => {
        if (selectedPhotos.includes(photo._id)) {
          return { ...photo, isBlurry };
        }
        return photo;
      }));
      
      handleActionMenuClose();
    } catch (err) {
      console.error('标记照片失败:', err);
      setError('标记照片失败，请稍后重试');
    }
  };

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          我的照片库
        </Typography>

        {/* 工具栏 */}
        <Toolbar disableGutters sx={{ mb: 2 }}>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            {photos.length > 0 && (
              <>
                <Checkbox
                  checked={selectedPhotos.length === photos.length && photos.length > 0}
                  indeterminate={selectedPhotos.length > 0 && selectedPhotos.length < photos.length}
                  onChange={handleSelectAll}
                />
                <Typography variant="body2" sx={{ mr: 2 }}>
                  {selectedPhotos.length > 0 
                    ? `已选择 ${selectedPhotos.length} 张照片` 
                    : '选择照片'}
                </Typography>
                {selectedPhotos.length > 0 && (
                  <IconButton onClick={handleActionMenuOpen}>
                    <MoreVertIcon />
                  </IconButton>
                )}
              </>
            )}
          </Box>
          
          <Box>
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={handleFilterMenuOpen}
              sx={{ mr: 1 }}
            >
              {currentFilter === 'all' ? '全部照片' : 
               currentFilter === 'blurry' ? '模糊照片' : '清晰照片'}
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              component={RouterLink}
              to="/photos/upload"
            >
              上传照片
            </Button>
          </Box>
        </Toolbar>

        {/* 筛选菜单 */}
        <Menu
          anchorEl={filterMenuAnchor}
          open={Boolean(filterMenuAnchor)}
          onClose={handleFilterMenuClose}
        >
          <MenuItem 
            onClick={() => applyFilter('all')}
            selected={currentFilter === 'all'}
          >
            全部照片
          </MenuItem>
          <MenuItem 
            onClick={() => applyFilter('blurry')}
            selected={currentFilter === 'blurry'}
          >
            模糊照片
          </MenuItem>
          <MenuItem 
            onClick={() => applyFilter('clear')}
            selected={currentFilter === 'clear'}
          >
            清晰照片
          </MenuItem>
        </Menu>

        {/* 操作菜单 */}
        <Menu
          anchorEl={actionMenuAnchor}
          open={Boolean(actionMenuAnchor)}
          onClose={handleActionMenuClose}
        >
          <MenuItem onClick={handleDeleteDialogOpen}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            删除选中照片
          </MenuItem>
          <MenuItem onClick={() => handleMarkPhotos(true)}>
            <BlurOnIcon fontSize="small" sx={{ mr: 1 }} />
            标记为模糊
          </MenuItem>
          <MenuItem onClick={() => handleMarkPhotos(false)}>
            <BlurOffIcon fontSize="small" sx={{ mr: 1 }} />
            标记为清晰
          </MenuItem>
        </Menu>

        {/* 删除确认对话框 */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteDialogClose}
        >
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>
            <DialogContentText>
              您确定要删除选中的 {selectedPhotos.length} 张照片吗？此操作无法撤销。
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteDialogClose}>取消</Button>
            <Button onClick={handleDeletePhotos} color="error">
              删除
            </Button>
          </DialogActions>
        </Dialog>

        {/* 加载指示器 */}
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* 错误消息 */}
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {/* 照片网格 */}
        {!loading && photos.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              没有找到照片
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              component={RouterLink}
              to="/photos/upload"
              sx={{ mt: 2 }}
            >
              上传照片
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {photos.map((photo) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={photo._id}>
                <Card 
                  sx={{ 
                    position: 'relative',
                    border: selectedPhotos.includes(photo._id) 
                      ? '2px solid #1976d2' 
                      : 'none'
                  }}
                >
                  <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}>
                    <Checkbox
                      checked={selectedPhotos.includes(photo._id)}
                      onChange={() => handleSelectPhoto(photo._id)}
                      sx={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        borderRadius: '50%',
                        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' }
                      }}
                    />
                  </Box>
                  
                  <CardActionArea 
                    component={RouterLink} 
                    to={`/photos/${photo._id}`}
                  >
                    <CardMedia
                      component="img"
                      height="200"
                      image={`/api/photos/${photo._id}/thumbnail`}
                      alt={photo.aiDescription || photo.originalName}
                      sx={{ 
                        objectFit: 'cover',
                        filter: photo.isBlurry ? 'blur(1px)' : 'none'
                      }}
                    />
                    <CardContent sx={{ pb: 1 }}>
                      <Typography variant="body2" noWrap>
                        {photo.originalName}
                      </Typography>
                      {photo.aiDescription && (
                        <Typography variant="caption" color="textSecondary" noWrap>
                          {photo.aiDescription}
                        </Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                  
                  <CardActions sx={{ pt: 0 }}>
                    <Tooltip title={photo.isBlurry ? "模糊照片" : "清晰照片"}>
                      <Box component="span">
                        {photo.isBlurry ? (
                          <BlurOnIcon fontSize="small" color="action" />
                        ) : (
                          <BlurOffIcon fontSize="small" color="action" />
                        )}
                      </Box>
                    </Tooltip>
                    <Box sx={{ flexGrow: 1 }} />
                    <Tooltip title="查看详情">
                      <IconButton 
                        size="small" 
                        component={RouterLink} 
                        to={`/photos/${photo._id}`}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedPhotos([photo._id]);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default PhotoGallery;