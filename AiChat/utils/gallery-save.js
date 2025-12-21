// utils/gallery-save.js

const GALLERY_KEY = 'app_gallery_data';

// 辅助函数：延迟等待
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 辅助函数：带重试的下载逻辑
const downloadWithRetry = async (url, retries = 3) => {
    const encodedUrl = encodeURI(url);
        
        for (let i = 0; i < retries; i++) {
            try {
                const startTime = Date.now(); // ⏱️ 记录开始时间
                console.log(`[相册] 开始下载 (第 ${i + 1} 次):`, encodedUrl);
                
                const res = await new Promise((resolve, reject) => {
                    uni.downloadFile({
                        url: encodedUrl,
                        timeout: 60000, 
                        success: (r) => {
                            if (r.statusCode === 200) resolve(r);
                            else reject(new Error(`HTTP状态码错误: ${r.statusCode}`));
                        },
                        fail: (err) => reject(err)
                    });
                });
    
                const endTime = Date.now(); // ⏱️ 记录结束时间
                const duration = (endTime - startTime) / 1000;
                console.log(`🌐 [网络层] 下载耗时: ${duration.toFixed(2)}秒`); // 👈 看看这里是几秒
    
                return res.tempFilePath;

        } catch (e) {
            console.warn(`[相册] 第 ${i + 1} 次下载失败:`, e);
            if (i === retries - 1) throw e; // 最后一次还是失败，抛出异常
            await sleep(1500); // 等待 1.5秒 后重试
        }
    }
};

export const saveToGallery = async (tempUrlOrBase64, roleId, roleName, prompt = '') => {
  try {
    let savedFilePath = '';

    // =========================================================
    // 场景 A: 处理 Base64 数据 (速度最快，推荐)
    // =========================================================
    if (tempUrlOrBase64.startsWith('data:image')) {
      const fs = uni.getFileSystemManager();
      // 随机文件名防止冲突
      const fileName = `img_${Date.now()}_${Math.floor(Math.random() * 10000)}.png`;
      savedFilePath = `${uni.env.USER_DATA_PATH}/${fileName}`;
      
      const base64Data = tempUrlOrBase64.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(savedFilePath, base64Data, 'base64');
      console.log('✅ [相册] Base64 保存成功');
    } 
    // =========================================================
    // 场景 B: 处理网络 URL (增加重试与编码)
    // =========================================================
    else {
      let tempPath = tempUrlOrBase64;
      
      if (tempUrlOrBase64.startsWith('http')) {
        // 使用封装好的重试下载函数
        tempPath = await downloadWithRetry(tempUrlOrBase64);
      }
      
      // 保存到本地相册目录 (持久化)
      try {
          const saveRes = await uni.saveFile({ tempFilePath: tempPath });
          savedFilePath = saveRes.savedFilePath;
          console.log('✅ [相册] 文件持久化保存成功');
      } catch (e) {
          console.error('保存出错:', e);
          throw new Error('无法写入本地存储，请检查权限或空间');
      }
    }

    // =========================================================
    // 【路径兼容性修复】
    // =========================================================
    // #ifdef APP-PLUS
    if (savedFilePath.startsWith('_doc')) {
        try {
            savedFilePath = plus.io.convertLocalFileSystemURL(savedFilePath);
        } catch (e) { console.error('路径转换失败', e); }
    }
    // 安卓必须加 file:// 前缀才能在 <image> 标签显示
    if (uni.getSystemInfoSync().platform === 'android' && !savedFilePath.startsWith('file://') && savedFilePath.startsWith('/')) {
        savedFilePath = 'file://' + savedFilePath;
    }
    // #endif
    // =========================================================

    // 3. 更新相册元数据 (Storage)
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
    console.log(`[相册] 最终路径: ${savedFilePath}`);
    
    return savedFilePath; 

  } catch (e) {
    console.error('[相册保存最终失败]', e);
    // 即使保存失败，也尝试返回原 URL，确保聊天界面至少能显示（虽然可能之后会失效）
    return tempUrlOrBase64.startsWith('http') ? tempUrlOrBase64 : null; 
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
      // 尝试删除物理文件，释放空间
      uni.removeSavedFile({ filePath: target.path, complete: () => {} });
    } catch(e) {}
    
    gallery[key].images.splice(imageIndex, 1);
    uni.setStorageSync(GALLERY_KEY, gallery);
    return true;
  }
  return false;
};