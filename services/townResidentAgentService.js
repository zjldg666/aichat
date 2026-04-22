import { LLM } from '@/services/llm.js';
import { STORAGE_KEYS } from '@/utils/storage-keys.js';
import { createResidentAutonomyRuntime } from '@/utils/town/town-resident-autonomy.js';

const fallbackStorage = {
  getStorageSync() {
    return undefined;
  }
};

function getStorage() {
  return typeof uni !== 'undefined' ? uni : fallbackStorage;
}

function clampDurationSlices(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(6, Math.max(1, Math.round(parsed)));
}

function clampSliceMinutes(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

function stringifyTownEvent(event) {
  if (typeof event === 'string') {
    return event.trim();
  }

  if (!event || typeof event !== 'object') {
    return '';
  }

  const candidates = [event.summary, event.text, event.label, event.detail, event.type];
  for (const candidate of candidates) {
    const normalized = String(candidate ?? '').trim();
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

function buildResolvedAction(action, {
  currentTime,
  trigger = '',
  goal = '',
  towardPlayer = '',
  durationSlices = 1,
  sliceMinutes = 10,
  source = 'lightweight'
} = {}) {
  if (!action || typeof action !== 'object') {
    return null;
  }

  const safeAction = { ...action };
  const safeDurationSlices = clampDurationSlices(durationSlices);
  const safeSliceMinutes = clampSliceMinutes(sliceMinutes);

  return {
    ...safeAction,
    autonomy: createResidentAutonomyRuntime({
      source,
      actionId: String(safeAction.id ?? '').trim(),
      lastDecisionAt: currentTime,
      validUntil: currentTime + safeDurationSlices * safeSliceMinutes * 60 * 1000,
      currentGoal: String(goal ?? '').trim(),
      trigger: String(trigger ?? '').trim(),
      towardPlayer: String(towardPlayer ?? '').trim()
    })
  };
}

function parseDecision(raw) {
  if (raw && typeof raw === 'object') {
    return raw;
  }

  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return null;
  }

  return JSON.parse(raw);
}

export async function decideResidentAction({
  resident = {},
  candidateActions = [],
  currentTime = Date.now(),
  trigger = '',
  sliceMinutes = 10,
  townEvents = []
}) {
  const fallbackAction = candidateActions[0] || null;
  if (!fallbackAction) return null;

  const fallbackResolvedAction = () => buildResolvedAction(fallbackAction, {
    currentTime,
    trigger,
    sliceMinutes,
    source: 'lightweight'
  });

  const storage = getStorage();
  const schemes = storage.getStorageSync(STORAGE_KEYS.LLM_SCHEMES);
  const currentSchemeIndex = Number(storage.getStorageSync(STORAGE_KEYS.CURRENT_LLM_SCHEME_INDEX)) || 0;
  const config = Array.isArray(schemes) ? schemes[currentSchemeIndex] : null;

  if (!config?.apiKey) {
    return fallbackResolvedAction();
  }

  const actionList = candidateActions
    .map((item) => `${item.id}:${item.label}@${item.locationId}`)
    .join('\n');
  const formattedTime = new Date(currentTime).toLocaleString('zh-CN', { hour12: false });
  const recentTownEvents = Array.isArray(townEvents)
    ? townEvents.slice(-3).map(stringifyTownEvent).filter(Boolean)
    : [];
  const prompt = [
    '你是小镇居民行动决策器。',
    `当前居民：${resident.name || '未命名居民'}`,
    `当前时间：${formattedTime}`,
    `触发原因：${String(trigger ?? '').trim() || '无'}`,
    '最近 3 条 townEvents：',
    recentTownEvents.length > 0 ? recentTownEvents.join('\n') : '无',
    '你必须只从下面候选动作中选择一个最合适的 actionId。',
    '只返回 JSON，不要解释，不要输出 markdown。',
    'JSON 格式必须是 {"actionId":"...","goal":"...","durationSlices":1,"towardPlayer":"wait"}。',
    '候选动作：',
    actionList
  ].join('\n');

  try {
    const raw = await LLM.chat({
      config,
      jsonMode: true,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    });
    const parsed = parseDecision(raw);
    const matched = candidateActions.find((item) => item.id === parsed?.actionId);

    if (!matched) {
      return fallbackResolvedAction();
    }

    return buildResolvedAction(matched, {
      currentTime,
      trigger,
      goal: parsed?.goal,
      towardPlayer: parsed?.towardPlayer,
      durationSlices: parsed?.durationSlices,
      sliceMinutes,
      source: 'agent'
    });
  } catch (error) {
    return fallbackResolvedAction();
  }
}
