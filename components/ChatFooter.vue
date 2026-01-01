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
      
      <view class="toolbar-compact" v-if="isToolbarOpen">
              <view class="tool-grid">
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
                  style="width: 100%;" 
                >
                  <view class="tool-item">
                    <view class="tool-icon">🛌</view>
                    <text class="tool-text">睡到...</text>
                  </view>
                </picker>
                
                <view class="tool-item" @click="$emit('clickCamera')" v-if="!isEmbedded">
                  <view class="tool-icon">📸</view>
                  <text class="tool-text">拍照</text>
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
defineProps({
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
  'clickCamera', 'clickContinue', 'toggleThought'
]);

// 处理 picker 的 change 事件并转发
const onPickerChange = (e) => {
  emit('sleepTimeChange', e);
};
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
    padding: 16rpx 10rpx; 
}

.tool-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10rpx; }
.tool-item { 
    display: flex; flex-direction: column; align-items: center; justify-content: center; 
    padding: 10rpx 0; border-radius: 12rpx; 
}
.tool-icon { font-size: 36rpx; margin-bottom: 6rpx; }
.tool-text { font-size: 20rpx; color: var(--text-sub); }
</style>