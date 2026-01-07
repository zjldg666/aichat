<template>
  <view v-if="visible" class="door-modal-mask" @touchmove.stop.prevent>
    <view class="door-modal-content">
      <!-- 1. 顶部状态栏 -->
      <view class="door-header">
        <text class="door-title">🚪 门外 ({{ npc.location || '未知地点' }})</text>
        <view class="close-btn" @click="handleClose">离开</view>
      </view>

      <!-- 2. 视觉区域 (门) -->
      <view class="door-visual">
        <view class="door-frame">
          <view class="door-panel" :class="{ 'door-opening': isOpening }">
            <view class="door-knob"></view>
            <view class="door-plate">{{ npc.name }} 的房间</view>
          </view>
          <!-- 门后的角色头像 (半透明/模糊) -->
          <image 
            v-if="npc.avatar" 
            :src="npc.avatar" 
            class="hidden-avatar" 
            mode="aspectFill"
          ></image>
        </view>
        <view class="status-text">{{ statusText }}</view>
      </view>

      <!-- 3. 对话区域 -->
      <scroll-view 
        scroll-y 
        class="door-chat-scroll" 
        :scroll-top="scrollTop"
        scroll-with-animation
      >
        <view class="chat-inner">
          <view v-for="(msg, index) in messages" :key="index" class="msg-row" :class="msg.role">
            <view class="msg-bubble">
              <text class="msg-name">{{ msg.role === 'user' ? '我' : '门内' }}</text>
              <text class="msg-text">{{ msg.content }}</text>
            </view>
          </view>
          <view v-if="isTyping" class="msg-row model">
             <view class="msg-bubble typing">
                 <text>...</text>
             </view>
          </view>
        </view>
      </scroll-view>

      <!-- 4. 输入区域 -->
      <view class="door-input-area">
        <input 
          class="door-input" 
          v-model="inputText" 
          placeholder="说点什么..." 
          :disabled="isTyping || isOpening"
          @confirm="sendMessage"
        />
        <view 
          class="send-btn" 
          :class="{ disabled: !inputText.trim() || isTyping }"
          @click="sendMessage"
        >
          喊话
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue';
import { LLM } from '@/services/llm.js';

const props = defineProps({
  visible: { type: Boolean, default: false },
  npc: { type: Object, required: true }, // 目标角色对象
  playerProfile: { type: Object, default: () => ({ name: '玩家' }) } // 玩家在该世界的档案
});

const emit = defineEmits(['close', 'open', 'save-history']);

// 状态
const messages = ref([]);
const inputText = ref('');
const isTyping = ref(false);
const isOpening = ref(false);
const statusText = ref('你敲了敲门...');
const scrollTop = ref(0);

// 监听打开，触发初始剧情
watch(() => props.visible, (val) => {
  if (val) {
    resetState();
    startKnockingSequence();
  }
});

const resetState = () => {
  messages.value = [];
  inputText.value = '';
  isTyping.value = false;
  isOpening.value = false;
  statusText.value = '你敲了敲门...';
};

const scrollToBottom = () => {
  nextTick(() => {
    scrollTop.value = 99999;
  });
};

// --- 核心逻辑 ---

const startKnockingSequence = async () => {
  console.log(`[Door] Knocking on ${props.npc.name}'s door`);
  
  // 1. 模拟敲门等待
  await new Promise(r => setTimeout(r, 1000));
  statusText.value = '等待回应...';
  
  // 2. 发送给 LLM 获取初始反应
  // 构造 Prompt
  const prompt = buildDoorPrompt('INITIAL_KNOCK');
  await callLLM(prompt, true);
};

const sendMessage = async () => {
  const text = inputText.value.trim();
  if (!text || isTyping.value) return;

  // 1. 上屏
  messages.value.push({ role: 'user', content: text });
  inputText.value = '';
  scrollToBottom();

  // 2. 调用 LLM
  const prompt = buildDoorPrompt('CONVERSATION', text);
  await callLLM(prompt);
};

// 构造 Prompt
const buildDoorPrompt = (type, userContent = '') => {
  const npc = props.npc;
  const player = props.playerProfile;
  
  // 基础设定
  let system = `
    [Roleplay Setting]
    You are ${npc.name}. 
    Location: Inside your room (${npc.location || 'Home'}).
    Status: Behind a CLOSED door. You cannot see outside yet.
    Player: ${player.name} (Knocking outside).
    Relationship: ${npc.relation || 'Unknown'}.
    Affection: ${npc.affection || 0}.
    Current Activity: ${npc.lastActivity || 'Resting'}.
    
    [Instruction]
    The user is outside knocking or speaking through the door.
    Interact with them naturally from BEHIND the door.
    
    [Rules]
    1. Keep responses SHORT (under 30 words).
    2. If you decide to OPEN the door, append exactly "((OPEN_DOOR))" to the end of your response.
    3. If you refuse, just say so or make an excuse.
    4. If you are sleeping or busy, you might be annoyed or slow to answer.
  `;

  let userMsg = '';
  
  if (type === 'INITIAL_KNOCK') {
    userMsg = `(Knocks on the door) *Knock knock knock*`;
    system += `\n[Event] Someone just knocked. You don't know who it is for sure yet, or maybe you recognize the knock. React naturally (e.g., "Who is it?", "Coming!", or silence).`;
  } else {
    userMsg = userContent;
  }

  // 构造历史消息上下文 (最近 4 条，避免太长)
  const history = messages.value.slice(-4).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }));

  return { system, userMsg, history };
};

// 调用 LLM
const callLLM = async ({ system, userMsg, history }, isInitial = false) => {
  isTyping.value = true;
  statusText.value = '门内有动静...';
  
  try {
    const config = uni.getStorageSync('app_llm_schemes')?.[uni.getStorageSync('app_current_scheme_index') || 0] 
                   || uni.getStorageSync('app_api_config');

    if (!config) {
        throw new Error('未配置 LLM');
    }

    const messagesPayload = [
        { role: 'system', content: system },
        ...history,
        { role: 'user', content: userMsg }
    ];

    const response = await LLM.chat({
        config,
        messages: messagesPayload,
        temperature: 0.7,
        maxTokens: 100
    });

    console.log(`[Door] AI Response: ${response}`);

    // 解析动作
    let cleanText = response;
    let shouldOpen = false;

    if (response.includes('((OPEN_DOOR))')) {
        shouldOpen = true;
        cleanText = response.replace('((OPEN_DOOR))', '').trim();
    }

    // AI 回复上屏
    if (cleanText) {
        messages.value.push({ role: 'assistant', content: cleanText });
    } else if (shouldOpen && isInitial) {
        // 如果直接开门没说话
        messages.value.push({ role: 'assistant', content: '(门开了)' });
    }

    scrollToBottom();

    // 处理结果
    if (shouldOpen) {
        statusText.value = '门锁转动了...';
        isOpening.value = true;
        isTyping.value = false;
        
        // 播放开门动画并跳转
        setTimeout(() => {
            emit('save-history', messages.value); // 保存这次对话记录
            emit('open'); // 通知父组件跳转
        }, 1000);
    } else {
        statusText.value = '对话中...';
        isTyping.value = false;
    }

  } catch (e) {
    console.error('[Door] LLM Error:', e);
    isTyping.value = false;
    statusText.value = '没反应...';
    uni.showToast({ title: '无回应', icon: 'none' });
  }
};

const handleClose = () => {
    emit('close');
};

</script>

<style scoped>
.door-modal-mask {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(5px);
    z-index: 2000;
    display: flex; align-items: center; justify-content: center;
}

.door-modal-content {
    width: 600rpx; height: 800rpx;
    background: #fff;
    border-radius: 24rpx;
    display: flex; flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20rpx 40rpx rgba(0,0,0,0.3);
}

.door-header {
    height: 80rpx;
    display: flex; justify-content: space-between; align-items: center;
    padding: 0 30rpx;
    background: #f8f9fa;
    border-bottom: 1px solid #eee;
}
.door-title { font-size: 28rpx; font-weight: bold; color: #333; }
.close-btn { font-size: 26rpx; color: #999; padding: 10rpx; }

/* 门视觉 */
.door-visual {
    height: 240rpx;
    background: #e9ecef;
    position: relative;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    border-bottom: 1px solid #eee;
}

.door-frame {
    width: 140rpx; height: 200rpx;
    background: #495057;
    border-radius: 8rpx;
    position: relative;
    overflow: hidden;
}

.door-panel {
    width: 100%; height: 100%;
    background: #865c46; /* 木门色 */
    position: absolute; top: 0; left: 0;
    border: 2rpx solid #5c3a2a;
    box-sizing: border-box;
    transition: transform 1s ease-in-out;
    transform-origin: left center;
    z-index: 2;
    display: flex; align-items: center; justify-content: center;
}

.door-panel.door-opening {
    transform: perspective(600px) rotateY(-80deg);
}

.door-knob {
    width: 12rpx; height: 12rpx;
    background: #ffd700;
    border-radius: 50%;
    position: absolute;
    right: 16rpx; top: 50%;
}

.door-plate {
    font-size: 10rpx; color: rgba(255,255,255,0.7);
    border: 1px solid rgba(255,255,255,0.3);
    padding: 2rpx 4rpx;
    margin-top: -40rpx;
}

.hidden-avatar {
    width: 100%; height: 100%;
    filter: blur(2px) brightness(0.7);
    z-index: 1;
}

.status-text {
    position: absolute; bottom: 10rpx;
    font-size: 22rpx; color: #666;
    background: rgba(255,255,255,0.8);
    padding: 4rpx 12rpx; border-radius: 20rpx;
}

/* 聊天区 */
.door-chat-scroll {
    flex: 1;
    background: #f1f3f5;
    padding: 20rpx;
    box-sizing: border-box;
    overflow-y: auto;
}
.chat-inner { display: flex; flex-direction: column; gap: 16rpx; padding-bottom: 20rpx; }

.msg-row { display: flex; width: 100%; }
.msg-row.user { justify-content: flex-end; }
.msg-row.assistant { justify-content: flex-start; }
.msg-row.model { justify-content: flex-start; }

.msg-bubble {
    max-width: 80%;
    padding: 12rpx 20rpx;
    border-radius: 16rpx;
    font-size: 26rpx;
    line-height: 1.4;
    position: relative;
}
.msg-row.user .msg-bubble { background: #007aff; color: #fff; border-bottom-right-radius: 4rpx; }
.msg-row.assistant .msg-bubble { background: #fff; color: #333; border-bottom-left-radius: 4rpx; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.05); }
.msg-bubble.typing { color: #999; font-style: italic; }

.msg-name {
    font-size: 20rpx; display: block; margin-bottom: 4rpx; opacity: 0.7;
}

/* 输入区 */
.door-input-area {
    height: 100rpx;
    background: #fff;
    border-top: 1px solid #eee;
    display: flex; align-items: center;
    padding: 0 20rpx;
    gap: 16rpx;
}
.door-input {
    flex: 1;
    height: 72rpx;
    background: #f5f5f5;
    border-radius: 36rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
}
.send-btn {
    padding: 10rpx 24rpx;
    background: #007aff;
    color: #fff;
    border-radius: 30rpx;
    font-size: 26rpx;
    transition: opacity 0.2s;
}
.send-btn.disabled { background: #ccc; }
</style>