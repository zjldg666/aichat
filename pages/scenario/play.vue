<template>
  <view class="play-container" :class="{ 'dark-mode': isDarkMode }">
    
    <view class="scene-header">
      <view class="header-left" @click="handleLeave">
        <text class="icon">🚪</text>
        <text class="btn-text">离开</text>
      </view>
      
      <view class="scene-info">
        <text class="scene-title">{{ engine.currentScenario.value?.name || '加载中...' }}</text>
        <view class="status-badge" :class="{ loading: engine.loading.value }">
          {{ engine.loading.value ? '🎲 演算中...' : '等待行动' }}
        </view>
      </view>
      
      <view class="header-right">
        <view class="icon-btn" @click="showSceneLog">
          <text class="icon">📜</text>
        </view>
        <view class="icon-btn" @click="goToSettings" style="margin-left: 16rpx;">
          <text class="icon">⚙️</text>
        </view>
      </view>
    </view>

    <scroll-view 
      class="chat-stream" 
      scroll-y 
      :scroll-top="scrollTop" 
      :scroll-into-view="scrollIntoViewId"
      @scrolltoupper="onScrollToUpper"
    >
      <view class="msg-list">
        <view style="height: 20rpx;"></view>

        <view 
          v-for="(msg, index) in engine.messages.value" 
          :key="index" 
          class="msg-wrapper" 
          :id="'msg-' + index"
        >
          
          <view v-if="isSystemRole(msg.role)" class="system-msg">
            <view class="narrative-box">
              <text class="narrative-text">{{ cleanContent(msg.content) }}</text>
            </view>
          </view>

          <view v-else-if="msg.role === 'user'" class="user-msg">
            <view class="bubble user-bubble">
              <text>{{ msg.content }}</text>
            </view>
            <view class="avatar user-avatar">我</view>
          </view>

          <view v-else class="npc-msg">
            <view class="avatar npc-avatar" :style="{ backgroundColor: getNpcColor(msg.role) }">
              {{ msg.role[0] }}
            </view>
            <view class="npc-content">
              <text class="npc-name">{{ msg.role }}</text>
              <view class="bubble npc-bubble">
                <rich-text :nodes="formatNpcText(msg.content)"></rich-text>
              </view>
            </view>
          </view>

        </view>

        <view id="bottom-anchor" style="height: 40rpx;"></view>
      </view>
    </scroll-view>

    <view class="input-area">
      <view class="tool-btn" @click="openInventory">
        <text class="tool-icon">🎒</text>
      </view>
      <input 
        class="chat-input" 
        v-model="inputText" 
        :placeholder="inputPlaceholder" 
        confirm-type="send"
        @confirm="handleSend"
        :disabled="engine.loading.value"
      />
      <view 
        class="send-btn" 
        :class="{ disabled: !inputText.trim() || engine.loading.value }"
        @click="handleSend"
      >
        发送
      </view>
    </view>

  </view>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { useScenarioEngine } from '@/composables/useScenarioEngine.js';
import { useTheme } from '@/composables/useTheme.js';

const { isDarkMode, applyNativeTheme } = useTheme();
const engine = useScenarioEngine();

const inputText = ref("");
const scrollTop = ref(0);
const scrollIntoViewId = ref("");
const inputPlaceholder = ref("描述你的动作，或与某人对话...");
const currentScenarioId = ref(null); // 记录当前ID用于跳转编辑

// 颜色池
const npcColorMap = new Map();
const colorPalette = ['#FF9F43', '#54a0ff', '#5f27cd', '#ff6b6b', '#1dd1a1', '#feca57'];

onLoad(async (opts) => {
  applyNativeTheme();
  console.log("🎮 [Play] 页面加载, ID:", opts.id);
  
  if (opts.id) {
    currentScenarioId.value = opts.id;
    await engine.initScenario(opts.id);
    scrollToBottom();
  }
});

// 监听消息增加，自动滚动
watch(() => engine.messages.value.length, (newVal) => {
  console.log(`📜 [Play] 消息更新，当前条数: ${newVal}`);
  scrollToBottom();
});

// === 核心交互 ===

const handleSend = async () => {
  if (!inputText.value.trim() || engine.loading.value) return;
  const text = inputText.value;
  inputText.value = "";
  
  console.log("📤 [Play] 发送消息:", text);
  await engine.sendText(text);
};

const handleLeave = () => {
  if (engine.loading.value) return uni.showToast({title:'请等待当前回合结束', icon:'none'});
  
  uni.showModal({
    title: '离场存档',
    content: '确定要结束本次探索吗？\nNPC将与你道别，并自动生成剧情日志。',
    confirmColor: '#ff6b6b',
    success: (res) => {
      if (res.confirm) {
        console.log("🚪 [Play] 用户触发离场");
        engine.handleLeaveScene();
      }
    }
  });
};

const openInventory = () => {
  const items = engine.availableItems.value;
  if (!items || items.length === 0) {
    return uni.showToast({ title: '背包里空空如也', icon: 'none' });
  }

  const itemList = items.map(i => `【${i.name}】: ${i.effect.substring(0, 15)}...`);
  
  uni.showActionSheet({
    itemList: itemList,
    success: (res) => {
      const selectedItem = items[res.tapIndex];
      uni.showModal({
        title: `使用 ${selectedItem.name}`,
        editable: true,
        placeholderText: '对谁使用？(例如: 老乔, 锁, 自己)',
        success: (mRes) => {
          if (mRes.confirm) {
            const target = mRes.content || "环境";
            console.log(`🎒 [Play] 使用道具 ${selectedItem.name} -> ${target}`);
            engine.useItem(res.tapIndex, target);
          }
        }
      });
    }
  });
};

const showSceneLog = () => {
  console.log("📜 [Play] 查看当前日志");
  uni.showModal({
    title: '剧情梗概 (Memory)',
    content: engine.sceneLog.value || "暂无记录",
    showCancel: false,
    confirmText: '阅毕'
  });
};

// ✨ 跳转到设置 (Create 页面)
const goToSettings = () => {
    if (!currentScenarioId.value) return;
    console.log("⚙️ [Play] 跳转设置页面");
    uni.navigateTo({
        url: `/pages/scenario/create?id=${currentScenarioId.value}`
    });
};

// === 辅助 ===

const scrollToBottom = () => {
  nextTick(() => {
    scrollIntoViewId.value = "bottom-anchor";
    scrollTop.value += 1; 
  });
};

const isSystemRole = (role) => {
  return ['system', 'Narrator', '旁白', 'system_display'].includes(role);
};

const getNpcColor = (name) => {
  if (!npcColorMap.has(name)) {
    const color = colorPalette[npcColorMap.size % colorPalette.length];
    npcColorMap.set(name, color);
  }
  return npcColorMap.get(name);
};

const cleanContent = (text) => {
  if (!text) return "";
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
};

const formatNpcText = (text) => {
  let clean = cleanContent(text);
  clean = clean.replace(/（(.*?)）|\((.*?)\)/g, (match) => {
    return `<span style="color: #999; font-size: 90%; margin: 0 4px;">${match}</span>`;
  });
  return clean.replace(/\n/g, '<br/>');
};

const onScrollToUpper = () => {};
</script>

<style lang="scss" scoped>
.play-container {
  --bg-color: #f2f5f9;
  --header-bg: #ffffff;
  --text-main: #333;
  --bubble-user: #95ec69;
  --bubble-npc: #ffffff;
  --accent-color: #007aff;
  
  height: 100vh; display: flex; flex-direction: column; background-color: var(--bg-color);
  transition: background 0.3s;
}
.play-container.dark-mode {
  --bg-color: #121212; --header-bg: #1e1e1e; --text-main: #e0e0e0;
  --bubble-user: #005d4b; --bubble-npc: #2c2c2c; --accent-color: #4facfe;
}

/* === 1. 顶部栏 (高度修复) === */
.scene-header {
  /* 关键修改：动态计算顶部 padding，避免额头过大 */
  padding-top: calc(var(--status-bar-height) );
  padding-bottom: 20rpx;
  padding-left: 30rpx;
  padding-right: 30rpx;
  
  background: var(--header-bg);
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05); z-index: 10;

  .header-left {
    display: flex; align-items: center; padding: 10rpx 0;
    &:active { opacity: 0.6; }
    .btn-text { font-size: 26rpx; margin-left: 4rpx; font-weight: bold; color: #ff4757; }
  }
  
  .header-right {
      display: flex; align-items: center;
      .icon-btn { 
          padding: 10rpx; border-radius: 50%; 
          &:active { background: rgba(0,0,0,0.05); }
      }
  }
  
  .icon { font-size: 36rpx; }

  .scene-info {
    display: flex; flex-direction: column; align-items: center;
    .scene-title { font-size: 30rpx; font-weight: 900; color: var(--text-main); }
    .status-badge { 
      font-size: 20rpx; color: #999; margin-top: 4rpx; background: rgba(0,0,0,0.05);
      padding: 2rpx 12rpx; border-radius: 20rpx;
      &.loading { color: var(--accent-color); background: rgba(0,122,255,0.1); }
    }
  }
}

/* === 2. 聊天流 === */
.chat-stream { flex: 1; height: 0; padding: 0 24rpx; box-sizing: border-box; }
.msg-list { display: flex; flex-direction: column; padding-bottom: 30rpx; }
.msg-wrapper { margin-bottom: 30rpx; width: 100%; }

.system-msg {
  display: flex; justify-content: center; margin: 20rpx 0;
  .narrative-box {
    background: rgba(0,0,0,0.04); padding: 12rpx 24rpx; border-radius: 12rpx;
    max-width: 85%; border: 1px dashed rgba(0,0,0,0.1);
  }
  .narrative-text { font-size: 26rpx; color: #7f8c8d; font-style: italic; line-height: 1.5; text-align: center; }
}
.dark-mode .narrative-text { color: #b0b0b0; }

.user-msg {
  display: flex; justify-content: flex-end; align-items: flex-start;
  .avatar {
    width: 80rpx; height: 80rpx; background: #ddd; border-radius: 12rpx;
    display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #666; margin-left: 16rpx;
  }
  .user-bubble {
    background: var(--bubble-user); color: #000; padding: 20rpx 24rpx; border-radius: 12rpx;
    font-size: 30rpx; max-width: 70%; line-height: 1.5; position: relative;
    &::after { content: ''; position: absolute; right: -12rpx; top: 26rpx; border-left: 12rpx solid var(--bubble-user); border-top: 10rpx solid transparent; border-bottom: 10rpx solid transparent; }
  }
}
.dark-mode .user-bubble { color: #fff; }

.npc-msg {
  display: flex; justify-content: flex-start; align-items: flex-start;
  .npc-avatar {
    width: 80rpx; height: 80rpx; border-radius: 12rpx;
    display: flex; align-items: center; justify-content: center; font-size: 32rpx; font-weight: bold; color: #fff; margin-right: 16rpx; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.1);
  }
  .npc-content {
    display: flex; flex-direction: column; align-items: flex-start; max-width: 75%;
    .npc-name { font-size: 22rpx; color: #999; margin-bottom: 6rpx; margin-left: 4rpx; }
    .npc-bubble {
      background: var(--bubble-npc); color: var(--text-main); padding: 20rpx 24rpx; border-radius: 12rpx;
      font-size: 30rpx; line-height: 1.6; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.05); position: relative;
      &::after { content: ''; position: absolute; left: -12rpx; top: 26rpx; border-right: 12rpx solid var(--bubble-npc); border-top: 10rpx solid transparent; border-bottom: 10rpx solid transparent; }
    }
  }
}

/* === 3. 底部输入 === */
.input-area {
  background: var(--header-bg); padding: 20rpx 30rpx; display: flex; align-items: center;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.03);
  .tool-btn { width: 70rpx; height: 70rpx; display: flex; align-items: center; justify-content: center; margin-right: 20rpx; .tool-icon { font-size: 48rpx; } &:active { transform: scale(0.9); } }
  .chat-input { flex: 1; height: 76rpx; background: rgba(0,0,0,0.05); border-radius: 12rpx; padding: 0 24rpx; font-size: 30rpx; color: var(--text-main); }
  .send-btn { margin-left: 20rpx; background: var(--accent-color); color: #fff; padding: 12rpx 32rpx; border-radius: 12rpx; font-size: 28rpx; font-weight: bold; transition: opacity 0.2s; &.disabled { background: #ccc; pointer-events: none; } &:active { opacity: 0.8; } }
}
</style>