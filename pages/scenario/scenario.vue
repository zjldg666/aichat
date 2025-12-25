<template>
  <view class="scenario-list-page" :class="{ 'dark-mode': isDarkMode }">
    <view class="nav-header">
      <text class="page-title">小剧场</text>
      <view class="add-btn" @click="goToCreate">
        <text class="add-icon">＋</text>
      </view>
    </view>

    <scroll-view scroll-y class="list-container" @refresherrefresh="onRefresh" refresher-enabled :refresher-triggered="isRefreshing">
      
      <view v-if="scenarios.length === 0" class="empty-state">
        <text class="empty-icon">🎭</text>
        <text class="empty-text">暂无剧本</text>
        <button class="create-btn" @click="goToCreate">创建第一个世界</button>
      </view>

      <view v-else class="card-list">
        <view 
          v-for="(item, index) in scenarios" 
          :key="item.id" 
          class="scenario-card"
          @click="enterScenario(item.id)"
        >
          <view class="card-content">
            <view class="card-top">
              <text class="sc-name">{{ item.name }}</text>
              <text class="sc-time">{{ formatTime(item.created_at) }}</text>
            </view>
            <text class="sc-desc">{{ item.description }}</text>
            <view class="sc-footer">
              <text class="sc-tag">NPC: {{ parseCount(item.npcs) }}人</text>
              <text class="sc-tag">道具: {{ parseCount(item.items) }}个</text>
            </view>
          </view>
          <view class="card-arrow">›</view>
        </view>
      </view>
      
      <view style="height: 120rpx;"></view>
    </scroll-view>

    <custom-tab-bar :current="1"></custom-tab-bar>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { DB } from '@/utils/db.js';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { useTheme } from '@/composables/useTheme.js';

const { isDarkMode, applyNativeTheme } = useTheme();
const scenarios = ref([]);
const isRefreshing = ref(false);

onShow(() => {
  applyNativeTheme();
  loadScenarios();
});

const loadScenarios = async () => {
  try {
    // 按创建时间倒序查
    const res = await DB.select('SELECT * FROM scenarios ORDER BY created_at DESC');
    scenarios.value = res || [];
  } catch (e) {
    console.error(e);
  } finally {
    isRefreshing.value = false;
  }
};

const onRefresh = () => {
  isRefreshing.value = true;
  loadScenarios();
};

const goToCreate = () => {
  uni.navigateTo({ url: '/pages/scenario/create' });
};

const enterScenario = (id) => {
  uni.navigateTo({ url: `/pages/scenario/play?id=${id}` });
};

// 辅助函数
const formatTime = (ts) => {
  if (!ts) return '';
  const date = new Date(ts);
  return `${date.getMonth()+1}/${date.getDate()}`;
};

const parseCount = (jsonStr) => {
  try {
    const arr = JSON.parse(jsonStr);
    return Array.isArray(arr) ? arr.length : 0;
  } catch (e) { return 0; }
};
</script>

<style lang="scss" scoped>
.scenario-list-page {
  --bg-color: #f5f7fa;
  --card-bg: #ffffff;
  --text-main: #333;
  --text-sub: #999;
  --accent: #007aff;
  
  min-height: 100vh;
  background: var(--bg-color);
  display: flex; flex-direction: column;
}

.scenario-list-page.dark-mode {
  --bg-color: #0d0d0d;
  --card-bg: #1a1a1a;
  --text-main: #eee;
  --text-sub: #666;
  --accent: #448aff;
}

.nav-header {
  padding: 100rpx 40rpx 30rpx;
  display: flex; justify-content: space-between; align-items: center;
  background: var(--bg-color);
  .page-title { font-size: 40rpx; font-weight: 900; color: var(--text-main); }
  .add-btn { 
    width: 60rpx; height: 60rpx; background: var(--text-main); border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }
  .add-icon { color: var(--bg-color); font-size: 40rpx; margin-top: -4rpx;}
}

.list-container { flex: 1; height: 0; }

.empty-state {
  display: flex; flex-direction: column; align-items: center; margin-top: 200rpx;
  .empty-icon { font-size: 80rpx; margin-bottom: 20rpx; opacity: 0.5; }
  .empty-text { color: var(--text-sub); margin-bottom: 40rpx; }
  .create-btn { 
    background: var(--text-main); color: var(--bg-color); 
    border-radius: 40rpx; padding: 0 40rpx; font-size: 28rpx;
  }
}

.card-list { padding: 0 30rpx; }

.scenario-card {
  background: var(--card-bg);
  padding: 30rpx; border-radius: 24rpx; margin-bottom: 24rpx;
  display: flex; justify-content: space-between; align-items: center;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
  
  .card-content { flex: 1; margin-right: 20rpx; }
  
  .card-top { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
  .sc-name { font-size: 32rpx; font-weight: bold; color: var(--text-main); }
  .sc-time { font-size: 24rpx; color: var(--text-sub); }
  
  .sc-desc { 
    font-size: 26rpx; color: var(--text-sub); 
    display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
    margin-bottom: 20rpx; line-height: 1.4;
  }
  
  .sc-footer { display: flex; gap: 16rpx; }
  .sc-tag { 
    font-size: 20rpx; color: var(--accent); 
    background: rgba(0,122,255,0.1); padding: 4rpx 12rpx; border-radius: 8rpx; 
  }
  
  .card-arrow { color: var(--text-sub); font-size: 40rpx; }
}
</style>