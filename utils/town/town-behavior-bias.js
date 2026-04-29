const FRESH_EVENT_WINDOW_MS = 60 * 60 * 1000;

import { isPrivateResidenceLocation } from '@/utils/town/town-location-access.js';
import { findResidentScheduleBlock } from '@/utils/town/town-schedule.js';
import { normalizePlayerRelationshipState } from '@/utils/town/player-relationship.js';
import {
  isSocialLinkAvoiding,
  isSocialLinkFamiliar,
  isSocialLinkGuarded,
  isSocialLinkStrongTie
} from '@/utils/town/town-social.js';

function resolveCurrentLocationContext(resident = {}) {
  return {
    residentId: String(resident.id || ''),
    residentName: resident.name || '',
    homeLocationId: resident.townProfile?.homeLocationId || '',
    locationId: resident.townRuntime?.currentLocationId || '',
    locationName: resident.townRuntime?.currentLocationName || resident.currentLocation || resident.location || '',
    currentAction: resident.townRuntime?.currentAction || resident.currentAction || resident.lastActivity || '停留'
  };
}

function resolvePlayerBehaviorRelationship(resident = {}) {
  const relationship = normalizePlayerRelationshipState(resident);
  const receptiveness = Math.round(
    relationship.affinity * 0.3
    + relationship.familiarity * 0.25
    + relationship.trust * 0.3
    + relationship.respect * 0.15
    - relationship.tension * 0.45
  );

  return {
    relationship,
    receptiveness,
    canPrioritizePlayerInvitation: (
      relationship.affinity >= 45
      && relationship.trust >= 40
      && relationship.tension <= 60
      && receptiveness >= 42
    ),
    canLingerAfterPlayerConversation: (
      relationship.familiarity >= 45
      && relationship.tension <= 65
      && receptiveness >= 38
    )
  };
}

function normalizeResidentEntries(link = {}) {
  const residents = Array.isArray(link.residents) ? link.residents : [];
  const residentNames = Array.isArray(link.residentNames) ? link.residentNames : [];

  return residents.map((residentId, index) => ({
    id: String(residentId),
    name: residentNames[index] || ''
  }));
}

function compareSocialLinkPriority(left = {}, right = {}) {
  const strongTieDelta = Number(isSocialLinkStrongTie(right)) - Number(isSocialLinkStrongTie(left));
  if (strongTieDelta !== 0) {
    return strongTieDelta;
  }

  const scoreDelta = (Number(right?.score) || 0) - (Number(left?.score) || 0);
  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  return (Number(right?.lastSeenAt) || 0) - (Number(left?.lastSeenAt) || 0);
}

function findFamiliarCompanionNames({ residentId = '', residentName = '', locationName = '', socialLinks = [] } = {}) {
  const companionNames = new Set();

  (Array.isArray(socialLinks) ? socialLinks : []).forEach((link) => {
    if (
      !link?.isActive
      || !isSocialLinkFamiliar(link)
      || isSocialLinkAvoiding(link)
      || link.locationName !== locationName
    ) {
      return;
    }

    normalizeResidentEntries(link).forEach((resident) => {
      if (resident.id !== residentId && resident.name && resident.name !== residentName) {
        companionNames.add(resident.name);
      }
    });
  });

  return [...companionNames];
}

function findFreshSceneEvents({ locationName = '', townEvents = [], currentTime = Date.now() } = {}) {
  if (!locationName) {
    return [];
  }

  return (Array.isArray(townEvents) ? townEvents : [])
    .filter((item) => item?.locationName === locationName)
    .filter((item) => {
      const happenedAt = Number(item?.happenedAt) || 0;
      return happenedAt > 0 && currentTime - happenedAt <= FRESH_EVENT_WINDOW_MS;
    })
    .sort((left, right) => (right.happenedAt || 0) - (left.happenedAt || 0));
}

function findFreshResidentChatEvents({ residentId = '', townEvents = [], currentTime = Date.now() } = {}) {
  return findFreshResidentCompanionEvents({
    residentId,
    townEvents,
    currentTime,
    eventTypes: ['companion_chat_started']
  });
}

function findFreshResidentOutingEvents({ residentId = '', townEvents = [], currentTime = Date.now() } = {}) {
  return findFreshResidentCompanionEvents({
    residentId,
    townEvents,
    currentTime,
    eventTypes: ['companion_outing_started']
  });
}

function findFreshResidentPlayerInvitationEvents({
  residentId = '',
  townEvents = [],
  currentTime = Date.now()
} = {}) {
  return findFreshResidentCompanionEvents({
    residentId,
    townEvents,
    currentTime,
    eventTypes: ['player_resident_invitation']
  });
}

function findFreshResidentConversationFollowUpEvents({
  residentId = '',
  townEvents = [],
  currentTime = Date.now()
} = {}) {
  return findFreshResidentCompanionEvents({
    residentId,
    townEvents,
    currentTime,
    eventTypes: ['player_resident_conversation_followup']
  });
}

function findFreshResidentPermissionUnlockEvents({
  residentId = '',
  townEvents = [],
  currentTime = Date.now()
} = {}) {
  return findFreshResidentCompanionEvents({
    residentId,
    townEvents,
    currentTime,
    eventTypes: ['player_relationship_permission_unlocked']
  });
}

function findFreshResidentCompanionEvents({
  residentId = '',
  townEvents = [],
  currentTime = Date.now(),
  eventTypes = []
} = {}) {
  if (!residentId) {
    return [];
  }

  return (Array.isArray(townEvents) ? townEvents : [])
    .filter((item) => eventTypes.includes(item?.type))
    .filter((item) => Array.isArray(item?.residents) && item.residents.map(String).includes(residentId))
    .filter((item) => {
      const happenedAt = Number(item?.happenedAt) || 0;
      return happenedAt > 0 && currentTime - happenedAt <= FRESH_EVENT_WINDOW_MS;
    })
    .sort((left, right) => (right.happenedAt || 0) - (left.happenedAt || 0));
}

function isResidentInHomeBlock({ resident = {}, candidateActions = [] } = {}) {
  const currentLocation = resolveCurrentLocationContext(resident);

  return Boolean(
    currentLocation.homeLocationId
      && candidateActions.length > 0
      && candidateActions.every((item) => item?.locationId === currentLocation.homeLocationId)
  );
}

function findFamiliarSocialLink({ residentId = '', targetResidentId = '', socialLinks = [] } = {}) {
  if (!residentId || !targetResidentId) {
    return null;
  }

  return (Array.isArray(socialLinks) ? socialLinks : []).find((link) => {
    if (!isSocialLinkFamiliar(link) || isSocialLinkGuarded(link)) {
      return false;
    }

    const residents = Array.isArray(link?.residents) ? link.residents.map(String) : [];
    return residents.includes(residentId) && residents.includes(targetResidentId);
  }) || null;
}

function findProfessionWorkLocationId(worldTemplate = {}, resident = {}) {
  const professionId = resident.townProfile?.professionId;

  if (!professionId) {
    return '';
  }

  return (worldTemplate.professions || []).find((item) => item.id === professionId)?.workLocationId || '';
}

function findLocationNameById(worldTemplate = {}, locationId = '') {
  if (!locationId) {
    return '';
  }

  return (worldTemplate.locations || []).find((item) => item.id === locationId)?.name || '';
}

function parseResidenceLocationId(locationId = '') {
  const match = String(locationId || '').trim().match(/^residence:([^:]+):(.+)$/);
  return {
    zoneId: match?.[1] || '',
    unitId: match?.[2] || ''
  };
}

function findResidenceUnit(worldTemplate = {}, locationId = '') {
  const parsed = parseResidenceLocationId(locationId);
  if (!parsed.zoneId || !parsed.unitId) {
    return null;
  }

  const zone = (worldTemplate.residentialZones || []).find((item) => item.id === parsed.zoneId);
  return (zone?.units || []).find((item) => item.id === parsed.unitId) || null;
}

function canResidentEnterLocation(worldTemplate = {}, resident = {}, action = {}) {
  const locationId = String(action?.locationId || '').trim();
  if (!locationId) {
    return false;
  }

  if (!isPrivateResidenceLocation(worldTemplate, locationId)) {
    return true;
  }

  const residentId = String(resident.id || '').trim();
  const homeLocationId = String(resident.townProfile?.homeLocationId || '').trim();
  const currentLocationId = String(resident.townRuntime?.currentLocationId || '').trim();

  if (locationId === homeLocationId || locationId === currentLocationId) {
    return true;
  }

  const residenceUnit = findResidenceUnit(worldTemplate, locationId);
  const accessPolicy = String(residenceUnit?.accessPolicy || 'consent_required').trim();
  if (accessPolicy !== 'consent_required') {
    return true;
  }

  const actionAllowedVisitorIds = Array.isArray(action.allowedVisitorIds)
    ? action.allowedVisitorIds.map((item) => String(item))
    : [];
  const unitAllowedVisitorIds = Array.isArray(residenceUnit?.allowedVisitorIds)
    ? residenceUnit.allowedVisitorIds.map((item) => String(item))
    : [];

  return actionAllowedVisitorIds.includes(residentId) || unitAllowedVisitorIds.includes(residentId);
}

function filterInaccessibleActions(worldTemplate = {}, resident = {}, candidateActions = []) {
  return (Array.isArray(candidateActions) ? candidateActions : []).filter((action) => (
    canResidentEnterLocation(worldTemplate, resident, action)
  ));
}

function resolveSingleCandidateLocationId(candidateActions = []) {
  const locationIds = [...new Set(
    (Array.isArray(candidateActions) ? candidateActions : [])
      .map((item) => String(item?.locationId || ''))
      .filter(Boolean)
  )];

  return locationIds.length === 1 ? locationIds[0] : '';
}

function resolveTownEventLocationId(worldTemplate = {}, event = {}) {
  const explicitLocationId = String(event?.locationId || '').trim();
  if (explicitLocationId) {
    return explicitLocationId;
  }

  const locationName = String(event?.locationName || '').trim();
  if (!locationName) {
    return '';
  }

  return String(
    (worldTemplate.locations || []).find((item) => item.name === locationName)?.id
      || (worldTemplate.publicLocations || []).find((item) => item.name === locationName)?.id
      || ''
  ).trim();
}

function dedupeCandidateActions(candidateActions = []) {
  const seen = new Set();

  return candidateActions.filter((item) => {
    const key = `${item?.locationId || ''}::${item?.label || ''}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function findPlayerResidentInvitationActions({
  worldTemplate = {},
  resident = {},
  candidateActions = [],
  townEvents = [],
  currentTime = Date.now()
} = {}) {
  const currentLocation = resolveCurrentLocationContext(resident);
  const latestInvitation = findFreshResidentPlayerInvitationEvents({
    residentId: currentLocation.residentId,
    townEvents,
    currentTime
  })[0];

  if (!latestInvitation) {
    return [];
  }

  if (!resolvePlayerBehaviorRelationship(resident).canPrioritizePlayerInvitation) {
    return [];
  }

  const targetLocationId = resolveTownEventLocationId(worldTemplate, latestInvitation);
  const targetLocationName = String(latestInvitation.locationName || findLocationNameById(worldTemplate, targetLocationId)).trim();
  const playerName = String(
    latestInvitation.playerName
      || worldTemplate.playerIdentityTemplates?.[0]?.name
      || ''
  ).trim() || '玩家';

  if (!targetLocationId || !targetLocationName || targetLocationId === currentLocation.locationId) {
    return [];
  }

  const baseLocationId = resolveSingleCandidateLocationId(candidateActions);
  if (baseLocationId === targetLocationId && candidateActions.length === 1) {
    return [];
  }

  return [{
    id: `player-invitation-${targetLocationId}-${currentLocation.residentId}-${currentTime}`,
    label: `去${targetLocationName}赴${playerName}的邀约`,
    locationId: targetLocationId,
    targetResidentId: 'player',
    targetResidentName: playerName,
    companionActionType: 'player_invitation'
  }];
}

function findPlayerConversationFollowUpActions({
  resident = {},
  townEvents = [],
  currentTime = Date.now()
} = {}) {
  const currentLocation = resolveCurrentLocationContext(resident);
  const latestFollowUp = findFreshResidentConversationFollowUpEvents({
    residentId: currentLocation.residentId,
    townEvents,
    currentTime
  })[0];

  if (!latestFollowUp || !currentLocation.locationId || !currentLocation.locationName) {
    return [];
  }

  if (!resolvePlayerBehaviorRelationship(resident).canLingerAfterPlayerConversation) {
    return [];
  }

  const eventLocationId = String(latestFollowUp.locationId || '').trim();
  const eventLocationName = String(latestFollowUp.locationName || '').trim();

  if (
    (eventLocationId && eventLocationId !== currentLocation.locationId)
    || (!eventLocationId && eventLocationName && eventLocationName !== currentLocation.locationName)
  ) {
    return [];
  }

  const playerName = String(latestFollowUp.playerName || '').trim() || '玩家';

  return [{
    id: `player-followup-${currentLocation.locationId}-${currentLocation.residentId}-${currentTime}`,
    label: `留在${currentLocation.locationName}回味刚和${playerName}聊过的话`,
    locationId: currentLocation.locationId,
    targetResidentId: 'player',
    targetResidentName: playerName,
    companionActionType: 'player_conversation_followup'
  }];
}

function findPlayerPermissionFollowUpActions({
  worldTemplate = {},
  resident = {},
  townEvents = [],
  currentTime = Date.now()
} = {}) {
  const currentLocation = resolveCurrentLocationContext(resident);
  const latestPermissionUnlock = findFreshResidentPermissionUnlockEvents({
    residentId: currentLocation.residentId,
    townEvents,
    currentTime
  })[0];

  if (!latestPermissionUnlock) {
    return [];
  }

  const homeLocationId = String(resident?.townProfile?.homeLocationId || '').trim();
  if (!homeLocationId) {
    return [];
  }

  const unlockedPermissions = Array.isArray(latestPermissionUnlock.unlockedPermissions)
    ? latestPermissionUnlock.unlockedPermissions.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  if (unlockedPermissions.length === 0) {
    return [];
  }

  const homeLocationName = findLocationNameById(worldTemplate, homeLocationId)
    || (homeLocationId === currentLocation.locationId ? currentLocation.locationName : '')
    || homeLocationId;
  const playerName = String(latestPermissionUnlock.playerName || '').trim() || '玩家';
  const unlocksHomeEntry = unlockedPermissions.includes('canEnterHome');
  const isAtHome = currentLocation.locationId === homeLocationId;
  const label = isAtHome
    ? (unlocksHomeEntry
      ? `留在${homeLocationName}，对${playerName}的来访更放松一点`
      : `留在${homeLocationName}待一会，也许会等到${playerName}来敲门`)
    : (unlocksHomeEntry
      ? `回${homeLocationName}待着，对${playerName}的来访更放松一点`
      : `回${homeLocationName}待一会，也许会等到${playerName}来找自己`);

  return [{
    id: `player-permission-followup-${homeLocationId}-${currentLocation.residentId}-${currentTime}`,
    label,
    locationId: homeLocationId,
    targetResidentId: 'player',
    targetResidentName: playerName,
    companionActionType: 'player_permission_followup'
  }];
}

function findCompanionVisitActions({
  resident = {},
  candidateActions = [],
  socialLinks = [],
  residentSnapshots = [],
  blockedTargetResidentIds = [],
  currentTime = Date.now()
} = {}) {
  const currentLocation = resolveCurrentLocationContext(resident);
  const isHomeBlock = isResidentInHomeBlock({ resident, candidateActions });

  if (!isHomeBlock) {
    return [];
  }

  const residentMap = new Map(
    (Array.isArray(residentSnapshots) ? residentSnapshots : []).map((item) => [String(item.id || ''), item])
  );
  const visitActions = [];
  const seenTargets = new Set();

  (Array.isArray(socialLinks) ? socialLinks : [])
    .filter((link) => isSocialLinkFamiliar(link) && !isSocialLinkGuarded(link))
    .sort(compareSocialLinkPriority)
    .forEach((link) => {
    const familiarResident = normalizeResidentEntries(link)
      .find((item) => item.id && item.id !== currentLocation.residentId);

    if (
      !familiarResident?.id
      || seenTargets.has(familiarResident.id)
      || blockedTargetResidentIds.includes(familiarResident.id)
    ) {
      return;
    }

    const targetResident = residentMap.get(familiarResident.id);
    const targetLocationId = targetResident?.townRuntime?.currentLocationId || '';
    const targetLocationName = targetResident?.currentLocation
      || targetResident?.townRuntime?.currentLocationName
      || targetResident?.location
      || '';

    if (!targetLocationId || !targetLocationName) {
      return;
    }

    if (targetLocationId === currentLocation.homeLocationId || targetLocationId === currentLocation.locationId) {
      return;
    }

    seenTargets.add(familiarResident.id);
    visitActions.push({
      id: `visit-familiar-${targetLocationId}-${familiarResident.id}-${currentTime}`,
      label: `去${targetLocationName}找${familiarResident.name || targetResident?.name || '熟人'}`,
      locationId: targetLocationId,
      targetResidentId: familiarResident.id,
      targetResidentName: familiarResident.name || targetResident?.name || ''
    });
  });

  return visitActions;
}

function resolveResidentOutingDestination({
  worldTemplate = {},
  resident = {},
  candidateActions = [],
  currentLocation = {}
} = {}) {
  const candidateLocationId = resolveSingleCandidateLocationId(candidateActions);
  const homeLocationId = resident.townProfile?.homeLocationId || '';
  const workLocationId = findProfessionWorkLocationId(worldTemplate, resident);

  if (!candidateLocationId) {
    return '';
  }

  if (
    candidateLocationId === currentLocation.locationId
    || candidateLocationId === homeLocationId
    || candidateLocationId === workLocationId
  ) {
    return '';
  }

  return candidateLocationId;
}

function buildCompanionSharedOutingActions({
  worldTemplate = {},
  resident = {},
  candidateActions = [],
  socialLinks = [],
  residentSnapshots = [],
  recentEvents = [],
  currentTime = Date.now(),
  resolveActionType = () => 'companion_outing',
  labelBuilder = ({ targetResidentName, chosenLocationName }) => `和${targetResidentName || '熟人'}一起去${chosenLocationName}`
} = {}) {
  const currentLocation = resolveCurrentLocationContext(resident);

  if (!currentLocation.locationId) {
    return [];
  }

  const residentMap = new Map(
    (Array.isArray(residentSnapshots) ? residentSnapshots : []).map((item) => [String(item.id || ''), item])
  );
  const ownOutingDestination = resolveResidentOutingDestination({
    worldTemplate,
    resident,
    candidateActions,
    currentLocation
  });

  return (Array.isArray(recentEvents) ? recentEvents : []).reduce((actions, event) => {
    const targetResidentId = (Array.isArray(event?.residents) ? event.residents : [])
      .map(String)
      .find((item) => item && item !== currentLocation.residentId);

    if (!targetResidentId) {
      return actions;
    }

    const socialLink = findFamiliarSocialLink({
      residentId: currentLocation.residentId,
      targetResidentId,
      socialLinks
    });

    if (!socialLink) {
      return actions;
    }

    const targetResident = residentMap.get(targetResidentId);
    const targetCurrentLocationId = targetResident?.townRuntime?.currentLocationId || '';

    if (!targetResident || targetCurrentLocationId !== currentLocation.locationId) {
      return actions;
    }

    const targetScheduleBlock = findResidentScheduleBlock(worldTemplate, targetResident, currentTime);
    const targetOutingDestination = resolveResidentOutingDestination({
      worldTemplate,
      resident: targetResident,
      candidateActions: (targetScheduleBlock?.resolvedLocationId || targetScheduleBlock?.locationId)
        ? [{
          id: `${targetScheduleBlock.resolvedLocationId || targetScheduleBlock.locationId}-0`,
          label: '',
          locationId: targetScheduleBlock.resolvedLocationId || targetScheduleBlock.locationId
        }]
        : [],
      currentLocation
    });
    const hasResidentDestination = Boolean(ownOutingDestination);
    const hasTargetDestination = Boolean(targetOutingDestination);

    if (!hasResidentDestination && !hasTargetDestination) {
      return actions;
    }

    if (hasResidentDestination && hasTargetDestination && ownOutingDestination !== targetOutingDestination) {
      return actions;
    }

    const chosenLocationId = ownOutingDestination || targetOutingDestination;
    const currentBaseLocationId = resolveSingleCandidateLocationId(candidateActions);
    const currentBaseLocationName = findLocationNameById(worldTemplate, currentBaseLocationId) || currentBaseLocationId;

    if (
      currentBaseLocationId
      && currentBaseLocationId !== chosenLocationId
      && currentBaseLocationId !== currentLocation.homeLocationId
      && currentBaseLocationId !== currentLocation.locationId
    ) {
      return actions;
    }

    const chosenLocationName = (worldTemplate.locations || []).find((item) => item.id === chosenLocationId)?.name
      || targetScheduleBlock?.locationName
      || chosenLocationId;
    const targetResidentName = targetResident.name
      || (Array.isArray(event?.residentNames) ? event.residentNames.find((name) => name && name !== currentLocation.residentName) : '')
      || '';
    const companionActionType = resolveActionType({
      ownOutingDestination,
      targetOutingDestination,
      chosenLocationId,
      currentBaseLocationId,
      currentBaseLocationName
    });

    actions.push({
      id: `companion-outing-${chosenLocationId}-${targetResidentId}-${currentTime}`,
      label: labelBuilder({
        targetResidentName,
        chosenLocationName,
        companionActionType,
        currentBaseLocationId,
        currentBaseLocationName
      }),
      locationId: chosenLocationId,
      targetResidentId,
      targetResidentName,
      companionActionType
    });

    return actions;
  }, []);
}

function findCompanionOutingActions({
  worldTemplate = {},
  resident = {},
  candidateActions = [],
  socialLinks = [],
  residentSnapshots = [],
  townEvents = [],
  currentTime = Date.now()
} = {}) {
  return buildCompanionSharedOutingActions({
    worldTemplate,
    resident,
    candidateActions,
    socialLinks,
    residentSnapshots,
    recentEvents: findFreshResidentChatEvents({
      residentId: String(resident.id || ''),
      townEvents,
      currentTime
    }),
    currentTime,
    resolveActionType: ({
      ownOutingDestination,
      targetOutingDestination,
      chosenLocationId,
      currentBaseLocationId
    }) => {
      if (
        ownOutingDestination
        && !targetOutingDestination
        && ownOutingDestination === chosenLocationId
      ) {
        return 'invitation_host';
      }

      if (
        !ownOutingDestination
        && currentBaseLocationId
        && currentBaseLocationId !== chosenLocationId
      ) {
        return 'invitation_accepted';
      }

      return 'companion_outing';
    },
    labelBuilder: ({
      targetResidentName,
      chosenLocationName,
      companionActionType
    }) => {
      if (companionActionType === 'invitation_host') {
        return `约${targetResidentName || '熟人'}一起去${chosenLocationName}`;
      }

      if (companionActionType === 'invitation_accepted') {
        return `答应和${targetResidentName || '熟人'}一起去${chosenLocationName}`;
      }

      return `和${targetResidentName || '熟人'}一起去${chosenLocationName}`;
    }
  });
}

function findOngoingCompanionOutingActions({
  worldTemplate = {},
  resident = {},
  candidateActions = [],
  socialLinks = [],
  residentSnapshots = [],
  townEvents = [],
  currentTime = Date.now()
} = {}) {
  return buildCompanionSharedOutingActions({
    worldTemplate,
    resident,
    candidateActions,
    socialLinks,
    residentSnapshots,
    recentEvents: findFreshResidentOutingEvents({
      residentId: String(resident.id || ''),
      townEvents,
      currentTime
    }),
    currentTime,
    resolveActionType: () => 'continued_outing',
    labelBuilder: ({ targetResidentName, chosenLocationName }) => `继续和${targetResidentName || '熟人'}一起去${chosenLocationName}`
  });
}

function findChatAfterglowFollowUpActions({
  resident = {},
  candidateActions = [],
  socialLinks = [],
  residentSnapshots = [],
  townEvents = [],
  currentTime = Date.now()
} = {}) {
  const currentLocation = resolveCurrentLocationContext(resident);
  const isHomeBlock = isResidentInHomeBlock({ resident, candidateActions });

  if (!isHomeBlock) {
    return [];
  }

  const residentMap = new Map(
    (Array.isArray(residentSnapshots) ? residentSnapshots : []).map((item) => [String(item.id || ''), item])
  );
  const seenTargets = new Set();

  return findFreshResidentChatEvents({
    residentId: currentLocation.residentId,
    townEvents,
    currentTime
  }).reduce((actions, event) => {
    const targetResidentId = (Array.isArray(event?.residents) ? event.residents : [])
      .map(String)
      .find((item) => item && item !== currentLocation.residentId);

    if (!targetResidentId || seenTargets.has(targetResidentId)) {
      return actions;
    }

    const socialLink = findFamiliarSocialLink({
      residentId: currentLocation.residentId,
      targetResidentId,
      socialLinks
    });

    if (!socialLink) {
      return actions;
    }

    const targetResident = residentMap.get(targetResidentId);
    const targetLocationId = targetResident?.townRuntime?.currentLocationId || '';
    const targetLocationName = targetResident?.currentLocation
      || targetResident?.townRuntime?.currentLocationName
      || targetResident?.location
      || '';
    const targetResidentName = targetResident?.name
      || (Array.isArray(event?.residentNames) ? event.residentNames.find((name) => name && name !== currentLocation.residentName) : '')
      || '';

    if (!targetLocationId || !targetLocationName) {
      return actions;
    }

    if (targetLocationId === currentLocation.homeLocationId || targetLocationId === currentLocation.locationId) {
      return actions;
    }

    seenTargets.add(targetResidentId);
    actions.push({
      id: `follow-chat-${targetLocationId}-${targetResidentId}-${currentTime}`,
      label: `去${targetLocationName}继续和${targetResidentName || '熟人'}待一会`,
      locationId: targetLocationId,
      targetResidentId,
      targetResidentName
    });

    return actions;
  }, []);
}

export function buildResidentBehaviorCandidateActions({
  worldTemplate = {},
  resident = {},
  candidateActions = [],
  socialLinks = [],
  residentSnapshots = [],
  townEvents = [],
  currentTime = Date.now()
} = {}) {
  const baseActions = Array.isArray(candidateActions) ? [...candidateActions] : [];
  const currentLocation = resolveCurrentLocationContext(resident);
  const playerBehavior = resolvePlayerBehaviorRelationship(resident);

  if (!currentLocation.locationId || !currentLocation.locationName) {
    return filterInaccessibleActions(worldTemplate, resident, baseActions);
  }

  const ongoingCompanionOutingActions = findOngoingCompanionOutingActions({
    worldTemplate,
    resident,
    candidateActions: baseActions,
    socialLinks,
    residentSnapshots,
    townEvents,
    currentTime
  });

  if (ongoingCompanionOutingActions.length > 0) {
    return filterInaccessibleActions(
      worldTemplate,
      resident,
      dedupeCandidateActions([
        ...ongoingCompanionOutingActions,
        ...baseActions
      ])
    );
  }

  const playerInvitationActions = findPlayerResidentInvitationActions({
    worldTemplate,
    resident,
    candidateActions: baseActions,
    townEvents,
    currentTime
  });

  if (playerInvitationActions.length > 0) {
    return filterInaccessibleActions(
      worldTemplate,
      resident,
      dedupeCandidateActions([
        ...playerInvitationActions,
        ...baseActions
      ])
    );
  }

  const playerPermissionFollowUpActions = findPlayerPermissionFollowUpActions({
    worldTemplate,
    resident,
    townEvents,
    currentTime
  });

  if (playerPermissionFollowUpActions.length > 0) {
    return filterInaccessibleActions(
      worldTemplate,
      resident,
      dedupeCandidateActions([
        ...playerPermissionFollowUpActions,
        ...baseActions
      ])
    );
  }

  const companionOutingActions = findCompanionOutingActions({
    worldTemplate,
    resident,
    candidateActions: baseActions,
    socialLinks,
    residentSnapshots,
    townEvents,
    currentTime
  });

  if (companionOutingActions.length > 0) {
    return filterInaccessibleActions(
      worldTemplate,
      resident,
      dedupeCandidateActions([
        ...companionOutingActions,
        ...baseActions
      ])
    );
  }

  const biasedActions = [];
  biasedActions.push(...findPlayerConversationFollowUpActions({
    resident,
    townEvents,
    currentTime
  }));

  const familiarCompanions = findFamiliarCompanionNames({
    residentId: currentLocation.residentId,
    residentName: currentLocation.residentName,
    locationName: currentLocation.locationName,
    socialLinks
  });
  const freshEvents = findFreshSceneEvents({
    locationName: currentLocation.locationName,
    townEvents,
    currentTime
  }).filter((event) => {
    if (event?.type === 'player_resident_conversation_followup') {
      return playerBehavior.canLingerAfterPlayerConversation;
    }

    if (event?.type === 'player_resident_invitation') {
      return playerBehavior.canPrioritizePlayerInvitation;
    }

    return true;
  });

  if (familiarCompanions.length > 0) {
    const companionLabel = familiarCompanions.slice(0, 2).join('、');
    biasedActions.push({
      id: `linger-familiar-${currentLocation.locationId}-${currentTime}`,
      label: `留在${currentLocation.locationName}和${companionLabel}多待一会`,
      locationId: currentLocation.locationId
    });
  }

  if (freshEvents.length > 0) {
    biasedActions.push({
      id: `linger-event-${currentLocation.locationId}-${currentTime}`,
      label: `留在${currentLocation.locationName}看看刚刚的动静`,
      locationId: currentLocation.locationId
    });
  }

  const chatAfterglowActions = findChatAfterglowFollowUpActions({
    resident,
    candidateActions: baseActions,
    socialLinks,
    residentSnapshots,
    townEvents,
    currentTime
  });

  biasedActions.push(...chatAfterglowActions);
  biasedActions.push(...findCompanionVisitActions({
    resident,
    candidateActions: baseActions,
    socialLinks,
    residentSnapshots,
    blockedTargetResidentIds: chatAfterglowActions
      .map((item) => String(item?.targetResidentId || ''))
      .filter(Boolean),
    currentTime
  }));

  const mergedActions = biasedActions.length > 0
    ? dedupeCandidateActions([
      ...biasedActions,
      ...baseActions
    ])
    : baseActions;
  const filteredActions = filterInaccessibleActions(worldTemplate, resident, mergedActions);

  return filteredActions.length > 0 ? filteredActions : baseActions;
}
