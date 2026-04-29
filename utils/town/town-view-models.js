import {
  buildLocationAtmosphere,
  findResidentActiveCompanions
} from '@/utils/town/town-social.js';
import { sortTownEvents } from '@/utils/town/town-event-order.js';
import {
  isPrivateResidenceLocation,
  resolvePlayerVisitorId,
  resolvePlayerResidenceLocationId,
  resolveLocationAccessState
} from '@/utils/town/town-location-access.js';

function sortTownEventsByTime(townEvents = []) {
  return sortTownEvents(townEvents);
}

function resolveResidentLocationName(resident = {}) {
  return resident.townRuntime?.currentLocationName || resident.currentLocation || resident.location || 'Unknown Location';
}

function resolveResidentAction(resident = {}) {
  return resident.townRuntime?.currentAction || resident.currentAction || 'idle';
}

function resolveWorldLocationName(location = {}) {
  if (typeof location === 'string') {
    return location;
  }

  return location.name || '';
}

export function buildLocationCards(worldTemplate = {}, residents = []) {
  const baseCards = (worldTemplate.locations || []).map((location) => ({
    id: location.id,
    name: location.name,
    chars: [],
    atmosphere: buildLocationAtmosphere(location.name, [])
  }));

  residents.forEach((resident) => {
    const locationName = resolveResidentLocationName(resident);
    let targetCard = baseCards.find((item) => item.name === locationName);

    if (!targetCard) {
      targetCard = {
        id: locationName,
        name: locationName,
        chars: [],
        atmosphere: buildLocationAtmosphere(locationName, [])
      };
      baseCards.push(targetCard);
    }

    targetCard.chars.push({
      id: resident.id,
      name: resident.name,
      avatar: resident.avatar,
      currentAction: resolveResidentAction(resident),
      unread: resident.unread || 0,
      affinity: resident.affinity
    });
  });

  baseCards.forEach((card) => {
    card.atmosphere = buildLocationAtmosphere(card.name, card.chars);
  });

  return baseCards;
}

export function createEmptyTownSnapshot({
  worldTemplate = {},
  currentTime = 0,
  sliceTimestamp = 0,
  autonomousConversationThreads = []
} = {}) {
  return {
    worldId: worldTemplate.id || null,
    worldTemplate,
    currentTime: Number(currentTime) || 0,
    sliceTimestamp: Number(sliceTimestamp) || 0,
    residents: [],
    locationCards: [],
    socialLinks: [],
    townEvents: [],
    autonomousConversationThreads: [...(Array.isArray(autonomousConversationThreads) ? autonomousConversationThreads : [])],
    // 统一世界真源 — 补充字段
    player: null,
    locationStates: {},
    residentContexts: {},
    accessSnapshot: null
  };
}

function buildPlayerSnapshot(worldTemplate = {}) {
  const playerTemplate = (worldTemplate.playerIdentityTemplates || [])[0] || {};
  return {
    id: playerTemplate.id || 'player',
    name: playerTemplate.name || '玩家',
    identity: playerTemplate.identity || '居民',
    address: playerTemplate.address || '',
    residence: playerTemplate.residence || null,
    residenceLocationId: resolvePlayerResidenceLocationId(worldTemplate)
  };
}

function buildLocationStates(worldTemplate = {}, locationCards = [], townEvents = []) {
  const states = {};
  const eventTimeByLocation = new Map();

  (townEvents || []).forEach((event) => {
    const name = String(event?.locationName || '').trim();
    const time = Number(event?.happenedAt) || 0;
    if (name && time && (!eventTimeByLocation.has(name) || eventTimeByLocation.get(name) < time)) {
      eventTimeByLocation.set(name, time);
    }
  });

  (worldTemplate.locations || []).forEach((location) => {
    const card = (locationCards || []).find((c) => (
      String(c?.id || '').trim() === String(location.id || '').trim()
      || String(c?.name || '').trim() === String(location.name || '').trim()
    )) || null;

    states[location.id] = {
      locationId: location.id,
      locationName: location.name,
      locationType: location.type || 'public',
      isPrivateResidence: isPrivateResidenceLocation(worldTemplate, location.id),
      residentCount: card?.chars?.length || 0,
      residentIds: (card?.chars || []).map((c) => c.id),
      atmosphere: card?.atmosphere || location.description || '',
      latestEventTime: eventTimeByLocation.get(location.name) || 0
    };
  });

  return states;
}

function buildResidentContexts(residents = [], socialLinks = [], townEvents = []) {
  const contexts = {};

  (residents || []).forEach((resident) => {
    const residentId = String(resident.id || '');
    if (!residentId) return;

    const companions = findResidentActiveCompanions(residentId, socialLinks);
    const latestEvents = sortTownEventsByTime(
      (townEvents || []).filter((e) => (e.residents || []).includes(residentId))
    ).slice(0, 3);

    contexts[residentId] = {
      residentId,
      currentLocationId: resident.townRuntime?.currentLocationId || '',
      currentLocationName: resident.townRuntime?.currentLocationName || resident.currentLocation || resident.location || '',
      currentAction: resident.townRuntime?.currentAction || resident.currentAction || '',
      companionNames: companions,
      latestEventCount: latestEvents.length,
      latestEventSummary: latestEvents[0]?.summary || '',
      lastSimulatedSlice: resident.townRuntime?.lastSimulatedSlice || 0
    };
  });

  return contexts;
}

function buildAccessSnapshot(worldTemplate = {}, residents = []) {
  const playerVisitorId = resolvePlayerVisitorId(worldTemplate);
  const ownResidenceLocationId = resolvePlayerResidenceLocationId(worldTemplate);
  const access = {};

  (worldTemplate.locations || []).forEach((location) => {
    if (!isPrivateResidenceLocation(worldTemplate, location.id)) return;

    const state = resolveLocationAccessState({
      worldTemplate,
      locationId: location.id,
      locationName: location.name,
      residents
    });

    access[location.id] = {
      locationId: state.locationId,
      locationName: state.locationName,
      canPlayerEnter: state.canPlayerEnter,
      canPlayerRequestVisit: state.canPlayerRequestVisit,
      isPrivateResidence: true
    };
  });

  return access;
}

export function buildTownSnapshot({
  worldTemplate = {},
  residents = [],
  locationCards = buildLocationCards(worldTemplate, residents),
  socialLinks = [],
  townEvents = [],
  autonomousConversationThreads = [],
  currentTime = Date.now(),
  sliceTimestamp = Number(currentTime) || 0
} = {}) {
  return {
    worldId: worldTemplate.id || null,
    worldTemplate,
    currentTime: Number(currentTime) || 0,
    sliceTimestamp: Number(sliceTimestamp) || 0,
    residents: [...residents],
    locationCards: [...locationCards],
    socialLinks: [...socialLinks],
    townEvents: [...townEvents],
    autonomousConversationThreads: [...(Array.isArray(autonomousConversationThreads) ? autonomousConversationThreads : [])],
    // 统一世界真源 — 补充字段
    player: buildPlayerSnapshot(worldTemplate),
    locationStates: buildLocationStates(worldTemplate, locationCards, townEvents),
    residentContexts: buildResidentContexts(residents, socialLinks, townEvents),
    accessSnapshot: buildAccessSnapshot(worldTemplate, residents)
  };
}

export function findLocationCard(locationCards = [], locationName = '') {
  return locationCards.find((item) => item.name === locationName) || {
    id: locationName || 'unknown-location',
    name: locationName || 'Unknown Location',
    chars: []
  };
}

export function findLocationCardById(locationCards = [], locationId = '') {
  const safeLocationId = String(locationId || '').trim();
  if (!safeLocationId) {
    return null;
  }

  return (Array.isArray(locationCards) ? locationCards : []).find(
    (item) => String(item?.id || '').trim() === safeLocationId
  ) || null;
}

export function findTownSnapshotLocationCard(snapshot = {}, locationName = '') {
  return findLocationCard(snapshot?.locationCards || [], locationName);
}

export function findTownSnapshotLocationCardById(snapshot = {}, locationId = '') {
  return findLocationCardById(snapshot?.locationCards || [], locationId);
}

export function findTownSnapshotResident(snapshot = {}, residentId = '') {
  const safeResidentId = String(residentId || '').trim();
  if (!safeResidentId) {
    return null;
  }

  return (Array.isArray(snapshot?.residents) ? snapshot.residents : []).find(
    (resident) => String(resident?.id || '').trim() === safeResidentId
  ) || null;
}

export function findTownSnapshotResidentsAtLocation(snapshot = {}, locationName = '') {
  return Array.isArray(findTownSnapshotLocationCard(snapshot, locationName)?.chars)
    ? findTownSnapshotLocationCard(snapshot, locationName).chars
    : [];
}

// ── 统一世界真源：selectors ──

// 从 snapshot 读取玩家运行态
export function selectPlayerRuntime(snapshot = {}) {
  return snapshot.player || null;
}

// 从 snapshot 读取某个地点的实时状态（by id 或 name）
export function selectLocationState(snapshot = {}, locationIdOrName = '') {
  const key = String(locationIdOrName || '').trim();
  if (!key) return null;

  const states = snapshot.locationStates || {};
  return states[key] || Object.values(states).find((s) => s.locationName === key) || null;
}

// 从 snapshot 读取某个居民的运行上下文
export function selectResidentContext(snapshot = {}, residentId = '') {
  const key = String(residentId || '').trim();
  if (!key) return null;
  return (snapshot.residentContexts || {})[key] || null;
}

// 从 snapshot 读取玩家对特定私人住宅的访问状态
export function selectPlayerAccessForLocation(snapshot = {}, locationId = '') {
  const access = snapshot.accessSnapshot || {};
  const key = String(locationId || '').trim();
  if (!key) return null;
  return access[key] || null;
}

export function selectAutonomousConversationThreads(snapshot = {}) {
  return Array.isArray(snapshot?.autonomousConversationThreads)
    ? snapshot.autonomousConversationThreads
    : [];
}

// 从 snapshot 筛选事件（支持按 location / resident / type 过滤）
export function selectFilteredEvents(snapshot = {}, {
  location = '',
  resident = '',
  type = '',
  limit = 0
} = {}) {
  let events = snapshot.townEvents || [];

  const locStr = String(location || '').trim();
  if (locStr) {
    events = events.filter((e) => (
      String(e?.locationName || '').trim() === locStr
      || String(e?.locationId || '').trim() === locStr
    ));
  }

  const resStr = String(resident || '').trim();
  if (resStr) {
    events = events.filter((e) => (e?.residents || []).some((r) => String(r || '').trim() === resStr));
  }

  const typeStr = String(type || '').trim();
  if (typeStr) {
    events = events.filter((e) => String(e?.type || '').trim() === typeStr);
  }

  const sorted = sortTownEventsByTime(events);
  return limit > 0 ? sorted.slice(0, limit) : sorted;
}

export function buildWorldLocationOptions(worldTemplate = {}) {
  const structuredPublicLocations = Array.isArray(worldTemplate.publicLocations)
    ? worldTemplate.publicLocations
    : [];
  const visibleLocations = structuredPublicLocations.length > 0
    ? structuredPublicLocations
    : (worldTemplate.locations || []).filter((location) => (
      location?.type !== 'residence'
      && !isPrivateResidenceLocation(worldTemplate, location?.id || '')
    ));

  return visibleLocations
    .map((location) => resolveWorldLocationName(location))
    .filter(Boolean)
    .map((name) => ({
      name,
      icon: '📍'
    }));
}

export function buildRecentTownEventSummaries(townEvents = [], limit = 3) {
  return sortTownEventsByTime(townEvents).slice(0, Math.max(0, limit));
}

export function buildSceneTownEventSummaries(townEvents = [], locationName = '', limit = 2) {
  if (!locationName) {
    return [];
  }

  return sortTownEventsByTime(townEvents)
    .filter((item) => item.locationName === locationName)
    .slice(0, Math.max(0, limit));
}

export function buildEncounterRuntimePatch(sceneName = '') {
  return {
    playerLocation: sceneName,
    currentLocation: sceneName,
    interactionMode: 'face'
  };
}

export function buildEncounterSystemMessage(
  character = {},
  sceneName = '',
  formattedTime = '',
  socialLinks = [],
  townEvents = []
) {
  const currentAction = character.townRuntime?.currentAction || character.currentAction || 'doing something';
  const companions = findResidentActiveCompanions(character.id, socialLinks);
  const companionSummary = companions.length > 0
    ? ` Companions nearby: ${companions.join(', ')}.`
    : '';
  const sceneEvents = buildSceneTownEventSummaries(townEvents, sceneName, 2);
  const eventSummary = sceneEvents.length > 0
    ? ` Fresh town events here: ${sceneEvents.map((item) => item.summary).join(' ')}`
    : '';

  return `[Town Scene] At ${sceneName}, ${character.name} is ${currentAction}. Time: ${formattedTime}.${companionSummary}${eventSummary}`;
}

export function buildEncounterContext(
  character = {},
  sceneName = '',
  formattedTime = '',
  socialLinks = [],
  townEvents = [],
  townSnapshot = null
) {
  const resolvedSocialLinks = townSnapshot ? (townSnapshot.socialLinks || []) : socialLinks;
  const resolvedTownEvents = townSnapshot
    ? selectFilteredEvents(townSnapshot, { location: sceneName, limit: 2 })
    : townEvents;

  return {
    systemMessage: buildEncounterSystemMessage(character, sceneName, formattedTime, resolvedSocialLinks, resolvedTownEvents),
    runtimePatch: buildEncounterRuntimePatch(sceneName)
  };
}

export function buildPlayerResidentInvitationContext({
  playerName = '\u73a9\u5bb6',
  residentName = '\u5bf9\u65b9',
  currentLocationName = '',
  targetLocationName = ''
} = {}) {
  const safePlayerName = String(playerName || '\u73a9\u5bb6').trim() || '\u73a9\u5bb6';
  const safeResidentName = String(residentName || '\u5bf9\u65b9').trim() || '\u5bf9\u65b9';
  const safeCurrentLocationName = String(currentLocationName || '').trim();
  const safeTargetLocationName = String(targetLocationName || '').trim() || '\u67d0\u4e2a\u516c\u5171\u5730\u70b9';
  const summary = safeCurrentLocationName && safeCurrentLocationName !== safeTargetLocationName
    ? `${safePlayerName}\u6253\u7b97\u5148\u53bb${safeCurrentLocationName}\u627e${safeResidentName}\uff0c\u60f3\u7ea6\u5979\u4e00\u8d77\u53bb${safeTargetLocationName}\u3002`
    : `${safePlayerName}\u60f3\u7ea6${safeResidentName}\u4e00\u8d77\u53bb${safeTargetLocationName}\u3002`;

  return {
    title: `${safePlayerName}\u7ea6${safeResidentName}\u4e00\u8d77\u53bb${safeTargetLocationName}`,
    summary,
    systemMessage: `\u3010\u5c0f\u9547\u9080\u7ea6\u3011\u4f60\u8fd9\u6b21\u6765\u627e${safeResidentName}\uff0c\u662f\u60f3\u7ea6\u5979\u4e00\u8d77\u53bb${safeTargetLocationName}\u3002`,
    systemOverride: [
      '[SYSTEM EVENT: PLAYER_TOWN_INVITATION]',
      `**Player Goal**: Invite ${safeResidentName} to go to ${safeTargetLocationName} together.`,
      `**Current Scene**: ${safeCurrentLocationName || 'unknown'}.`,
      '**Instruction**: React naturally to the invitation and decide whether the resident sounds willing, hesitant, or curious.'
    ].join('\n')
  };
}

export function buildPlayerResidentActivityJoinContext({
  playerName = '\u73a9\u5bb6',
  residentName = '\u5bf9\u65b9',
  locationName = '',
  currentAction = ''
} = {}) {
  const safePlayerName = String(playerName || '\u73a9\u5bb6').trim() || '\u73a9\u5bb6';
  const safeResidentName = String(residentName || '\u5bf9\u65b9').trim() || '\u5bf9\u65b9';
  const safeLocationName = String(locationName || '').trim() || '\u67d0\u4e2a\u516c\u5171\u5730\u70b9';
  const safeCurrentAction = String(currentAction || '').trim() || '\u5fd9\u7740\u624b\u5934\u7684\u4e8b';

  return {
    title: `${safePlayerName}\u53bb${safeLocationName}\u52a0\u5165${safeResidentName}\u7684\u5f53\u524d\u52a8\u9759`,
    summary: `${safePlayerName}\u51c6\u5907\u53bb${safeLocationName}\u627e${safeResidentName}\uff0c\u60f3\u5148\u52a0\u5165\u5979\u6b63\u5728${safeCurrentAction}\u7684\u8fd9\u4ef6\u4e8b\u3002`,
    systemMessage: `\u3010\u5c0f\u9547\u73b0\u573a\u3011\u4f60\u8fd9\u6b21\u51fa\u73b0\u5728${safeLocationName}\uff0c\u662f\u60f3\u5148\u52a0\u5165${safeResidentName}\u6b63\u5728${safeCurrentAction}\u7684\u8fd9\u4ef6\u4e8b\u3002`,
    systemOverride: [
      '[SYSTEM EVENT: PLAYER_JOIN_SCENE_ACTIVITY]',
      `**Player Goal**: Join ${safeResidentName} in what they are doing at ${safeLocationName}.`,
      `**Resident Activity**: ${safeCurrentAction}.`,
      '**Instruction**: React naturally to the player stepping into the current public scene and decide whether the resident feels welcoming, distracted, or busy.'
    ].join('\n')
  };
}

export function buildPlayerResidentHomeVisitContext({
  playerName = '\u73a9\u5bb6',
  residentName = '\u5bf9\u65b9',
  residenceLocationName = '',
  currentAction = ''
} = {}) {
  const safePlayerName = String(playerName || '\u73a9\u5bb6').trim() || '\u73a9\u5bb6';
  const safeResidentName = String(residentName || '\u5bf9\u65b9').trim() || '\u5bf9\u65b9';
  const safeResidenceLocationName = String(residenceLocationName || '').trim() || '\u5bf9\u65b9\u7684\u5bb6';
  const safeCurrentAction = String(currentAction || '').trim() || '\u5fd9\u7740\u624b\u5934\u7684\u4e8b';

  return {
    title: `${safePlayerName}\u53bb${safeResidenceLocationName}\u62dc\u8bbf${safeResidentName}`,
    summary: `${safePlayerName}\u6765\u5230${safeResidenceLocationName}\u95e8\u53e3\uff0c\u60f3\u95ee${safeResidentName}\u73b0\u5728\u80fd\u4e0d\u80fd\u8fdb\u5c4b\u62dc\u8bbf\u3002`,
    systemMessage: `\u3010\u4e0a\u95e8\u62dc\u8bbf\u3011\u4f60\u8fd9\u6b21\u6765\u5230${safeResidenceLocationName}\u95e8\u53e3\uff0c\u60f3\u95ee${safeResidentName}\u73b0\u5728\u80fd\u4e0d\u80fd\u8fdb\u5c4b\u5750\u5750\u3002`,
    systemOverride: [
      '[SYSTEM EVENT: PLAYER_HOME_VISIT_REQUEST]',
      `**Player Goal**: Ask ${safeResidentName} whether the player may enter ${safeResidenceLocationName} right now.`,
      `**Resident Current State**: ${safeCurrentAction}.`,
      '**Instruction**: Reply naturally as the resident at the door. Your very first reply must make the outcome clear: let the player in now, refuse for now, or ask them to come another time.',
      '**Instruction**: If you agree, clearly say the player can come in now. If you refuse, clearly say they should not come in. If you postpone, clearly say it is better another time.'
    ].join('\n')
  };
}

export function buildPlayerRelationshipFocusContext({
  playerName = '\u73a9\u5bb6',
  residentName = '\u5bf9\u65b9',
  relationshipStage = '',
  relationshipSummary = '',
  focusSummary = '',
  currentLocationName = '',
  currentAction = ''
} = {}) {
  const safePlayerName = String(playerName || '\u73a9\u5bb6').trim() || '\u73a9\u5bb6';
  const safeResidentName = String(residentName || '\u5bf9\u65b9').trim() || '\u5bf9\u65b9';
  const safeRelationshipStage = String(relationshipStage || '').trim() || '\u8fd8\u5728\u4e92\u76f8\u8ba4\u8bc6';
  const safeRelationshipSummary = String(relationshipSummary || '').trim()
    || `${safeResidentName}\u5bf9\u4f60\u8fd8\u5728\u89c2\u671b\uff0c\u4f46\u5173\u7cfb\u5df2\u7ecf\u6709\u4e86\u53ef\u4ee5\u7ee7\u7eed\u5f80\u524d\u63a8\u7684\u7ebf\u7d22\u3002`;
  const safeFocusSummary = String(focusSummary || '').trim()
    || `${safeResidentName}\u73b0\u5728\u5728${String(currentLocationName || '').trim() || '\u5c0f\u9547\u67d0\u5904'}${String(currentAction || '').trim() ? `\uff0c\u6b63\u5728${String(currentAction || '').trim()}` : ''}\u3002`;
  const safeCurrentLocationName = String(currentLocationName || '').trim();
  const safeCurrentAction = String(currentAction || '').trim() || '\u5fd9\u7740\u624b\u5934\u7684\u4e8b';

  return {
    title: `${safePlayerName}\u60f3\u628a\u548c${safeResidentName}\u7684\u5173\u7cfb\u5f80\u524d\u63a8`,
    summary: `${safePlayerName}\u60f3\u987a\u7740\u4f60\u4eec\u73b0\u5728\u7684\u5173\u7cfb\u7ee7\u7eed\u63a5\u8fd1${safeResidentName}\u3002\u5f53\u524d\u9636\u6bb5\uff1a${safeRelationshipStage}\u3002${safeFocusSummary}`,
    systemMessage: `\u3010\u5173\u7cfb\u63a8\u8fdb\u3011\u4f60\u8fd9\u6b21\u6765\u627e${safeResidentName}\uff0c\u4e0d\u662f\u53ea\u60f3\u95f2\u804a\uff0c\u800c\u662f\u60f3\u987a\u7740\u4f60\u4eec\u73b0\u5728\u7684\u5173\u7cfb\u7ee7\u7eed\u9760\u8fd1\u4e00\u70b9\u3002`,
    systemOverride: [
      '[SYSTEM EVENT: PLAYER_RELATIONSHIP_FOCUS]',
      `**Relationship Stage**: ${safeRelationshipStage}.`,
      `**Known Context**: ${safeRelationshipSummary}.`,
      `**Fresh Thread**: ${safeFocusSummary}.`,
      `**Current Scene**: ${safeCurrentLocationName || 'unknown'}.`,
      `**Resident State**: ${safeCurrentAction}.`,
      '**Instruction**: React naturally to a player who is consciously trying to deepen trust or emotional closeness without skipping the current relationship stage.'
    ].join('\n')
  };
}

export function resolveChatSessionTime(townCurrentTime) {
  return Number.isFinite(townCurrentTime) && townCurrentTime > 0 ? townCurrentTime : Date.now();
}
