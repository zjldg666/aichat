import { buildRecentTownEventSummaries, buildSceneTownEventSummaries } from '@/utils/town/town-view-models.js';
import { findResidentActiveCompanions } from '@/utils/town/town-social.js';
import {
  buildResidenceLabel,
  isResidenceAccessAllowed,
  isResidenceVisitRequestAllowed,
  resolvePlayerResidenceLocationId,
  resolvePlayerVisitorId
} from '@/utils/town/town-location-access.js';
import { buildWorldSemanticsView } from '@/utils/town/world-semantics.js';

function resolveResidentLocationId(resident = {}) {
  return resident.townRuntime?.currentLocationId || '';
}

function resolveResidentLocationName(resident = {}) {
  return resident.currentLocation || resident.townRuntime?.currentLocationName || resident.location || 'Unknown Location';
}

function resolveResidentAction(resident = {}) {
  return resident.currentAction || resident.townRuntime?.currentAction || 'idle';
}

function resolveResidentUnreadCount(resident = {}) {
  return Math.max(0, Number(resident.unread) || 0);
}

function resolveResidentLatestReplyPreview(resident = {}) {
  return String(
    resident.phoneLastMsg
    || resident.phoneSummary
    || resident.summary
    || resident.lastMsg
    || ''
  ).trim();
}

function buildPhoneContacts(residents = [], semantics = {}) {
  if (semantics.remoteChatEnabled === false) {
    return [];
  }

  return (Array.isArray(residents) ? residents : []).map((resident) => {
    const unreadCount = resolveResidentUnreadCount(resident);

    return {
      residentId: resident.id || '',
      residentName: resident.name || 'Unknown Resident',
      avatar: resident.avatar || '',
      currentLocationName: resolveResidentLocationName(resident),
      currentAction: resolveResidentAction(resident),
      phoneChatLabel: semantics.remoteChatEntryLabel || '\u624b\u673a\u804a\u5929',
      hasUnreadReply: unreadCount > 0,
      unreadCount,
      latestReplyPreview: resolveResidentLatestReplyPreview(resident)
    };
  });
}

function resolveResidentBio(resident = {}) {
  return resident.bio || resident.settings?.bio || 'They are living through another ordinary day in town.';
}

function resolveResidentRelationshipStage(resident = {}) {
  return String(
    resident.relation
    || resident.settings?.relation
    || resident.settings?.relationStage
    || ''
  ).trim() || '\u8fd8\u5728\u4e92\u76f8\u8ba4\u8bc6';
}

function resolveResidentRelationshipSummary(resident = {}) {
  return String(
    resident.settings?.userRelation
    || resident.userRelation
    || resident.settings?.relationSummary
    || resident.relation
    || ''
  ).trim() || `${resident.name || '\u5bf9\u65b9'}\u5bf9\u4f60\u8fd8\u5728\u89c2\u671b\uff0c\u4f46\u5173\u7cfb\u5df2\u7ecf\u6709\u4e86\u53ef\u4ee5\u7ee7\u7eed\u63a8\u8fdb\u7684\u7ebf\u7d22\u3002`;
}

function parseResidenceLocationId(locationId = '') {
  const match = String(locationId || '').trim().match(/^residence:([^:]+):(.+)$/);
  return {
    zoneId: match?.[1] || '',
    unitId: match?.[2] || ''
  };
}

function getPlayerTemplate(worldTemplate = {}) {
  return Array.isArray(worldTemplate.playerIdentityTemplates)
    ? (worldTemplate.playerIdentityTemplates[0] || {})
    : {};
}

function buildLocationCardLookup(locationCards = []) {
  const byId = new Map();
  const byName = new Map();

  (Array.isArray(locationCards) ? locationCards : []).forEach((card) => {
    const id = String(card?.id || '').trim();
    const name = String(card?.name || '').trim();

    if (id) {
      byId.set(id, card);
    }

    if (name) {
      byName.set(name, card);
    }
  });

  return { byId, byName };
}

function resolveResidentResidence(resident = {}) {
  const zoneId = resident.townProfile?.residence?.zoneId || '';
  const unitId = resident.townProfile?.residence?.unitId || '';

  if (zoneId && unitId) {
    return { zoneId, unitId };
  }

  return parseResidenceLocationId(
    resident.townProfile?.homeLocationId
      || resident.townRuntime?.currentLocationId
      || ''
  );
}

function getWorldLocationMeta(worldTemplate = {}, locationId = '', locationName = '') {
  const normalizedLocationId = String(locationId || '').trim();
  const runtimeLocation = (worldTemplate.locations || []).find((item) => item.id === normalizedLocationId)
    || (worldTemplate.locations || []).find((item) => item.name === locationName)
    || null;
  const parsedResidence = parseResidenceLocationId(normalizedLocationId || runtimeLocation?.id || '');

  if (parsedResidence.zoneId && parsedResidence.unitId) {
    const zone = (worldTemplate.residentialZones || []).find((item) => item.id === parsedResidence.zoneId);
    const unit = (zone?.units || []).find((item) => item.id === parsedResidence.unitId);

    if (zone && unit) {
      return {
        id: normalizedLocationId || runtimeLocation?.id || '',
        name: runtimeLocation?.name || `${zone.name || zone.id} ${unit.label || unit.id}`,
        access: unit.accessPolicy || runtimeLocation?.access || 'consent_required'
      };
    }
  }

  return {
    id: runtimeLocation?.id || normalizedLocationId || '',
    name: runtimeLocation?.name || locationName || '',
    access: runtimeLocation?.access || 'public'
  };
}

function buildPublicLocationCards(worldTemplate = {}, locationCards = [], eventFeed = []) {
  const liveCards = buildLocationCardLookup(locationCards);
  const latestEventTimeByLocation = new Map();

  eventFeed.forEach((event) => {
    const locationName = String(event?.locationName || '').trim();
    const happenedAt = Number(event?.happenedAt) || 0;

    if (!locationName || !happenedAt) {
      return;
    }

    latestEventTimeByLocation.set(
      locationName,
      Math.max(latestEventTimeByLocation.get(locationName) || 0, happenedAt)
    );
  });

  return (worldTemplate.publicLocations || [])
    .map((location) => {
      const liveCard = liveCards.byId.get(location.id) || liveCards.byName.get(location.name) || null;

      return {
        id: location.id || location.name || '',
        name: location.name || 'Unknown Location',
        atmosphere: liveCard?.atmosphere || location.description || '',
        residentCount: Array.isArray(liveCard?.chars) ? liveCard.chars.length : 0,
        leadNames: (Array.isArray(liveCard?.chars) ? liveCard.chars : [])
          .slice(0, 2)
          .map((item) => item.name)
          .filter(Boolean),
        latestEventTime: latestEventTimeByLocation.get(location.name || '') || 0
      };
    })
    .sort((left, right) => {
      const eventDelta = (right.latestEventTime || 0) - (left.latestEventTime || 0);
      if (eventDelta !== 0) {
        return eventDelta;
      }

      const residentDelta = (right.residentCount || 0) - (left.residentCount || 0);
      if (residentDelta !== 0) {
        return residentDelta;
      }

      return String(left.name || '').localeCompare(String(right.name || ''), 'zh-CN');
    });
}

function buildResidentialZoneCards(worldTemplate = {}, residents = []) {
  return (worldTemplate.residentialZones || []).map((zone) => {
    const occupiedUnits = new Set();
    const zoneResidents = [];

    (Array.isArray(residents) ? residents : []).forEach((resident) => {
      const residence = resolveResidentResidence(resident);

      if (residence.zoneId === zone.id && residence.unitId) {
        occupiedUnits.add(residence.unitId);
        const unit = (zone.units || []).find((item) => item.id === residence.unitId) || {};
        const fallbackLocationName = `${zone.name || zone.id} ${unit.label || residence.unitId}`.trim();
        const residenceLocationId = resident.townProfile?.homeLocationId || `residence:${zone.id}:${residence.unitId}`;
        const residenceMeta = getWorldLocationMeta(worldTemplate, residenceLocationId, fallbackLocationName);

        zoneResidents.push({
          residentId: resident.id || '',
          residentName: resident.name || 'Unknown Resident',
          unitId: residence.unitId,
          unitLabel: unit.label || residence.unitId,
          residenceLocationId: residenceMeta.id || residenceLocationId,
          residenceLocationName: residenceMeta.name || fallbackLocationName,
          currentLocationId: resolveResidentLocationId(resident),
          currentLocationName: resolveResidentLocationName(resident),
          currentAction: resolveResidentAction(resident),
          isHomeNow: (
            String(resolveResidentLocationId(resident) || '').trim() === String(residenceMeta.id || '').trim()
            || String(resolveResidentLocationName(resident) || '').trim() === String(residenceMeta.name || '').trim()
          )
        });
      }
    });

    return {
      id: zone.id || zone.name || '',
      name: zone.name || 'Unknown Residence Zone',
      description: zone.description || '',
      unitCount: Array.isArray(zone.units) ? zone.units.length : 0,
      occupiedCount: occupiedUnits.size,
      residents: zoneResidents.sort((left, right) => {
        const unitDelta = String(left.unitLabel || '').localeCompare(String(right.unitLabel || ''), 'zh-CN');
        if (unitDelta !== 0) {
          return unitDelta;
        }

        return String(left.residentName || '').localeCompare(String(right.residentName || ''), 'zh-CN');
      }),
      occupiedUnitLabels: (zone.units || [])
        .filter((unit) => occupiedUnits.has(unit.id))
        .map((unit) => unit.label || unit.id)
    };
  });
}

function buildPlayerResidenceEntry(worldTemplate = {}, semantics = {}) {
  const playerTemplate = getPlayerTemplate(worldTemplate);
  const residenceLabel = String(semantics.residenceLabel || '').trim() || '住处';
  const locationId = resolvePlayerResidenceLocationId(worldTemplate);
  const locationName = buildResidenceLabel(worldTemplate, playerTemplate.residence)
    || String(playerTemplate.address || '').trim();

  if (!locationId && !locationName) {
    return null;
  }

  const title = residenceLabel === '住处' ? '我的住处' : `我的${residenceLabel}`;
  const actionLabel = residenceLabel === '住处' ? '回家看看' : `回${residenceLabel}看看`;
  const badgeLabel = residenceLabel === '住处' ? '回家' : `回${residenceLabel}`;
  const worldName = String(worldTemplate.name || '').trim() || '这个世界';

  return {
    id: locationId || `player-residence:${locationName}`,
    locationId,
    locationName,
    title,
    badgeLabel,
    actionLabel,
    description: `这里是你在${worldName}的落脚点，想安静待一会时可以直接回来。`
  };
}

export function buildResidentInvitationOptions(worldTemplate = {}, currentLocationName = '', townEvents = []) {
  const structuredPublicLocations = Array.isArray(worldTemplate.publicLocations)
    ? worldTemplate.publicLocations
    : [];
  const publicLocations = structuredPublicLocations.length > 0
    ? structuredPublicLocations
    : (worldTemplate.locations || []).filter((location) => location?.type !== 'residence');
  const latestEventTimeByLocation = new Map();

  (Array.isArray(townEvents) ? townEvents : []).forEach((event) => {
    const locationName = String(event?.locationName || '').trim();
    const happenedAt = Number(event?.happenedAt) || 0;

    if (!locationName || !happenedAt) {
      return;
    }

    latestEventTimeByLocation.set(
      locationName,
      Math.max(latestEventTimeByLocation.get(locationName) || 0, happenedAt)
    );
  });

  return publicLocations
    .map((location, index) => {
      const locationName = String(location?.name || '').trim();
      const latestEventTime = latestEventTimeByLocation.get(locationName) || 0;
      const description = String(location?.description || '').trim();

      return {
        id: `invite:${location?.id || locationName || index}`,
        locationId: String(location?.id || locationName).trim(),
        locationName,
        label: `\u7ea6\u5979\u53bb${locationName}`,
        reason: latestEventTime > 0
          ? `${locationName}\u521a\u6709\u65b0\u52a8\u9759\uff0c\u987a\u7740\u8fd9\u6761\u7ebf\u7d22\u7ea6\u5979\u8fc7\u53bb\u66f4\u81ea\u7136\u3002`
          : (description ? `${locationName}: ${description}` : `${locationName}\u662f\u4e2a\u9002\u5408\u628a\u5c0f\u9547\u6545\u4e8b\u5f80\u524d\u63a8\u7684\u516c\u5171\u5730\u70b9\u3002`),
        latestEventTime,
        sortIndex: index
      };
    })
    .filter((option) => option.locationName && option.locationName !== String(currentLocationName || '').trim())
    .sort((left, right) => {
      const eventDelta = (right.latestEventTime || 0) - (left.latestEventTime || 0);
      if (eventDelta !== 0) {
        return eventDelta;
      }

      return (left.sortIndex || 0) - (right.sortIndex || 0);
    })
    .slice(0, 3)
    .map(({ latestEventTime, sortIndex, ...option }) => option);
}

function buildResidentActivityJoinOption(resident = {}, locationId = '', locationName = '', isPrivateResidence = false) {
  if (isPrivateResidence || !locationName) {
    return null;
  }

  const residentName = resident.name || 'TA';
  const currentAction = resolveResidentAction(resident);

  return {
    id: `join:${resident.id || residentName}:${locationId || locationName}`,
    residentId: resident.id || '',
    residentName,
    locationId: locationId || locationName,
    locationName,
    currentAction,
    label: `\u53bb${locationName}\u52a0\u5165${residentName}\u6b63\u5728\u505a\u7684\u4e8b`,
    reason: `${residentName}\u73b0\u5728\u6b63\u5728${currentAction}\uff0c\u4ece\u73b0\u573a\u5207\u8fdb\u4f1a\u6bd4\u76f4\u63a5\u6539\u8bdd\u9898\u66f4\u81ea\u7136\u3002`
  };
}

function isPlayerRelationshipEvent(event = {}, residentId = '') {
  const targetResidentId = String(residentId || '').trim();
  if (!targetResidentId) {
    return false;
  }

  const residents = Array.isArray(event?.residents) ? event.residents.map(String) : [];
  if (!residents.includes(targetResidentId)) {
    return false;
  }

  const type = String(event?.type || '').trim();
  return Boolean(String(event?.playerName || '').trim())
    || type.startsWith('player_')
    || type.startsWith('private_visit_');
}

function buildPlayerRelationshipEventFeed(townEvents = [], residentId = '', limit = 3) {
  return buildRecentTownEventSummaries(
    (Array.isArray(townEvents) ? townEvents : []).filter((event) => isPlayerRelationshipEvent(event, residentId)),
    limit
  );
}

function resolveRelationshipMomentumLabel(event = {}) {
  switch (String(event?.type || '').trim()) {
    case 'private_visit_allowed':
      return '\u5979\u5df2\u7ecf\u5411\u4f60\u6253\u5f00\u4e86\u66f4\u79c1\u4eba\u7684\u8fb9\u754c';
    case 'private_visit_requested':
      return '\u4f60\u521a\u5411\u5979\u63d0\u51fa\u8fc7\u79c1\u5b85\u62dc\u8bbf\u8bf7\u6c42';
    case 'player_relationship_permission_unlocked':
      return '\u8fd9\u8f6e\u516c\u5f00\u804a\u5929\u5df2\u7ecf\u628a\u4f60\u4eec\u7684\u5173\u7cfb\u63a8\u5230\u4e86\u65b0\u7684\u6743\u9650\u9636\u6bb5';
    case 'player_resident_home_visit_request':
      return '\u4f60\u521a\u5230\u5979\u5bb6\u95e8\u53e3\u53d1\u8d77\u8fc7\u62dc\u8bbf\u8bf7\u6c42';
    case 'player_resident_activity_join':
      return '\u4f60\u4eec\u521a\u5171\u4eab\u8fc7\u4e00\u6b21\u73b0\u573a\u52a8\u9759';
    case 'player_resident_invitation':
      return '\u4f60\u521a\u4e3b\u52a8\u5411\u5979\u53d1\u8d77\u8fc7\u9080\u7ea6';
    case 'player_relationship_focus':
      return '\u4f60\u5df2\u7ecf\u5f00\u59cb\u6709\u610f\u8bc6\u5730\u63a8\u52a8\u8fd9\u6bb5\u5173\u7cfb';
    default:
      return '\u8fd9\u6bb5\u5173\u7cfb\u6700\u8fd1\u6709\u4e86\u65b0\u7684\u7ebf\u7d22';
  }
}

function buildRelationshipMomentum(playerEventFeed = [], locationName = '', currentAction = '', companions = []) {
  const freshestEvent = Array.isArray(playerEventFeed) ? playerEventFeed[0] : null;

  if (freshestEvent?.summary) {
    return {
      label: resolveRelationshipMomentumLabel(freshestEvent),
      reason: freshestEvent.summary,
      focusSummary: freshestEvent.summary
    };
  }

  if (Array.isArray(companions) && companions.length > 0) {
    return {
      label: '\u5979\u73b0\u5728\u8eab\u8fb9\u8fd8\u6709\u522b\u4eba',
      reason: `${companions.join('\u3001')}\u4e5f\u5728\u573a\uff0c\u4f60\u53ef\u4ee5\u5148\u5224\u65ad\u8fd9\u6bb5\u5173\u7cfb\u66f4\u9002\u5408\u516c\u5f00\u63a5\u8fd1\u8fd8\u662f\u79c1\u4e0b\u5355\u72ec\u63a8\u8fdb\u3002`,
      focusSummary: `${companions.join('\u3001')}\u4e5f\u5728\u5979\u8eab\u8fb9\uff0c\u9700\u8981\u5148\u5224\u65ad\u8fd9\u4f1a\u9002\u4e0d\u9002\u5408\u628a\u8bdd\u8bf4\u6df1\u4e00\u70b9\u3002`
    };
  }

  const safeLocationName = String(locationName || '').trim();
  const safeCurrentAction = String(currentAction || '').trim();

  return {
    label: safeLocationName
      ? `\u5979\u73b0\u5728\u5c31\u5728${safeLocationName}`
      : '\u73b0\u5728\u53ef\u4ee5\u4ece\u4f60\u4eec\u76ee\u524d\u7684\u5f53\u4e0b\u72b6\u6001\u5207\u5165',
    reason: safeLocationName
      ? `${safeLocationName}${safeCurrentAction ? `\u91cc\u5979\u6b63\u5728${safeCurrentAction}` : '\u91cc\u5979\u6b63\u5728\u8fc7\u81ea\u5df1\u7684\u751f\u6d3b'}\uff0c\u987a\u7740\u5f53\u4e0b\u73b0\u573a\u53bb\u63a5\u8fd1\uff0c\u6bd4\u7a81\u7136\u8df3\u8bdd\u9898\u66f4\u81ea\u7136\u3002`
      : '\u6682\u65f6\u8fd8\u6ca1\u6709\u66f4\u76f4\u63a5\u7684\u5173\u7cfb\u4e8b\u4ef6\uff0c\u53ef\u4ee5\u5148\u4ece\u5f53\u4e0b\u5bf9\u8bdd\u5f00\u59cb\u8bd5\u63a2\u3002',
    focusSummary: safeLocationName
      ? `${safeLocationName}${safeCurrentAction ? `\u91cc\u5979\u6b63\u5728${safeCurrentAction}` : '\u91cc\u5979\u6b63\u5728\u5fd9\u7740\u624b\u5934\u7684\u4e8b'}\u3002`
      : '\u6682\u65f6\u8fd8\u6ca1\u6709\u66f4\u76f4\u63a5\u7684\u5173\u7cfb\u4e8b\u4ef6\u53ef\u4ee5\u9806\u7740\u8d70\u3002'
  };
}

function buildResidentRelationshipEntry({
  resident = {},
  playerEventFeed = [],
  locationName = '',
  currentAction = '',
  companions = []
} = {}) {
  const relationshipStage = resolveResidentRelationshipStage(resident);
  const relationshipSummary = resolveResidentRelationshipSummary(resident);
  const momentum = buildRelationshipMomentum(playerEventFeed, locationName, currentAction, companions);
  const residentName = resident.name || '\u5bf9\u65b9';

  return {
    residentId: String(resident.id || ''),
    residentName,
    relationshipStage,
    relationshipSummary,
    label: `\u770b\u770b\u4f60\u548c${residentName}\u73b0\u5728\u5230\u54ea\u4e00\u6b65\u4e86`,
    summary: `${relationshipStage} · ${relationshipSummary}`,
    focusSummary: momentum.focusSummary,
    momentumLabel: momentum.label,
    momentumReason: momentum.reason
  };
}

export function buildTownOverviewViewModel({
  worldTemplate = {},
  residents = [],
  locationCards = [],
  townEvents = []
} = {}) {
  const semantics = buildWorldSemanticsView(worldTemplate);
  const eventFeed = buildRecentTownEventSummaries(townEvents, 3);
  const playerTemplate = getPlayerTemplate(worldTemplate);
  const residentCount = Array.isArray(residents) ? residents.length : 0;
  const locationCount = (
    (Array.isArray(worldTemplate.publicLocations) ? worldTemplate.publicLocations.length : 0)
    + (Array.isArray(worldTemplate.residentialZones) ? worldTemplate.residentialZones.length : 0)
  ) || (Array.isArray(worldTemplate.locations) ? worldTemplate.locations.length : 0);

  return {
    hero: {
      worldId: worldTemplate.id || '',
      worldName: worldTemplate.name || 'Unnamed Town',
      residentCount,
      locationCount,
      activeEventCount: eventFeed.length,
      summary: `${playerTemplate.name || 'player'} is living here as ${playerTemplate.identity || 'a town resident'}.`
    },
    player: {
      name: playerTemplate.name || 'player',
      identity: playerTemplate.identity || 'a town resident',
      address: playerTemplate.address || 'address not set',
      summary: playerTemplate.summary || 'You are still getting to know this town.'
    },
    playerResidence: buildPlayerResidenceEntry(worldTemplate, semantics),
    semantics,
    phoneContacts: buildPhoneContacts(residents, semantics),
    eventFeed,
    publicLocationCards: buildPublicLocationCards(worldTemplate, locationCards, eventFeed),
    residentialZoneCards: buildResidentialZoneCards(worldTemplate, residents),
    quickActions: [
      { id: 'events', label: '\u5148\u770b\u52a8\u9759' },
      { id: 'public-locations', label: `\u518d\u53bb${semantics.publicLocationLabel || '\u516c\u5171\u5730\u70b9'}` },
      { id: 'residences', label: `\u6700\u540e\u770b${semantics.residentialZoneLabel || '\u4f4f\u5b85\u533a'}` }
    ]
  };
}

export function buildTownSceneViewModel({
  locationCard = {},
  townEvents = []
} = {}) {
  const locationName = locationCard.name || 'Unknown Location';
  const residentEntries = (Array.isArray(locationCard.chars) ? locationCard.chars : []).map((resident) => ({
    ...resident,
    primaryAction: '\u4ea4\u8c08',
    secondaryAction: '\u89c2\u5bdf'
  }));
  const leadResident = residentEntries[0] || null;
  const eventFeed = buildSceneTownEventSummaries(townEvents, locationName, 3);

  return {
    header: {
      locationId: locationCard.id || locationName,
      locationName,
      atmosphere: locationCard.atmosphere || 'You arrive and listen to the place before acting.',
      residentCount: residentEntries.length,
      eventCount: eventFeed.length
    },
    eventFeed,
    joinAction: leadResident
      ? {
        residentId: leadResident.id || '',
        residentName: leadResident.name || '',
        locationId: locationCard.id || locationName,
        locationName,
        currentAction: leadResident.currentAction || 'staying in the moment',
        label: `\u5148\u53bb\u52a0\u5165${leadResident.name || '\u5bf9\u65b9'}\u6b63\u5728\u505a\u7684\u4e8b`,
        description: `${leadResident.name || '\u5bf9\u65b9'}\u6b63\u5728${leadResident.currentAction || '\u5fd9\u7740\u773c\u524d\u7684\u4e8b'}\uff0c\u4ece\u73b0\u573a\u5207\u8fdb\u6700\u81ea\u7136\u3002`
      }
      : null,
    publicChat: {
      placeholder: '\u5728\u73b0\u573a\u8bf4\u70b9\u4ec0\u4e48\uff0c\u8ba9\u5728\u573a\u7684\u4eba\u81ea\u5df1\u63a5\u8bdd',
      emptyState: '\u5148\u5f00\u4e2a\u5934\uff0c\u8ba9\u73b0\u573a\u6162\u6162\u70ed\u8d77\u6765\u3002'
    },
    residentEntries,
    emptyMessage: 'Nobody is here right now, but the atmosphere is still moving.'
  };
}

export function buildTownResidentViewModel({
  worldTemplate = {},
  resident = {},
  locationCard = {},
  socialLinks = [],
  townEvents = []
} = {}) {
  const residentId = String(resident.id || '');
  const locationId = resolveResidentLocationId(resident) || locationCard.id || '';
  const locationName = resolveResidentLocationName(resident) || locationCard.name || 'Unknown Location';
  const currentAction = resolveResidentAction(resident);
  const locationMeta = getWorldLocationMeta(worldTemplate, locationId, locationName);
  const companions = findResidentActiveCompanions(residentId, socialLinks);
  const eventFeed = buildRecentTownEventSummaries(
    (Array.isArray(townEvents) ? townEvents : [])
      .filter((event) => Array.isArray(event?.residents) && event.residents.map(String).includes(residentId)),
    3
  );
  const playerRelationshipEventFeed = buildPlayerRelationshipEventFeed(townEvents, residentId, 2);
  const playerTemplate = getPlayerTemplate(worldTemplate);
  const playerVisitorId = resolvePlayerVisitorId(worldTemplate);
  const playerResidenceLocationId = resolvePlayerResidenceLocationId(worldTemplate);
  const semantics = buildWorldSemanticsView(worldTemplate);
  const isDefaultResidenceLabel = semantics.residenceLabel === '住处';
  const privateSpaceTypeLabel = isDefaultResidenceLabel ? '私人住宅' : `私人${semantics.residenceLabel}`;
  const residenceTargetLabel = isDefaultResidenceLabel ? '她家' : `她的${semantics.residenceLabel}`;
  const enterPermissionPhrase = semantics.enterActionLabel === '进入' ? '进入' : semantics.enterActionLabel;
  const approvedEnterPhrase = semantics.enterActionLabel === '进入' ? '进门拜访' : semantics.enterActionLabel;
  const visitPermissionPhrase = semantics.visitActionLabel === '拜访' ? '上门拜访' : semantics.visitActionLabel;
  const enterResidenceActionLabel = isDefaultResidenceLabel
    ? (
      semantics.enterActionLabel === '进入'
        ? '\u53bb\u5979\u5bb6\u770b\u770b'
        : `\u53bb${residenceTargetLabel}${semantics.enterActionLabel}`
    )
    : `\u53bb${residenceTargetLabel}${semantics.enterActionLabel}`;
  const requestResidenceVisitLabel = isDefaultResidenceLabel
    ? (
      semantics.visitActionLabel === '拜访'
        ? '\u7533\u8bf7\u53bb\u5979\u5bb6\u62dc\u8bbf'
        : `\u7533\u8bf7\u53bb${residenceTargetLabel}${semantics.visitActionLabel}`
    )
    : `\u7533\u8bf7\u53bb${residenceTargetLabel}${semantics.visitActionLabel}`;
  const blockedResidenceActionLabel = isDefaultResidenceLabel
    ? '\u6682\u65f6\u522b\u53bb\u5979\u5bb6'
    : `\u6682\u65f6\u5148\u522b\u53bb${residenceTargetLabel}`;
  const isPrivateResidence = locationMeta.access === 'consent_required';
  const canEnterResidence = isPrivateResidence
    ? isResidenceAccessAllowed({
      worldTemplate,
      locationId: locationMeta.id || locationId,
      visitorId: playerVisitorId,
      ownResidenceLocationId: playerResidenceLocationId,
      hostResident: resident
    })
    : true;
  const canRequestResidenceVisit = isPrivateResidence
    ? isResidenceVisitRequestAllowed({
      worldTemplate,
      locationId: locationMeta.id || locationId,
      visitorId: playerVisitorId,
      ownResidenceLocationId: playerResidenceLocationId,
      hostResident: resident
    })
    : false;
  const accessNote = isPrivateResidence
    ? (
      canEnterResidence
        ? `\u4f60\u5df2\u7ecf\u83b7\u5f97\u4f4f\u6237\u540c\u610f\uff0c\u73b0\u5728\u53ef\u4ee5${approvedEnterPhrase}\u3002`
        : (
          canRequestResidenceVisit
            ? `\u8fd9\u91cc\u662f${privateSpaceTypeLabel}\uff0c\u672a\u83b7\u4f4f\u6237\u540c\u610f\u524d\u4e0d\u80fd\u76f4\u63a5${enterPermissionPhrase}\u3002`
            : `\u8fd9\u91cc\u662f${privateSpaceTypeLabel}\uff0c\u73b0\u5728\u8fd8\u6ca1\u6709\u5230\u53ef\u4ee5${visitPermissionPhrase}\u7684\u5173\u7cfb\u9636\u6bb5\u3002`
        )
    )
    : '';
  const observationHints = [
    `${resident.name || 'TA'}\u73b0\u5728\u5728${locationName}\uff0c\u6b63\u51c6\u5907${currentAction}\u3002`,
    companions.length > 0
      ? `${companions.join('\u3001')}\u4e5f\u5728\u5979\u8eab\u8fb9\uff0c\u4f60\u6700\u597d\u5148\u770b\u6e05\u73b0\u5728\u662f\u8c01\u5728\u966a\u5979\u3002`
      : `${locationName}\u91cc\u5979\u6682\u65f6\u662f\u72ec\u81ea\u5f85\u7740\u7684\uff0c\u66f4\u9002\u5408\u5b89\u9759\u5730\u63a5\u8fd1\u3002`,
    accessNote || eventFeed[0]?.summary || `${locationCard.atmosphere || `${locationName} has its own rhythm right now.`}`
  ];
  const activityJoinOption = buildResidentActivityJoinOption(
    resident,
    locationCard.id || locationId || locationName,
    locationName,
    isPrivateResidence
  );

  return {
    hero: {
      id: resident.id,
      name: resident.name || 'Unknown Resident',
      avatar: resident.avatar || '',
      locationName,
      currentAction,
      bio: resolveResidentBio(resident)
    },
    scene: {
      locationId: locationCard.id || locationId || locationName,
      locationName,
      atmosphere: locationCard.atmosphere || `${locationName} has its own rhythm right now.`,
      isPrivateResidence,
      canEnter: canEnterResidence,
      canRequestVisit: canRequestResidenceVisit,
      accessNote
    },
    playerContext: {
      name: playerTemplate.name || 'player',
      identity: playerTemplate.identity || 'a town resident',
      address: playerTemplate.address || 'address not set',
      summary: playerTemplate.summary || 'You are still getting to know this town.'
    },
    companions,
    eventFeed,
    observationHints,
    relationshipEntry: buildResidentRelationshipEntry({
      resident,
      playerEventFeed: playerRelationshipEventFeed,
      locationName,
      currentAction,
      companions
    }),
    activityJoinOption,
    invitationOptions: buildResidentInvitationOptions(worldTemplate, locationName, townEvents),
    actions: [
      { id: 'observe', label: '\u5148\u89c2\u5bdf\u5979\u4e00\u4f1a' },
      { id: 'chat', label: '\u53bb\u548c\u5979\u8bf4\u8bdd' },
      {
        id: 'scene',
        label: isPrivateResidence
          ? (
            canEnterResidence
              ? enterResidenceActionLabel
              : (canRequestResidenceVisit ? requestResidenceVisitLabel : blockedResidenceActionLabel)
          )
          : '\u53bb\u5979\u6240\u5728\u5730\u70b9'
      }
    ]
  };
}

export function buildTownRelationshipViewModel({
  worldTemplate = {},
  resident = {},
  locationCard = {},
  socialLinks = [],
  townEvents = []
} = {}) {
  const residentView = buildTownResidentViewModel({
    worldTemplate,
    resident,
    locationCard,
    socialLinks,
    townEvents
  });
  const playerEventFeed = buildPlayerRelationshipEventFeed(townEvents, residentView.hero.id, 3);
  const momentum = buildRelationshipMomentum(
    playerEventFeed,
    residentView.scene.locationName,
    residentView.hero.currentAction,
    residentView.companions
  );

  return {
    hero: {
      residentId: residentView.hero.id || '',
      residentName: residentView.hero.name || '\u672a\u77e5\u5c45\u6c11',
      avatar: residentView.hero.avatar || '',
      relationshipStage: residentView.relationshipEntry?.relationshipStage || '\u8fd8\u5728\u4e92\u76f8\u8ba4\u8bc6'
    },
    playerContext: residentView.playerContext,
    scene: residentView.scene,
    companions: residentView.companions,
    eventFeed: residentView.eventFeed,
    playerEventFeed,
    summary: {
      relationshipStage: residentView.relationshipEntry?.relationshipStage || '\u8fd8\u5728\u4e92\u76f8\u8ba4\u8bc6',
      relationshipSummary: residentView.relationshipEntry?.relationshipSummary || '',
      momentumLabel: momentum.label,
      momentumReason: momentum.reason
    },
    focusChatAction: {
      residentId: residentView.hero.id || '',
      residentName: residentView.hero.name || '',
      relationshipStage: residentView.relationshipEntry?.relationshipStage || '\u8fd8\u5728\u4e92\u76f8\u8ba4\u8bc6',
      relationshipSummary: residentView.relationshipEntry?.relationshipSummary || '',
      focusSummary: momentum.focusSummary,
      currentLocationId: residentView.scene.locationId || '',
      currentLocationName: residentView.scene.locationName || '',
      currentAction: residentView.hero.currentAction || '',
      label: `\u5e26\u7740\u5173\u7cfb\u76ee\u6807\u53bb\u548c${residentView.hero.name || '\u5979'}\u804a`,
      description: momentum.reason
    },
    activityJoinOption: residentView.activityJoinOption,
    invitationOptions: residentView.invitationOptions.slice(0, 2),
    actions: residentView.actions
  };
}
