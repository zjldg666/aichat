function buildPageUrl(basePath = '', params = {}) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

  return query ? `${basePath}?${query}` : basePath;
}

export function buildResidentPhoneChatId(residentId = '', prefix = 'phone') {
  const normalizedPrefix = String(prefix || '').trim() || 'phone';
  return `${normalizedPrefix}:${String(residentId || '').trim()}`;
}

export function buildScenePublicChatId({
  worldId = '',
  locationId = ''
} = {}) {
  return `scene-public:${String(worldId || '').trim()}:${String(locationId || '').trim()}`;
}

export function buildResidentVisitSessionId({
  residentId = '',
  residenceLocationId = '',
  happenedAt = Date.now()
} = {}) {
  return `visit:${String(residentId || '').trim()}:${String(residenceLocationId || '').trim()}:${Number(happenedAt) || 0}`;
}

export function buildResidentDoorstepConversationId(visitSessionId = '') {
  const normalized = String(visitSessionId || '').trim();
  // treat visitSessionId as opaque (don't split on ':' even though it contains them)
  return normalized ? `doorstep:${normalized}` : '';
}

export function buildResidentSceneConversationId(visitSessionId = '') {
  const normalized = String(visitSessionId || '').trim();
  // treat visitSessionId as opaque (don't split on ':' even though it contains them)
  return normalized ? `scene:${normalized}` : '';
}

export function buildResidentEncounterChatUrl({
  residentId = '',
  residentName = '',
  sceneName = ''
} = {}) {
  return buildPageUrl('/pages/chat/chat', {
    id: residentId,
    name: residentName,
    scene: sceneName,
    encounter: 1
  });
}

export function buildResidentInvitationChatUrl({
  residentId = '',
  residentName = '',
  currentLocationName = '',
  targetLocationId = '',
  targetLocationName = ''
} = {}) {
  return buildPageUrl('/pages/chat/chat', {
    id: residentId,
    name: residentName,
    intent: 'resident_invitation',
    inviteLocationName: targetLocationName,
    inviteLocationId: targetLocationId,
    inviteFrom: currentLocationName
  });
}

export function buildResidentActivityJoinChatUrl({
  residentId = '',
  residentName = '',
  locationId = '',
  locationName = '',
  currentAction = ''
} = {}) {
  return buildPageUrl('/pages/chat/chat', {
    id: residentId,
    name: residentName,
    intent: 'resident_activity_join',
    activityLocationId: locationId,
    activityLocationName: locationName,
    activityCurrentAction: currentAction
  });
}

export function buildResidentHomeVisitChatUrl({
  residentId = '',
  residentName = '',
  residenceLocationId = '',
  residenceLocationName = '',
  currentAction = ''
} = {}) {
  return buildPageUrl('/pages/chat/chat', {
    id: residentId,
    name: residentName,
    intent: 'resident_home_visit_request',
    visitResidenceLocationId: residenceLocationId,
    visitResidenceLocationName: residenceLocationName,
    visitCurrentAction: currentAction
  });
}

export function buildResidentRemoteChatUrl({
  residentId = '',
  residentName = ''
} = {}) {
  return buildPageUrl('/pages/chat/chat', {
    id: residentId,
    name: residentName,
    remote: 1,
    entry: 'phone_contact'
  });
}

export function buildResidentRelationshipPageUrl({
  worldId = '',
  residentId = '',
  residentName = ''
} = {}) {
  return buildPageUrl('/pages/town-relationship/town-relationship', {
    worldId,
    id: residentId,
    name: residentName
  });
}

export function buildResidentRelationshipChatUrl({
  residentId = '',
  residentName = '',
  relationshipStage = '',
  relationshipSummary = '',
  focusSummary = '',
  currentLocationName = '',
  currentAction = ''
} = {}) {
  return buildPageUrl('/pages/chat/chat', {
    id: residentId,
    name: residentName,
    intent: 'relationship_focus',
    relationshipStage,
    relationshipSummary,
    relationshipFocus: focusSummary,
    relationshipLocationName: currentLocationName,
    relationshipCurrentAction: currentAction
  });
}

export function buildResidentSceneUrl({
  worldId = '',
  locationName = '',
  visitSessionId = ''
} = {}) {
  const normalizedVisitSessionId = String(visitSessionId || '').trim();
  const params = {
    worldId,
    location: locationName
  };

  if (normalizedVisitSessionId) {
    params.visitSessionId = normalizedVisitSessionId;
  }

  return buildPageUrl('/pages/scene/scene', params);
}
