import { STORAGE_KEYS } from '@/utils/storage-keys.js';

const fallbackStorage = {
  getStorageSync() {
    return undefined;
  },
  setStorageSync() {}
};

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function floorToSlice(timestamp, sliceMinutes = 10) {
  const date = new Date(timestamp);
  date.setSeconds(0, 0);
  const currentMinutes = date.getMinutes();
  const flooredMinutes = Math.floor(currentMinutes / sliceMinutes) * sliceMinutes;
  date.setMinutes(flooredMinutes);
  return date.getTime();
}

export function createTownClockService(
  storage = (typeof uni !== 'undefined' ? uni : fallbackStorage),
  initial = {}
) {
  const state = {
    currentTime: toFiniteNumber(initial.currentTime)
      ?? toFiniteNumber(storage.getStorageSync(STORAGE_KEYS.WORLD_CLOCK_TIME))
      ?? Date.now(),
    timeRatio: toPositiveNumber(initial.timeRatio)
      ?? toPositiveNumber(storage.getStorageSync(STORAGE_KEYS.WORLD_TIME_RATIO))
      ?? 6,
    sliceMinutes: toPositiveNumber(initial.sliceMinutes) ?? 10,
    currentSlice: 0
  };

  state.currentSlice = floorToSlice(state.currentTime, state.sliceMinutes);

  function persist() {
    storage.setStorageSync(STORAGE_KEYS.WORLD_CLOCK_TIME, state.currentTime);
    storage.setStorageSync(STORAGE_KEYS.WORLD_TIME_RATIO, state.timeRatio);
  }

  function buildSnapshot(extra = {}) {
    return {
      currentTime: state.currentTime,
      timeRatio: state.timeRatio,
      sliceTimestamp: state.currentSlice,
      crossedSlice: false,
      ...extra
    };
  }

  function getSnapshot() {
    return buildSnapshot();
  }

  function tick(realMs = 1000) {
    state.currentTime += realMs * state.timeRatio;
    const nextSlice = floorToSlice(state.currentTime, state.sliceMinutes);
    const crossedSlice = nextSlice > state.currentSlice;

    if (crossedSlice) {
      state.currentSlice = nextSlice;
    }

    persist();
    return buildSnapshot({ crossedSlice });
  }

  function setCurrentTime(timestamp) {
    const nextTime = Number(timestamp);
    if (Number.isFinite(nextTime)) {
      state.currentTime = nextTime;
      state.currentSlice = floorToSlice(state.currentTime, state.sliceMinutes);
      persist();
    }

    return buildSnapshot();
  }

  function setTimeRatio(ratio) {
    const nextRatio = Number(ratio);
    if (Number.isFinite(nextRatio) && nextRatio > 0) {
      state.timeRatio = nextRatio;
      persist();
    }

    return buildSnapshot();
  }

  return {
    persist,
    getSnapshot,
    tick,
    setCurrentTime,
    setTimeRatio
  };
}

export const townClockService = createTownClockService();
