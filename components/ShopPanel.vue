<template>
  <view v-if="visible" class="modal-mask" @click="$emit('close')">
    <view class="shop-container" @click.stop>
      <view class="shop-header">
        <text class="title">🛒 手机网购超市</text>
        <view class="wallet-box">
          <text class="wallet-icon">💰</text>
          <text class="wallet-amount">¥{{ wallet }}</text>
        </view>
      </view>
      
      <scroll-view scroll-y class="goods-scroll">
        <view v-for="(cat, idx) in shopCatalog" :key="idx" class="category-block">
          <view class="cat-title">
            <text class="cat-line"></text>
            <text>{{ cat.category }}</text>
            <text class="cat-line"></text>
          </view>
          
          <view class="goods-grid">
            <view v-for="item in cat.items" :key="item.name" class="goods-card">
              <view class="goods-icon">{{ item.icon }}</view>
              <text class="goods-name">{{ item.name }}</text>
              <text class="goods-desc">{{ item.desc }}</text>
              <button class="buy-btn" :class="{ 'disabled': wallet < item.price }" @click="handleBuy(item)">
                ¥{{ item.price }} 购买
              </button>
            </view>
          </view>
        </view>
        <view style="height: 40rpx;"></view> </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  wallet: { type: Number, default: 0 }
});

const emit = defineEmits(['close', 'buy']);

// 🛒 预设商品大字典 (自带属性标签)
const shopCatalog = ref([
  {
    category: '生鲜食材 (存入冰箱)',
    items: [
      { name: '顶级和牛', icon: '🥩', price: 200, type: 'food', desc: '做饭用，香气四溢' },
      { name: '新鲜鸡蛋', icon: '🥚', price: 15, type: 'food', desc: '居家必备食材' },
      { name: '西红柿', icon: '🍅', price: 10, type: 'food', desc: '健康蔬菜' },
      { name: '冰镇啤酒', icon: '🍺', price: 25, type: 'drink', desc: '微醺专属' }
    ]
  },
  {
    category: '日用洗浴 (存入浴室柜)',
    items: [
      { name: '柔软浴球', icon: '🧽', price: 30, type: 'bath', desc: '洗澡互动道具' },
      { name: '玫瑰沐浴露', icon: '🧴', price: 68, type: 'bath', desc: '洗完香喷喷的' },
      { name: '高级搓澡巾', icon: '🧤', price: 18, type: 'bath', desc: '搓背专用神器' }
    ]
  },
  {
    category: '精美礼物 (存入床头柜)',
    items: [
      { name: '红玫瑰花束', icon: '🌹', price: 99, type: 'gift', desc: '送给她增加好感' },
      { name: '心形巧克力', icon: '🍫', price: 50, type: 'gift', desc: '甜蜜的惊喜' }
    ]
  }
]);

const handleBuy = (item) => {
  if (props.wallet < item.price) return;
  emit('buy', item);
};
</script>

<style lang="scss" scoped>
.modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: flex-end; /* 底部弹出 */
}

.shop-container {
  width: 100%;
  height: 75vh;
  background-color: var(--bg-color);
  border-radius: 30rpx 30rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.shop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 40rpx;
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
}

.title {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--text-color);
}

.wallet-box {
  background: rgba(255, 153, 0, 0.1);
  padding: 10rpx 20rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
}

.wallet-amount {
  color: #e67e22;
  font-weight: bold;
  font-size: 28rpx;
  margin-left: 8rpx;
}

.goods-scroll {
  flex: 1;
  padding: 20rpx;
}

.category-block {
  margin-bottom: 40rpx;
}

.cat-title {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  color: var(--text-sub);
  margin-bottom: 20rpx;
  gap: 20rpx;
  
  .cat-line {
    height: 1px;
    width: 60rpx;
    background-color: var(--border-color);
  }
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.goods-card {
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 16rpx;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.goods-icon {
  font-size: 60rpx;
  margin-bottom: 10rpx;
}

.goods-name {
  font-size: 28rpx;
  font-weight: bold;
  color: var(--text-color);
  margin-bottom: 8rpx;
}

.goods-desc {
  font-size: 22rpx;
  color: var(--text-sub);
  margin-bottom: 20rpx;
  height: 60rpx; /* 保证高度对齐 */
}

.buy-btn {
  width: 100%;
  height: 60rpx;
  line-height: 60rpx;
  font-size: 24rpx;
  background-color: #007aff;
  color: white;
  border-radius: 30rpx;
  margin: 0;
  
  &.disabled {
    background-color: #ccc;
    color: #fff;
  }
}
</style>