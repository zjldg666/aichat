import { DEFAULT_WORLD_TEMPLATE } from '@/utils/town/default-world-template.js';
import {
  buildResidenceLabel,
  buildResidenceLocationId
} from '@/utils/town/town-location-access.js';
import { normalizeWorldSemantics } from '@/utils/town/world-semantics.js';
import { normalizeWorldConversationVisibility } from '@/utils/town/world-conversation-visibility.js';

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeOpenHours(openHours) {
  return Array.isArray(openHours) && openHours.length > 0 ? deepClone(openHours) : ['00:00-24:00'];
}

function normalizeLegacyLocation(location, index = 0) {
  if (typeof location === 'string') {
    const id = String(location).trim();
    return {
      id,
      name: id,
      type: 'public',
      openHours: ['00:00-24:00']
    };
  }

  const id = String(location?.id || location?.name || `legacy-location-${index + 1}`).trim();
  const name = String(location?.name || id).trim();

  return {
    id,
    name,
    type: String(location?.type || 'public').trim(),
    openHours: normalizeOpenHours(location?.openHours),
    description: location?.description || ''
  };
}

function mapLegacyTypeToCategory(type = '') {
  const normalized = String(type || '').trim();
  if (!normalized || normalized === 'public') {
    return 'public';
  }

  if (normalized === 'residence') {
    return 'public';
  }

  return normalized;
}

function normalizePublicLocations(publicLocations = []) {
  const normalizedMap = new Map();

  (publicLocations || []).forEach((location, index) => {
    const base = typeof location === 'string'
      ? { id: location, name: location, category: 'public', openHours: ['00:00-24:00'] }
      : {
        ...deepClone(location),
        category: location?.category || mapLegacyTypeToCategory(location?.type)
      };

    const id = String(base?.id || base?.name || `public-location-${index + 1}`).trim();
    if (!id) {
      return;
    }

    const normalizedLocation = {
      ...base,
      id,
      name: String(base?.name || id).trim(),
      category: String(base?.category || 'public').trim(),
      openHours: normalizeOpenHours(base?.openHours)
    };

    if (normalizedMap.has(id)) {
      normalizedMap.delete(id);
    }
    normalizedMap.set(id, normalizedLocation);
  });

  return Array.from(normalizedMap.values());
}

function normalizeResidentialZones(residentialZones = []) {
  const seenZones = new Set();
  const normalized = [];

  (residentialZones || []).forEach((zone, zoneIndex) => {
    const id = String(zone?.id || zone?.name || `residential-zone-${zoneIndex + 1}`).trim();
    if (!id || seenZones.has(id)) {
      return;
    }
    seenZones.add(id);

    const seenUnits = new Set();
    const units = (zone?.units || []).map((unit, unitIndex) => {
      const unitId = String(unit?.id || unit?.label || `unit-${unitIndex + 1}`).trim();
      if (!unitId || seenUnits.has(unitId)) {
        return null;
      }
      seenUnits.add(unitId);

      return {
        ...deepClone(unit),
        id: unitId,
        label: String(unit?.label || unitId).trim(),
        accessPolicy: String(unit?.accessPolicy || 'consent_required').trim(),
        residentIds: Array.isArray(unit?.residentIds) ? deepClone(unit.residentIds) : [],
        allowedVisitorIds: Array.isArray(unit?.allowedVisitorIds) ? deepClone(unit.allowedVisitorIds) : []
      };
    }).filter(Boolean);

    normalized.push({
      ...deepClone(zone),
      id,
      name: String(zone?.name || id).trim(),
      description: zone?.description || '',
      units
    });
  });

  return normalized;
}

function splitLegacyLocations(locations = []) {
  const normalizedLegacyLocations = (locations || []).map((item, index) => normalizeLegacyLocation(item, index));
  const publicLocations = [];
  const residentialZones = [];

  normalizedLegacyLocations.forEach((location) => {
    if (location.type === 'residence') {
      residentialZones.push({
        id: location.id,
        name: location.name,
        description: location.description || '',
        units: [
          {
            id: 'unit-1',
            label: 'Unit 1',
            accessPolicy: 'consent_required',
            residentIds: [],
            allowedVisitorIds: []
          }
        ]
      });
      return;
    }

    publicLocations.push({
      id: location.id,
      name: location.name,
      category: mapLegacyTypeToCategory(location.type),
      openHours: normalizeOpenHours(location.openHours),
      description: location.description || ''
    });
  });

  return {
    legacyLocations: normalizedLegacyLocations,
    publicLocations,
    residentialZones
  };
}

function normalizeResidence(residence = {}, fallbackLocationId = '') {
  let zoneId = String(residence?.zoneId || '').trim();
  let unitId = String(residence?.unitId || '').trim();

  if ((!zoneId || !unitId) && typeof fallbackLocationId === 'string') {
    const match = fallbackLocationId.trim().match(/^residence:([^:]+):(.+)$/);
    if (match) {
      zoneId = zoneId || match[1];
      unitId = unitId || match[2];
    }
  }

  return {
    zoneId,
    unitId
  };
}

function hasResidenceUnit(residentialZones = [], residence = {}) {
  if (!residence?.zoneId || !residence?.unitId) {
    return false;
  }

  const zone = (residentialZones || []).find((item) => item.id === residence.zoneId);
  return Boolean((zone?.units || []).find((item) => item.id === residence.unitId));
}

function pushRuntimeLocation(locations, seenIds, item) {
  if (!item || !item.id || seenIds.has(item.id)) {
    return;
  }

  seenIds.add(item.id);
  locations.push(item);
}

function buildRuntimeLocations({ publicLocations = [], residentialZones = [], legacyLocations = [] } = {}) {
  const runtime = [];
  const seenIds = new Set();
  const publicById = new Map((publicLocations || []).map((item) => [item.id, item]));
  const zoneById = new Map((residentialZones || []).map((item) => [item.id, item]));

  (legacyLocations || []).forEach((legacyLocation) => {
    if (legacyLocation.type === 'residence') {
      const zone = zoneById.get(legacyLocation.id);
      if (!zone) {
        return;
      }

      pushRuntimeLocation(runtime, seenIds, {
        id: zone.id,
        name: zone.name,
        type: 'residence',
        openHours: normalizeOpenHours(legacyLocation.openHours)
      });
      return;
    }

    const location = publicById.get(legacyLocation.id);
    if (!location) {
      return;
    }

    pushRuntimeLocation(runtime, seenIds, {
      id: location.id,
      name: location.name,
      type: location.category || 'public',
      openHours: normalizeOpenHours(location.openHours)
    });
  });

  (residentialZones || []).forEach((zone) => {
    pushRuntimeLocation(runtime, seenIds, {
      id: zone.id,
      name: zone.name,
      type: 'residence',
      openHours: ['00:00-24:00']
    });
  });

  (publicLocations || []).forEach((location) => {
    pushRuntimeLocation(runtime, seenIds, {
      id: location.id,
      name: location.name,
      type: location.category || 'public',
      openHours: normalizeOpenHours(location.openHours)
    });
  });

  (residentialZones || []).forEach((zone) => {
    (zone.units || []).forEach((unit) => {
      pushRuntimeLocation(runtime, seenIds, {
        id: buildResidenceLocationId(zone.id, unit.id),
        name: `${zone.name} ${unit.label}`,
        type: 'residence',
        openHours: ['00:00-24:00']
      });
    });
  });

  return runtime;
}

export function buildDefaultWorldTemplate() {
  return deepClone(DEFAULT_WORLD_TEMPLATE);
}

export function normalizeWorldTemplate(world = {}) {
  const base = buildDefaultWorldTemplate();
  const source = world && typeof world === 'object' ? deepClone(world) : {};
  const hasStructuredLocationInput = Array.isArray(source.publicLocations) || Array.isArray(source.residentialZones);
  const legacyLocationsInput = hasStructuredLocationInput
    ? (Array.isArray(source.locations) ? source.locations : [])
    : (source.locations ?? base.locations);
  const legacyLocations = splitLegacyLocations(legacyLocationsInput);
  const normalizedPublicLocations = normalizePublicLocations(
    Array.isArray(source.publicLocations) ? source.publicLocations : legacyLocations.publicLocations
  );
  const normalizedResidentialZones = normalizeResidentialZones(
    Array.isArray(source.residentialZones) ? source.residentialZones : legacyLocations.residentialZones
  );
  const runtimeLocations = buildRuntimeLocations({
    publicLocations: normalizedPublicLocations,
    residentialZones: normalizedResidentialZones,
    legacyLocations: legacyLocations.legacyLocations
  });
  const locationIds = new Set(runtimeLocations.map((item) => item.id));
  const worldShape = {
    publicLocations: normalizedPublicLocations,
    residentialZones: normalizedResidentialZones
  };
  const normalizedPlayerTemplates = deepClone(source.playerIdentityTemplates ?? base.playerIdentityTemplates).map(
    (template) => {
      let residence = normalizeResidence(template?.residence);
      if (!hasResidenceUnit(normalizedResidentialZones, residence)) {
        residence = { zoneId: '', unitId: '' };
      }

      return {
        ...template,
        residence,
        age: template?.age ?? '',
        gender: template?.gender ?? '',
        appearance: template?.appearance ?? '',
        address: buildResidenceLabel(worldShape, residence) || template?.address || ''
      };
    }
  );
  const normalizedProfessions = deepClone(source.professions ?? base.professions).map((profession) => ({
    ...profession,
    workLocationId: locationIds.has(profession?.workLocationId) ? profession.workLocationId : ''
  }));
  const normalizedStarterResidents = deepClone(source.starterResidents ?? base.starterResidents).map((resident) => {
    const townProfile = {
      ...(resident?.townProfile || {})
    };
    let residence = normalizeResidence(townProfile.residence, townProfile.homeLocationId);
    if (!hasResidenceUnit(normalizedResidentialZones, residence)) {
      residence = { zoneId: '', unitId: '' };
    }

    const residenceLocationId = buildResidenceLocationId(residence.zoneId, residence.unitId);
    const homeLocationId = locationIds.has(townProfile.homeLocationId)
      ? townProfile.homeLocationId
      : (locationIds.has(residenceLocationId) ? residenceLocationId : '');

    return {
      ...resident,
      townProfile: {
        ...townProfile,
        residence,
        homeLocationId
      }
    };
  });

  return {
    ...base,
    ...source,
    worldSemantics: normalizeWorldSemantics(source.worldSemantics ?? base.worldSemantics),
    worldConversationVisibility: normalizeWorldConversationVisibility(
      source.worldConversationVisibility ?? base.worldConversationVisibility
    ),
    publicLocations: normalizedPublicLocations,
    residentialZones: normalizedResidentialZones,
    playerIdentityTemplates: normalizedPlayerTemplates,
    locations: runtimeLocations,
    professions: normalizedProfessions,
    scheduleTemplates: deepClone(source.scheduleTemplates ?? base.scheduleTemplates),
    starterResidents: normalizedStarterResidents
  };
}

export function buildWorldLegacyMirror(world = {}) {
  const normalized = normalizeWorldTemplate(world);
  const firstIdentity = normalized.playerIdentityTemplates[0] || {};
  const mirroredLocationNames = [
    ...(normalized.publicLocations || []).map((item) => item.name),
    ...(normalized.residentialZones || []).map((item) => item.name)
  ];
  const legacyLocationNames = Array.from(new Set(
    (mirroredLocationNames.length > 0 ? mirroredLocationNames : normalized.locations.map((item) => item.name))
      .filter(Boolean)
  ));

  return {
    id: normalized.id,
    name: normalized.name,
    locations: legacyLocationNames,
    occupations: normalized.professions.map((item) => item.name),
    playerInfo: {
      name: firstIdentity.name || '\u73a9\u5bb6',
      address: firstIdentity.address || '\u672a\u8bbe\u5b9a',
      identity: firstIdentity.identity || '\u666e\u901a\u5c45\u6c11',
      age: firstIdentity.age || '',
      gender: firstIdentity.gender || '',
      appearance: firstIdentity.appearance || ''
    }
  };
}
