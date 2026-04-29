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
  townEvents = [],
  allowCreativeAction = false
}) {
  const fallbackAction = candidateActions[0] || null;
  if (!fallbackAction && !allowCreativeAction) return null;

  const fallbackResolvedAction = (action) => buildResolvedAction(action || fallbackAction, {
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
    return fallbackAction ? fallbackResolvedAction() : null;
  }

  const settings = resident?.settings || {};
  const formattedTime = new Date(currentTime).toLocaleString('zh-CN', { hour12: false });
  const recentTownEvents = Array.isArray(townEvents)
    ? townEvents.slice(-5).map(stringifyTownEvent).filter(Boolean)
    : [];

  const personality = String(settings.personality || '').trim() || '无';
  const bio = String(settings.bio || resident?.bio || '').trim() || '无';
  const likes = String(settings.likes || '').trim() || '无';
  const dislikes = String(settings.dislikes || '').trim() || '无';
  const currentLocation = resident?.townRuntime?.currentLocationName || resident?.currentLocation || '未知';
  const scheduleTemplateId = resident?.townProfile?.scheduleTemplateId || '无';

  const actionList = candidateActions
    .map((item) => {
      const parts = [`  - ${item.id}`];
      parts.push(`动作: ${item.label}`);
      if (item.locationId) parts.push(`地点: ${item.locationId}`);
      if (item.locationName) parts.push(`地点名: ${item.locationName}`);
      if (item.targetResidentName) parts.push(`目标: ${item.targetResidentName}`);
      if (item.companionActionType) parts.push(`类型: ${item.companionActionType}`);
      return parts.join(', ');
    })
    .join('\n');

  const promptParts = [
    '你是小镇角色行动决策器。只返回 JSON，不要解释。',
    '',
    `角色：${resident.name || '未命名'}`,
    `性格：${personality}`,
    `简介：${bio}`,
    `喜好：${likes}`,
    `反感：${dislikes}`,
    `当前位置：${currentLocation}`,
    `当前时间：${formattedTime}`,
    `日程模板：${scheduleTemplateId}`,
    `触发原因：${String(trigger ?? '').trim() || '无'}`,
    '',
    recentTownEvents.length > 0 ? ['最近事件：', ...recentTownEvents].join('\n') : '',
    '',
    '候选动作：',
    actionList || '  (无预设动作)',
    ''
  ];

  if (allowCreativeAction) {
    promptParts.push(
      '你也可以自由创意一个新动作（不再受限于预设列表）。',
      '如果选择创意动作，actionId 设为 "__creative__"，在 creativeAction 中描述新动作。',
      ''
    );
  } else {
    promptParts.push('你必须从上面候选动作中选择一个。');
    promptParts.push('');
  }

  promptParts.push(
    'JSON schema:',
    '{',
    '  "actionId": "选中候选的id，或 __creative__",',
    '  "goal": "一句话描述本时段目标",',
    '  "durationSlices": 1,',
    '  "towardPlayer": "wait|seek|avoid"',
    (allowCreativeAction ? ',' : ''),
    (allowCreativeAction ? '  "creativeAction": { "label": "动作描述", "locationId": "目标地点id（可选）", "reason": "理由" }' : ''),
    '}'
  );

  const prompt = promptParts.filter(Boolean).join('\n');

  try {
    const raw = await LLM.chat({
      config,
      jsonMode: true,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    });
    const parsed = parseDecision(raw);

    if (parsed?.actionId === '__creative__' && parsed?.creativeAction) {
      const creativeLabel = String(parsed.creativeAction.label || '').trim();
      if (creativeLabel) {
        const creativeAction = {
          id: '__creative__',
          label: creativeLabel,
          locationId: String(parsed.creativeAction.locationId || '').trim() || undefined,
          targetResidentId: '',
          targetResidentName: ''
        };
        const resolved = buildResolvedAction(creativeAction, {
          currentTime,
          trigger,
          goal: parsed?.goal,
          towardPlayer: parsed?.towardPlayer,
          durationSlices: parsed?.durationSlices,
          sliceMinutes,
          source: 'agent'
        });
        if (resolved) return resolved;
      }
    }

    const matched = candidateActions.find((item) => item.id === parsed?.actionId);
    if (!matched) {
      return fallbackAction ? fallbackResolvedAction() : null;
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
    return fallbackAction ? fallbackResolvedAction() : null;
  }
}
