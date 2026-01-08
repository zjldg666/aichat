<template>
  <view>
    <view class="time-panel-mask" v-if="visibleModal === 'timeSkip'" @click="close">
      <view class="time-panel" @click.stop>
        <view class="panel-title">时间跳跃</view>
        <view class="grid-actions">
          <view class="grid-btn" @click="$emit('timeSkip', 'morning')">🌤️ 一上午过去</view>
          <view class="grid-btn" @click="$emit('timeSkip', 'afternoon')">🌇 一下午过去</view>
          <view class="grid-btn" @click="$emit('timeSkip', 'night')">🌙 一晚上过去</view>
          <view class="grid-btn" @click="$emit('timeSkip', 'day')">📅 一整天过去</view>
        </view>
        <view class="custom-time">
          <text>快进分钟：</text>
          <input class="mini-input" type="number" v-model="localCustomMinutes" placeholder="30"/>
          <view class="mini-btn" @click="$emit('timeSkip', 'custom', localCustomMinutes)">确定</view>
        </view>
      </view>
    </view>

    <view class="time-panel-mask" v-if="visibleModal === 'timeSetting'" @click="close">
      <view class="time-panel" @click.stop>
        <view class="panel-title">设定具体时间</view>
        <view class="setting-row">
            <text class="setting-label">日期：</text>
            <picker mode="date" :value="tempDateStr" @change="(e) => $emit('update:tempDateStr', e.detail.value)">
                <view class="picker-display">{{ tempDateStr }}</view>
            </picker>
        </view>
        <view class="setting-row">
            <text class="setting-label">时间：</text>
            <picker mode="time" :value="tempTimeStr" @change="(e) => $emit('update:tempTimeStr', e.detail.value)">
                <view class="picker-display">{{ tempTimeStr }}</view>
            </picker>
        </view>
        <view class="setting-row">
            <text class="setting-label">流速：</text>
            <view class="ratio-input-box">
                <text class="txt">现实 1s = 游戏</text>
                <input class="mini-input" type="number" :value="tempTimeRatio" @input="(e) => $emit('update:tempTimeRatio', e.detail.value)" />
                <text class="txt">s</text>
            </view>
        </view>
        <button class="confirm-time-btn" @click="$emit('confirmTime')">确认修改</button>
      </view>
    </view>

    <view class="time-panel-mask" v-if="visibleModal === 'location'" @click="close">
      <view class="time-panel" @click.stop>
        <view class="panel-title">前往哪里？</view>
        <view class="grid-actions">
          <view 
            class="grid-btn" 
            v-for="(loc, index) in locationList" 
            :key="index"
            @click="$emit('moveTo', loc)"
            :style="loc.style || ''"
          >
            <text>{{ loc.icon }} {{ loc.name }}</text>
            <span v-if="loc.detail" style="font-size:20rpx; opacity:0.7;">{{ loc.detail }}</span>
          </view>
        </view>
        <view class="custom-time">
          <text>自定义地点：</text>
          <input class="mini-input" v-model="localCustomLocation" placeholder="输入地点"/>
          <view class="mini-btn" @click="handleCustomMove">出发</view>
        </view>
      </view>
    </view>

    <view class="time-panel-mask" v-if="visibleModal === 'forceLocation'" @click="close">
      <view class="time-panel" @click.stop>
        <view class="panel-title" style="color: #ff9800;">🛠️ 强制修正坐标 (不通知AI)</view>
        <view class="grid-actions">
          <view class="grid-btn" v-for="(loc, index) in locationList" :key="index" 
              @click="$emit('forceMove', loc)" :style="loc.style || ''">
            <text>{{ loc.icon }} {{ loc.name }}</text>
            <span v-if="loc.detail" style="font-size:20rpx; opacity:0.7;">{{ loc.detail }}</span>
          </view>
        </view>
        <view class="custom-time">
          <text>自定义：</text>
          <input class="mini-input" v-model="localForceLocation" placeholder="输入地点" />
          <view class="mini-btn" @click="handleCustomForce">修正</view>
        </view>
      </view>
    </view>

    <!-- 衣柜弹窗 -->
    <view class="time-panel-mask" v-if="visibleModal === 'wardrobe'" @click="close">
      <ChatWardrobe 
        :list="wardrobeList"
        :currentRole="currentRole || {}"
        @update:list="(val) => $emit('update:wardrobeList', val)"
        @apply="(val) => $emit('applyOutfit', val)"
        @close="close"
      />
    </view>

  </view>
</template>

<script setup>
import { ref, watch } from 'vue';
import ChatWardrobe from './ChatWardrobe.vue';

const props = defineProps({
  // 控制显示哪个弹窗: '' | 'timeSkip' | 'timeSetting' | 'location' | 'forceLocation' | 'wardrobe'
  visibleModal: { type: String, default: '' },
  
  // 数据源
  locationList: { type: Array, default: () => [] },
  wardrobeList: { type: Array, default: () => [] }, // 新增
  tempDateStr: { type: String, default: '' },
  tempTimeStr: { type: String, default: '' },
  tempTimeRatio: { type: [Number, String], default: 1 }
});

const emit = defineEmits([
  'close', 
  'timeSkip', 
  'confirmTime', 
  'moveTo', 
  'forceMove',
  'update:tempDateStr', 
  'update:tempTimeStr', 
  'update:tempTimeRatio',
  'update:customMinutes',
  'update:wardrobeList', // 新增
  'applyOutfit'          // 新增
]);

// 内部状态 (将临时输入框状态移入组件，净化父组件)
const localCustomMinutes = ref('');
const localCustomLocation = ref('');
const localForceLocation = ref('');

// 辅助方法
const close = () => {
  emit('close');
};

const handleCustomMove = () => {
  emit('moveTo', { name: localCustomLocation.value, type: 'custom' });
  localCustomLocation.value = ''; // 清空
};

const handleCustomForce = () => {
  emit('forceMove', { name: localForceLocation.value });
  localForceLocation.value = ''; // 清空
};

// 监听 props 变化同步自定义分钟 (可选)
watch(() => props.visibleModal, (val) => {
    // 每次打开弹窗可以重置一下状态
    if (!val) {
        // 关闭时逻辑
    }
});
</script>

<style lang="scss" scoped>
/* ==========================================================================
   通用弹窗样式 (直接从原 chat.vue 迁移)
   ========================================================================== */
.time-panel-mask { 
    position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
    background: rgba(0,0,0,0.5); z-index: 999; 
    display: flex; justify-content: center; align-items: center; 
}

.time-panel { 
    width: 600rpx; 
    background: var(--card-bg); 
    border-radius: 24rpx; padding: 40rpx 30rpx; 
    animation: popCenter 0.25s; 
}

@keyframes popCenter { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.panel-title { 
    font-size: 34rpx; font-weight: bold; text-align: center; margin-bottom: 40rpx; 
    color: var(--text-color); 
}

.grid-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; max-height: 60vh; overflow-y: auto; }

.grid-btn { 
    background: var(--bg-color); 
    color: #007aff; text-align: center; padding: 24rpx 0; border-radius: 12rpx; font-size: 28rpx; 
}

.custom-time { display: flex; align-items: center; justify-content: center; margin-top: 30rpx; gap: 10rpx; }

.mini-input { 
    width: 100rpx; 
    border-bottom: 1px solid var(--border-color); 
    text-align: center; color: var(--text-color);
}

.mini-btn { 
    background: var(--tool-bg); 
    padding: 10rpx 20rpx; border-radius: 8rpx; font-size: 24rpx; color: var(--text-color);
}

.setting-row { display: flex; align-items: center; margin-bottom: 30rpx; justify-content: center; }

.picker-display { 
    border: 1px solid var(--border-color); 
    padding: 10rpx 30rpx; border-radius: 10rpx; min-width: 240rpx; text-align: center; 
    background: var(--input-bg); 
    color: var(--text-color);
}

.confirm-time-btn { background: #007aff; color: #fff; width: 100%; border-radius: 40rpx; margin-top: 20rpx; }

.ratio-input-box {
    display: flex; align-items: center; 
    background: var(--tool-bg); 
    padding: 8rpx 20rpx; border-radius: 10rpx;
    
    .txt { font-size: 24rpx; color: var(--text-sub); }
    .mini-input { 
        width: 80rpx; text-align: center; font-weight: bold; color: #007aff; 
        border-bottom: 2rpx solid #007aff; margin: 0 10rpx; 
    }
}
</style>