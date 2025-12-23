// AiChat/utils/gallery-save.js

const GALLERY_KEY = 'app_gallery_data';

// 辅助函数：延迟等待
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 🛠️ App 端专用：将 Base64 保存为本地文件
const saveBase64App = (base64Data) => {
    return new Promise((resolve, reject) => {
        // #ifdef APP-PLUS
        const bitmap = new plus.nativeObj.Bitmap('temp_img_' + Date.now());
        bitmap.loadBase64Data(base64Data, () => {
            const fileName = `_doc/img_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
            bitmap.save(fileName, { overwrite: true, format: 'png', quality: 100 }, (i) => {
                bitmap.clear();
                resolve(i.target); // 返回保存后的路径
            }, (e) => {
                bitmap.clear();
                reject(e);
            });
        }, (e) => {
            bitmap.clear();
            reject(e);
        });
        // #endif

        // #ifndef APP-PLUS
        reject(new Error('此平台不支持 Base64 直接保存'));
        // #endif
    });
};


// AiChat/utils/gallery-save.js

// ... (saveBase64App 保持不变) ...

// 辅助函数：带重试的下载逻辑
const downloadWithRetry = async (url, retries = 3) => {
    let targetUrl = url;

    // 🛠️🔥【强力修复】循环解码，直到消除所有双重编码
    // 有时候 URL 会被上游错误地编码多次 (比如 %25252F)，必须彻底还原
    // 只要 URL 里包含 "%25" (即 % 被转义了)，就说明还需要解码
    let decodeCount = 0;
    while (targetUrl.includes('%25') && decodeCount < 5) {
        try {
            console.log(`⚠️ [自动修复] 发现双重编码，正在第 ${decodeCount + 1} 次解码...`);
            targetUrl = decodeURI(targetUrl);
            decodeCount++;
        } catch (e) {
            console.warn('解码异常，停止尝试');
            break;
        }
    }

    // 最后的保险：有时候 decodeURI 解不开 query 参数里的编码
    // 如果还没解开，手动把 %252F 替换成 %2F (这是最关键的斜杠)
    if (targetUrl.includes('%252F')) {
         targetUrl = targetUrl.replaceAll('%252F', '%2F');
    }

    for (let i = 0; i < retries; i++) {
        try {
            const startTime = Date.now();
            console.log(`[相册] 开始下载 (第 ${i + 1} 次):`, targetUrl);
            
            const res = await new Promise((resolve, reject) => {
                uni.downloadFile({
                    url: targetUrl,
                    success: (r) => {
                        if (r.statusCode === 200) {
                            resolve(r);
                        } else {
                            // 打印详细错误方便调试
                            console.error(`[下载失败] 状态码: ${r.statusCode}`);
                            reject(new Error(`HTTP状态码错误: ${r.statusCode}`));
                        }
                    },
                    fail: (err) => {
                        console.error('[下载网络错误]', err);
                        reject(err);
                    }
                });
            });

            const endTime = Date.now();
            console.log(`🌐 [网络层] 下载耗时: ${((endTime - startTime) / 1000).toFixed(2)}秒`);
            return res.tempFilePath;

        } catch (e) {
            console.warn(`[相册] 第 ${i + 1} 次下载失败:`, e);
            if (i === retries - 1) throw e;
            await sleep(1500);
        }
    }
};



// 🚀 核心保存函数
export const saveToGallery = async (tempUrlOrBase64, roleId, roleName, prompt = '') => {
  try {
    let savedFilePath = '';

    // =========================================================
    // 场景 A: 处理 Base64 数据 (兼容 App 和 小程序)
    // =========================================================
    if (tempUrlOrBase64.startsWith('data:image')) {
  
      
      // #ifdef APP-PLUS
      // App 端使用 plus.nativeObj.Bitmap 保存
      savedFilePath = await saveBase64App(tempUrlOrBase64);
      console.log('✅ [相册] App端 Base64 保存成功:', savedFilePath);
      // #endif

      // #ifdef MP-WEIXIN
      // 小程序端使用 getFileSystemManager
      const fs = uni.getFileSystemManager();
      const fileName = `img_${Date.now()}.png`;
      savedFilePath = `${uni.env.USER_DATA_PATH}/${fileName}`;
      const base64Data = tempUrlOrBase64.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(savedFilePath, base64Data, 'base64');
      // #endif
      
      // #ifdef H5
      // H5 无法直接保存到文件系统，直接返回 base64 供展示
      savedFilePath = tempUrlOrBase64;
      // #endif
    } 
    // =========================================================
    // 场景 B: 处理网络 URL (增加重试与编码)
    // =========================================================
    else {
      let tempPath = tempUrlOrBase64;
      
      if (tempUrlOrBase64.startsWith('http')) {
        tempPath = await downloadWithRetry(tempUrlOrBase64);
      }
      
      // 永久保存到本地
      try {
          const saveRes = await uni.saveFile({ tempFilePath: tempPath });
          savedFilePath = saveRes.savedFilePath;
          console.log('✅ [相册] 文件持久化保存成功:', savedFilePath);
      } catch (e) {
          console.error('保存出错:', e);
          // 如果 saveFile 失败 (如文件过大)，尝试直接用临时路径
          savedFilePath = tempPath; 
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
    if (uni.getSystemInfoSync().platform === 'android' && !savedFilePath.startsWith('file://') && !savedFilePath.startsWith('data:') && savedFilePath.startsWith('/')) {
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
    console.log(`[相册] 最终记录路径: ${savedFilePath}`);
    
    return savedFilePath; 

  } catch (e) {
    console.error('[相册保存最终失败]', e);
    // 兜底：如果一切保存手段都失败，返回原链接确保能看（虽然下次打开可能没了）
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