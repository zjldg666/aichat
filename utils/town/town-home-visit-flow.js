export async function requestResidentHomeVisitFlow({
  townStore,
  requestDoorReply,
  residentId = '',
  residentName = '',
  residenceLocationId = '',
  residenceLocationName = '',
  currentAction = '',
  hostResident = null,
  happenedAt = Date.now()
} = {}) {
  if (!townStore || typeof townStore.createPlayerResidentHomeVisitRequest !== 'function') {
    throw new Error('HOME_VISIT_STORE_MISSING');
  }

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
      status: 'accepted',
      decision: 'accepted',
      alreadyAllowed: true,
      replySummary: '',
      shouldEnter: true
    };
  }

  if (!requestResult?.created) {
    return {
      status: 'blocked',
      decision: '',
      alreadyAllowed: false,
      replySummary: '',
      shouldEnter: false
    };
  }

  const doorReply = await requestDoorReply({
    residentId,
    residentName,
    residenceLocationId,
    residenceLocationName,
    currentAction,
    hostResident
  });
  const decision = String(doorReply?.decision || '').trim();
  const replySummary = String(doorReply?.replySummary || '').trim();

  if (replySummary && typeof townStore.createPlayerResidentConversationFollowUp === 'function') {
    await townStore.createPlayerResidentConversationFollowUp({
      intentType: 'resident_home_visit_request',
      sourceIntent: 'resident_home_visit_request',
      residentId,
      residentName,
      locationId: residenceLocationId,
      locationName: residenceLocationName,
      currentAction,
      replySummary,
      visitDecision: decision,
      happenedAt
    });
  }

  let accessApproved = false;
  if (decision === 'accepted' && typeof townStore.grantPlayerResidenceAccess === 'function') {
    const accessResult = await townStore.grantPlayerResidenceAccess({
      residenceLocationId,
      hostResidentId: residentId,
      hostResidentName: residentName,
      hostResident,
      requestAlreadyRecorded: true
    });
    accessApproved = Boolean(accessResult?.approved);
  }

  return {
    status: decision || 'postponed',
    decision,
    alreadyAllowed: false,
    replySummary,
    shouldEnter: accessApproved,
    accessApproved
  };
}
