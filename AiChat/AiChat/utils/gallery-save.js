// utils/gallery-save.js

const GALLERY_KEY = 'app_gallery_data';

export const saveToGallery = async (tempUrlOrBase64, roleId, roleName, prompt = '') => {
  try {
    let savedFilePath = '';

    // 1. 处理 Base64
    if (tempUrlOrBase64.startsWith('data:image')) {
      const fs = uni.getFileSystemManager();
      const fileName = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
      savedFilePath = `${uni.env.USER_DATA_PATH}/${fileName}`;
      const base64Data = tempUrlOrBase64.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(savedFilePath, base64Data, 'base64');
    } 
    // 2. 处理网络 URL 或 临时路径
    else {
      let tempPath = tempUrlOrBase64;
      if (tempUrlOrBase64.startsWith('http')) {
        try {
            const downloadRes = await uni.downloadFile({ url: tempUrlOrBase64 });
            if (downloadRes.statusCode === 200) {
                tempPath = downloadRes.tempFilePath;
            } else {
                throw new Error(`下载失败 code:${downloadRes.statusCode}`);
            }
        } catch (e) {
            console.error('下载出错:', e);
            throw new Error('图片下载连接失败');
        }
      }
      
      try {
          const saveRes = await uni.saveFile({ tempFilePath: tempPath });
          savedFilePath = saveRes.savedFilePath;
      } catch (e) {
          console.error('保存出错:', e);
          throw new Error('无法写入本地文件');
      }
    }

    // =========================================================
    // 【核心修复1】：转换绝对路径
    // =========================================================
    // #ifdef APP-PLUS
    if (savedFilePath.startsWith('_doc')) {
        try {
            savedFilePath = plus.io.convertLocalFileSystemURL(savedFilePath);
        } catch (e) {
            console.error('路径转换失败', e);
        }
    }
    // 【核心修复2】：安卓必须加 file:// 前缀才能在 image 标签显示
    if (uni.getSystemInfoSync().platform === 'android' && !savedFilePath.startsWith('file://') && savedFilePath.startsWith('/')) {
        savedFilePath = 'file://' + savedFilePath;
    }
    // #endif
    // =========================================================

    // 3. 更新相册数据
    const gallery = uni.getStorageSync(GALLERY_KEY) || {};
    const key = String(roleId); 
    
    if (!gallery[key]) {
      gallery[key] = { name: roleName, images: [] };
    }
    
    gallery[key].images.unshift({
      path: savedFilePath,
      timestamp: Date.now(),
      prompt: prompt
    });

    uni.setStorageSync(GALLERY_KEY, gallery);
    console.log(`[相册] 最终保存路径: ${savedFilePath}`);
    
    return savedFilePath; 

  } catch (e) {
    console.error('[相册保存失败详情]', e);
    return tempUrlOrBase64; 
  }
};

export const getGalleryData = () => {
  return uni.getStorageSync(GALLERY_KEY) || {};
};

export const deleteImage = (roleId, imageIndex) => {
  const gallery = uni.getStorageSync(GALLERY_KEY) || {};
  const key = String(roleId);
  
  if (gallery[key] && gallery[key].images[imageIndex]) {
    const target = gallery[key].images[imageIndex];
    try {
      uni.removeSavedFile({ filePath: target.path, complete: () => {} });
    } catch(e) {}
    gallery[key].images.splice(imageIndex, 1);
    uni.setStorageSync(GALLERY_KEY, gallery);
    return true;
  }
  return false;
};