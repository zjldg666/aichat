import {
  buildAutonomousThreadPairKey,
  closeAutonomousConversationThread,
  createAutonomousConversationThread
} from '@/utils/town/town-autonomous-conversation-threads.js';
import { isResidentAgentMode } from '@/utils/town/town-resident-autonomy.js';
import { LLM } from '@/services/llm.js';

const STARTABLE_REASON_TAGS = new Set([
  'after_work_overlap',
  'companion_visit_followup',
  'fresh_chat_afterglow',
  'outing_coordination'
]);
const INTERRUPTING_EVENT_TYPES = new Set([
  'player_resident_invitation',
  'player_resident_activity_join',
  'player_relationship_focus'
]);
const INTERRUPTING_ACTION_TYPES = new Set([
  'player_invitation',
  'player_activity_join',
  'player_relationship_focus',
  'player_permission_followup'
]);

function normalizeStringList(value = []) {
  return [...new Set(
    (Array.isArray(value) ? value : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  )];
}

function normalizeText(value = '') {
  return String(value || '').trim();
}

function stripCodeFence(text = '') {
  return String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function safeJsonParse(text = '') {
  return JSON.parse(stripCodeFence(text));
}

function buildResidentMap(residents = []) {
  return new Map(
    (Array.isArray(residents) ? residents : []).map((resident) => [String(resident?.id || '').trim(), resident])
  );
}

function buildActiveThreadKey(thread = {}) {
  return [
    buildAutonomousThreadPairKey(thread.participantIds || []),
    String(thread.locationId || '').trim(),
    String(thread.type || '').trim()
  ].join('@');
}

function resolveResidentLocationId(resident = {}) {
  return String(resident?.townRuntime?.currentLocationId || '').trim();
}

function resolveResidentLocationName(resident = {}) {
  return String(
    resident?.townRuntime?.currentLocationName
    || resident?.currentLocation
    || resident?.location
    || ''
  ).trim();
}

function resolveAutonomy(resident = {}) {
  return resident?.townRuntime?.autonomy || {};
}

function resolveResidentAction(resident = {}) {
  return normalizeText(
    resident?.townRuntime?.currentAction
    || resident?.currentAction
    || resident?.lastActivity
    || ''
  ) || '待在现场';
}

function resolveResidentCompanionActionType(resident = {}) {
  return normalizeText(resident?.townRuntime?.currentCompanionActionType);
}

function resolveResidentTargetResidentId(resident = {}) {
  return normalizeText(resident?.townRuntime?.currentTargetResidentId);
}

function buildAutonomousResidentMap(residents = []) {
  return new Map(
    (Array.isArray(residents) ? residents : [])
      .map((resident) => [normalizeText(resident?.id), resident])
      .filter(([residentId]) => residentId)
  );
}

function buildAutonomousRoundFallback({ thread = {}, residents = [] } = {}) {
  const residentMap = buildAutonomousResidentMap(residents);
  const safeTopicSeed = normalizeText(thread?.topicSeed) || '刚才的话题';
  const turns = (Array.isArray(thread?.participantIds) ? thread.participantIds : [])
    .map((residentId, index) => {
      const resident = residentMap.get(normalizeText(residentId)) || {};
      const residentName = normalizeText(resident?.name) || '居民';
      const currentAction = resolveResidentAction(resident);

      return {
        residentId: normalizeText(residentId),
        residentName,
        content: index === 0
          ? `刚才聊到${safeTopicSeed}，我现在还在想着这件事。`
          : `是啊，而且我刚刚还在${currentAction}，顺着这个话题继续说正合适。`
      };
    })
    .filter((turn) => turn.residentId && turn.content);

  return {
    threadId: normalizeText(thread?.id),
    turns,
    summary: turns.length > 0
      ? turns.map((turn) => `${turn.residentName}：${turn.content}`).join(' / ')
      : safeTopicSeed,
    shouldContinue: false
  };
}

function buildAutonomousRoundPrompt({ thread = {}, residents = [] } = {}) {
  const residentMap = buildAutonomousResidentMap(residents);
  const participants = (Array.isArray(thread?.participantIds) ? thread.participantIds : [])
    .map((residentId) => {
      const resident = residentMap.get(normalizeText(residentId)) || {};
      const personality = normalizeText(resident?.settings?.personality);
      const likes = normalizeText(resident?.settings?.likes);
      const lines = [
        `- residentId: ${normalizeText(residentId)}`,
        `  name: ${normalizeText(resident?.name) || '居民'}`,
        `  currentAction: ${resolveResidentAction(resident)}`
      ];
      if (personality) lines.push(`  personality: ${personality}`);
      if (likes) lines.push(`  likes: ${likes}`);
      if (isResidentAgentMode(resident)) lines.push('  agentMode: true');
      return lines.join('\n');
    })
    .join('\n');

  const roundCount = Number(thread?.roundCount) || 0;
  const formattedTime = thread?.startedAt
    ? new Date(Number(thread.startedAt)).toLocaleString('zh-CN', { hour12: false })
    : '未知时间';
  const maxRounds = Number(thread?.maxRounds) || 3;
  const lastSummary = normalizeText(thread?.lastSummary);

  return [
    'Return JSON only.',
    'You are generating a short autonomous resident-to-resident scene dialogue for a living town simulation.',
    `Thread Type: ${normalizeText(thread?.type) || 'scene_autonomous'}`,
    `Location Id: ${normalizeText(thread?.locationId) || 'unknown'}`,
    `Current Time: ${formattedTime}`,
    `Round: ${roundCount + 1} / ${maxRounds}`,
    `Topic Seed: ${normalizeText(thread?.topicSeed) || '刚才的话题'}`,
    `Last Summary: ${lastSummary || 'none'}`,
    `Trigger Reason Tags: ${normalizeStringList(thread?.triggerReasonTags).join(', ') || 'none'}`,
    '',
    'Participants:',
    participants || '- none',
    '',
    'Rules:',
    '1. Return 2 to 4 short turns.',
    '2. Each turn must be a natural resident-to-resident line.',
    '3. Keep the dialogue grounded in ordinary town life.',
    '4. Also return a one-sentence Chinese summary.',
    '5. Decide whether the conversation should continue based on the current time and scene atmosphere.',
    '   If it\'s late, characters should naturally part ways, or the topic has wound down, set "shouldContinue" to false.',
    '   If there\'s still energy and things to talk about, set "shouldContinue" to true.',
    '6. If this round would mostly repeat the last summary, set "shouldContinue" to false.',
    '',
    'JSON schema:',
    '{',
    '  "turns": [{"residentId": "id", "content": "line"}],',
    '  "summary": "one sentence summary",',
    '  "shouldContinue": true',
    '}',
    '',
    'JSON only.'
  ].join('\n');
}

function normalizeAutonomousTurns(turns = [], residents = [], participantIds = []) {
  const residentMap = buildAutonomousResidentMap(residents);
  const allowedParticipantIds = new Set(
    (Array.isArray(participantIds) ? participantIds : [])
      .map((residentId) => normalizeText(residentId))
      .filter(Boolean)
  );

  return (Array.isArray(turns) ? turns : [])
    .map((turn) => {
      const residentId = normalizeText(turn?.residentId);
      if (!residentId || !allowedParticipantIds.has(residentId)) {
        return null;
      }

      const resident = residentMap.get(residentId) || {};
      const content = normalizeText(turn?.content);
      if (!content) {
        return null;
      }

      return {
        residentId,
        residentName: normalizeText(turn?.residentName || resident?.name) || '居民',
        content
      };
    })
    .filter(Boolean);
}

function shouldStartSceneThread({ resident = {}, targetResident = {} } = {}) {
  const autonomy = resolveAutonomy(resident);
  const reasonTags = normalizeStringList(autonomy.recentContactReasonTags);
  const lastContactLocationId = String(autonomy.lastContactLocationId || '').trim();
  const currentLocationId = resolveResidentLocationId(resident);
  const targetLocationId = resolveResidentLocationId(targetResident);

  if (!currentLocationId || !targetLocationId || currentLocationId !== targetLocationId) {
    return false;
  }

  if (!isResidentAgentMode(resident) && !isResidentAgentMode(targetResident)) {
    if (lastContactLocationId && lastContactLocationId !== currentLocationId) {
      return false;
    }
  }

  if (isResidentAgentMode(resident) || isResidentAgentMode(targetResident)) {
    return reasonTags.length > 0;
  }

  return reasonTags.some((tag) => STARTABLE_REASON_TAGS.has(tag));
}

function shouldStartRemoteThread({ resident = {}, targetResident = {} } = {}) {
  const autonomy = resolveAutonomy(resident);
  const preferredFollowUpResidentIds = normalizeStringList(autonomy.preferredFollowUpResidentIds);
  const currentLocationId = resolveResidentLocationId(resident);
  const targetLocationId = resolveResidentLocationId(targetResident);
  const recentConversationSummary = normalizeText(
    autonomy?.recentConversationSummaries?.[0]?.summary
  );

  if (!currentLocationId || !targetLocationId || currentLocationId === targetLocationId) {
    return false;
  }

  if (!recentConversationSummary) {
    return false;
  }

  return preferredFollowUpResidentIds.includes(normalizeText(targetResident?.id));
}

function buildSceneThreadPayload({ resident = {}, targetResident = {}, currentTime = 0 } = {}) {
  const autonomy = resolveAutonomy(resident);
  const reasonTags = normalizeStringList(autonomy.recentContactReasonTags);
  const locationId = resolveResidentLocationId(resident);
  const locationName = resolveResidentLocationName(resident);
  const residentName = resident?.name || '居民';
  const targetResidentName = targetResident?.name || '居民';

  return {
    type: 'scene_autonomous',
    participantIds: [resident?.id, targetResident?.id],
    locationId,
    startedAt: currentTime,
    triggerSource: 'life_contact',
    triggerReasonTags: reasonTags,
    topicSeed: `${residentName}和${targetResidentName}在${locationName || '现场'}继续刚才的接触话题`
  };
}

function buildRemoteThreadPayload({ resident = {}, targetResident = {}, currentTime = 0 } = {}) {
  const autonomy = resolveAutonomy(resident);
  const residentName = resident?.name || '居民';
  const targetResidentName = targetResident?.name || '居民';
  const residentLocationName = resolveResidentLocationName(resident) || '原地';
  const targetLocationName = resolveResidentLocationName(targetResident) || '另一边';
  const recentConversationSummary = normalizeText(
    autonomy?.recentConversationSummaries?.[0]?.summary
  );

  return {
    type: 'remote_autonomous',
    participantIds: [resident?.id, targetResident?.id],
    locationId: '',
    startedAt: currentTime,
    triggerSource: 'follow_up_bias',
    triggerReasonTags: ['preferred_follow_up'],
    topicSeed: recentConversationSummary || `${residentName}和${targetResidentName}分开后，还想继续刚才在${residentLocationName}与${targetLocationName}之间没说完的话题`
  };
}

function reactivateAutonomousConversationThread(thread = {}) {
  return {
    ...thread,
    status: 'active'
  };
}

function hasFreshInterruptingEvent({
  residentId = '',
  townEvents = [],
  currentTime = 0,
  since = 0
} = {}) {
  const safeResidentId = normalizeText(residentId);
  const safeCurrentTime = Number(currentTime) || 0;
  const safeSince = Number(since) || 0;

  if (!safeResidentId) {
    return false;
  }

  return (Array.isArray(townEvents) ? townEvents : []).some((event) => {
    const eventType = normalizeText(event?.type);
    const happenedAt = Number(event?.happenedAt) || 0;
    const residentIds = normalizeStringList(event?.residents);

    if (!INTERRUPTING_EVENT_TYPES.has(eventType)) {
      return false;
    }

    if (!residentIds.includes(safeResidentId)) {
      return false;
    }

    if (happenedAt <= 0 || happenedAt < safeSince || happenedAt > safeCurrentTime) {
      return false;
    }

    return safeCurrentTime - happenedAt <= 60 * 60 * 1000;
  });
}

function isResidentPulledIntoHigherPriorityAction(resident = {}) {
  const actionType = resolveResidentCompanionActionType(resident);
  const targetResidentId = resolveResidentTargetResidentId(resident);

  return targetResidentId === 'player' && INTERRUPTING_ACTION_TYPES.has(actionType);
}

function hasHigherPriorityInterruption({
  participants = [],
  thread = {},
  townEvents = [],
  currentTime = 0
} = {}) {
  const since = Math.max(
    Number(thread?.lastAdvancedAt) || 0,
    Number(thread?.startedAt) || 0
  );

  return (Array.isArray(participants) ? participants : []).some((resident) => (
    isResidentPulledIntoHigherPriorityAction(resident)
    || hasFreshInterruptingEvent({
      residentId: resident?.id,
      townEvents,
      currentTime,
      since
    })
  ));
}

function shouldContinueSceneThread({
  participants = [],
  participantIds = [],
  thread = {},
  currentTime = 0,
  townEvents = []
} = {}) {
  const safeCurrentTime = Number(currentTime) || 0;
  const cooldownUntil = Number(thread?.cooldownUntil) || 0;

  if (participants.length !== participantIds.length) {
    return false;
  }

  if (safeCurrentTime < cooldownUntil) {
    return false;
  }

  if (Number(thread?.roundCount || 0) >= Number(thread?.maxRounds || 0)) {
    return false;
  }

  if (hasHigherPriorityInterruption({ participants, thread, townEvents, currentTime: safeCurrentTime })) {
    return false;
  }

  return new Set(participants.map((resident) => resolveResidentLocationId(resident))).size === 1;
}

function shouldContinueRemoteThread({
  participants = [],
  participantIds = [],
  thread = {},
  currentTime = 0,
  townEvents = []
} = {}) {
  const safeCurrentTime = Number(currentTime) || 0;
  const cooldownUntil = Number(thread?.cooldownUntil) || 0;

  if (participants.length !== participantIds.length) {
    return false;
  }

  if (safeCurrentTime < cooldownUntil) {
    return false;
  }

  if (Number(thread?.roundCount || 0) >= Number(thread?.maxRounds || 0)) {
    return false;
  }

  if (hasHigherPriorityInterruption({ participants, thread, townEvents, currentTime: safeCurrentTime })) {
    return false;
  }

  return new Set(participants.map((resident) => resolveResidentLocationId(resident))).size > 1;
}

export function advanceAutonomousConversationRuntime({
  residents = [],
  autonomousThreads = [],
  townEvents = [],
  currentTime = 0
} = {}) {
  const residentMap = buildResidentMap(residents);
  const nextThreads = [];
  const startedThreads = [];
  const continuedThreads = [];
  const closedThreads = [];
  const seenThreadKeys = new Set();

  (Array.isArray(autonomousThreads) ? autonomousThreads : []).forEach((thread) => {
    const participantIds = Array.isArray(thread?.participantIds) ? thread.participantIds : [];
    const participants = participantIds
      .map((residentId) => residentMap.get(String(residentId || '').trim()))
      .filter(Boolean);
    const threadType = String(thread?.type || '').trim();
    const threadStatus = String(thread?.status || '').trim();

    if (
      threadStatus === 'active'
      && participants.length === participantIds.length
      && new Set(participants.map((resident) => resolveResidentLocationId(resident))).size > 1
      && threadType === 'scene_autonomous'
    ) {
      const closedThread = closeAutonomousConversationThread({
        thread,
        closedAt: currentTime,
        reason: 'participants_separated'
      });
      seenThreadKeys.add(buildActiveThreadKey(closedThread));
      nextThreads.push(closedThread);
      closedThreads.push(closedThread);
      return;
    }

    if (
      (threadType === 'scene_autonomous' || threadType === 'remote_autonomous')
      && participants.length === participantIds.length
      && hasHigherPriorityInterruption({ participants, thread, townEvents, currentTime })
    ) {
      const closedThread = closeAutonomousConversationThread({
        thread,
        closedAt: currentTime,
        reason: 'higher_priority_event'
      });
      seenThreadKeys.add(buildActiveThreadKey(closedThread));
      nextThreads.push(closedThread);
      closedThreads.push(closedThread);
      return;
    }

    if (
      threadStatus === 'cooldown'
      && Number(thread?.roundCount || 0) >= Number(thread?.maxRounds || 0)
    ) {
      const closedThread = closeAutonomousConversationThread({
        thread,
        closedAt: currentTime,
        reason: 'max_rounds_reached'
      });
      seenThreadKeys.add(buildActiveThreadKey(closedThread));
      nextThreads.push(closedThread);
      closedThreads.push(closedThread);
      return;
    }

    if (
      threadType === 'scene_autonomous'
      && shouldContinueSceneThread({
        participants,
        participantIds,
        thread,
        currentTime,
        townEvents
      })
    ) {
      const continuedThread = reactivateAutonomousConversationThread(thread);
      nextThreads.push(continuedThread);
      continuedThreads.push(continuedThread);
      seenThreadKeys.add(buildActiveThreadKey(continuedThread));
      return;
    }

    if (
      threadType === 'remote_autonomous'
      && shouldContinueRemoteThread({
        participants,
        participantIds,
        thread,
        currentTime,
        townEvents
      })
    ) {
      const continuedThread = reactivateAutonomousConversationThread(thread);
      nextThreads.push(continuedThread);
      continuedThreads.push(continuedThread);
      seenThreadKeys.add(buildActiveThreadKey(continuedThread));
      return;
    }

    nextThreads.push(thread);
    if (threadStatus !== 'closed' || Number(thread?.cooldownUntil || 0) > Number(currentTime || 0)) {
      seenThreadKeys.add(buildActiveThreadKey(thread));
    }
  });

  (Array.isArray(residents) ? residents : []).forEach((resident) => {
    const autonomy = resolveAutonomy(resident);
    const targetResidentIds = normalizeStringList(autonomy.recentContactResidentIds);
    const remoteFollowUpResidentIds = normalizeStringList(autonomy.preferredFollowUpResidentIds);

    targetResidentIds.forEach((targetResidentId) => {
      const targetResident = residentMap.get(targetResidentId);
      if (!targetResident || !shouldStartSceneThread({ resident, targetResident })) {
        return;
      }

      const payload = buildSceneThreadPayload({
        resident,
        targetResident,
        currentTime
      });
      const threadKey = [
        buildAutonomousThreadPairKey(payload.participantIds),
        payload.locationId,
        payload.type
      ].join('@');

      if (seenThreadKeys.has(threadKey)) {
        return;
      }

      seenThreadKeys.add(threadKey);
      const thread = createAutonomousConversationThread(payload);
      nextThreads.push(thread);
      startedThreads.push(thread);
    });

    remoteFollowUpResidentIds.forEach((targetResidentId) => {
      const targetResident = residentMap.get(targetResidentId);
      if (!targetResident || !shouldStartRemoteThread({ resident, targetResident })) {
        return;
      }

      const payload = buildRemoteThreadPayload({
        resident,
        targetResident,
        currentTime
      });
      const threadKey = [
        buildAutonomousThreadPairKey(payload.participantIds),
        payload.locationId,
        payload.type
      ].join('@');

      if (seenThreadKeys.has(threadKey)) {
        return;
      }

      seenThreadKeys.add(threadKey);
      const thread = createAutonomousConversationThread(payload);
      nextThreads.push(thread);
      startedThreads.push(thread);
    });
  });

  return {
    nextThreads,
    startedThreads,
    continuedThreads,
    closedThreads,
    debug: {
      currentTime,
      residentsConsidered: Array.isArray(residents) ? residents.length : 0,
      startedThreadIds: startedThreads.map((thread) => thread.id),
      continuedThreadIds: continuedThreads.map((thread) => thread.id),
      closedThreadIds: closedThreads.map((thread) => thread.id)
    }
  };
}

export async function runAutonomousConversationRound({
  thread = {},
  residents = [],
  config = null,
  llmChat = null
} = {}) {
  const safeThread = thread && typeof thread === 'object' ? thread : {};
  const fallback = buildAutonomousRoundFallback({
    thread: safeThread,
    residents
  });

  try {
    const responseText = typeof llmChat === 'function'
      ? await llmChat(buildAutonomousRoundPrompt({ thread: safeThread, residents }))
      : (config?.apiKey
        ? await LLM.chat({
          config,
          messages: [
            {
              role: 'user',
              content: buildAutonomousRoundPrompt({ thread: safeThread, residents })
            }
          ]
        })
        : '');
    const parsed = safeJsonParse(responseText || '');
    const parsedTurns = normalizeAutonomousTurns(parsed?.turns, residents, safeThread?.participantIds);
    const summary = normalizeText(parsed?.summary);
    const shouldContinue = parsed?.shouldContinue !== false;

    if (parsedTurns.length >= 2) {
      return {
        threadId: normalizeText(safeThread?.id),
        turns: parsedTurns,
        summary: summary || parsedTurns.map((turn) => `${turn.residentName}：${turn.content}`).join(' / '),
        shouldContinue
      };
    }
  } catch (error) {
    console.warn('[townAutonomousConversationService] falling back after autonomous round failure', error);
  }

  return fallback;
}
