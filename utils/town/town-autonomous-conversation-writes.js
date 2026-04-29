function normalizeText(value = '') {
  return String(value || '').trim();
}

function normalizeResidentIds(value = []) {
  return [...new Set(
    (Array.isArray(value) ? value : [])
      .map((item) => normalizeText(item))
      .filter(Boolean)
  )];
}

function buildRoundSummary(round = {}) {
  const directSummary = normalizeText(round?.summary);
  if (directSummary) {
    return directSummary;
  }

  const turns = Array.isArray(round?.turns) ? round.turns : [];
  const joinedTurns = turns
    .map((turn) => {
      const residentName = normalizeText(turn?.residentName);
      const content = normalizeText(turn?.content);
      if (!content) {
        return '';
      }

      return residentName ? `${residentName}：${content}` : content;
    })
    .filter(Boolean)
    .join(' / ');

  return normalizeText(joinedTurns);
}

function resolveRelationshipWarmthDelta(round = {}) {
  const explicitDelta = Number(round?.relationshipDelta);
  if (Number.isFinite(explicitDelta) && explicitDelta !== 0) {
    return explicitDelta;
  }

  return 1;
}

function resolveRelationshipMemoryType(round = {}, warmthDelta = 1) {
  const explicitType = normalizeText(round?.relationshipMemoryType);
  if (explicitType) {
    return explicitType;
  }

  return warmthDelta < 0 ? 'awkward_autonomous_moment' : 'autonomous_followup';
}

export function buildAutonomousConversationWriteBack({
  thread = {},
  round = {},
  currentTime = 0
} = {}) {
  const happenedAt = Number(currentTime) || Date.now();
  const threadId = normalizeText(thread?.id);
  const locationId = normalizeText(thread?.locationId);
  const residentIds = normalizeResidentIds(thread?.participantIds);
  const summary = buildRoundSummary(round);
  const relationshipWarmthDelta = resolveRelationshipWarmthDelta(round);
  const relationshipMemoryType = resolveRelationshipMemoryType(round, relationshipWarmthDelta);

  const events = summary && residentIds.length > 0
    ? [
        {
          id: `${normalizeText(thread?.type) === 'remote_autonomous' ? 'remote' : 'scene'}-autonomous-conversation-${threadId || 'thread'}-${happenedAt}`,
          type: normalizeText(thread?.type) === 'remote_autonomous'
            ? 'remote_autonomous_conversation'
            : 'scene_autonomous_conversation',
          happenedAt,
          locationId,
          residents: residentIds,
          summary,
          title: summary,
          threadId
        }
      ]
    : [];

  const memoryPatches = residentIds.map((residentId) => ({
    residentId,
    threadId,
    locationId,
    happenedAt,
    summary,
    participantIds: residentIds.filter((item) => item !== residentId)
  }));

  const relationshipPatches = residentIds.length >= 2
    ? [
        {
          residentIds,
          threadId,
          locationId,
          happenedAt,
          summary,
          warmthDelta: relationshipWarmthDelta,
          memoryType: relationshipMemoryType
        }
      ]
    : [];

  const behaviorBiasPatches = residentIds.map((residentId) => ({
    residentId,
    threadId,
    locationId,
    happenedAt,
    preferredFollowUpResidentIds: residentIds.filter((item) => item !== residentId)
  }));

  return {
    summary,
    events,
    memoryPatches,
    relationshipPatches,
    behaviorBiasPatches
  };
}
