import { compareTownEvents, sortTownEvents } from '@/utils/town/town-event-order.js';

const EVENT_DOMINANCE = {
  co_present: [
    'resident_life_contact',
    'companion_visit',
    'companion_meetup',
    'companion_chat_started',
    'companion_outing_started',
    'companion_invitation_accepted',
    'companion_invitation_confirmed',
    'player_resident_invitation_accepted'
  ],
  relationship_warmed: [
    'resident_life_contact',
    'companion_visit',
    'companion_meetup',
    'companion_chat_started',
    'companion_outing_started',
    'companion_invitation_accepted',
    'companion_invitation_confirmed',
    'player_resident_invitation_accepted'
  ]
};

function createEventId(prefix, linkId, currentTime) {
  return `${prefix}-${linkId}-${currentTime}`;
}

function normalizeResidentNames(link = {}) {
  return Array.isArray(link.residentNames) ? link.residentNames.filter(Boolean) : [];
}

function buildCoPresenceSummary(link = {}) {
  const residentNames = normalizeResidentNames(link);

  if (link.summary) {
    return link.summary;
  }

  if (residentNames.length > 0) {
    return `${residentNames.join('和')}出现在${link.locationName || '同一地点'}。`;
  }

  return `${link.locationName || '某个地点'}有人碰面了。`;
}

function resolveResidentLocationName(resident = {}) {
  return resident.townRuntime?.currentLocationName || resident.currentLocation || resident.location || '';
}

function resolveResidentLocationId(resident = {}) {
  return resident.townRuntime?.currentLocationId || '';
}

function resolveLinkLocationId(link = {}) {
  return String(link.locationId || '').trim();
}

function buildCompanionVisitSummary(resident = {}, previousResident = {}) {
  const residentName = resident.name || '有人';
  const targetName = resident.townRuntime?.currentTargetResidentName || '熟人';
  const currentLocationName = resolveResidentLocationName(resident) || '某处';
  const previousLocationName = resolveResidentLocationName(previousResident);

  if (previousLocationName && previousLocationName !== currentLocationName) {
    return `${residentName}从${previousLocationName}赶到${currentLocationName}，像是专门来找${targetName}。`;
  }

  return `${residentName}特意来到了${currentLocationName}，像是专门来找${targetName}。`;
}

function buildCompanionMeetupSummary(resident = {}, targetResident = {}, previousResident = {}) {
  const residentName = resident.name || '有人';
  const targetName = targetResident.name || resident.townRuntime?.currentTargetResidentName || '熟人';
  const currentLocationName = resolveResidentLocationName(resident) || resolveResidentLocationName(targetResident) || '某处';
  const previousLocationName = resolveResidentLocationName(previousResident);

  if (previousLocationName && previousLocationName !== currentLocationName) {
    return `${residentName}刚赶到${currentLocationName}，很快就和${targetName}碰上了头。`;
  }

  return `${residentName}在${currentLocationName}和${targetName}碰上了头。`;
}

function buildCompanionChatStartedSummary(resident = {}, targetResident = {}, previousResident = {}) {
  const residentName = resident.name || '有人';
  const targetName = targetResident.name || resident.townRuntime?.currentTargetResidentName || '熟人';
  const currentLocationName = resolveResidentLocationName(resident) || resolveResidentLocationName(targetResident) || '某处';
  const previousLocationName = resolveResidentLocationName(previousResident);

  if (previousLocationName && previousLocationName !== currentLocationName) {
    return `${residentName}刚赶到${currentLocationName}，很快就和${targetName}聊上了几句。`;
  }

  return `${residentName}在${currentLocationName}和${targetName}聊上了几句。`;
}

function buildCompanionOutingStartedSummary(
  resident = {},
  targetResident = {},
  previousResident = {},
  previousTargetResident = {}
) {
  const residentName = resident.name || '有人';
  const targetName = targetResident.name || resident.townRuntime?.currentTargetResidentName || '熟人';
  const previousLocationName = resolveResidentLocationName(previousResident)
    || resolveResidentLocationName(previousTargetResident)
    || '原来的地方';
  const currentLocationName = resolveResidentLocationName(resident) || resolveResidentLocationName(targetResident) || '某处';

  return `${residentName}和${targetName}从${previousLocationName}一起去了${currentLocationName}。`;
}

function buildCompanionInvitationAcceptedSummary(
  resident = {},
  targetResident = {},
  scheduledLocationName = ''
) {
  const residentName = resident.name || '有人';
  const targetName = targetResident.name || resident.townRuntime?.currentTargetResidentName || '熟人';
  const currentLocationName = resolveResidentLocationName(resident) || resolveResidentLocationName(targetResident) || '某处';

  if (scheduledLocationName && scheduledLocationName !== currentLocationName) {
    return `${residentName}本来要去${scheduledLocationName}，但答应和${targetName}一起去了${currentLocationName}。`;
  }

  return `${residentName}答应和${targetName}一起去了${currentLocationName}。`;
}

function buildCompanionInvitationConfirmedSummary(
  hostResident = {},
  acceptedResident = {},
  acceptedScheduledLocationName = ''
) {
  const hostName = hostResident.name || hostResident.townRuntime?.currentTargetResidentName || '有人';
  const acceptedName = acceptedResident.name || acceptedResident.townRuntime?.currentTargetResidentName || '熟人';
  const currentLocationName = resolveResidentLocationName(hostResident)
    || resolveResidentLocationName(acceptedResident)
    || '某处';

  if (acceptedScheduledLocationName && acceptedScheduledLocationName !== currentLocationName) {
    return `${hostName}约${acceptedName}一起去${currentLocationName}，${acceptedName}本来要去${acceptedScheduledLocationName}，但答应了。`;
  }

  return `${hostName}约${acceptedName}一起去了${currentLocationName}，${acceptedName}答应了。`;
}

function isInvitationAcceptedResident(resident = {}) {
  const companionActionType = resident.townRuntime?.currentCompanionActionType || '';
  const scheduledLocationId = String(resident.townRuntime?.currentScheduledLocationId || '');
  const currentLocationId = resolveResidentLocationId(resident);

  return Boolean(
    companionActionType === 'invitation_accepted'
    && scheduledLocationId
    && scheduledLocationId !== currentLocationId
  );
}

function isInvitationHostResident(resident = {}) {
  return (resident.townRuntime?.currentCompanionActionType || '') === 'invitation_host';
}

function isPlayerInvitationResident(resident = {}) {
  return (resident.townRuntime?.currentCompanionActionType || '') === 'player_invitation';
}

function buildPlayerResidentInvitationAcceptedSummary(resident = {}, previousResident = {}) {
  const residentName = resident.name || '有人';
  const playerName = resident.townRuntime?.currentTargetResidentName || '玩家';
  const currentLocationName = resolveResidentLocationName(resident) || '某处';
  const previousLocationName = resolveResidentLocationName(previousResident);

  if (previousLocationName && previousLocationName !== currentLocationName) {
    return `${residentName}从${previousLocationName}动身去了${currentLocationName}，像是在赴${playerName}的邀约。`;
  }

  return `${residentName}动身去了${currentLocationName}，像是在赴${playerName}的邀约。`;
}

function normalizeResidentRuntimeContactIds(resident = {}) {
  return Array.isArray(resident?.townRuntime?.autonomy?.recentContactResidentIds)
    ? resident.townRuntime.autonomy.recentContactResidentIds.map(String).filter(Boolean)
    : [];
}

function normalizeResidentRuntimeContactReasonTags(resident = {}) {
  return Array.isArray(resident?.townRuntime?.autonomy?.recentContactReasonTags)
    ? resident.townRuntime.autonomy.recentContactReasonTags.map(String).filter(Boolean)
    : [];
}

function buildResidentLifeContactSummary(resident = {}, targetResident = {}, locationName = '', reasonTag = '') {
  const residentName = resident.name || '有人';
  const targetName = targetResident?.name || resident.townRuntime?.currentTargetResidentName || '熟人';
  const safeLocationName = locationName || resolveResidentLocationName(resident) || '某处';

  if (reasonTag === 'after_work_overlap') {
    return `${residentName}和${targetName}在${safeLocationName}收工后还一起待着。`;
  }

  return `${residentName}和${targetName}在${safeLocationName}继续待在一起。`;
}

function normalizeResidentsKey(event = {}) {
  const residents = Array.isArray(event?.residents) ? event.residents.map(String).filter(Boolean).sort() : [];
  return residents.join('__');
}

function isSameEventLocation(left = {}, right = {}) {
  const leftLocationId = String(left.locationId || '').trim();
  const rightLocationId = String(right.locationId || '').trim();

  if (leftLocationId && rightLocationId) {
    return leftLocationId === rightLocationId;
  }

  return String(left.locationName || '').trim() === String(right.locationName || '').trim();
}

function shouldSuppressTownEvent(candidate = {}, existingEvent = {}) {
  if (!candidate?.type || !existingEvent?.type) {
    return false;
  }

  const dominantTypes = EVENT_DOMINANCE[candidate.type] || [];
  if (!dominantTypes.includes(existingEvent.type)) {
    return false;
  }

  if ((Number(candidate.happenedAt) || 0) !== (Number(existingEvent.happenedAt) || 0)) {
    return false;
  }

  if (!isSameEventLocation(candidate, existingEvent)) {
    return false;
  }

  return normalizeResidentsKey(candidate) === normalizeResidentsKey(existingEvent);
}

function settlePrimaryTownEvents(events = []) {
  const nextEvents = [];

  sortTownEvents(events).forEach((event) => {
    if (nextEvents.some((existingEvent) => shouldSuppressTownEvent(event, existingEvent))) {
      return;
    }

    nextEvents.push(event);
  });

  return nextEvents;
}

function settleCompanionVisitEvents({
  previousResidents = [],
  currentResidents = [],
  currentTime = Date.now()
} = {}) {
  const previousResidentMap = new Map(
    (Array.isArray(previousResidents) ? previousResidents : []).map((resident) => [String(resident.id || ''), resident])
  );
  const currentResidentMap = new Map(
    (Array.isArray(currentResidents) ? currentResidents : []).map((resident) => [String(resident.id || ''), resident])
  );
  const settledMeetupPairs = new Set();
  const settledOutingPairs = new Set();
  const events = [];

  (Array.isArray(currentResidents) ? currentResidents : []).forEach((resident) => {
    const residentId = String(resident.id || '');
    const targetResidentId = String(resident.townRuntime?.currentTargetResidentId || '');
    const currentLocationId = resolveResidentLocationId(resident);
    const previousResident = previousResidentMap.get(residentId);
    const previousLocationId = resolveResidentLocationId(previousResident);
    const targetResident = currentResidentMap.get(targetResidentId);
    const targetLocationId = resolveResidentLocationId(targetResident);
    const previousTargetResident = previousResidentMap.get(targetResidentId);
    const previousTargetLocationId = resolveResidentLocationId(previousTargetResident);

    if (!residentId || !currentLocationId) {
      return;
    }

    if (!previousLocationId || previousLocationId === currentLocationId) {
      return;
    }

    const residentName = resident.name || '有人';
    const targetResidentName = resident.townRuntime?.currentTargetResidentName || '熟人';
    const currentLocationName = resolveResidentLocationName(resident) || '';

    if (isPlayerInvitationResident(resident)) {
      events.push({
        id: createEventId('player-resident-invitation-accepted', residentId, currentTime),
        type: 'player_resident_invitation_accepted',
        happenedAt: currentTime,
        locationId: currentLocationId,
        locationName: currentLocationName,
        residentNames: [residentName].filter(Boolean),
        residents: [residentId],
        title: `${residentName}动身去${currentLocationName}赴玩家邀约`,
        summary: buildPlayerResidentInvitationAcceptedSummary(resident, previousResident)
      });
      return;
    }

    if (!targetResidentId) {
      return;
    }

    if (
      targetResident
      && targetLocationId === currentLocationId
      && previousLocationId
      && previousTargetLocationId
      && previousLocationId === previousTargetLocationId
      && previousLocationId !== currentLocationId
    ) {
      const outingPairId = [residentId, targetResidentId].sort().join('__');
      const outingKey = `${outingPairId}@${previousLocationId}->${currentLocationId}`;

      if (!settledOutingPairs.has(outingKey)) {
        settledOutingPairs.add(outingKey);
        const residentAccepted = isInvitationAcceptedResident(resident);
        const targetAccepted = isInvitationAcceptedResident(targetResident);
        const residentHost = isInvitationHostResident(resident);
        const targetHost = isInvitationHostResident(targetResident);
        const acceptedResident = residentAccepted ? resident : (targetAccepted ? targetResident : null);
        const hostResident = residentHost && targetAccepted
          ? resident
          : (targetHost && residentAccepted ? targetResident : null);
        const confirmedAcceptedResident = hostResident
          ? (hostResident === resident ? targetResident : resident)
          : null;
        const acceptedPartnerResident = acceptedResident
          ? (acceptedResident === resident ? targetResident : resident)
          : null;
        const acceptedScheduledLocationName = acceptedResident?.townRuntime?.currentScheduledLocationName || '';
        const isInvitationConfirmed = Boolean(hostResident && confirmedAcceptedResident);
        const isInvitationAccepted = Boolean(acceptedResident) && !isInvitationConfirmed;
        const primaryResident = isInvitationConfirmed
          ? confirmedAcceptedResident
          : (acceptedResident || resident);
        const companionResident = isInvitationConfirmed
          ? hostResident
          : (acceptedPartnerResident || targetResident);
        const eventLocationName = resolveResidentLocationName(primaryResident)
          || resolveResidentLocationName(companionResident)
          || currentLocationName;

        events.push({
          id: createEventId(
            isInvitationConfirmed
              ? 'companion-invitation-confirmed'
              : (isInvitationAccepted ? 'companion-invitation-accepted' : 'companion-outing-started'),
            outingPairId,
            currentTime
          ),
          type: isInvitationConfirmed
            ? 'companion_invitation_confirmed'
            : (isInvitationAccepted ? 'companion_invitation_accepted' : 'companion_outing_started'),
          happenedAt: currentTime,
          locationId: resolveResidentLocationId(primaryResident)
            || resolveResidentLocationId(companionResident)
            || currentLocationId,
          locationName: eventLocationName,
          residentNames: [primaryResident?.name || residentName, companionResident?.name || targetResidentName].filter(Boolean),
          residents: [residentId, targetResidentId],
          title: isInvitationConfirmed
            ? `${hostResident?.name || '有人'}约${confirmedAcceptedResident?.name || '熟人'}一起去了${eventLocationName}`
            : (isInvitationAccepted
              ? `${primaryResident?.name || residentName}答应和${companionResident?.name || targetResidentName}一起去了${eventLocationName}`
              : `${residentName}和${targetResident.name || targetResidentName}一起去了${eventLocationName}`),
          summary: isInvitationConfirmed
            ? buildCompanionInvitationConfirmedSummary(
              hostResident,
              confirmedAcceptedResident,
              confirmedAcceptedResident?.townRuntime?.currentScheduledLocationName || ''
            )
            : (isInvitationAccepted
              ? buildCompanionInvitationAcceptedSummary(
                primaryResident,
                companionResident,
                acceptedScheduledLocationName
              )
              : buildCompanionOutingStartedSummary(resident, targetResident, previousResident, previousTargetResident))
        });
      }

      return;
    }

    events.push({
      id: createEventId('companion-visit', `${residentId}-${targetResidentId}`, currentTime),
      type: 'companion_visit',
      happenedAt: currentTime,
      locationId: currentLocationId,
      locationName: currentLocationName,
      residentNames: [residentName, targetResidentName].filter(Boolean),
      residents: [residentId, targetResidentId],
      title: `${residentName}特意来找${targetResidentName}`,
      summary: buildCompanionVisitSummary(resident, previousResident)
    });

    if (!targetResident || targetLocationId !== currentLocationId) {
      return;
    }

    const meetupPairId = [residentId, targetResidentId].sort().join('__');
    const meetupKey = `${meetupPairId}@${currentLocationId}`;

    if (settledMeetupPairs.has(meetupKey)) {
      return;
    }

    settledMeetupPairs.add(meetupKey);

    events.push({
      id: createEventId('companion-chat-started', meetupPairId, currentTime),
      type: 'companion_chat_started',
      happenedAt: currentTime,
      locationId: currentLocationId,
      locationName: currentLocationName,
      residentNames: [residentName, targetResident.name || targetResidentName].filter(Boolean),
      residents: [residentId, targetResidentId],
      title: `${residentName}和${targetResident.name || targetResidentName}聊上了`,
      summary: buildCompanionChatStartedSummary(resident, targetResident, previousResident)
    });

    events.push({
      id: createEventId('companion-meetup', meetupPairId, currentTime),
      type: 'companion_meetup',
      happenedAt: currentTime,
      locationId: currentLocationId,
      locationName: currentLocationName,
      residentNames: [residentName, targetResident.name || targetResidentName].filter(Boolean),
      residents: [residentId, targetResidentId],
      title: `${residentName}和${targetResident.name || targetResidentName}碰头了`,
      summary: buildCompanionMeetupSummary(resident, targetResident, previousResident)
    });
  });

  return events;
}

function settleResidentLifeContactEvents({
  currentResidents = [],
  currentTime = Date.now()
} = {}) {
  const currentResidentMap = new Map(
    (Array.isArray(currentResidents) ? currentResidents : []).map((resident) => [String(resident.id || ''), resident])
  );
  const settledPairs = new Set();
  const events = [];

  (Array.isArray(currentResidents) ? currentResidents : []).forEach((resident) => {
    const residentId = String(resident?.id || '').trim();
    const reasonTags = normalizeResidentRuntimeContactReasonTags(resident);
    const targetResidentIds = normalizeResidentRuntimeContactIds(resident);
    const currentLocationId = resolveResidentLocationId(resident);
    const currentLocationName = resolveResidentLocationName(resident);

    if (!residentId || !reasonTags.includes('after_work_overlap') || targetResidentIds.length === 0) {
      return;
    }

    targetResidentIds.forEach((targetResidentId) => {
      const targetResident = currentResidentMap.get(String(targetResidentId || '').trim());
      if (!targetResident) {
        return;
      }

      const targetLocationId = resolveResidentLocationId(targetResident);
      if (!currentLocationId || currentLocationId !== targetLocationId) {
        return;
      }

      const pairId = [residentId, String(targetResidentId || '').trim()].sort().join('__');
      const pairKey = `${pairId}@${currentLocationId}@after_work_overlap`;
      if (settledPairs.has(pairKey)) {
        return;
      }

      settledPairs.add(pairKey);
      events.push({
        id: createEventId('resident-life-contact', pairId, currentTime),
        type: 'resident_life_contact',
        happenedAt: currentTime,
        locationId: currentLocationId,
        locationName: currentLocationName,
        residentNames: [resident.name || '有人', targetResident.name || '熟人'],
        residents: [residentId, String(targetResidentId || '').trim()],
        reasonTags: ['after_work_overlap'],
        title: `${resident.name || '有人'}和${targetResident.name || '熟人'}还待在${currentLocationName}`,
        summary: buildResidentLifeContactSummary(
          resident,
          targetResident,
          currentLocationName,
          'after_work_overlap'
        )
      });
    });
  });

  return events;
}

export function settleTownEvents({
  previousLinks = [],
  currentLinks = [],
  previousResidents = [],
  currentResidents = [],
  currentTime = Date.now()
} = {}) {
  const previousMap = new Map(
    (Array.isArray(previousLinks) ? previousLinks : []).map((item) => [item.id, item])
  );
  const events = [
    ...settleResidentLifeContactEvents({
      currentResidents,
      currentTime
    }),
    ...settleCompanionVisitEvents({
      previousResidents,
      currentResidents,
      currentTime
    })
  ];

  (Array.isArray(currentLinks) ? currentLinks : [])
    .filter((link) => link?.isActive)
    .forEach((link) => {
      const previous = previousMap.get(link.id);
      const residentNames = normalizeResidentNames(link);
      const locationId = resolveLinkLocationId(link);

      if (!previous || !previous.isActive) {
        events.push({
          id: createEventId('co-present', link.id, currentTime),
          type: 'co_present',
          happenedAt: currentTime,
          locationId,
          locationName: link.locationName || '',
          residentNames,
          residents: Array.isArray(link.residents) ? [...link.residents] : [],
          title: `${link.locationName || '某个地点'}有人碰面了`,
          summary: buildCoPresenceSummary(link)
        });
      }

      if ((Number(previous?.score) || 0) < 2 && (Number(link.score) || 0) >= 2) {
        events.push({
          id: createEventId('relationship-warmed', link.id, currentTime),
          type: 'relationship_warmed',
          happenedAt: currentTime,
          locationId,
          locationName: link.locationName || '',
          residentNames,
          residents: Array.isArray(link.residents) ? [...link.residents] : [],
          title: `${residentNames.join('和') || '这几位居民'}开始熟络起来`,
          summary: `${residentNames.join('和') || '这几位居民'}在${link.locationName || '这里'}明显熟悉了不少。`
        });
      }
    });

  return settlePrimaryTownEvents(events).sort(compareTownEvents);
}
