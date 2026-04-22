function normalizeText(value = '') {
  return String(value || '').trim();
}

function clampRelationshipDelta(value) {
  const num = Number(value) || 0;
  if (num === 0) return 0;
  return Math.max(-3, Math.min(3, Math.trunc(num)));
}

const SCENE_SALIENCE_WEIGHT = {
  high: 3,
  medium: 2,
  low: 1
};

function normalizeSceneSalience(value = '') {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'high' || normalized === 'medium') {
    return normalized;
  }
  return 'low';
}

function getSceneSalienceWeight(value = '') {
  return SCENE_SALIENCE_WEIGHT[normalizeSceneSalience(value)] || SCENE_SALIENCE_WEIGHT.low;
}

function normalizeResidentIdList(value = []) {
  return Array.from(new Set(
    (Array.isArray(value) ? value : [])
      .map((item) => normalizeText(item))
      .filter(Boolean)
  ));
}

const SCENE_AMBIENT_EVENT_TYPES = new Set([
  'companion_chat_started',
  'companion_outing_started'
]);

const DEFAULT_PLAYER_RELATIONSHIP = {
  affinity: 50,
  familiarity: 50,
  trust: 50,
  tension: 0,
  summaryText: '初相识'
};

function normalizeSceneConversationVisibility(value = '') {
  return normalizeText(value).toLowerCase() === 'full' ? 'full' : 'summary';
}

function normalizeSceneConversationScope(value = '') {
  return normalizeText(value).toLowerCase() === 'known_only' ? 'known_only' : 'all';
}

function isSceneAmbientEvent(event = {}) {
  return SCENE_AMBIENT_EVENT_TYPES.has(normalizeText(event?.type));
}

function hasNonDefaultRelationshipMetrics(relationship = {}) {
  return (
    Number(relationship?.affinity) !== DEFAULT_PLAYER_RELATIONSHIP.affinity
    || Number(relationship?.familiarity) !== DEFAULT_PLAYER_RELATIONSHIP.familiarity
    || Number(relationship?.trust) !== DEFAULT_PLAYER_RELATIONSHIP.trust
    || Number(relationship?.tension) !== DEFAULT_PLAYER_RELATIONSHIP.tension
  );
}

function hasUnlockedRelationshipState(relationship = {}) {
  const permissions = relationship?.permissions || {};
  const flags = relationship?.flags || {};

  return Object.values(permissions).some(Boolean) || Object.values(flags).some(Boolean);
}

function isResidentKnownToPlayer(resident = {}) {
  const relationship = resident?.playerRelationship || {};
  const summaryText = normalizeText(relationship?.summaryText || resident?.relation);

  return hasNonDefaultRelationshipMetrics(relationship)
    || hasUnlockedRelationshipState(relationship)
    || (summaryText && summaryText !== DEFAULT_PLAYER_RELATIONSHIP.summaryText);
}

function shouldExposeAmbientEvent(event = {}, {
  scopeMode = 'all',
  residents = []
} = {}) {
  if (normalizeSceneConversationScope(scopeMode) !== 'known_only') {
    return true;
  }

  const residentMap = new Map(
    (Array.isArray(residents) ? residents : [])
      .map((resident) => [normalizeText(resident?.id), resident])
      .filter(([residentId]) => residentId)
  );
  const participantIds = normalizeResidentIdList(event?.residents);

  if (participantIds.length === 0) {
    return false;
  }

  return participantIds.some((residentId) => isResidentKnownToPlayer(residentMap.get(residentId)));
}

function normalizeSceneMessageTimestamp(message = {}) {
  return Number(message?.timestamp ?? message?.happenedAt) || 0;
}

function normalizeRenderableSceneMessage(message = {}, fallbackId = '') {
  const content = normalizeText(message?.content);

  if (!content) {
    return null;
  }

  return {
    ...message,
    id: normalizeText(message?.id) || fallbackId,
    role: normalizeText(message?.role) || (message?.isSystem ? 'system' : 'model'),
    type: normalizeText(message?.type) || 'text',
    timestamp: normalizeSceneMessageTimestamp(message),
    isSystem: Boolean(message?.isSystem)
  };
}

function resolveAmbientEventContent(event = {}, visibility = 'summary') {
  if (normalizeSceneConversationVisibility(visibility) === 'full') {
    return normalizeText(event?.dialogue || event?.content || event?.summary);
  }

  return normalizeText(event?.summary || event?.dialogue || event?.content);
}

function normalizeDispatchContext(dispatchContext = {}) {
  const leadSpeakerIds = normalizeResidentIdList(dispatchContext?.leadSpeakerIds);
  const supportSpeakerIds = normalizeResidentIdList(dispatchContext?.supportSpeakerIds)
    .filter((residentId) => !leadSpeakerIds.includes(residentId));
  const listenerIds = normalizeResidentIdList(dispatchContext?.listenerIds)
    .filter((residentId) => !leadSpeakerIds.includes(residentId) && !supportSpeakerIds.includes(residentId));
  const rawReasonTags = dispatchContext?.reasonTagsByResidentId || {};
  const reasonTagsByResidentId = Object.fromEntries(
    Object.entries(rawReasonTags)
      .map(([residentId, reasonTags]) => [
        normalizeText(residentId),
        Array.from(new Set(
          (Array.isArray(reasonTags) ? reasonTags : [])
            .map((tag) => normalizeText(tag))
            .filter(Boolean)
        ))
      ])
      .filter(([residentId]) => residentId)
  );

  return {
    leadSpeakerIds,
    supportSpeakerIds,
    listenerIds,
    reasonTagsByResidentId
  };
}

function hasFreshSceneResidentEvent(eventType = '', residentId = '', townEvents = []) {
  const safeResidentId = normalizeText(residentId);
  const safeEventType = normalizeText(eventType);

  if (!safeResidentId || !safeEventType) {
    return false;
  }

  return (Array.isArray(townEvents) ? townEvents : []).some((event) => (
    normalizeText(event?.type) === safeEventType
    && (Array.isArray(event?.residents) ? event.residents : [])
      .map((item) => normalizeText(item))
      .includes(safeResidentId)
  ));
}

function resolveProjectionSalience(projection = {}, residentId = '', dispatchContext = {}) {
  const safeResidentId = normalizeText(residentId);
  const explicitSalience = normalizeText(projection?.salience);

  if (explicitSalience) {
    return normalizeSceneSalience(explicitSalience);
  }

  if (
    normalizeText(projection?.perspective) === 'speaker'
    || dispatchContext.leadSpeakerIds.includes(safeResidentId)
  ) {
    return 'high';
  }

  if (
    normalizeText(projection?.perspective) === 'targeted'
    || dispatchContext.supportSpeakerIds.includes(safeResidentId)
  ) {
    return 'medium';
  }

  return 'low';
}

function scaleSignedDelta(value, ratio) {
  const num = Number(value) || 0;
  if (num === 0) {
    return 0;
  }

  return clampRelationshipDelta(Math.round(num * ratio));
}

export function buildSceneSpeakerDispatchContext({
  locationId = '',
  residents = [],
  history = [],
  townEvents = [],
  userContent = ''
} = {}) {
  const safeLocationId = normalizeText(locationId);
  const safeUserContent = normalizeText(userContent);
  const recentModelMessages = extractVisibleSceneMessages(history)
    .filter((message) => normalizeText(message?.role) === 'model')
    .slice(-3)
    .map((message) => normalizeText(message?.content));

  const scoredResidents = (Array.isArray(residents) ? residents : [])
    .map((resident) => {
      const residentId = normalizeText(resident?.id);
      const residentName = normalizeText(resident?.name);
      const relationship = resident?.playerRelationship || {};
      const reasonTags = [];
      let score = 0;

      if (!residentId) {
        return null;
      }

      if (normalizeText(resident?.townProfile?.homeLocationId) === safeLocationId) {
        score += 6;
        reasonTags.push('scene_host');
      }

      if (residentName && safeUserContent.includes(residentName)) {
        score += 5;
        reasonTags.push('player_named');
      }

      if (hasFreshSceneResidentEvent('player_resident_conversation_followup', residentId, townEvents)) {
        score += 4;
        reasonTags.push('fresh_followup');
      }

      if (hasFreshSceneResidentEvent('player_relationship_permission_unlocked', residentId, townEvents)) {
        score += 3;
        reasonTags.push('fresh_permission_unlock');
      }

      score += Math.round((Number(relationship?.trust) || 0) / 20);
      score += Math.round((Number(relationship?.familiarity) || 0) / 25);

      if (residentName && recentModelMessages.some((message) => message.includes(residentName))) {
        score -= 3;
        reasonTags.push('recent_speaker_penalty');
      }

      return {
        residentId,
        score,
        reasonTags
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score);

  const leadSpeakerIds = scoredResidents.slice(0, 1).map((item) => item.residentId).filter(Boolean);
  const supportSpeakerIds = scoredResidents
    .slice(1)
    .filter((item) => item.score >= 5)
    .slice(0, 2)
    .map((item) => item.residentId)
    .filter((residentId) => !leadSpeakerIds.includes(residentId));
  const listenerIds = scoredResidents
    .map((item) => item.residentId)
    .filter((residentId) => !leadSpeakerIds.includes(residentId) && !supportSpeakerIds.includes(residentId));

  return normalizeDispatchContext({
    leadSpeakerIds,
    supportSpeakerIds,
    listenerIds,
    reasonTagsByResidentId: Object.fromEntries(
      scoredResidents.map((item) => [item.residentId, item.reasonTags])
    )
  });
}

export function scaleSceneRelationshipEffect(effect = {}, {
  participationRole = 'listener',
  perspective = 'listener'
} = {}) {
  const normalizedRole = normalizeText(participationRole);
  const normalizedPerspective = normalizeText(perspective);
  const ratio = normalizedRole === 'lead'
    ? 1
    : normalizedRole === 'support'
      ? 0.6
      : normalizedPerspective === 'targeted'
        ? 0.35
        : 0;

  if (ratio <= 0) {
    return null;
  }

  return {
    ...effect,
    trustDelta: scaleSignedDelta(effect?.trustDelta, ratio),
    familiarityDelta: scaleSignedDelta(effect?.familiarityDelta, ratio),
    affinityDelta: scaleSignedDelta(effect?.affinityDelta, ratio),
    tensionDelta: scaleSignedDelta(effect?.tensionDelta, ratio)
  };
}

export function resolveSceneResidentParticipation({
  residentId = '',
  dispatchContext = {},
  projection = null,
  speakerTurn = null
} = {}) {
  const safeResidentId = normalizeText(residentId);
  const normalizedDispatchContext = normalizeDispatchContext(dispatchContext);
  const perspective = normalizeText(projection?.perspective);
  const spoke = Boolean(speakerTurn);
  let role = 'listener';

  if (normalizedDispatchContext.leadSpeakerIds.includes(safeResidentId) || perspective === 'speaker') {
    role = 'lead';
  } else if (normalizedDispatchContext.supportSpeakerIds.includes(safeResidentId) || perspective === 'targeted') {
    role = 'support';
  }

  return {
    role,
    shouldCreateFollowUp: role === 'lead' || role === 'support' || (spoke && role !== 'listener')
  };
}

export function normalizeSceneDispatchResult(rawResult = {}, {
  residents = [],
  playerName = '玩家',
  locationName = '',
  dispatchContext = null
} = {}) {
  const safeDispatchContext = normalizeDispatchContext(dispatchContext || rawResult?.dispatchContext || {});
  const residentMap = new Map(
    (Array.isArray(residents) ? residents : []).map((resident) => [String(resident?.id || '').trim(), resident])
  );
  const speakerTurns = (Array.isArray(rawResult?.speakerQueue) ? rawResult.speakerQueue : [])
    .map((turn) => {
      const residentId = normalizeText(turn?.residentId);
      const resident = residentMap.get(residentId);
      const content = normalizeText(turn?.content);

      if (!residentId || !resident || !content) {
        return null;
      }

      return {
        residentId,
        residentName: normalizeText(turn?.residentName) || normalizeText(resident?.name) || '在场居民',
        content
      };
    })
    .filter(Boolean)
    .slice(0, 3);

  const memoryProjections = (Array.isArray(rawResult?.memoryProjections) ? rawResult.memoryProjections : [])
    .map((projection) => {
      const residentId = normalizeText(projection?.residentId);
      const resident = residentMap.get(residentId);
      const summary = normalizeText(projection?.summary);

      if (!residentId || !resident || !summary) {
        return null;
      }

      return {
        residentId,
        residentName: normalizeText(projection?.residentName) || normalizeText(resident?.name) || '在场居民',
        summary,
        perspective: normalizeText(projection?.perspective) || 'listener',
        salience: resolveProjectionSalience(projection, residentId, safeDispatchContext),
        shouldPersistDiary: projection?.shouldPersistDiary !== false
      };
    })
    .filter(Boolean);
  const existingProjectionIds = new Set(memoryProjections.map((projection) => projection.residentId));
  const safeLocationName = normalizeText(locationName) || '现场';
  const safeSceneSummary = normalizeText(rawResult?.sceneSummary)
    || `${playerName}在${safeLocationName}主动说了句话，在场居民顺着气氛接了下去。`;

  residentMap.forEach((resident, residentId) => {
    if (existingProjectionIds.has(residentId)) {
      return;
    }

    memoryProjections.push({
      residentId,
      residentName: normalizeText(resident?.name) || '在场居民',
      summary: `我在${safeLocationName}旁听到这轮公开聊天。${safeSceneSummary}`,
      perspective: 'listener',
      salience: resolveProjectionSalience({ perspective: 'listener' }, residentId, safeDispatchContext),
      shouldPersistDiary: false
    });
  });

  const relationshipEffects = (Array.isArray(rawResult?.relationshipEffects) ? rawResult.relationshipEffects : [])
    .map((effect) => {
      const residentId = normalizeText(effect?.residentId);
      const resident = residentMap.get(residentId);

      if (!residentId || !resident) {
        return null;
      }

      return {
        residentId,
        residentName: normalizeText(resident?.name) || '在场居民',
        trustDelta: clampRelationshipDelta(effect?.trustDelta),
        familiarityDelta: clampRelationshipDelta(effect?.familiarityDelta),
        affinityDelta: clampRelationshipDelta(effect?.affinityDelta),
        tensionDelta: clampRelationshipDelta(effect?.tensionDelta),
        reason: normalizeText(effect?.reason)
      };
    })
    .filter(Boolean)
    .filter((effect) => (
      effect.trustDelta !== 0
      || effect.familiarityDelta !== 0
      || effect.affinityDelta !== 0
      || effect.tensionDelta !== 0
      || effect.reason
    ));

  const sceneSummary = safeSceneSummary;

  return {
    speakerTurns,
    sceneSummary,
    dispatchContext: safeDispatchContext,
    memoryProjections,
    relationshipEffects
  };
}

export function normalizeSceneMemoryDigest(entry = {}) {
  const sceneChatId = normalizeText(entry?.sceneChatId);
  const summary = normalizeText(entry?.summary);
  const happenedAt = Number(entry?.happenedAt) || 0;

  if (!sceneChatId || !summary || !happenedAt) {
    return null;
  }

  return {
    sceneChatId,
    worldId: normalizeText(entry?.worldId),
    locationId: normalizeText(entry?.locationId),
    locationName: normalizeText(entry?.locationName) || normalizeText(entry?.locationId) || '现场',
    residentId: normalizeText(entry?.residentId),
    residentName: normalizeText(entry?.residentName),
    summary,
    perspective: normalizeText(entry?.perspective) || 'listener',
    salience: normalizeSceneSalience(entry?.salience),
    happenedAt
  };
}

export function mergeSceneMemoryDigests(existing = [], incoming = [], limit = 6) {
  const merged = [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]
    .map((entry) => normalizeSceneMemoryDigest(entry))
    .filter(Boolean);
  const deduped = [];
  const seen = new Set();

  merged
    .sort((left, right) => {
      const salienceDiff = getSceneSalienceWeight(right?.salience) - getSceneSalienceWeight(left?.salience);
      if (salienceDiff !== 0) {
        return salienceDiff;
      }

      return (Number(right?.happenedAt) || 0) - (Number(left?.happenedAt) || 0);
    })
    .forEach((entry) => {
      const key = `${entry.sceneChatId}::${entry.happenedAt}::${entry.summary}`;
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      deduped.push(entry);
    });

  return deduped.slice(0, Math.max(0, Number(limit) || 0));
}

export function buildSceneChatMemoryContext(character = {}, limit = 2) {
  const entries = mergeSceneMemoryDigests(character?.sceneMemories || [], [], limit);

  if (entries.length === 0) {
    return '';
  }

  return [
    `【Recent Scene Memories (${entries.length})】`,
    ...entries.map((entry) => `[${entry.locationName}]: ${entry.summary}`)
  ].join('\n');
}

export function formatSceneSpeakerTurn(turn = {}) {
  const residentName = normalizeText(turn?.residentName) || '在场居民';
  const content = normalizeText(turn?.content);
  return content ? `${residentName}：${content}` : '';
}

export function buildSceneAmbientEventMessages(events = [], options = {}) {
  const visibility = normalizeSceneConversationVisibility(
    options?.sceneConversationVisibility || options?.visibility
  );

  return (Array.isArray(events) ? events : [])
    .filter((event) => isSceneAmbientEvent(event) && shouldExposeAmbientEvent(event, options))
    .map((event, index) => {
      const content = resolveAmbientEventContent(event, visibility);
      const eventId = normalizeText(event?.id) || `scene-ambient-${index}`;

      if (!content) {
        return null;
      }

      return normalizeRenderableSceneMessage({
        id: `scene-ambient-event-${eventId}`,
        role: 'system',
        type: visibility === 'full' ? 'scene_ambient_dialogue' : 'scene_ambient_summary',
        isSystem: true,
        content,
        timestamp: normalizeSceneMessageTimestamp(event)
      }, `scene-ambient-event-${eventId}`);
    })
    .filter(Boolean)
    .sort((left, right) => {
      const timeDiff = normalizeSceneMessageTimestamp(left) - normalizeSceneMessageTimestamp(right);
      if (timeDiff !== 0) {
        return timeDiff;
      }

      return String(left?.id || '').localeCompare(String(right?.id || ''));
    });
}

export function extractVisibleSceneMessages(messages = []) {
  return (Array.isArray(messages) ? messages : []).filter((message) => !isSceneDispatchMetaMessage(message));
}

export function mergeRenderableSceneMessages(messages = [], ambientMessages = []) {
  const merged = [
    ...extractVisibleSceneMessages(messages)
      .map((message, index) => {
        const normalizedMessage = normalizeRenderableSceneMessage(
          message,
          normalizeText(message?.id) || `scene-message-${index}`
        );

        return normalizedMessage
          ? {
            ...normalizedMessage,
            __sourceRank: 0,
            __sourceIndex: index
          }
          : null;
      })
      .filter(Boolean),
    ...(Array.isArray(ambientMessages) ? ambientMessages : [])
      .map((message, index) => {
        const normalizedMessage = normalizeRenderableSceneMessage(
          message,
          normalizeText(message?.id) || `scene-ambient-${index}`
        );

        return normalizedMessage
          ? {
            ...normalizedMessage,
            __sourceRank: 1,
            __sourceIndex: index
          }
          : null;
      })
      .filter(Boolean)
  ]
    .sort((left, right) => {
      const timeDiff = normalizeSceneMessageTimestamp(left) - normalizeSceneMessageTimestamp(right);
      if (timeDiff !== 0) {
        return timeDiff;
      }

      const sourceDiff = (Number(left?.__sourceRank) || 0) - (Number(right?.__sourceRank) || 0);
      if (sourceDiff !== 0) {
        return sourceDiff;
      }

      return (Number(left?.__sourceIndex) || 0) - (Number(right?.__sourceIndex) || 0);
    });
  const deduped = [];
  const seen = new Set();

  merged.forEach((message) => {
    const messageId = normalizeText(message?.id);
    if (messageId && seen.has(messageId)) {
      return;
    }

    if (messageId) {
      seen.add(messageId);
    }

    const { __sourceRank, __sourceIndex, ...renderableMessage } = message;
    deduped.push(renderableMessage);
  });

  return deduped;
}

export function buildSceneMemoryDigest(projection = {}, meta = {}) {
  return normalizeSceneMemoryDigest({
    sceneChatId: meta?.sceneChatId,
    worldId: meta?.worldId,
    locationId: meta?.locationId,
    locationName: meta?.locationName,
    happenedAt: meta?.happenedAt,
    residentId: projection?.residentId,
    residentName: projection?.residentName,
    perspective: projection?.perspective,
    salience: projection?.salience,
    summary: projection?.summary
  });
}

export function shouldPersistSceneMemoryToDiary(projection = {}, dispatch = {}) {
  const residentId = normalizeText(projection?.residentId);
  const spoke = (Array.isArray(dispatch?.speakerTurns) ? dispatch.speakerTurns : [])
    .some((turn) => normalizeText(turn?.residentId) === residentId);
  const hasRelationshipEffect = (Array.isArray(dispatch?.relationshipEffects) ? dispatch.relationshipEffects : [])
    .some((effect) => normalizeText(effect?.residentId) === residentId);
  const isHighSalience = normalizeSceneSalience(projection?.salience) === 'high';

  return Boolean(projection?.shouldPersistDiary || spoke || hasRelationshipEffect || isHighSalience);
}

export function buildSceneDispatchMetaMessage(dispatch = {}, extra = {}) {
  return {
    id: `scene-dispatch-meta-${Number(extra?.happenedAt) || Date.now()}`,
    role: 'system',
    type: 'scene_dispatch_meta',
    isSystem: true,
    content: JSON.stringify({
      sceneSummary: dispatch?.sceneSummary || '',
      speakerTurns: dispatch?.speakerTurns || [],
      memoryProjections: dispatch?.memoryProjections || [],
      relationshipEffects: dispatch?.relationshipEffects || [],
      ...extra
    })
  };
}

export function isSceneDispatchMetaMessage(message = {}) {
  return String(message?.type || '').trim() === 'scene_dispatch_meta';
}
