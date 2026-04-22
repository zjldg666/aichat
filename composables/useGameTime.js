import { computed, onUnmounted, ref, watch } from 'vue';
import { useTownStore } from '@/stores/useTownStore.js';

export function useGameTime(saveCharacterState) {
  const townStore = useTownStore();
  const showTimePanel = ref(false);
  const showTimeSettingPanel = ref(false);
  const tempDateStr = ref('');
  const tempTimeStr = ref('');
  const tempTimeRatio = ref(6);
  const customMinutes = ref('');

  async function ensureTownReady() {
    if (!townStore.isReady) {
      await townStore.initialize();
    }
  }

  async function startTimeFlow() {
    await ensureTownReady();
    townStore.ensureClockRunning();
  }

  function stopTimeFlow() {
    townStore.stopClock();
  }

  void ensureTownReady();

  const currentTime = computed({
    get: () => townStore.currentTime,
    set: (value) => townStore.setCurrentTime(value)
  });

  const timeRatio = computed({
    get: () => townStore.timeRatio,
    set: (value) => townStore.setTimeRatio(value)
  });

  const formattedTime = computed(() => {
    const date = new Date(currentTime.value);
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const day = weekDays[date.getDay()];
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${hour}:${minute}`;
  });

  function buildSkipTarget(type) {
    const now = new Date(currentTime.value);
    const oldDay = now.getDate();
    const targetDate = new Date(currentTime.value);
    let desc = '';

    switch (type) {
      case 'morning':
        targetDate.setHours(11, 30, 0, 0);
        if (targetDate.getTime() <= currentTime.value) {
          targetDate.setDate(targetDate.getDate() + 1);
        }
        desc = '一个上午过去了，快到中午了。';
        break;
      case 'afternoon':
        targetDate.setHours(17, 30, 0, 0);
        if (targetDate.getTime() <= currentTime.value) {
          targetDate.setDate(targetDate.getDate() + 1);
        }
        desc = '一个下午过去了，黄昏降临。';
        break;
      case 'night':
      case 'day':
        targetDate.setDate(targetDate.getDate() + 1);
        targetDate.setHours(8, 0, 0, 0);
        desc = type === 'night' ? '一晚过去了，晨光微亮。' : '整整一天过去了。';
        break;
      case 'custom': {
        const minutes = parseInt(customMinutes.value, 10);
        if (!minutes || minutes <= 0) {
          uni.showToast({ title: '请输入分钟数', icon: 'none' });
          return null;
        }
        targetDate.setTime(currentTime.value + minutes * 60 * 1000);
        desc = `${minutes} 分钟过去了。`;
        break;
      }
      default:
        return null;
    }

    return {
      newTime: targetDate.getTime(),
      isNextDay: targetDate.getDate() !== oldDay,
      desc
    };
  }

  async function handleTimeSkip(type, messageList, scrollToBottom) {
    const target = buildSkipTarget(type);
    if (!target) {
      return false;
    }

    stopTimeFlow();

    try {
      await townStore.advanceTimeTo(target.newTime);

      if (typeof saveCharacterState === 'function') {
        saveCharacterState(undefined, target.newTime);
      }

      showTimePanel.value = false;

      if (messageList?.value) {
        messageList.value.push({
          id: Date.now() + Math.random(),
          role: 'system',
          content: `【系统】${target.desc} 当前时间：${formattedTime.value}`,
          isSystem: true
        });
      }

      if (typeof scrollToBottom === 'function') {
        scrollToBottom();
      }
    } finally {
      void startTimeFlow();
    }

    return target.isNextDay;
  }

  watch(showTimeSettingPanel, async (visible) => {
    if (!visible) return;

    await ensureTownReady();
    const now = new Date(currentTime.value);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    tempDateStr.value = `${year}-${month}-${day}`;
    tempTimeStr.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    tempTimeRatio.value = timeRatio.value;
  });

  async function confirmManualTime() {
    const fullStr = `${tempDateStr.value} ${tempTimeStr.value}`;
    const newTimestamp = new Date(fullStr.replace(/-/g, '/')).getTime();

    if (Number.isNaN(newTimestamp)) {
      uni.showToast({ title: '时间格式错误', icon: 'none' });
      return null;
    }

    timeRatio.value = Number(tempTimeRatio.value) || 6;
    stopTimeFlow();

    if (newTimestamp === currentTime.value) {
      uni.showToast({ title: '流速已更新', icon: 'none' });
      showTimeSettingPanel.value = false;
      void startTimeFlow();
      return currentTime.value;
    }

    try {
      await townStore.advanceTimeTo(newTimestamp);

      if (typeof saveCharacterState === 'function') {
        saveCharacterState(undefined, newTimestamp);
      }

      showTimeSettingPanel.value = false;
      uni.showToast({ title: '时间已调整', icon: 'none' });
    } finally {
      void startTimeFlow();
    }

    return newTimestamp;
  }

  onUnmounted(() => {
    stopTimeFlow();
  });

  return {
    currentTime,
    formattedTime,
    timeRatio,
    tempTimeRatio,
    showTimePanel,
    showTimeSettingPanel,
    tempDateStr,
    tempTimeStr,
    customMinutes,
    startTimeFlow,
    stopTimeFlow,
    handleTimeSkip,
    confirmManualTime
  };
}
