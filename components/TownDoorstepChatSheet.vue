<template>
  <view v-if="visible" class="doorstep-mask" @click="emit('close')">
    <view class="doorstep-sheet" @click.stop>
      <view class="doorstep-header">
        <view class="doorstep-header-copy">
          <text class="doorstep-title">门口对话</text>
          <text class="doorstep-subtitle">{{ residentName }} · {{ residenceLocationName }}</text>
        </view>
        <view class="doorstep-header-right">
          <text v-if="decisionLabel" class="doorstep-badge">{{ decisionLabel }}</text>
          <text class="doorstep-close" @click="emit('close')">关闭</text>
        </view>
      </view>

      <scroll-view
        scroll-y
        class="doorstep-messages"
        :scroll-into-view="scrollIntoView"
        :scroll-with-animation="true"
      >
        <view class="doorstep-message-list">
          <view
            v-for="(message, index) in messages"
            :key="message.id || index"
            :id="`doorstep-message-${index}`"
            class="doorstep-message-item"
            :class="{
              'doorstep-message-item--self': message.role === 'user'
            }"
          >
            <view class="doorstep-message-bubble">
              <text class="doorstep-message-text">{{ message.content }}</text>
            </view>
          </view>

          <view v-if="messages.length === 0" class="doorstep-empty">
            <text class="doorstep-empty-text">你站在门口，等她回应。</text>
          </view>

          <view id="doorstep-message-bottom" style="height: 1px;"></view>
        </view>
      </scroll-view>

      <view v-if="panelMode === 'leave_message'" class="doorstep-subpanel">
        <textarea
          class="doorstep-textarea"
          maxlength="120"
          :value="leaveMessageDraft"
          placeholder="留一条简短消息，等她之后通过手机回复你。"
          @input="handleLeaveMessageInput"
        />
        <view class="doorstep-subpanel-actions">
          <button class="doorstep-secondary-btn" :disabled="isBusy" @click="emit('cancel-subpanel')">
            返回
          </button>
          <button class="doorstep-primary-btn" :disabled="!canSubmitLeaveMessage || isBusy" @click="emit('submit-leave-message')">
            留消息
          </button>
        </view>
      </view>

      <view v-else-if="panelMode === 'schedule'" class="doorstep-subpanel">
        <view class="doorstep-schedule-list">
          <button
            v-for="option in scheduleOptions"
            :key="option.id"
            class="doorstep-schedule-btn"
            :disabled="isBusy"
            @click="emit('select-schedule', option)"
          >
            <text class="doorstep-schedule-label">{{ option.label }}</text>
            <text class="doorstep-schedule-desc">{{ option.description }}</text>
          </button>
        </view>
        <view class="doorstep-subpanel-actions">
          <button class="doorstep-secondary-btn" :disabled="isBusy" @click="emit('cancel-subpanel')">
            返回
          </button>
        </view>
      </view>

      <view v-else class="doorstep-footer">
        <view v-if="showChatInput" class="doorstep-input-row">
          <input
            class="doorstep-input"
            :value="chatDraft"
            :disabled="isBusy"
            confirm-type="send"
            placeholder="在门口说点什么…"
            @input="handleChatInput"
            @confirm="emit('send')"
          />
          <button class="doorstep-primary-btn doorstep-send-btn" :disabled="!canSend || isBusy" @click="emit('send')">
            发送
          </button>
        </view>
        <view class="doorstep-action-row">
          <button
            v-for="action in actions"
            :key="action.id"
            class="doorstep-secondary-btn"
            :disabled="isBusy"
            @click="emit('action', action)"
          >
            {{ action.label }}
          </button>
          <button
            v-if="canEnterResidence"
            class="doorstep-primary-btn"
            :disabled="isBusy"
            @click="emit('enter-scene')"
          >
            进入住宅
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  residentName: {
    type: String,
    default: ''
  },
  residenceLocationName: {
    type: String,
    default: ''
  },
  decisionLabel: {
    type: String,
    default: ''
  },
  messages: {
    type: Array,
    default: () => []
  },
  actions: {
    type: Array,
    default: () => []
  },
  panelMode: {
    type: String,
    default: 'chat'
  },
  chatDraft: {
    type: String,
    default: ''
  },
  leaveMessageDraft: {
    type: String,
    default: ''
  },
  scheduleOptions: {
    type: Array,
    default: () => []
  },
  isBusy: {
    type: Boolean,
    default: false
  },
  canSend: {
    type: Boolean,
    default: false
  },
  canSubmitLeaveMessage: {
    type: Boolean,
    default: false
  },
  showChatInput: {
    type: Boolean,
    default: true
  },
  canEnterResidence: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'close',
  'send',
  'action',
  'enter-scene',
  'select-schedule',
  'submit-leave-message',
  'cancel-subpanel',
  'update:chatDraft',
  'update:leaveMessageDraft'
]);

const scrollIntoView = ref('');

watch(
  () => [props.visible, props.messages.length, props.panelMode],
  ([visible]) => {
    if (!visible) {
      return;
    }

    nextTick(() => {
      scrollIntoView.value = '';
      setTimeout(() => {
        scrollIntoView.value = 'doorstep-message-bottom';
      }, 30);
    });
  }
);

function handleChatInput(event) {
  emit('update:chatDraft', event?.detail?.value || '');
}

function handleLeaveMessageInput(event) {
  emit('update:leaveMessageDraft', event?.detail?.value || '');
}
</script>

<style lang="scss" scoped>
.doorstep-mask {
  position: fixed;
  inset: 0;
  background: rgba(9, 18, 28, 0.52);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 30rpx;
  z-index: 1500;
}

.doorstep-sheet {
  width: 100%;
  max-width: 690rpx;
  max-height: 82vh;
  background: #f9fafb;
  border-radius: 34rpx;
  border: 1px solid rgba(22, 41, 58, 0.12);
  box-shadow: 0 24rpx 60rpx rgba(8, 20, 30, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.doorstep-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
  padding: 24rpx 26rpx;
  border-bottom: 1px solid #e2e8f0;
}

.doorstep-header-copy {
  flex: 1;
  min-width: 0;
}

.doorstep-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2937;
}

.doorstep-subtitle {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #667085;
}

.doorstep-header-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.doorstep-badge {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(24, 68, 84, 0.12);
  color: #184454;
  font-size: 20rpx;
  font-weight: 700;
}

.doorstep-close {
  font-size: 24rpx;
  color: #5b6675;
}

.doorstep-messages {
  flex: 1;
  min-height: 320rpx;
}

.doorstep-message-list {
  padding: 24rpx;
}

.doorstep-message-item {
  display: flex;
  margin-bottom: 16rpx;
}

.doorstep-message-item--self {
  justify-content: flex-end;
}

.doorstep-message-bubble {
  max-width: 88%;
  border-radius: 24rpx;
  padding: 16rpx 20rpx;
  background: #ffffff;
  border: 1px solid #e5e7eb;
}

.doorstep-message-item--self .doorstep-message-bubble {
  background: #d9f2dd;
  border-color: #c5e7cb;
}

.doorstep-message-text {
  font-size: 26rpx;
  line-height: 1.7;
  color: #1f2937;
}

.doorstep-empty {
  display: flex;
  justify-content: center;
  padding: 24rpx 0;
}

.doorstep-empty-text {
  font-size: 22rpx;
  color: #8a95a6;
}

.doorstep-footer,
.doorstep-subpanel {
  border-top: 1px solid #e2e8f0;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
}

.doorstep-input-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.doorstep-input {
  flex: 1;
  height: 78rpx;
  border-radius: 999rpx;
  background: #eef2f7;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: #1f2937;
}

.doorstep-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 14rpx;
}

.doorstep-primary-btn,
.doorstep-secondary-btn {
  min-height: 72rpx;
  margin: 0;
  padding: 0 24rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  line-height: 72rpx;
  font-weight: 700;
}

.doorstep-primary-btn {
  background: #184454;
  color: #fff7ea;
}

.doorstep-secondary-btn {
  background: rgba(24, 68, 84, 0.08);
  color: #184454;
}

.doorstep-primary-btn[disabled],
.doorstep-secondary-btn[disabled] {
  opacity: 0.55;
}

.doorstep-send-btn {
  width: 128rpx;
  padding: 0;
}

.doorstep-textarea {
  width: 100%;
  min-height: 210rpx;
  border-radius: 22rpx;
  background: #eef2f7;
  border: 1px solid #d9dee7;
  padding: 20rpx;
  box-sizing: border-box;
  font-size: 26rpx;
  line-height: 1.7;
  color: #1f2937;
}

.doorstep-subpanel-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 14rpx;
}

.doorstep-schedule-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.doorstep-schedule-btn {
  width: 100%;
  min-height: 108rpx;
  margin: 0;
  border-radius: 22rpx;
  background: #eef2f7;
  border: 1px solid #d9dee7;
  padding: 18rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 6rpx;
}

.doorstep-schedule-label {
  font-size: 26rpx;
  font-weight: 700;
  color: #1f2937;
}

.doorstep-schedule-desc {
  font-size: 22rpx;
  line-height: 1.5;
  color: #667085;
  text-align: left;
}
</style>
