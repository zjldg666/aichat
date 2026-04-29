<template>
  <view v-if="visible && resident" class="phone-chat-mask" @click="handleMaskClose">
    <view class="phone-chat-sheet" @click.stop>
      <view class="phone-chat-header">
        <view class="phone-chat-header-copy">
          <image
            :src="resident.avatar || '/static/ai-avatar.png'"
            mode="aspectFill"
            class="phone-chat-avatar"
          ></image>
          <view class="phone-chat-title-wrap">
            <text class="phone-chat-title">{{ resident.name || resident.residentName || '联系人' }}</text>
            <text class="phone-chat-subtitle">{{ resolvedEntryLabel }}</text>
            <text v-if="autonomousSummaryHint" class="phone-chat-context">{{ autonomousSummaryHint }}</text>
          </view>
        </view>
        <text class="phone-chat-close" @click="emit('close')">关闭</text>
      </view>

      <scroll-view
        scroll-y
        class="phone-chat-messages"
        :scroll-into-view="scrollIntoView"
        :scroll-with-animation="true"
      >
        <view class="phone-chat-message-list">
          <view
            v-for="(msg, index) in messageList"
            :key="msg.id || index"
            :id="`phone-msg-${index}`"
            class="phone-chat-message-item"
            :class="{
              'phone-chat-message-item--self': msg.role === 'user',
              'phone-chat-message-item--system': msg.isSystem
            }"
          >
            <text v-if="msg.isSystem" class="phone-chat-system-text">{{ msg.content }}</text>
            <view v-else class="phone-chat-bubble">
              <text class="phone-chat-bubble-text">{{ msg.content }}</text>
            </view>
          </view>

          <view v-if="isLoading" class="phone-chat-message-item phone-chat-message-item--system">
            <text class="phone-chat-system-text">对方正在输入...</text>
          </view>

          <view id="phone-chat-bottom" style="height: 1px;"></view>
        </view>
      </scroll-view>

      <view class="phone-chat-footer">
        <input
          class="phone-chat-input"
          :value="draft"
          :disabled="isLoading"
          confirm-type="send"
          :placeholder="inputPlaceholder"
          @input="handleInput"
          @confirm="handleSend"
        />
        <button class="phone-chat-send" :disabled="!canSend || isLoading" @click="handleSend">
          发送
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { LLM, getCurrentLlmConfig } from '@/services/llm.js';
import { messageService } from '@/services/messageService.js';
import { cleanAiResponse } from '@/utils/textUtils.js';
import { buildSystemPrompt } from '@/core/prompt-builder.js';
import { buildResidentPhoneChatId } from '@/utils/town/town-entry-links.js';
import { buildSceneChatMemoryContext } from '@/utils/town/town-scene-chat.js';
import { createResidentPhoneHomeVisitIntent } from '@/utils/town/town-player-intent-followups.js';
import { settlePlayerIntentFollowUp } from '@/utils/town/town-player-intent-settlement.js';
import {
  buildPhoneRemoteConversationSystemOverride,
  buildPhoneRemoteRewritePrompt,
  containsPhoneFaceToFaceAction,
  fallbackRewritePhoneReply
} from '@/utils/town/town-phone-chat-guard.js';
import { DB } from '@/utils/db.js';
import { useCharacterStore } from '@/stores/useCharacterStore.js';
import { useTownStore } from '@/stores/useTownStore.js';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  resident: {
    type: Object,
    default: null
  },
  playerName: {
    type: String,
    default: '玩家'
  },
  townTimeText: {
    type: String,
    default: ''
  },
  channelLabel: {
    type: String,
    default: '手机'
  },
  entryLabel: {
    type: String,
    default: '手机聊天'
  },
  threadPrefix: {
    type: String,
    default: 'phone'
  }
});

const emit = defineEmits(['close', 'open', 'sent', 'received']);

const townStore = useTownStore();
const charStore = useCharacterStore();
const draft = ref('');
const isLoading = ref(false);
const messageList = ref([]);
const scrollIntoView = ref('');
const activePlayerIntentSession = ref(null);
const activeIntentSystemOverride = ref('');

const resolvedChannelLabel = computed(() => String(props.channelLabel || '').trim() || '手机');
const resolvedEntryLabel = computed(() => String(props.entryLabel || '').trim() || '手机聊天');
const autonomousSummaryHint = computed(() => String(
  props.resident?.autonomousSummaryPreview
  || props.resident?.townRuntime?.autonomy?.recentConversationSummaries?.[0]?.summary
  || ''
).trim());
const phoneRemoteSystemOverride = computed(() => buildPhoneRemoteConversationSystemOverride());
const inputPlaceholder = computed(() => (
  resolvedChannelLabel.value === '手机'
    ? '发一条消息'
    : `发一条${resolvedChannelLabel.value}消息`
));
const phoneChatId = computed(() => buildResidentPhoneChatId(
  props.resident?.residentId || props.resident?.id || '',
  props.threadPrefix
));
const canSend = computed(() => draft.value.trim().length > 0);

watch(
  () => [props.visible, phoneChatId.value],
  async ([visible, chatId]) => {
    if (!visible || !chatId) {
      resetPhoneIntentSession();
      return;
    }

    await initializeResidentSession();
    await loadHistory();
    scrollToBottom();
    emit('open', {
      residentId: props.resident?.residentId || props.resident?.id || '',
      chatId
    });
  },
  { immediate: false }
);

function handleMaskClose() {
  emit('close');
}

function resetPhoneIntentSession() {
  activePlayerIntentSession.value = null;
  activeIntentSystemOverride.value = '';
}

function resolveResidentId() {
  return String(props.resident?.residentId || props.resident?.id || '').trim();
}

async function initializeResidentSession() {
  const residentId = resolveResidentId();
  if (!residentId) return;

  if (typeof charStore.loadCharacterById === 'function') {
    await charStore.loadCharacterById(residentId);
  }

  if (typeof townStore.markResidentPhoneReplyRead === 'function') {
    await townStore.markResidentPhoneReplyRead({
      residentId
    });
  } else if (typeof townStore.markResidentRemoteReplyRead === 'function') {
    await townStore.markResidentRemoteReplyRead({
      residentId
    });
  }

  syncResidentPhoneState({
    unread: 0
  });
}

function handleInput(event) {
  draft.value = event?.detail?.value || '';
}

function scrollToBottom() {
  nextTick(() => {
    scrollIntoView.value = '';
    setTimeout(() => {
      scrollIntoView.value = 'phone-chat-bottom';
    }, 30);
  });
}

async function loadHistory() {
  const chatId = phoneChatId.value;
  if (!chatId) {
    messageList.value = [];
    return;
  }

  const history = await messageService.getMessages(chatId);
  messageList.value = (history || []).map((item) => ({
    ...item,
    isSystem: !!item.isSystem
  }));
}

async function persistMessage(msg) {
  if (!phoneChatId.value || !msg) return;
  await messageService.saveMessage(phoneChatId.value, msg);
}

function syncResidentPhoneState(patch = {}) {
  const residentId = resolveResidentId();
  if (!residentId) return;

  const activeResident = townStore.activeResidents.find(
    (item) => String(item.id || '').trim() === residentId
  ) || null;

  if (activeResident) {
    Object.assign(activeResident, patch);
  }

  if (charStore.currentCharacter && String(charStore.currentCharacter.id || '').trim() === residentId) {
    charStore.saveCharacterData(patch);
  }
}

function syncPhoneVisitIntentFromUserMessage(userContent = '') {
  const nextIntent = createResidentPhoneHomeVisitIntent({
    userContent,
    playerName: props.playerName || '玩家',
    resident: props.resident || {},
    worldTemplate: townStore.activeWorld || {},
    residents: townStore.activeResidents || []
  });

  if (!nextIntent) {
    return;
  }

  activePlayerIntentSession.value = nextIntent.session;
  activeIntentSystemOverride.value = nextIntent.promptContext?.systemOverride || '';
}

async function appendPhoneVisitAccessMessage(payload = null) {
  if (!payload?.residentName || !payload?.locationName) {
    return;
  }

  const systemMsg = {
    id: `phone-home-visit-approved-${Date.now()}-${Math.random()}`,
    role: 'system',
    content: `【拜访已约好】${payload.residentName}同意你去${payload.locationName}拜访了。现在再去拜访就能进门。`,
    type: 'text',
    isSystem: true
  };

  systemMsg.content = '【拜访已记录】这次电话里的拜访许可已经记下了；之后你从住处入口进入时，系统会按这次约定处理。';
  messageList.value.push(systemMsg);
  await persistMessage(systemMsg);
  scrollToBottom();
}

async function fetchActiveMemoryContext() {
  const residentId = resolveResidentId();
  const days = Number(props.resident?.activeMemoryDays) || 3;
  const sceneMemoryContext = buildSceneChatMemoryContext(props.resident || {}, 2);

  if (!residentId || days <= 0) return sceneMemoryContext;

  try {
    const logs = await DB.select(
      `SELECT dateStr, brief FROM diaries WHERE roleId = ? ORDER BY id DESC LIMIT ${days}`,
      [residentId]
    );
    if (!logs || logs.length === 0) return sceneMemoryContext;

    return [
      sceneMemoryContext,
      `【Recent Memories (${days} days range)】\n${
        logs.slice().reverse().map((log) => `[${log.dateStr}]: ${log.brief}`).join('\n')
      }`
    ]
      .filter(Boolean)
      .join('\n\n');
  } catch (error) {
    return sceneMemoryContext;
  }
}

function buildPhonePrompt() {
  const resident = props.resident || {};
  return buildSystemPrompt({
    role: resident,
    userName: props.playerName || '玩家',
    summary: resident.summary || '',
    formattedTime: props.townTimeText || '',
    location: resident.townRuntime?.currentLocationName || resident.currentLocation || resident.currentLocationName || '',
    mode: 'phone',
    activity: resident.townRuntime?.currentAction || resident.currentAction || resident.lastActivity || '',
    clothes: resident.clothing || '',
    relation: resident.playerRelationship?.summaryText || resident.relation || ''
  });
}

async function ensurePhoneReplyRemoteOnly(content = '', config = null) {
  const normalized = String(content || '').trim();
  if (!containsPhoneFaceToFaceAction(normalized)) {
    return normalized;
  }

  const fallbackContent = fallbackRewritePhoneReply({
    content: normalized,
    session: activePlayerIntentSession.value
  });

  if (!config?.apiKey) {
    return fallbackContent;
  }

  try {
    const rewrittenReply = await LLM.chat({
      config,
      systemPrompt: buildPhoneRemoteRewritePrompt({
        residentName: props.resident?.name || props.resident?.residentName || '',
        intentType: activePlayerIntentSession.value?.intentType || ''
      }),
      messages: [
        {
          role: 'user',
          content: normalized
        }
      ],
      temperature: 0.2,
      maxTokens: 400
    });
    const rewrittenContent = cleanAiResponse(rewrittenReply).trim();

    if (rewrittenContent && !containsPhoneFaceToFaceAction(rewrittenContent)) {
      return rewrittenContent;
    }
  } catch (error) {
    console.error('[TownPhoneChatSheet] failed to rewrite phone reply as remote-only content', error);
  }

  return fallbackContent;
}

async function handleSend() {
  if (!canSend.value || isLoading.value || !props.resident) return;

  const userContent = draft.value.trim();
  syncPhoneVisitIntentFromUserMessage(userContent);
  const userMsg = {
    id: `phone-user-${Date.now()}-${Math.random()}`,
    role: 'user',
    content: userContent,
    type: 'text',
    isSystem: false
  };

  messageList.value.push(userMsg);
  draft.value = '';
  await persistMessage(userMsg);
  syncResidentPhoneState({
    phoneLastMsg: userContent,
    unread: 0,
    lastTime: '刚刚'
  });
  emit('sent', {
    residentId: props.resident?.residentId || props.resident?.id || '',
    content: userContent,
    chatId: phoneChatId.value
  });
  scrollToBottom();

  const config = getCurrentLlmConfig();
  if (!config || !config.apiKey) {
    const errorMsg = {
      id: `phone-system-${Date.now()}-${Math.random()}`,
      role: 'system',
      content: '当前还没有可用模型配置，暂时无法发送手机消息。',
      type: 'text',
      isSystem: true
    };
    messageList.value.push(errorMsg);
    await persistMessage(errorMsg);
    scrollToBottom();
    return;
  }

  isLoading.value = true;

  try {
    const activeMemory = await fetchActiveMemoryContext();
    const historyLimit = Math.max(1, Number(props.resident?.historyLimit) || 20);
    const reply = await LLM.chat({
      config,
      systemPrompt: buildPhonePrompt(),
      messages: [
        ...(activeMemory ? [{
          role: 'system',
          content: activeMemory
        }] : []),
        ...(phoneRemoteSystemOverride.value ? [{
          role: 'system',
          content: phoneRemoteSystemOverride.value
        }] : []),
        ...(activeIntentSystemOverride.value ? [{
          role: 'system',
          content: activeIntentSystemOverride.value
        }] : []),
        ...messageList.value
        .filter((item) => !item.isSystem)
        .slice(-historyLimit)
        .map((item) => ({
          role: item.role === 'model' ? 'assistant' : item.role,
          content: item.content
        }))
      ],
      temperature: 0.7,
      maxTokens: 1200
    });

    const cleanContent = cleanAiResponse(reply).trim() || '她看了看手机，却一时没有回你。';
    const safeCleanContent = await ensurePhoneReplyRemoteOnly(cleanContent, config);
    const modelMsg = {
      id: `phone-model-${Date.now()}-${Math.random()}`,
      role: 'model',
      content: safeCleanContent,
      type: 'text',
      isSystem: false
    };

    messageList.value.push(modelMsg);
    await persistMessage(modelMsg);
    syncResidentPhoneState({
      phoneLastMsg: safeCleanContent,
      unread: 0,
      lastTime: '刚刚'
    });
    emit('received', {
      residentId: props.resident?.residentId || props.resident?.id || '',
      content: safeCleanContent,
      chatId: phoneChatId.value
    });

    const settlement = await settlePlayerIntentFollowUp({
      session: activePlayerIntentSession.value,
      message: modelMsg,
      currentTime: townStore.currentTime || Date.now(),
      townStore,
      resident: props.resident || null
    });

    if (!settlement.keepSession) {
      resetPhoneIntentSession();
    }

    if (settlement.accessResult?.approved && settlement.payload?.intentType === 'resident_home_visit_request') {
      await appendPhoneVisitAccessMessage(settlement.payload);
    }

    scrollToBottom();
  } catch (error) {
    const errorMsg = {
      id: `phone-error-${Date.now()}-${Math.random()}`,
      role: 'system',
      content: '手机消息发送失败了，请稍后再试。',
      type: 'text',
      isSystem: true
    };
    console.error('[TownPhoneChatSheet] failed to send phone chat message', error);
    messageList.value.push(errorMsg);
    await persistMessage(errorMsg);
    scrollToBottom();
  } finally {
    isLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.phone-chat-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.34);
  z-index: 1200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.phone-chat-sheet {
  width: 100%;
  height: 80vh;
  background: #f7f8fa;
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.phone-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  background: #ffffff;
  border-bottom: 1px solid #e7eaf0;
}

.phone-chat-header-copy {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.phone-chat-avatar {
  width: 76rpx;
  height: 76rpx;
  border-radius: 22rpx;
  background: #d8dde8;
}

.phone-chat-title-wrap {
  display: flex;
  flex-direction: column;
}

.phone-chat-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2937;
}

.phone-chat-subtitle {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #7b8794;
}

.phone-chat-context {
  margin-top: 8rpx;
  max-width: 520rpx;
  font-size: 22rpx;
  line-height: 1.5;
  color: #516071;
}

.phone-chat-close {
  font-size: 26rpx;
  color: #58667a;
}

.phone-chat-messages {
  flex: 1;
}

.phone-chat-message-list {
  padding: 24rpx;
}

.phone-chat-message-item {
  display: flex;
  margin-bottom: 20rpx;
}

.phone-chat-message-item--self {
  justify-content: flex-end;
}

.phone-chat-message-item--system {
  justify-content: center;
}

.phone-chat-system-text {
  font-size: 22rpx;
  color: #8b97a8;
  background: rgba(139, 151, 168, 0.12);
  border-radius: 999rpx;
  padding: 10rpx 18rpx;
}

.phone-chat-bubble {
  max-width: 78%;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 18rpx 22rpx;
  box-shadow: 0 10rpx 28rpx rgba(15, 23, 42, 0.06);
}

.phone-chat-message-item--self .phone-chat-bubble {
  background: #c8f2bb;
}

.phone-chat-bubble-text {
  font-size: 28rpx;
  line-height: 1.55;
  color: #1f2937;
}

.phone-chat-footer {
  display: flex;
  gap: 16rpx;
  align-items: center;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1px solid #e7eaf0;
}

.phone-chat-input {
  flex: 1;
  height: 78rpx;
  background: #f3f5f8;
  border-radius: 999rpx;
  padding: 0 26rpx;
  font-size: 28rpx;
  color: #1f2937;
}

.phone-chat-send {
  width: 132rpx;
  height: 78rpx;
  border-radius: 999rpx;
  border: none;
  background: #1d7dfa;
  color: #ffffff;
  font-size: 28rpx;
  line-height: 78rpx;
}

.phone-chat-send[disabled] {
  opacity: 0.5;
}
</style>
