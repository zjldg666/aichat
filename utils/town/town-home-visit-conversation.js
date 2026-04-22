import {
  buildResidentDoorstepConversationId,
  buildResidentVisitSessionId
} from './town-entry-links.js';

export async function startResidentHomeVisitConversation({
  townStore,
  requestConversationTurn,
  residentId = '',
  residentName = '',
  residenceLocationId = '',
  residenceLocationName = '',
  currentAction = '',
  hostResident = null,
  playerName = '',
  happenedAt = Date.now()
} = {}) {
  if (!townStore || typeof townStore.createPlayerResidentHomeVisitRequest !== 'function') {
    throw new Error('HOME_VISIT_STORE_MISSING');
  }

  if (typeof requestConversationTurn !== 'function') {
    throw new Error('HOME_VISIT_CONVERSATION_TURN_MISSING');
  }

  const visitSessionId = buildResidentVisitSessionId({
    residentId,
    residenceLocationId,
    happenedAt
  });
  const doorstepConversationId = buildResidentDoorstepConversationId(visitSessionId);
  const requestResult = await townStore.createPlayerResidentHomeVisitRequest({
    residentId,
    residentName,
    residenceLocationId,
    residenceLocationName,
    currentAction,
    hostResident
  });

  if (requestResult?.alreadyAllowed) {
    return {
      visitSessionId,
      doorstepConversationId,
      requestResult,
      decision: 'accepted',
      alreadyAllowed: true,
      initialTurn: null
    };
  }

  if (!requestResult?.created) {
    return {
      visitSessionId,
      doorstepConversationId,
      requestResult,
      decision: 'blocked',
      alreadyAllowed: false,
      initialTurn: null
    };
  }

  const initialReply = await requestConversationTurn({
    residentId,
    residentName,
    residenceLocationId,
    residenceLocationName,
    currentAction,
    hostResident,
    playerName,
    playerMessage: '',
    transcript: [],
    visitSessionId,
    doorstepConversationId
  });
  const replySummary = String(initialReply?.replySummary || '').trim();
  const decision = String(initialReply?.decision || '').trim() || 'postponed';

  return {
    visitSessionId,
    doorstepConversationId,
    requestResult,
    decision,
    alreadyAllowed: false,
    initialTurn: replySummary
      ? {
        id: `doorstep-initial-${visitSessionId || happenedAt}`,
        role: 'model',
        content: replySummary,
        type: 'text',
        isSystem: false
      }
      : null
  };
}
