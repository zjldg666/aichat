import { buildResidenceLabel, resolveLocationAccessState } from './town-location-access.js';
import { buildPlayerResidentHomeVisitContext } from './town-view-models.js';

function normalizeText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeReplySummary(content = '') {
  const summary = normalizeText(content);

  if (!summary) {
    return '';
  }

  return summary.slice(0, 160);
}

export function resolveHomeVisitDecision(content = '') {
  const summary = normalizeReplySummary(content);

  if (!summary) {
    return '';
  }

  if (/(别进来|先别进|不能进|不让你进|不欢迎|请回吧|别来了|不想见|不见客)/.test(summary)) {
    return 'rejected';
  }

  if (/(改天|下次|晚点|等会|等我|回头|以后再|有空再|今天不太方便|现在不太方便|现在不方便|今天先|之后再)/.test(summary)) {
    return 'postponed';
  }

  if (/(进来吧|请进|进屋吧|进门吧|进来坐|进来坐坐|可以进来|欢迎进来|来吧|来家里|来我家|屋里坐|上来吧)/.test(summary)) {
    return 'accepted';
  }

  return '';
}

export function createPlayerIntentSession({
  intentType = '',
  residentId = '',
  residentName = '',
  playerName = '',
  currentLocationId = '',
  currentLocationName = '',
  targetLocationId = '',
  targetLocationName = '',
  relationshipStage = '',
  currentAction = '',
  createdAt = Date.now()
} = {}) {
  const normalizedIntentType = normalizeText(intentType);

  if (!normalizedIntentType) {
    return null;
  }

  return {
    intentType: normalizedIntentType,
    residentId: normalizeText(residentId),
    residentName: normalizeText(residentName),
    playerName: normalizeText(playerName),
    currentLocationId: normalizeText(currentLocationId),
    currentLocationName: normalizeText(currentLocationName),
    targetLocationId: normalizeText(targetLocationId),
    targetLocationName: normalizeText(targetLocationName),
    relationshipStage: normalizeText(relationshipStage),
    currentAction: normalizeText(currentAction),
    createdAt: Number(createdAt) || Date.now()
  };
}

function resolveResidentHomeVisitLocation({
  resident = {},
  worldTemplate = {}
} = {}) {
  const homeLocationId = normalizeText(
    resident?.residenceLocationId
    || resident?.townProfile?.homeLocationId
    || ''
  );
  const worldLocationName = homeLocationId
    ? normalizeText(
      (worldTemplate?.locations || []).find(
        (item) => normalizeText(item?.id) === homeLocationId
      )?.name
    )
    : '';
  const residenceLabel = resident?.townProfile?.residence
    ? normalizeText(buildResidenceLabel(worldTemplate, resident.townProfile.residence))
    : '';
  const homeLocationName = normalizeText(
    resident?.residenceLocationName
    || worldLocationName
    || residenceLabel
  );

  return {
    locationId: homeLocationId,
    locationName: homeLocationName
  };
}

function isPhoneHomeVisitRequest(userContent = '') {
  const normalizedContent = normalizeText(userContent);

  if (!normalizedContent) {
    return false;
  }

  return /(拜访|上门|去你家|去你那|去你那里|去找你|过去找你|去看看你|我过去找你|我来找你|我去找你|方便我去|能去你家|能去找你|现在过去)/.test(normalizedContent);
}

export function createResidentPhoneHomeVisitIntent({
  userContent = '',
  playerName = '',
  resident = {},
  worldTemplate = {},
  residents = []
} = {}) {
  if (!isPhoneHomeVisitRequest(userContent)) {
    return null;
  }

  const homeVisitLocation = resolveResidentHomeVisitLocation({
    resident,
    worldTemplate
  });
  if (!homeVisitLocation.locationId && !homeVisitLocation.locationName) {
    return null;
  }

  const promptContext = buildPlayerResidentHomeVisitContext({
    playerName: normalizeText(playerName) || '玩家',
    residentName: normalizeText(resident?.name) || '对方',
    residenceLocationName: homeVisitLocation.locationName || '对方的家',
    currentAction: normalizeText(
      resident?.townRuntime?.currentAction
      || resident?.currentAction
      || resident?.lastActivity
    ) || '忙着手头的事'
  });
  const accessState = resolveLocationAccessState({
    worldTemplate,
    locationId: homeVisitLocation.locationId,
    locationName: homeVisitLocation.locationName,
    hostResident: resident,
    residents
  });
  const localRule = accessState.canPlayerEnter
    ? 'The player already has valid access to this residence. If you agree, make the invitation explicit.'
    : accessState.canPlayerRequestVisit
      ? 'The player may ask to visit, but do not narrate them as already inside until you clearly approve entry now.'
      : 'Do not approve entry now. The current relationship state has not unlocked formal home-visit permission yet.';

  return {
    session: createPlayerIntentSession({
      intentType: 'resident_home_visit_request',
      residentId: resident?.residentId || resident?.id || '',
      residentName: resident?.residentName || resident?.name || '',
      playerName,
      currentLocationId: homeVisitLocation.locationId,
      currentLocationName: homeVisitLocation.locationName,
      currentAction: resident?.townRuntime?.currentAction || resident?.currentAction || resident?.lastActivity || ''
    }),
    promptContext: {
      ...promptContext,
      systemOverride: [
        promptContext.systemOverride,
        '**Channel Rule**: This is a remote conversation before anyone arrives in person.',
        `**Local Rule**: ${localRule}`
      ].join('\n')
    },
    accessState
  };
}

export function buildPlayerIntentFollowUpPayload({
  session = null,
  message = {}
} = {}) {
  if (!session || typeof session !== 'object') {
    return null;
  }

  if (!message || message.isSystem || message.role !== 'model' || message.type === 'think') {
    return null;
  }

  const replySummary = normalizeReplySummary(message.content);
  if (!replySummary) {
    return null;
  }

  const payload = {
    intentType: normalizeText(session.intentType),
    residentId: normalizeText(session.residentId),
    residentName: normalizeText(session.residentName),
    playerName: normalizeText(session.playerName),
    locationId: normalizeText(session.currentLocationId),
    locationName: normalizeText(session.currentLocationName),
    targetLocationId: normalizeText(session.targetLocationId),
    targetLocationName: normalizeText(session.targetLocationName),
    relationshipStage: normalizeText(session.relationshipStage),
    currentAction: normalizeText(session.currentAction),
    replySummary
  };

  if (payload.intentType === 'resident_home_visit_request') {
    payload.visitDecision = resolveHomeVisitDecision(replySummary);
  }

  return payload;
}

export function shouldKeepPlayerIntentSession(payload = null) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  return payload.intentType === 'resident_home_visit_request' && !normalizeText(payload.visitDecision);
}
