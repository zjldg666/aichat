const DEFAULT_SCENE_ROUNDS = 3;
const DEFAULT_REMOTE_ROUNDS = 2;
const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000;
const DEFAULT_CLOSED_RESTART_COOLDOWN_MS = 2 * 60 * 60 * 1000;

function normalizeThreadType(type = '') {
  return String(type || '').trim() === 'remote_autonomous'
    ? 'remote_autonomous'
    : 'scene_autonomous';
}

function normalizeThreadStatus(status = '') {
  const normalized = String(status || '').trim();
  if (normalized === 'cooldown' || normalized === 'closed') {
    return normalized;
  }
  return 'active';
}

function normalizeParticipantIds(participantIds = []) {
  return [...new Set(
    (Array.isArray(participantIds) ? participantIds : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  )].sort();
}

export function buildAutonomousThreadPairKey(participantIds = []) {
  return normalizeParticipantIds(participantIds).join('__');
}

export function createAutonomousConversationThread(payload = {}) {
  const type = normalizeThreadType(payload.type);

  return {
    id: payload.id || `autonomous-thread-${Date.now()}-${Math.random()}`,
    type,
    participantIds: normalizeParticipantIds(payload.participantIds),
    locationId: String(payload.locationId || '').trim(),
    status: normalizeThreadStatus(payload.status),
    topicSeed: String(payload.topicSeed || '').trim(),
    triggerSource: String(payload.triggerSource || 'life_contact').trim(),
    triggerReasonTags: [...new Set(
      (Array.isArray(payload.triggerReasonTags) ? payload.triggerReasonTags : [])
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )],
    roundCount: Number(payload.roundCount) || 0,
    maxRounds: Number(payload.maxRounds) || (type === 'remote_autonomous' ? DEFAULT_REMOTE_ROUNDS : DEFAULT_SCENE_ROUNDS),
    startedAt: Number(payload.startedAt) || Date.now(),
    lastAdvancedAt: Number(payload.lastAdvancedAt) || 0,
    cooldownUntil: Number(payload.cooldownUntil) || 0,
    lastSummary: String(payload.lastSummary || '').trim()
  };
}

export function continueAutonomousConversationThread({ thread = {}, advancedAt = 0 } = {}) {
  const safeAdvancedAt = Number(advancedAt) || Date.now();

  return {
    ...createAutonomousConversationThread(thread),
    id: thread.id || `autonomous-thread-${safeAdvancedAt}`,
    status: 'cooldown',
    roundCount: Number(thread.roundCount || 0) + 1,
    lastAdvancedAt: safeAdvancedAt,
    cooldownUntil: safeAdvancedAt + DEFAULT_COOLDOWN_MS
  };
}

export function closeAutonomousConversationThread({ thread = {}, closedAt = 0, reason = '' } = {}) {
  const safeClosedAt = Number(closedAt) || Date.now();

  return {
    ...createAutonomousConversationThread(thread),
    id: thread.id || `autonomous-thread-${safeClosedAt}`,
    status: 'closed',
    cooldownUntil: Math.max(
      Number(thread?.cooldownUntil) || 0,
      safeClosedAt + DEFAULT_CLOSED_RESTART_COOLDOWN_MS
    ),
    closedAt: safeClosedAt,
    closeReason: String(reason || '').trim()
  };
}
