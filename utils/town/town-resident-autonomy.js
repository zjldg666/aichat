export const RESIDENT_BEHAVIOR_MODES = {
  AGENT: 'agent',
  LIGHTWEIGHT: 'lightweight'
};

export const DEFAULT_RESIDENT_AUTONOMY_RUNTIME = {
  source: 'lightweight',
  actionId: '',
  lastDecisionAt: 0,
  validUntil: 0,
  currentGoal: '',
  trigger: '',
  towardPlayer: '',
  recentContactResidentIds: [],
  recentContactReasonTags: [],
  lastContactLocationId: '',
  lastContactLocationName: '',
  lastContactAt: 0
};

function toTrimmedString(value) {
  return String(value ?? '').trim();
}

function normalizePositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .map((item) => toTrimmedString(item))
      .filter(Boolean)
  )];
}

export function resolveResidentBehaviorMode(resident = {}) {
  const townProfile = resident && typeof resident === 'object' ? resident.townProfile : null;
  const candidates = [
    townProfile && typeof townProfile === 'object' ? townProfile.behaviorMode : undefined,
    resident && typeof resident === 'object' ? resident.behaviorMode : undefined
  ];

  for (const candidate of candidates) {
    const normalized = toTrimmedString(candidate);
    if (normalized === RESIDENT_BEHAVIOR_MODES.AGENT || normalized === RESIDENT_BEHAVIOR_MODES.LIGHTWEIGHT) {
      return normalized;
    }
  }

  return RESIDENT_BEHAVIOR_MODES.LIGHTWEIGHT;
}

export function isResidentAgentMode(resident = {}) {
  return resolveResidentBehaviorMode(resident) === RESIDENT_BEHAVIOR_MODES.AGENT;
}

export function normalizeResidentAutonomyRuntime(autonomy = {}) {
  const source = toTrimmedString(autonomy && typeof autonomy === 'object' ? autonomy.source : '');

  return {
    source: source || DEFAULT_RESIDENT_AUTONOMY_RUNTIME.source,
    actionId: toTrimmedString(autonomy && typeof autonomy === 'object' ? autonomy.actionId : ''),
    lastDecisionAt: normalizePositiveNumber(autonomy && typeof autonomy === 'object' ? autonomy.lastDecisionAt : 0),
    validUntil: normalizePositiveNumber(autonomy && typeof autonomy === 'object' ? autonomy.validUntil : 0),
    currentGoal: toTrimmedString(autonomy && typeof autonomy === 'object' ? autonomy.currentGoal : ''),
    trigger: toTrimmedString(autonomy && typeof autonomy === 'object' ? autonomy.trigger : ''),
    towardPlayer: toTrimmedString(autonomy && typeof autonomy === 'object' ? autonomy.towardPlayer : ''),
    recentContactResidentIds: normalizeStringList(autonomy && typeof autonomy === 'object' ? autonomy.recentContactResidentIds : []),
    recentContactReasonTags: normalizeStringList(autonomy && typeof autonomy === 'object' ? autonomy.recentContactReasonTags : []),
    lastContactLocationId: toTrimmedString(autonomy && typeof autonomy === 'object' ? autonomy.lastContactLocationId : ''),
    lastContactLocationName: toTrimmedString(autonomy && typeof autonomy === 'object' ? autonomy.lastContactLocationName : ''),
    lastContactAt: normalizePositiveNumber(autonomy && typeof autonomy === 'object' ? autonomy.lastContactAt : 0)
  };
}

export function createResidentAutonomyRuntime(overrides = {}) {
  return normalizeResidentAutonomyRuntime({
    ...DEFAULT_RESIDENT_AUTONOMY_RUNTIME,
    ...(overrides && typeof overrides === 'object' ? overrides : {})
  });
}
