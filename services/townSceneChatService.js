import { LLM } from '@/services/llm.js';
import { cleanAiResponse } from '@/utils/textUtils.js';
import {
  buildSceneChatMemoryContext,
  buildSceneSpeakerDispatchContext,
  extractVisibleSceneMessages,
  normalizeSceneDispatchResult
} from '@/utils/town/town-scene-chat.js';

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
  const cleaned = stripCodeFence(cleanAiResponse(text));
  return JSON.parse(cleaned);
}

function buildResidentDispatchBlock(resident = {}, dispatchContext = {}) {
  const relationship = resident.playerRelationship || {};
  const sceneMemoryContext = buildSceneChatMemoryContext(resident, 2);
  const residentId = normalizeText(resident.id);
  const reasonTags = dispatchContext?.reasonTagsByResidentId?.[residentId] || [];
  const dispatchRole = (dispatchContext?.leadSpeakerIds || []).includes(residentId)
    ? 'lead'
    : (dispatchContext?.supportSpeakerIds || []).includes(residentId)
      ? 'support'
      : 'listener';

  return [
    `- residentId: ${residentId}`,
    `  name: ${normalizeText(resident.name) || '在场居民'}`,
    `  currentAction: ${normalizeText(resident.townRuntime?.currentAction || resident.currentAction) || '待在现场'}`,
    `  dispatchRole: ${dispatchRole}`,
    `  dispatchReasons: ${reasonTags.join(', ') || 'none'}`,
    `  relationStage: ${normalizeText(relationship.summaryText || resident.relation) || '初相识'}`,
    `  trust: ${Number(relationship.trust) || 0}`,
    `  familiarity: ${Number(relationship.familiarity) || 0}`,
    `  affinity: ${Number(relationship.affinity) || 0}`,
    `  tension: ${Number(relationship.tension) || 0}`,
    `  recentSceneMemory: ${sceneMemoryContext || 'none'}`
  ].join('\n');
}

function buildSceneHistoryBlock(messages = []) {
  const visibleMessages = extractVisibleSceneMessages(messages)
    .slice(-8)
    .map((message) => {
      const roleLabel = message.role === 'user' ? '玩家' : '现场';
      return `${roleLabel}: ${normalizeText(message.content)}`;
    });

  if (visibleMessages.length === 0) {
    return '暂无公开聊天历史。';
  }

  return visibleMessages.join('\n');
}

function buildTownEventBlock(townEvents = [], locationName = '') {
  const safeLocationName = normalizeText(locationName);
  const events = (Array.isArray(townEvents) ? townEvents : [])
    .filter((event) => normalizeText(event?.locationName) === safeLocationName)
    .slice(0, 3)
    .map((event) => `${normalizeText(event?.title) || '现场动静'}：${normalizeText(event?.summary)}`);

  return events.length > 0 ? events.join('\n') : '暂无新的现场事件。';
}

function buildFallbackSceneDispatch({
  residents = [],
  playerName = '玩家',
  locationName = '',
  userContent = '',
  dispatchContext = null
} = {}) {
  const safeDispatchContext = dispatchContext || {};
  const residentMap = new Map(
    (Array.isArray(residents) ? residents : []).map((resident) => [normalizeText(resident?.id), resident])
  );
  const leadResidentId = (safeDispatchContext?.leadSpeakerIds || []).find((residentId) => residentMap.has(residentId));
  const firstResident = leadResidentId
    ? residentMap.get(leadResidentId)
    : ((Array.isArray(residents) ? residents : [])[0] || null);
  const safeLocationName = normalizeText(locationName) || '现场';
  const safeUserContent = normalizeText(userContent);
  const supportProjection = (safeDispatchContext?.supportSpeakerIds || [])
    .map((residentId) => residentMap.get(residentId))
    .find((resident) => {
      const residentName = normalizeText(resident?.name);
      return residentName && safeUserContent.includes(residentName);
    }) || null;

  if (!firstResident) {
    return normalizeSceneDispatchResult({
      speakerQueue: [],
      sceneSummary: `${playerName}在${safeLocationName}说了一句“${safeUserContent || '你好'}”，现场暂时安静了下来。`,
      memoryProjections: []
    }, {
      residents,
      playerName,
      locationName: safeLocationName,
      dispatchContext: safeDispatchContext
    });
  }

  const memoryProjections = [
    {
      residentId: firstResident.id || '',
      residentName: firstResident.name || '',
      summary: `我在${safeLocationName}当众接住了玩家刚才抛出来的话题。`,
      perspective: 'speaker',
      salience: 'high',
      shouldPersistDiary: true
    }
  ];

  if (supportProjection && normalizeText(supportProjection?.id) !== normalizeText(firstResident?.id)) {
    memoryProjections.push({
      residentId: supportProjection.id || '',
      residentName: supportProjection.name || '',
      summary: `玩家在${safeLocationName}公开提到我，我顺着现场气氛补了一句。`,
      perspective: 'targeted',
      salience: 'medium',
      shouldPersistDiary: true
    });
  }

  return normalizeSceneDispatchResult({
    speakerQueue: [
      {
        residentId: firstResident.id || '',
        residentName: firstResident.name || '',
        content: safeUserContent
          ? `我听见了，你刚才提到“${safeUserContent}”。我们可以顺着这个继续聊。`
          : '我在听，你可以继续往下说。'
      }
    ],
    sceneSummary: `${playerName}在${safeLocationName}先开了口，${firstResident.name || '在场居民'}顺势把公开聊天接了起来。`,
    memoryProjections,
    relationshipEffects: [
      {
        residentId: firstResident.id || '',
        familiarityDelta: 1,
        reason: `${playerName}主动在公开场合和${firstResident.name || '她'}搭了话。`
      }
    ]
  }, {
    residents,
    playerName,
    locationName: safeLocationName,
    dispatchContext: safeDispatchContext
  });
}

function buildDispatchPrompt({
  playerName = '玩家',
  locationName = '',
  atmosphere = '',
  residents = [],
  history = [],
  townEvents = [],
  userContent = '',
  dispatchContext = null
} = {}) {
  const safeLocationName = normalizeText(locationName) || '现场';
  const safePlayerName = normalizeText(playerName) || '玩家';

  return [
    'Return JSON only.',
    'You are a scene public-chat scheduler for a living town simulation.',
    'Decide who among the present residents should answer the player in a public scene, who should stay silent, and what each person remembers afterward.',
    '',
    'Program Scheduler Context:',
    `Lead Speaker Candidates: ${(dispatchContext?.leadSpeakerIds || []).join(', ') || 'none'}`,
    `Support Speaker Candidates: ${(dispatchContext?.supportSpeakerIds || []).join(', ') || 'none'}`,
    `Listeners: ${(dispatchContext?.listenerIds || []).join(', ') || 'none'}`,
    `Reason Tags: ${JSON.stringify(dispatchContext?.reasonTagsByResidentId || {})}`,
    '',
    `Player Name: ${safePlayerName}`,
    `Location: ${safeLocationName}`,
    `Atmosphere: ${normalizeText(atmosphere) || '现场正在自然流动。'}`,
    `Latest Player Message: ${normalizeText(userContent) || '你好。'}`,
    '',
    'Present Residents:',
    (Array.isArray(residents) ? residents : []).map((resident) => buildResidentDispatchBlock(resident, dispatchContext)).join('\n'),
    '',
    'Recent Public Scene History:',
    buildSceneHistoryBlock(history),
    '',
    'Recent Location Events:',
    buildTownEventBlock(townEvents, safeLocationName),
    '',
    'Rules:',
    '1. Choose 1 to 3 speakers at most.',
    '2. Not everyone has to speak, but every present resident must receive a memory projection.',
    '3. Prefer lead speakers first, support speakers second, and listeners only when the public scene clearly needs them.',
    '4. Return speaker|targeted|listener perspectives that match the scheduler tiers.',
    '5. Keep each spoken reply concise and conversational.',
    '6. Only include relationship changes when this public exchange would realistically move trust, familiarity, affinity, or tension.',
    '7. Use shouldPersistDiary=true only when the resident clearly spoke, was directly hit by the topic, or the relationship noticeably changed.',
    '',
    'JSON schema:',
    '{',
    '  "speakerQueue": [{"residentId": "id", "content": "reply"}],',
    '  "sceneSummary": "what happened in the public scene",',
    '  "memoryProjections": [{"residentId": "id", "summary": "first-person memory", "perspective": "speaker|listener|targeted", "shouldPersistDiary": true}],',
    '  "relationshipEffects": [{"residentId": "id", "trustDelta": 0, "familiarityDelta": 0, "affinityDelta": 0, "tensionDelta": 0, "reason": "optional"}]',
    '}',
    '',
    'JSON only.'
  ].join('\n');
}

export async function dispatchTownSceneChat({
  config,
  playerName = '玩家',
  locationId = '',
  locationName = '',
  atmosphere = '',
  residents = [],
  history = [],
  townEvents = [],
  userContent = ''
} = {}) {
  const dispatchContext = buildSceneSpeakerDispatchContext({
    locationId,
    locationName,
    residents,
    history,
    townEvents,
    userContent
  });

  if ((Array.isArray(residents) ? residents : []).length <= 1) {
    return buildFallbackSceneDispatch({
      residents,
      playerName,
      locationName,
      userContent,
      dispatchContext
    });
  }

  try {
    const response = await LLM.chat({
      config,
      messages: [
        {
          role: 'user',
          content: buildDispatchPrompt({
            playerName,
            locationName,
            atmosphere,
            residents,
            history,
            townEvents,
            userContent,
            dispatchContext
          })
        }
      ],
      temperature: 0.5,
      maxTokens: 1800,
      jsonMode: true
    });
    const parsed = safeJsonParse(response);

    return normalizeSceneDispatchResult(parsed, {
      residents,
      playerName,
      locationName,
      dispatchContext
    });
  } catch (error) {
    console.warn('[townSceneChatService] falling back after dispatch failure', error);
    return buildFallbackSceneDispatch({
      residents,
      playerName,
      locationName,
      userContent,
      dispatchContext
    });
  }
}
