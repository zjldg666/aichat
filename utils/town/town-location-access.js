import { normalizePlayerRelationshipState } from './player-relationship.js';

function normalizeId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseResidenceLocationId(locationId = '') {
  const normalized = normalizeId(locationId);
  const match = normalized.match(/^residence:([^:]+):(.+)$/);
  if (!match) {
    return { zoneId: '', unitId: '' };
  }

  return {
    zoneId: normalizeId(match[1]),
    unitId: normalizeId(match[2])
  };
}

export function buildResidenceLocationId(zoneId = '', unitId = '') {
  const normalizedZoneId = normalizeId(zoneId);
  const normalizedUnitId = normalizeId(unitId);
  return normalizedZoneId && normalizedUnitId ? `residence:${normalizedZoneId}:${normalizedUnitId}` : '';
}

export function buildResidenceKey(residence = {}) {
  const zoneId = normalizeId(residence?.zoneId);
  const unitId = normalizeId(residence?.unitId);
  return zoneId && unitId ? `${zoneId}::${unitId}` : '';
}

export function buildResidenceLabel(worldTemplate = {}, residence = {}) {
  const zoneId = normalizeId(residence?.zoneId);
  const unitId = normalizeId(residence?.unitId);
  if (!zoneId || !unitId) {
    return '';
  }

  const zone = (worldTemplate?.residentialZones || []).find((item) => normalizeId(item?.id) === zoneId);
  const unit = (zone?.units || []).find((item) => normalizeId(item?.id) === unitId);

  if (!zone || !unit) {
    return '';
  }

  return `${zone.name || zone.id} ${unit.label || unit.id}`;
}

export function collectOccupiedResidenceKeys({ worldTemplate = {}, residents = [], ignoreResidentId = '' } = {}) {
  const occupied = new Set();
  const ignoredId = normalizeId(ignoreResidentId);

  const playerResidence = worldTemplate?.playerIdentityTemplates?.[0]?.residence;
  const playerKey = buildResidenceKey(playerResidence);
  if (playerKey) {
    occupied.add(playerKey);
  }

  (residents || []).forEach((resident) => {
    if (ignoredId && normalizeId(resident?.id) === ignoredId) {
      return;
    }

    const key = buildResidenceKey(resident?.townProfile?.residence);
    if (key) {
      occupied.add(key);
    }
  });

  return occupied;
}

export function buildAvailableResidenceUnits({
  worldTemplate = {},
  zoneId = '',
  residents = [],
  ignoreResidentId = '',
  ignoreResidenceKey = ''
} = {}) {
  const normalizedZoneId = normalizeId(zoneId);
  if (!normalizedZoneId) {
    return [];
  }

  const zone = (worldTemplate?.residentialZones || []).find((item) => normalizeId(item?.id) === normalizedZoneId);
  if (!zone) {
    return [];
  }

  const occupied = collectOccupiedResidenceKeys({
    worldTemplate,
    residents,
    ignoreResidentId
  });
  const skippedResidenceKey = normalizeId(ignoreResidenceKey);
  if (skippedResidenceKey) {
    occupied.delete(skippedResidenceKey);
  }

  return (zone.units || []).map((unit) => {
    const normalizedUnitId = normalizeId(unit?.id);
    if (!normalizedUnitId) {
      return null;
    }

    const residence = {
      zoneId: normalizedZoneId,
      unitId: normalizedUnitId
    };
    const residenceKey = buildResidenceKey(residence);
    if (!residenceKey || occupied.has(residenceKey)) {
      return null;
    }

    return {
      ...unit,
      id: normalizedUnitId,
      label: String(unit?.label || normalizedUnitId).trim(),
      zoneId: normalizedZoneId,
      zoneName: zone.name || zone.id || normalizedZoneId,
      residenceKey,
      locationId: buildResidenceLocationId(normalizedZoneId, normalizedUnitId)
    };
  }).filter(Boolean);
}

export function isPrivateResidenceLocation(worldTemplate = {}, locationId = '') {
  const parsed = parseResidenceLocationId(locationId);
  if (!parsed.zoneId || !parsed.unitId) {
    return false;
  }

  const zone = (worldTemplate?.residentialZones || []).find((item) => normalizeId(item?.id) === parsed.zoneId);
  if (!zone) {
    return false;
  }

  return (zone.units || []).some((item) => normalizeId(item?.id) === parsed.unitId);
}

export function findResidenceUnit(worldTemplate = {}, locationId = '') {
  const parsed = parseResidenceLocationId(locationId);
  if (!parsed.zoneId || !parsed.unitId) {
    return null;
  }

  const zone = (worldTemplate?.residentialZones || []).find((item) => normalizeId(item?.id) === parsed.zoneId);
  if (!zone) {
    return null;
  }

  return (zone.units || []).find((item) => normalizeId(item?.id) === parsed.unitId) || null;
}

function resolveResidentResidenceLocationId(resident = {}) {
  const residenceLocationId = buildResidenceLocationId(
    resident?.townProfile?.residence?.zoneId,
    resident?.townProfile?.residence?.unitId
  );

  return residenceLocationId || normalizeId(resident?.townProfile?.homeLocationId);
}

function resolveResidenceHostResident({
  locationId = '',
  hostResident = null,
  residents = []
} = {}) {
  if (hostResident && typeof hostResident === 'object' && Object.keys(hostResident).length > 0) {
    return hostResident;
  }

  const normalizedLocationId = normalizeId(locationId);
  if (!normalizedLocationId) {
    return null;
  }

  return (residents || []).find((resident) => (
    resolveResidentResidenceLocationId(resident) === normalizedLocationId
  )) || null;
}

function resolvePlayerHouseholdAccess(hostResident = null) {
  if (!hostResident || typeof hostResident !== 'object') {
    return {
      hasRuleOverride: false,
      canRequestVisit: false,
      canEnterHome: false
    };
  }

  const relationship = normalizePlayerRelationshipState(hostResident);
  const canRequestVisit = Boolean(relationship.permissions?.canRequestVisit);
  const canEnterHome = Boolean(relationship.permissions?.canEnterHome);

  return {
    hasRuleOverride: Boolean(relationship.flags?.householdTrackActive || canRequestVisit || canEnterHome),
    canRequestVisit,
    canEnterHome
  };
}

export function resolvePlayerVisitorId(worldTemplate = {}) {
  return normalizeId(worldTemplate?.playerIdentityTemplates?.[0]?.id) || 'player';
}

export function resolvePlayerResidenceLocationId(worldTemplate = {}) {
  const residence = worldTemplate?.playerIdentityTemplates?.[0]?.residence || {};
  return buildResidenceLocationId(residence?.zoneId, residence?.unitId);
}

export function isResidenceAccessAllowed({
  worldTemplate = {},
  locationId = '',
  visitorId = '',
  ownResidenceLocationId = '',
  hostResident = null,
  residents = []
} = {}) {
  const normalizedLocationId = normalizeId(locationId);
  if (!normalizedLocationId) {
    return false;
  }

  if (!isPrivateResidenceLocation(worldTemplate, normalizedLocationId)) {
    return true;
  }

  const normalizedVisitorId = normalizeId(visitorId);
  const normalizedOwnResidenceLocationId = normalizeId(ownResidenceLocationId)
    || resolvePlayerResidenceLocationId(worldTemplate);

  if (normalizedOwnResidenceLocationId && normalizedLocationId === normalizedOwnResidenceLocationId) {
    return true;
  }

  const residenceUnit = findResidenceUnit(worldTemplate, normalizedLocationId);
  const accessPolicy = normalizeId(residenceUnit?.accessPolicy || 'consent_required');
  if (accessPolicy && accessPolicy !== 'consent_required') {
    return true;
  }

  if (!normalizedVisitorId) {
    return false;
  }

  const residentIds = Array.isArray(residenceUnit?.residentIds)
    ? residenceUnit.residentIds.map((item) => normalizeId(item)).filter(Boolean)
    : [];
  if (residentIds.includes(normalizedVisitorId)) {
    return true;
  }

  const allowedVisitorIds = Array.isArray(residenceUnit?.allowedVisitorIds)
    ? residenceUnit.allowedVisitorIds.map((item) => normalizeId(item)).filter(Boolean)
    : [];

  if (allowedVisitorIds.includes(normalizedVisitorId)) {
    return true;
  }

  const playerVisitorId = resolvePlayerVisitorId(worldTemplate);
  if (normalizedVisitorId && normalizedVisitorId === playerVisitorId) {
    const residenceHost = resolveResidenceHostResident({
      locationId: normalizedLocationId,
      hostResident,
      residents
    });
    const householdAccess = resolvePlayerHouseholdAccess(residenceHost);

    if (householdAccess.canEnterHome) {
      return true;
    }
  }

  return false;
}

export function isResidenceVisitRequestAllowed({
  worldTemplate = {},
  locationId = '',
  visitorId = '',
  ownResidenceLocationId = '',
  hostResident = null,
  residents = []
} = {}) {
  const normalizedLocationId = normalizeId(locationId);
  if (!normalizedLocationId || !isPrivateResidenceLocation(worldTemplate, normalizedLocationId)) {
    return false;
  }

  const normalizedVisitorId = normalizeId(visitorId);
  const playerVisitorId = resolvePlayerVisitorId(worldTemplate);
  if (!normalizedVisitorId || normalizedVisitorId !== playerVisitorId) {
    return false;
  }

  const normalizedOwnResidenceLocationId = normalizeId(ownResidenceLocationId)
    || resolvePlayerResidenceLocationId(worldTemplate);

  if (isResidenceAccessAllowed({
    worldTemplate,
    locationId: normalizedLocationId,
    visitorId: normalizedVisitorId,
    ownResidenceLocationId: normalizedOwnResidenceLocationId,
    hostResident,
    residents
  })) {
    return false;
  }

  const residenceHost = resolveResidenceHostResident({
    locationId: normalizedLocationId,
    hostResident,
    residents
  });
  if (!residenceHost) {
    return false;
  }

  const householdAccess = resolvePlayerHouseholdAccess(residenceHost);
  if (!householdAccess.hasRuleOverride) {
    return true;
  }

  return householdAccess.canRequestVisit;
}

export function grantResidenceVisitorAccess(worldTemplate = {}, locationId = '', visitorId = '') {
  const normalizedLocationId = normalizeId(locationId);
  const normalizedVisitorId = normalizeId(visitorId);
  const parsed = parseResidenceLocationId(normalizedLocationId);

  if (!parsed.zoneId || !parsed.unitId || !normalizedVisitorId) {
    return worldTemplate;
  }

  let changed = false;
  const residentialZones = (worldTemplate?.residentialZones || []).map((zone) => {
    if (normalizeId(zone?.id) !== parsed.zoneId) {
      return zone;
    }

    const units = (zone.units || []).map((unit) => {
      if (normalizeId(unit?.id) !== parsed.unitId) {
        return unit;
      }

      const allowedVisitorIds = Array.isArray(unit?.allowedVisitorIds)
        ? unit.allowedVisitorIds.map((item) => normalizeId(item)).filter(Boolean)
        : [];
      if (allowedVisitorIds.includes(normalizedVisitorId)) {
        return unit;
      }

      changed = true;
      return {
        ...unit,
        allowedVisitorIds: [...allowedVisitorIds, normalizedVisitorId]
      };
    });

    return changed
      ? {
        ...zone,
        units
      }
      : zone;
  });

  return changed
    ? {
      ...worldTemplate,
      residentialZones
    }
    : worldTemplate;
}

export function resolveLocationAccessState({
  worldTemplate = {},
  locationId = '',
  locationName = '',
  hostResident = null,
  residents = []
} = {}) {
  const normalizedLocationId = normalizeId(locationId);
  const normalizedLocationName = normalizeId(locationName);
  const runtimeLocation = (worldTemplate?.locations || []).find((item) => (
    normalizeId(item?.id) === normalizedLocationId
      || normalizeId(item?.name) === normalizedLocationName
  )) || null;
  let resolvedLocationId = normalizeId(runtimeLocation?.id) || normalizedLocationId;
  let resolvedLocationName = normalizeId(runtimeLocation?.name) || normalizedLocationName;

  if (!resolvedLocationId && normalizedLocationName) {
    (worldTemplate?.residentialZones || []).some((zone) => (
      (zone.units || []).some((unit) => {
        const fallbackName = normalizeId(`${zone?.name || zone?.id} ${unit?.label || unit?.id}`);
        if (fallbackName !== normalizedLocationName) {
          return false;
        }

        resolvedLocationId = buildResidenceLocationId(zone?.id, unit?.id);
        resolvedLocationName = fallbackName;
        return true;
      })
    ));
  }

  const isPrivateResidence = isPrivateResidenceLocation(worldTemplate, resolvedLocationId);
  const playerVisitorId = resolvePlayerVisitorId(worldTemplate);
  const ownResidenceLocationId = resolvePlayerResidenceLocationId(worldTemplate);

  return {
    locationId: resolvedLocationId,
    locationName: resolvedLocationName,
    isPrivateResidence,
    canPlayerEnter: isResidenceAccessAllowed({
      worldTemplate,
      locationId: resolvedLocationId,
      visitorId: playerVisitorId,
      ownResidenceLocationId,
      hostResident,
      residents
    }),
    canPlayerRequestVisit: isResidenceVisitRequestAllowed({
      worldTemplate,
      locationId: resolvedLocationId,
      visitorId: playerVisitorId,
      ownResidenceLocationId,
      hostResident,
      residents
    })
  };
}
