import {
  buildLocationAtmosphere,
  buildSocialLinks,
  findResidentActiveCompanions
} from '@/utils/town/town-social.js';
import { sortTownEvents } from '@/utils/town/town-event-order.js';
import { isPrivateResidenceLocation } from '@/utils/town/town-location-access.js';

function sortTownEventsByTime(townEvents = []) {
  return sortTownEvents(townEvents);
}

function resolveResidentLocationName(resident = {}) {
  return resident.currentLocation || resident.townRuntime?.currentLocationName || resident.location || 'Unknown Location';
}

function resolveResidentAction(resident = {}) {
  return resident.currentAction || resident.townRuntime?.currentAction || 'idle';
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

export function buildTownSnapshot(worldTemplate = {}, residents = [], currentTime = Date.now()) {
  const socialLinks = buildSocialLinks(residents, currentTime);

  return {
    worldId: worldTemplate.id || null,
    residents: [...residents],
    socialLinks,
    locationCards: buildLocationCards(worldTemplate, residents)
  };
}

export function findLocationCard(locationCards = [], locationName = '') {
  return locationCards.find((item) => item.name === locationName) || {
    id: locationName || 'unknown-location',
    name: locationName || 'Unknown Location',
    chars: []
  };
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
  const currentAction = character.currentAction || character.townRuntime?.currentAction || 'doing something';
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
  townEvents = []
) {
  return {
    systemMessage: buildEncounterSystemMessage(character, sceneName, formattedTime, socialLinks, townEvents),
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
