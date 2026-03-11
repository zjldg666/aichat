<template>
  <view class="footer">
    
    <view class="edit-toolbar" v-if="isEditMode">
      <view class="cancel-btn" @click="$emit('cancelEdit')">取消</view>
      <view class="count-tip">已选择 <text class="num">{{ selectedCount }}</text> 条内容</view>
      <view 
        class="delete-confirm-btn" 
        @click="$emit('confirmDelete')" 
        :class="{ 'active': selectedCount > 0 }"
      >删除</view>
    </view>

    <view class="input-container" v-else>
      
      <view class="camera-popup" v-if="showCameraMenu" @click.stop>
              <view class="popup-arrow"></view>
              <view class="camera-actions">
                 <view class="action-item" @click="handleSubCameraClick('clickCamera')">
                    <view class="icon">📸</view>
                    <text class="label">直拍</text>
                 </view>
                 
                 <view class="action-item" @click="handleSubCameraClick('clickStealthCamera')">
                    <view class="icon">👁️</view>
                    <text class="label">偷拍</text>
                 </view>
      
                 <view class="action-item" @click="handleSubCameraClick('clickGroupCamera')">
                    <view class="icon">✌️</view>
                    <text class="label">合拍</text>
                 </view>
              </view>
            </view>

      <view class="toolbar-compact" v-if="isToolbarOpen">
        <scroll-view class="tool-scroll" scroll-x="true" show-scrollbar="false">
          <view class="tool-flex">
            <view class="tool-item" @click="$emit('clickTime')" v-if="!isEmbedded">
              <view class="tool-icon">⏳</view>
              <text class="tool-text">时间</text>
            </view>
            
            <view class="tool-item" @click="$emit('clickLocation')" v-if="!isEmbedded">
              <view class="tool-icon">🗺️</view>
              <text class="tool-text">移动</text>
            </view>
            
            <picker 
              v-if="!isEmbedded"  
              mode="time" 
              :value="wakeTime" 
              start="00:00" 
              end="23:59" 
              @change="onPickerChange" 
            >
              <view class="tool-item">
                <view class="tool-icon">🛌</view>
                <text class="tool-text">睡到...</text>
              </view>
            </picker>
            
            <view class="tool-item" @click="toggleCameraMenu" :class="{ active: showCameraMenu }" v-if="!isEmbedded">
              <view class="tool-icon">📷</view>
              <text class="tool-text">摄影</text>
            </view>

            
            <view class="tool-item" @click="$emit('clickContinue')">
              <view class="tool-icon">👉</view>
              <text class="tool-text">继续</text>
            </view>
            
            <view class="tool-item" @click="$emit('toggleThought')">
              <view class="tool-icon">{{ showThought ? '🧠' : '😶' }}</view>
              <text class="tool-text">{{ showThought ? '显心声' : '藏心声' }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="input-area">
        <view class="action-btn" @click="$emit('toggleToolbar')">
          <text>{{ isToolbarOpen ? '⬇️' : '⊕' }}</text>
        </view>
        
        <input 
          class="input" 
          :value="modelValue" 
          @input="$emit('update:modelValue', $event.detail.value)"
          confirm-type="send" 
          @confirm="$emit('send')" 
          placeholder="输入对话..." 
        />
        
        <view class="send-btn" @click="$emit('send')">发送</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  isEditMode: { type: Boolean, default: false },
  selectedCount: { type: Number, default: 0 },
  isToolbarOpen: { type: Boolean, default: false },
  modelValue: { type: String, default: '' }, // 对应 v-model
  wakeTime: { type: String, default: '08:00' },
  showThought: { type: Boolean, default: false },
  isEmbedded: { type: Boolean, default: false }
});

const emit = defineEmits([
  'cancelEdit', 'confirmDelete', 
  'toggleToolbar', 'update:modelValue', 'send',
  'clickTime', 'clickLocation', 'sleepTimeChange',
  'clickCamera', 'clickStealthCamera', 
  'clickContinue', 'toggleThought', 'clickWardrobe','clickGroupCamera'
]);

// 📸 相机菜单状态
const showCameraMenu = ref(false);

const toggleCameraMenu = () => {
  showCameraMenu.value = !showCameraMenu.value;
};

const handleSubCameraClick = (eventName) => {
  emit(eventName);
  showCameraMenu.value = false;
};

// 处理 picker 的 change 事件并转发
const onPickerChange = (e) => {
  emit('sleepTimeChange', e);
};

// 监听工具栏关闭，同时关闭相机菜单
watch(() => props.isToolbarOpen, (val) => {
    if (!val) showCameraMenu.value = false;
});
</script>

<style lang="scss" scoped>
.footer { 
    position: fixed; bottom: 0; left: 0; right: 0; 
    background: var(--card-bg); 
    border-top: 1px solid var(--border-color); 
    z-index: 99; padding-bottom: env(safe-area-inset-bottom); 
}

/* 多选编辑条 */
.edit-toolbar {
    display: flex; justify-content: space-between; align-items: center;
    height: 100rpx; padding: 0 40rpx;
    background: var(--card-bg);
    border-top: 1px solid var(--border-color);
    .delete-confirm-btn { color: #ff4d4f; font-weight: bold; }
    .cancel-btn { color: var(--text-color); }
    .count-tip { font-size: 24rpx; color: var(--text-sub); }
    /* 删除按钮激活态 */
    .delete-confirm-btn { opacity: 0.5; pointer-events: none; }
    .delete-confirm-btn.active { opacity: 1; pointer-events: auto; }
}

.input-area { 
    display: flex; align-items: center; padding: 16rpx 20rpx; 
    background: var(--tool-bg); 
}

.action-btn { 
    width: 70rpx; height: 70rpx; display: flex; align-items: center; justify-content: center; 
    margin-right: 16rpx; font-size: 44rpx; 
    color: var(--text-sub); 
}

.input { 
    flex: 1; height: 76rpx; 
    background: var(--input-bg); 
    color: var(--text-color);
    border-radius: 38rpx; padding: 0 30rpx; font-size: 30rpx; margin-right: 16rpx; 
    border: 1px solid var(--border-color);
}

.send-btn { 
    width: 120rpx; height: 76rpx; background: #007aff; color: #fff; 
    line-height: 76rpx; border-radius: 38rpx; text-align: center; 
    font-size: 28rpx; font-weight: bold; 
}

.toolbar-compact { 
    background: var(--tool-bg); 
    border-bottom: 1px solid var(--border-color); 
    padding: 16rpx 0; 
}

.tool-scroll {
    width: 100%;
    white-space: nowrap;
}

.tool-flex {
    display: flex;
    flex-wrap: nowrap;
    padding: 0 10rpx;
    align-items: center;
}

.tool-item { 
    display: flex; flex-direction: column; align-items: center; justify-content: center; 
    padding: 10rpx 0; border-radius: 12rpx; 
    flex-shrink: 0;
    width: 120rpx; 
    
    &.active {
        background: rgba(0, 122, 255, 0.1); 
        .tool-text { color: #007aff; font-weight: bold; }
    }
}
.tool-icon { font-size: 36rpx; margin-bottom: 6rpx; }
.tool-text { font-size: 20rpx; color: var(--text-sub); }

/* 🆕 相机二级菜单悬浮层 (横向版) */
.camera-popup {
    position: absolute;
    bottom: 230rpx; /* 根据实际位置微调 */
    left: 50%;
    transform: translateX(-50%);
    
    /* 宽度调整为自适应或更宽，以容纳横向图标 */
    width: auto;
    min-width: 380rpx; 
    
    background: rgba(40, 40, 40, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 20rpx;
    padding: 16rpx 20rpx; /* 增加一点内边距 */
    box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.3);
    z-index: 1000;
    animation: fadeInUp 0.2s ease-out;
    
    /* 小三角箭头 */
    .popup-arrow {
        position: absolute;
        bottom: -12rpx;
        left: 50%;
        margin-left: -12rpx;
        width: 0; height: 0;
        border-left: 12rpx solid transparent;
        border-right: 12rpx solid transparent;
        border-top: 12rpx solid rgba(40, 40, 40, 0.95);
    }

    /* 容器改为横向排列 */
    .camera-actions {
        display: flex;
        flex-direction: row; /* 横向 */
        justify-content: space-around; /* 均匀分布 */
        align-items: center;
    }

    /* 按钮样式改为 上图标-下文字 */
    .action-item {
        display: flex;
        flex-direction: column; /* 纵向堆叠 */
        align-items: center;
        justify-content: center;
        padding: 10rpx 20rpx;
        border-radius: 12rpx;
        
        &:active {
            background: rgba(255,255,255,0.1);
        }

        .icon { 
            font-size: 44rpx; 
            margin-right: 0; /* 移除右边距 */
            margin-bottom: 8rpx; /* 增加下边距 */
        }
        
        .label { 
            font-size: 24rpx; 
            color: #fff; 
            font-weight: normal;
            margin-right: 0;
        }
        
        /* 隐藏原本的描述文字，横向放不下 */
        .desc { display: none; }
    }
}

// 简单的淡入动画
@keyframes fadeInUp {
    from { opacity: 0; transform: translate(-50%, 10rpx); }
    to { opacity: 1; transform: translate(-50%, 0); }
}

/* 适配不同机型，确保菜单位置合理 */
.camera-popup {
    bottom: 230rpx; 
}
</style>