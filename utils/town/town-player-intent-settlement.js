import {
  buildPlayerIntentFollowUpPayload,
  shouldKeepPlayerIntentSession
} from './town-player-intent-followups.js';

export async function settlePlayerIntentFollowUp({
  session = null,
  message = {},
  currentTime = Date.now(),
  townStore = null,
  resident = null
} = {}) {
  const payload = buildPlayerIntentFollowUpPayload({
    session,
    message
  });

  if (!payload) {
    return {
      settled: false,
      keepSession: Boolean(session),
      payload: null,
      accessResult: null
    };
  }

  if (shouldKeepPlayerIntentSession(payload)) {
    return {
      settled: false,
      keepSession: true,
      payload,
      accessResult: null
    };
  }

  if (typeof townStore?.createPlayerResidentConversationFollowUp === 'function') {
    await townStore.createPlayerResidentConversationFollowUp({
      ...payload,
      sourceIntent: payload.intentType,
      happenedAt: currentTime
    });
  }

  let accessResult = null;
  if (
    payload.intentType === 'resident_home_visit_request'
    && payload.visitDecision === 'accepted'
    && typeof townStore?.grantPlayerResidenceAccess === 'function'
  ) {
    accessResult = await townStore.grantPlayerResidenceAccess({
      residenceLocationId: payload.locationId || '',
      hostResidentId: payload.residentId || '',
      hostResidentName: payload.residentName || resident?.name || '',
      hostResident: resident || null,
      requestAlreadyRecorded: true
    });
  }

  return {
    settled: true,
    keepSession: false,
    payload,
    accessResult
  };
}
