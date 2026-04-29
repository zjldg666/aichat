import {
  buildRecentTownEventSummaries,
  buildSceneTownEventSummaries,
  findTownSnapshotLocationCard,
  findTownSnapshotResident,
  selectAutonomousConversationThreads,
  selectFilteredEvents,
  selectLocationState,
  selectPlayerAccessForLocation,
  selectResidentContext
} from '@/utils/town/town-view-models.js';
import { findResidentActiveCompanions } from '@/utils/town/town-social.js';
import {
  buildResidenceLabel,
  isResidenceAccessAllowed,
  isResidenceVisitRequestAllowed,
  resolvePlayerResidenceLocationId,
  resolvePlayerVisitorId
} from '@/utils/town/town-location-access.js';
import { buildWorldSemanticsView } from '@/utils/town/world-semantics.js';

function resolveResidentRuntimeContext(townSnapshot = null, resident = {}) {
  if (!townSnapshot || typeof townSnapshot !== 'object') {
    return null;
  }

  const residentId = String(resident?.residentId || resident?.id || '').trim();
  if (!residentId) {
    return null;
  }

  return selectResidentContext(townSnapshot, residentId);
}

function resolveResidentLocationId(resident = {}, runtimeContext = null) {
  return runtimeContext?.currentLocationId || resident.townRuntime?.currentLocationId || '';
}

function resolveResidentLocationName(resident = {}, runtimeContext = null) {
  return runtimeContext?.currentLocationName
    || resident.townRuntime?.currentLocationName
    || resident.currentLocation
    || resident.location
    || 'Unknown Location';
}

function resolveResidentAction(resident = {}, runtimeContext = null) {
  return runtimeContext?.currentAction || resident.townRuntime?.currentAction || resident.currentAction || 'idle';
}

function resolveResidentUnreadCount(resident = {}) {
  return Math.max(0, Number(resident.unread) || 0);
}

function resolveResidentAutonomousPreview(resident = {}) {
  const recentConversationSummary = Array.isArray(resident?.townRuntime?.autonomy?.recentConversationSummaries)
    ? resident.townRuntime.autonomy.recentConversationSummaries[0]
    : null;

  return String(recentConversationSummary?.summary || '').trim();
}

function resolveResidentLatestReplyPreview(resident = {}) {
  return String(
    resident.phoneLastMsg
    || resident.phoneSummary
    || resolveResidentAutonomousPreview(resident)
    || resident.summary
    || resident.lastMsg
    || ''
  ).trim();
}

function buildPhoneContacts(residents = [], semantics = {}, townSnapshot = null) {
  if (semantics.remoteChatEnabled === false) {
    return [];
  }

  return (Array.isArray(residents) ? residents : []).map((resident) => {
    const runtimeContext = resolveResidentRuntimeContext(townSnapshot, resident);
    const unreadCount = resolveResidentUnreadCount(resident);

    return {
      residentId: resident.id || '',
      residentName: resident.name || 'Unknown Resident',
      avatar: resident.avatar || '',
      currentLocationName: resolveResidentLocationName(resident, runtimeContext),
      currentAction: resolveResidentAction(resident, runtimeContext),
      phoneChatLabel: semantics.remoteChatEntryLabel || '\u624b\u673a\u804a\u5929',
      hasUnreadReply: unreadCount > 0,
      unreadCount,
      latestReplyPreview: resolveResidentLatestReplyPreview(resident),
      autonomousSummaryPreview: resolveResidentAutonomousPreview(resident)
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

function resolveOverviewLocationMeta(worldTemplate = {}, locationCards = [], {
  locationId = '',
  locationName = ''
} = {}) {
  const safeLocationId = String(locationId || '').trim();
  const safeLocationName = String(locationName || '').trim();
  const lookup = buildLocationCardLookup(locationCards);
  const card = (safeLocationId && lookup.byId.get(safeLocationId))
    || (safeLocationName && lookup.byName.get(safeLocationName))
    || null;
  const publicLocation = (worldTemplate.publicLocations || []).find((item) => (
    String(item?.id || '').trim() === safeLocationId
    || String(item?.name || '').trim() === safeLocationName
  )) || null;
  const worldLocation = (worldTemplate.locations || []).find((item) => (
    String(item?.id || '').trim() === safeLocationId
    || String(item?.name || '').trim() === safeLocationName
  )) || null;

  return {
    locationId: safeLocationId || card?.id || publicLocation?.id || worldLocation?.id || '',
    locationName: safeLocationName || card?.name || publicLocation?.name || worldLocation?.name || ''
  };
}

function buildOverviewActionLabel(locationName = '') {
  const safeLocationName = String(locationName || '').trim();
  return safeLocationName ? `去 ${safeLocationName} 看看` : '先去看看';
}

function buildOverviewEventFeed(worldTemplate = {}, locationCards = [], townEvents = []) {
  return buildRecentTownEventSummaries(townEvents, 3).map((event) => {
    const locationMeta = resolveOverviewLocationMeta(worldTemplate, locationCards, {
      locationId: event?.locationId,
      locationName: event?.locationName
    });

    return {
      ...event,
      locationId: locationMeta.locationId,
      locationName: locationMeta.locationName,
      actionLabel: buildOverviewActionLabel(locationMeta.locationName),
      isActionable: Boolean(locationMeta.locationName || (Array.isArray(event?.residents) && event.residents.length > 0))
    };
  });
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
  const latestEventByLocation = new Map();

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

    if (!latestEventByLocation.has(locationName) || Number(latestEventByLocation.get(locationName)?.happenedAt) < happenedAt) {
      latestEventByLocation.set(locationName, event);
    }
  });

  return (worldTemplate.publicLocations || [])
    .map((location) => {
      const liveCard = liveCards.byId.get(location.id) || liveCards.byName.get(location.name) || null;
      const latestEvent = latestEventByLocation.get(location.name || '') || null;
      const leadNames = (Array.isArray(liveCard?.chars) ? liveCard.chars : [])
        .slice(0, 2)
        .map((item) => item.name)
        .filter(Boolean);
      const residentCount = Array.isArray(liveCard?.chars) ? liveCard.chars.length : 0;
      const reason = latestEvent?.summary
        || (leadNames.length > 0
          ? `${leadNames.join('、')}现在都在这里，直接过去最容易看到新的现场动静。`
          : (residentCount > 0
            ? '这里现在有人在场，直接过去最容易看到新的现场动静。'
            : (liveCard?.atmosphere || location.description || '可以先过去看看今天的动静。')));

      return {
        id: location.id || location.name || '',
        name: location.name || 'Unknown Location',
        atmosphere: liveCard?.atmosphere || location.description || '',
        residentCount,
        leadNames,
        latestEventTime: latestEventTimeByLocation.get(location.name || '') || 0,
        latestEventSummary: latestEvent?.summary || '',
        actionLabel: buildOverviewActionLabel(location.name || ''),
        reason
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

function buildObservationFocus({
  eventFeed = [],
  publicLocationCards = [],
  playerResidence = null
} = {}) {
  const freshestEvent = (Array.isArray(eventFeed) ? eventFeed : []).find((event) => String(event?.locationName || '').trim());
  if (freshestEvent) {
    return {
      type: 'event',
      title: freshestEvent.title || freshestEvent.locationName || '镇上刚有了新的动静',
      summary: freshestEvent.summary || '这里刚有新的变化，适合先过去看看。',
      badgeLabel: '最新动静',
      actionLabel: freshestEvent.actionLabel || buildOverviewActionLabel(freshestEvent.locationName),
      locationId: String(freshestEvent.locationId || '').trim(),
      locationName: String(freshestEvent.locationName || '').trim(),
      residentId: Array.isArray(freshestEvent.residents) ? String(freshestEvent.residents[0] || '').trim() : '',
      residentName: Array.isArray(freshestEvent.residentNames) ? String(freshestEvent.residentNames[0] || '').trim() : ''
    };
  }

  const livelyLocation = Array.isArray(publicLocationCards) ? publicLocationCards[0] : null;
  if (livelyLocation?.name) {
    return {
      type: 'location',
      title: livelyLocation.name,
      summary: livelyLocation.reason || livelyLocation.atmosphere || '这里现在值得先过去看看。',
      badgeLabel: livelyLocation.residentCount > 0 ? '现场有动静' : '可先观察',
      actionLabel: livelyLocation.actionLabel || buildOverviewActionLabel(livelyLocation.name),
      locationId: String(livelyLocation.id || '').trim(),
      locationName: String(livelyLocation.name || '').trim(),
      residentId: '',
      residentName: ''
    };
  }

  if (playerResidence?.locationName) {
    return {
      type: 'residence',
      title: playerResidence.locationName,
      summary: playerResidence.description || '想先回到自己的住处整理一下，也可以从这里重新观察小镇。',
      badgeLabel: playerResidence.badgeLabel || '回家',
      actionLabel: playerResidence.actionLabel || buildOverviewActionLabel(playerResidence.locationName),
      locationId: String(playerResidence.locationId || '').trim(),
      locationName: String(playerResidence.locationName || '').trim(),
      residentId: '',
      residentName: ''
    };
  }

  return null;
}

function buildResidentialZoneCards(worldTemplate = {}, residents = [], townSnapshot = null) {
  return (worldTemplate.residentialZones || []).map((zone) => {
    const occupiedUnits = new Set();
    const zoneResidents = [];

    (Array.isArray(residents) ? residents : []).forEach((resident) => {
      const runtimeContext = resolveResidentRuntimeContext(townSnapshot, resident);
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
          currentLocationId: resolveResidentLocationId(resident, runtimeContext),
          currentLocationName: resolveResidentLocationName(resident, runtimeContext),
          currentAction: resolveResidentAction(resident, runtimeContext),
          isHomeNow: (
            String(resolveResidentLocationId(resident, runtimeContext) || '').trim() === String(residenceMeta.id || '').trim()
            || String(resolveResidentLocationName(resident, runtimeContext) || '').trim() === String(residenceMeta.name || '').trim()
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

function resolveResidentHomeLocationId(resident = {}) {
  return String(
    resident?.townProfile?.homeLocationId
    || resident?.townRuntime?.currentLocationId
    || ''
  ).trim();
}

function resolveSceneHostResidentId(townSnapshot = {}, locationId = '', residentEntries = []) {
  const safeLocationId = String(locationId || '').trim();
  const fallbackResidentId = String(residentEntries?.[0]?.id || '').trim();

  if (!safeLocationId) {
    return fallbackResidentId;
  }

  const homeOwner = (Array.isArray(townSnapshot?.residents) ? townSnapshot.residents : []).find((resident) => (
    resolveResidentHomeLocationId(resident) === safeLocationId
  ));

  if (homeOwner?.id) {
    return String(homeOwner.id).trim();
  }

  const locationState = selectLocationState(townSnapshot, safeLocationId);
  const residentIds = Array.isArray(locationState?.residentIds) ? locationState.residentIds : [];
  const currentResidentId = String(residentIds[0] || '').trim();

  return currentResidentId || fallbackResidentId;
}

function buildSceneResidentActionLabel(residentName = '') {
  const safeResidentName = String(residentName || '').trim();
  return safeResidentName ? `去和 ${safeResidentName} 搭上话` : '先和现场的人搭上话';
}

function buildSceneResidentEntries(townSnapshot = {}, residents = [], locationName = '') {
  const safeLocationName = String(locationName || '').trim();

  return (Array.isArray(residents) ? residents : []).map((resident, index) => {
    const runtimeContext = resolveResidentRuntimeContext(townSnapshot, resident);
    const residentName = String(resident?.name || '').trim() || 'Someone';
    const currentAction = resolveResidentAction(resident, runtimeContext) || 'staying in the moment';

    return {
      ...resident,
      currentAction,
      primaryAction: '\u4ea4\u8c08',
      secondaryAction: '\u89c2\u5bdf',
      presenceNote: `${residentName}\u6b63\u5728${currentAction}`,
      actionLabel: buildSceneResidentActionLabel(residentName),
      isLeadResident: index === 0,
      locationName: safeLocationName
    };
  });
}

function buildSceneJoinAction(leadResident = null, {
  locationId = '',
  locationName = ''
} = {}) {
  if (!leadResident) {
    return null;
  }

  const residentName = String(leadResident?.name || '').trim();
  const currentAction = String(leadResident?.currentAction || '').trim() || 'staying in the moment';

  return {
    residentId: leadResident.id || '',
    residentName,
    locationId,
    locationName,
    currentAction,
    label: `\u5148\u53bb\u52a0\u5165${residentName || '\u5bf9\u65b9'}\u6b63\u5728\u505a\u7684\u4e8b`,
    description: `${residentName || '\u5bf9\u65b9'}\u6b63\u5728${currentAction}\uff0c\u4ece\u73b0\u573a\u5207\u8fdb\u6700\u81ea\u7136\u3002`
  };
}

function buildSceneEventFeed(eventFeed = [], {
  joinAction = null,
  locationName = ''
} = {}) {
  const safeLocationName = String(locationName || '').trim();

  return (Array.isArray(eventFeed) ? eventFeed : []).map((event) => ({
    ...event,
    reason: String(event?.summary || '').trim()
      || String(event?.title || '').trim()
      || (safeLocationName
        ? `${safeLocationName} \u521a\u6709\u4e86\u65b0\u53d8\u5316\uff0c\u503c\u5f97\u987a\u7740\u73b0\u573a\u7ee7\u7eed\u8ddf\u8fdb\u3002`
        : '\u73b0\u573a\u521a\u6709\u65b0\u52a8\u9759\uff0c\u503c\u5f97\u7ee7\u7eed\u8ddf\u8fdb\u3002'),
    actionLabel: joinAction?.label || (safeLocationName
      ? `\u987a\u7740 ${safeLocationName} \u7684\u52a8\u9759\u8ddf\u8fdb`
      : '\u987a\u7740\u73b0\u573a\u52a8\u9759\u8ddf\u8fdb')
  }));
}

function buildSceneAutonomousThreadFeed(townSnapshot = {}, {
  locationId = '',
  locationName = ''
} = {}) {
  const safeLocationId = String(locationId || '').trim();
  const safeLocationName = String(locationName || '').trim();

  return selectAutonomousConversationThreads(townSnapshot)
    .filter((thread) => (
      String(thread?.type || '').trim() === 'scene_autonomous'
      && String(thread?.status || '').trim() !== 'closed'
      && String(thread?.locationId || '').trim() === safeLocationId
      && String(thread?.lastSummary || '').trim()
    ))
    .sort((left, right) => (
      (Number(right?.lastAdvancedAt) || Number(right?.startedAt) || 0)
      - (Number(left?.lastAdvancedAt) || Number(left?.startedAt) || 0)
    ))
    .map((thread) => ({
      id: `scene-autonomous-thread-${thread.id || Math.random()}`,
      type: 'scene_autonomous_thread',
      title: '居民自治对白',
      summary: String(thread?.lastSummary || '').trim(),
      happenedAt: Number(thread?.lastAdvancedAt) || Number(thread?.startedAt) || 0,
      locationId: String(thread?.locationId || '').trim() || safeLocationId,
      locationName: safeLocationName,
      residents: Array.isArray(thread?.participantIds) ? thread.participantIds : [],
      residentNames: []
    }));
}

function buildScenePresenceSummary({
  locationName = '',
  residentEntries = [],
  eventFeed = [],
  atmosphere = ''
} = {}) {
  const safeLocationName = String(locationName || '').trim() || 'This scene';
  const safeAtmosphere = String(atmosphere || '').trim();
  const residentCount = Array.isArray(residentEntries) ? residentEntries.length : 0;
  const freshestReason = String(eventFeed?.[0]?.reason || '').trim();

  if (residentCount > 0) {
    return `${safeLocationName} \u73b0\u5728\u6709 ${residentCount} \u4f4d\u5c45\u6c11\u5728\u573a\uff0c${freshestReason || safeAtmosphere || '\u5148\u770b\u770b\u8c01\u4f1a\u5148\u63a5\u4f4f\u4f60\u3002'}`;
  }

  return `${safeLocationName} \u6682\u65f6\u6ca1\u6709\u5c45\u6c11\u505c\u7559\uff0c${freshestReason || safeAtmosphere || '\u4f46\u8fd9\u91cc\u7684\u8282\u594f\u8fd8\u5728\u7ee7\u7eed\u3002'}`;
}

function buildSceneFocus({
  header = {},
  eventFeed = [],
  residentEntries = [],
  joinAction = null
} = {}) {
  const freshestEvent = Array.isArray(eventFeed) ? eventFeed[0] : null;
  const leadResident = Array.isArray(residentEntries) ? residentEntries[0] : null;
  const safeLocationId = String(header?.locationId || '').trim();
  const safeLocationName = String(header?.locationName || '').trim();

  if (freshestEvent?.title || freshestEvent?.summary) {
    return {
      type: 'event',
      title: freshestEvent.title || safeLocationName || 'Scene update',
      summary: freshestEvent.summary || freshestEvent.reason || header?.atmosphere || '',
      badgeLabel: '\u6700\u65b0\u52a8\u9759',
      actionLabel: freshestEvent.actionLabel || joinAction?.label || '\u987a\u7740\u73b0\u573a\u7ee7\u7eed\u770b\u770b',
      residentId: String(joinAction?.residentId || leadResident?.id || '').trim(),
      residentName: String(joinAction?.residentName || leadResident?.name || '').trim(),
      locationId: safeLocationId,
      locationName: safeLocationName
    };
  }

  if (leadResident) {
    return {
      type: 'resident',
      title: leadResident.name || safeLocationName || 'Scene lead',
      summary: leadResident.presenceNote || header?.atmosphere || '',
      badgeLabel: '\u5728\u573a\u4e3b\u89d2',
      actionLabel: joinAction?.label || leadResident.actionLabel || '\u5148\u8fc7\u53bb\u770b\u770b',
      residentId: String(leadResident.id || '').trim(),
      residentName: String(leadResident.name || '').trim(),
      locationId: safeLocationId,
      locationName: safeLocationName
    };
  }

  return {
    type: 'atmosphere',
    title: safeLocationName || 'Scene',
    summary: header?.atmosphere || 'You arrive and listen to the place before acting.',
    badgeLabel: '\u73b0\u573a\u6c14\u6c1b',
    actionLabel: safeLocationName ? `\u5148\u89c2\u5bdf ${safeLocationName}` : '\u5148\u89c2\u5bdf\u73b0\u573a',
    residentId: '',
    residentName: '',
    locationId: safeLocationId,
    locationName: safeLocationName
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

function buildRelationshipMomentum(
  playerEventFeed = [],
  locationName = '',
  currentAction = '',
  companions = [],
  autonomousSummary = ''
) {
  const freshestEvent = Array.isArray(playerEventFeed) ? playerEventFeed[0] : null;

  if (freshestEvent?.summary) {
    return {
      label: resolveRelationshipMomentumLabel(freshestEvent),
      reason: freshestEvent.summary,
      focusSummary: freshestEvent.summary
    };
  }

  const safeAutonomousSummary = String(autonomousSummary || '').trim();
  if (safeAutonomousSummary) {
    return {
      label: '她刚刚自己和别人聊过一轮',
      reason: safeAutonomousSummary,
      focusSummary: safeAutonomousSummary
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
  const momentum = buildRelationshipMomentum(
    playerEventFeed,
    locationName,
    currentAction,
    companions,
    resolveResidentAutonomousPreview(resident)
  );
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
  townSnapshot = {}
} = {}) {
  const worldTemplate = townSnapshot.worldTemplate || {};
  const residents = Array.isArray(townSnapshot.residents) ? townSnapshot.residents : [];
  const locationCards = Array.isArray(townSnapshot.locationCards) ? townSnapshot.locationCards : [];
  const townEvents = Array.isArray(townSnapshot.townEvents) ? townSnapshot.townEvents : [];
  const semantics = buildWorldSemanticsView(worldTemplate);
  const eventFeed = buildOverviewEventFeed(worldTemplate, locationCards, townEvents);
  const playerTemplate = getPlayerTemplate(worldTemplate);
  const residentCount = Array.isArray(residents) ? residents.length : 0;
  const locationCount = (
    (Array.isArray(worldTemplate.publicLocations) ? worldTemplate.publicLocations.length : 0)
    + (Array.isArray(worldTemplate.residentialZones) ? worldTemplate.residentialZones.length : 0)
  ) || (Array.isArray(worldTemplate.locations) ? worldTemplate.locations.length : 0);
  const playerResidence = buildPlayerResidenceEntry(worldTemplate, semantics);
  const publicLocationCards = buildPublicLocationCards(worldTemplate, locationCards, eventFeed);

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
    playerResidence,
    semantics,
    phoneContacts: buildPhoneContacts(residents, semantics, townSnapshot),
    observationFocus: buildObservationFocus({
      eventFeed,
      publicLocationCards,
      playerResidence
    }),
    eventFeed,
    publicLocationCards,
    residentialZoneCards: buildResidentialZoneCards(worldTemplate, residents, townSnapshot),
    quickActions: [
      { id: 'events', label: '\u5148\u770b\u52a8\u9759' },
      { id: 'public-locations', label: `\u518d\u53bb${semantics.publicLocationLabel || '\u516c\u5171\u5730\u70b9'}` },
      { id: 'residences', label: `\u6700\u540e\u770b${semantics.residentialZoneLabel || '\u4f4f\u5b85\u533a'}` }
    ]
  };
}

export function buildTownSceneViewModel({
  townSnapshot = {},
  locationName = ''
} = {}) {
  const safeLocationName = String(locationName || '').trim();
  const locationState = selectLocationState(townSnapshot, safeLocationName);
  const locationCard = findTownSnapshotLocationCard(
    townSnapshot,
    locationState?.locationName || safeLocationName
  ) || {};
  const resolvedLocationName = locationState?.locationName || locationCard.name || safeLocationName || 'Unknown Location';
  const resolvedLocationId = locationState?.locationId || locationCard.id || resolvedLocationName;
  const accessState = selectPlayerAccessForLocation(townSnapshot, resolvedLocationId);
  const isPrivateResidence = Boolean(
    accessState?.isPrivateResidence
    ?? locationState?.isPrivateResidence
  );
  const residentEntries = buildSceneResidentEntries(
    townSnapshot,
    Array.isArray(locationCard.chars) ? locationCard.chars : [],
    resolvedLocationName
  );
  const hostResidentId = resolveSceneHostResidentId(townSnapshot, resolvedLocationId, residentEntries);
  const hostResident = findTownSnapshotResident(townSnapshot, hostResidentId)
    || residentEntries.find((resident) => String(resident?.id || '').trim() === hostResidentId)
    || null;
  const residenceRooms = isPrivateResidence
    ? Object.keys(hostResident?.economy?.containers || {}).filter(Boolean)
    : [];
  const leadResident = residentEntries[0] || null;
  const filteredSceneEvents = selectFilteredEvents(townSnapshot, {
    location: resolvedLocationId || resolvedLocationName,
    limit: 3
  });
  const threadFeed = buildSceneAutonomousThreadFeed(townSnapshot, {
    locationId: resolvedLocationId,
    locationName: resolvedLocationName
  });
  const eventFeed = filteredSceneEvents.length > 0
    ? filteredSceneEvents
    : buildSceneTownEventSummaries(townSnapshot?.townEvents || [], resolvedLocationName, 3);
  const combinedEventFeed = [
    ...threadFeed,
    ...(Array.isArray(eventFeed) ? eventFeed : [])
  ].sort((left, right) => (
    (Number(right?.happenedAt) || 0) - (Number(left?.happenedAt) || 0)
  ));
  const canPlayerEnter = isPrivateResidence
    ? Boolean(accessState?.canPlayerEnter)
    : true;
  const canPlayerRequestVisit = isPrivateResidence
    ? Boolean(accessState?.canPlayerRequestVisit)
    : false;
  const joinAction = buildSceneJoinAction(leadResident, {
    locationId: resolvedLocationId,
    locationName: resolvedLocationName
  });
  const sceneEventFeed = buildSceneEventFeed(combinedEventFeed, {
    joinAction,
    locationName: resolvedLocationName
  });
  const header = {
    locationId: resolvedLocationId,
    locationName: resolvedLocationName,
    atmosphere: locationState?.atmosphere || locationCard.atmosphere || 'You arrive and listen to the place before acting.',
    residentCount: residentEntries.length,
    eventCount: sceneEventFeed.length,
    isPrivateResidence,
    canPlayerEnter,
    canPlayerRequestVisit
  };
  const presenceSummary = buildScenePresenceSummary({
    locationName: resolvedLocationName,
    residentEntries,
    eventFeed: sceneEventFeed,
    atmosphere: header.atmosphere
  });
  const sceneFocus = buildSceneFocus({
    header,
    eventFeed: sceneEventFeed,
    residentEntries,
    joinAction
  });

  return {
    header,
    sceneFocus,
    presenceSummary,
    eventFeed: sceneEventFeed,
    hostResidentId,
    hostResident,
    residenceRooms,
    joinAction,
    publicChat: {
      placeholder: '\u5728\u73b0\u573a\u8bf4\u70b9\u4ec0\u4e48\uff0c\u8ba9\u5728\u573a\u7684\u4eba\u81ea\u5df1\u63a5\u8bdd',
      emptyState: '\u5148\u5f00\u4e2a\u5934\uff0c\u8ba9\u73b0\u573a\u6162\u6162\u70ed\u8d77\u6765\u3002'
    },
    residentEntries,
    emptyMessage: 'Nobody is here right now, but the atmosphere is still moving.'
  };
}

export function buildTownResidentViewModel({
  townSnapshot = null,
  worldTemplate,
  resident = {},
  locationCard = {},
  socialLinks,
  townEvents
} = {}) {
  // 优先从 townSnapshot 统一真源读取，兼容旧调用方式
  const hasSnapshot = townSnapshot && typeof townSnapshot === 'object';
  const resolvedWorldTemplate = worldTemplate || (hasSnapshot ? townSnapshot.worldTemplate : {}) || {};
  const resolvedSocialLinks = socialLinks || (hasSnapshot ? townSnapshot.socialLinks : []) || [];
  const resolvedTownEvents = townEvents || (hasSnapshot ? townSnapshot.townEvents : []) || [];
  const runtimeContext = hasSnapshot ? resolveResidentRuntimeContext(townSnapshot, resident) : null;

  if (hasSnapshot && (!locationCard || Object.keys(locationCard).length === 0)) {
    const locName = resolveResidentLocationName(resident, runtimeContext) || '';
    locationCard = findTownSnapshotLocationCard(townSnapshot, locName) || {};
  }

  const residentId = String(resident.id || '');
  const locationId = resolveResidentLocationId(resident, runtimeContext) || locationCard.id || '';
  const locationName = resolveResidentLocationName(resident, runtimeContext) || locationCard.name || 'Unknown Location';
  const currentAction = resolveResidentAction(resident, runtimeContext);
  const locationMeta = getWorldLocationMeta(resolvedWorldTemplate, locationId, locationName);
  const companions = findResidentActiveCompanions(residentId, resolvedSocialLinks);
  const eventFeed = buildRecentTownEventSummaries(
    (Array.isArray(resolvedTownEvents) ? resolvedTownEvents : [])
      .filter((event) => Array.isArray(event?.residents) && event.residents.map(String).includes(residentId)),
    3
  );
  const playerRelationshipEventFeed = buildPlayerRelationshipEventFeed(resolvedTownEvents, residentId, 2);
  const playerTemplate = getPlayerTemplate(resolvedWorldTemplate);
  const playerVisitorId = resolvePlayerVisitorId(resolvedWorldTemplate);
  const playerResidenceLocationId = resolvePlayerResidenceLocationId(resolvedWorldTemplate);
  const semantics = buildWorldSemanticsView(resolvedWorldTemplate);
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
      worldTemplate: resolvedWorldTemplate,
      locationId: locationMeta.id || locationId,
      visitorId: playerVisitorId,
      ownResidenceLocationId: playerResidenceLocationId,
      hostResident: resident
    })
    : true;
  const canRequestResidenceVisit = isPrivateResidence
    ? isResidenceVisitRequestAllowed({
      worldTemplate: resolvedWorldTemplate,
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
    accessNote
      || eventFeed[0]?.summary
      || resolveResidentAutonomousPreview(resident)
      || `${locationCard.atmosphere || `${locationName} has its own rhythm right now.`}`
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
    invitationOptions: buildResidentInvitationOptions(resolvedWorldTemplate, locationName, resolvedTownEvents),
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
  townSnapshot = null,
  worldTemplate,
  resident = {},
  locationCard = {},
  socialLinks,
  townEvents
} = {}) {
  const hasSnapshot = townSnapshot && typeof townSnapshot === 'object';
  const resolvedTownEvents = townEvents || (hasSnapshot ? townSnapshot.townEvents : []) || [];

  const residentView = buildTownResidentViewModel({
    townSnapshot,
    worldTemplate,
    resident,
    locationCard,
    socialLinks,
    townEvents
  });
  const playerEventFeed = buildPlayerRelationshipEventFeed(resolvedTownEvents, residentView.hero.id, 3);
  const momentum = buildRelationshipMomentum(
    playerEventFeed,
    residentView.scene.locationName,
    residentView.hero.currentAction,
    residentView.companions,
    resolveResidentAutonomousPreview(resident)
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
