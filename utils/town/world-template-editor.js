import {
  buildResidenceKey,
  buildResidenceLabel,
  buildResidenceLocationId,
  collectOccupiedResidenceKeys
} from './town-location-access.js';
import { buildDefaultWorldTemplate, normalizeWorldTemplate } from './town-schema.js';

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeOpenHours(openHours) {
  return Array.isArray(openHours) && openHours.length > 0 ? deepClone(openHours) : ['00:00-24:00'];
}

function mapLocationTypeToCategory(type = '') {
  const normalized = String(type || '').trim();
  if (!normalized || normalized === 'public') {
    return 'public';
  }

  if (normalized === 'residence') {
    return 'public';
  }

  return normalized;
}

function isResidenceUnitMirror(locationId = '') {
  return /^residence:[^:]+:.+$/.test(String(locationId || '').trim());
}

function areLocationOpenHoursEqual(nextOpenHours, prevOpenHours) {
  const nextNormalized = normalizeOpenHours(nextOpenHours);
  const prevNormalized = normalizeOpenHours(prevOpenHours);
  return JSON.stringify(nextNormalized) === JSON.stringify(prevNormalized);
}

function areLegacyMappedLocationsEqual(next = {}, prev = {}) {
  return String(next.name || '') === String(prev.name || '')
    && String(next.category || '') === String(prev.category || '')
    && String(next.description || '') === String(prev.description || '')
    && areLocationOpenHoursEqual(next.openHours, prev.openHours);
}

function areMappedLocationListsEqual(next = [], prev = []) {
  const nextMap = new Map((next || []).map((item) => [String(item.id || '').trim(), item]));
  const prevMap = new Map((prev || []).map((item) => [String(item.id || '').trim(), item]));

  if (nextMap.size !== prevMap.size) {
    return false;
  }

  return Array.from(nextMap.keys()).every((id) => {
    const nextItem = nextMap.get(id);
    const prevItem = prevMap.get(id);
    if (!prevItem) {
      return false;
    }

    return areLegacyMappedLocationsEqual(nextItem, prevItem);
  });
}

function syncLegacyLocationsToStructuredWorld(world) {
  const clone = deepClone(world);
  if (!Array.isArray(clone.locations)) {
    return clone;
  }

  const locationItems = clone.locations
    .filter((item) => item && typeof item === 'object')
    .filter((item) => !isResidenceUnitMirror(item.id));
  const locationPublicItems = locationItems.filter((item) => String(item.type || '').trim() !== 'residence');
  const nextPublicLocations = locationPublicItems.map((item) => ({
    id: String(item.id || item.name || '').trim(),
    name: String(item.name || item.id || '').trim(),
    category: String(item.category || mapLocationTypeToCategory(item.type)).trim(),
    openHours: normalizeOpenHours(item.openHours),
    description: item.description || ''
  })).filter((item) => item.id);

  const existingPublicLocations = Array.isArray(clone.publicLocations) ? clone.publicLocations : [];
  const snapshotPublicLocations = Array.isArray(clone.legacyPublicLocationsSnapshot)
    ? clone.legacyPublicLocationsSnapshot
    : null;
  if (snapshotPublicLocations) {
    const legacyChanged = !areMappedLocationListsEqual(nextPublicLocations, snapshotPublicLocations);
    const structuredChanged = !areMappedLocationListsEqual(existingPublicLocations, snapshotPublicLocations);

    if (legacyChanged && !structuredChanged) {
      clone.publicLocations = nextPublicLocations;
    }

    return clone;
  }

  const existingMap = new Map(existingPublicLocations.map((item) => [String(item.id || '').trim(), item]));
  const nextMap = new Map(nextPublicLocations.map((item) => [item.id, item]));
  const locationsEdited = nextMap.size !== existingMap.size
    || Array.from(nextMap.keys()).some((id) => {
      const next = nextMap.get(id);
      const prev = existingMap.get(id);
      if (!prev) {
        return true;
      }
      return !areLegacyMappedLocationsEqual(next, prev);
    });

  if (locationsEdited) {
    clone.publicLocations = nextPublicLocations;
  }

  return clone;
}

function stripUiFields(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stripUiFields(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const clone = deepClone(value);

  delete clone.isOpen;
  delete clone.tempLoc;
  delete clone.tempJob;
  delete clone.tempName;
  delete clone.tempZone;
  delete clone.tempUnit;
  delete clone.draftId;
  delete clone.editorSections;

  Object.keys(clone).forEach((key) => {
    clone[key] = stripUiFields(clone[key]);
  });

  return clone;
}

function cleanupWorldReferences(world) {
  const synced = syncLegacyLocationsToStructuredWorld(world);
  const normalized = normalizeWorldTemplate(synced);
  const locationIds = new Set((normalized.locations || []).map((item) => item.id));
  const locationNames = new Set((normalized.locations || []).map((item) => item.name));
  const professionIds = new Set((normalized.professions || []).map((item) => item.id));

  normalized.professions = (normalized.professions || []).map((profession) => ({
    ...profession,
    workLocationId: locationIds.has(profession.workLocationId) ? profession.workLocationId : ''
  }));

  normalized.starterResidents = (normalized.starterResidents || []).map((resident) => {
    const townProfile = {
      ...(resident.townProfile || {})
    };
    const residence = {
      zoneId: String(townProfile.residence?.zoneId || '').trim(),
      unitId: String(townProfile.residence?.unitId || '').trim()
    };
    const residenceLocationId = buildResidenceLocationId(residence.zoneId, residence.unitId);
    const residenceExists = Boolean(residenceLocationId && locationIds.has(residenceLocationId));
    const homeLocationId = locationIds.has(townProfile.homeLocationId)
      ? townProfile.homeLocationId
      : (residenceExists ? residenceLocationId : '');

    return {
      ...resident,
      settings: {
        ...(resident.settings || {}),
        workplace: locationNames.has(resident.settings?.workplace) ? resident.settings.workplace : ''
      },
      townProfile: {
        ...townProfile,
        residence: residenceExists ? residence : { zoneId: '', unitId: '' },
        professionId: professionIds.has(townProfile.professionId) ? townProfile.professionId : '',
        homeLocationId
      }
    };
  });

  return normalized;
}

function ensureResidenceUniqueness(world) {
  const occupied = collectOccupiedResidenceKeys({ worldTemplate: world, residents: [] });

  (world.starterResidents || []).forEach((resident) => {
    const key = buildResidenceKey(resident.townProfile?.residence);
    if (!key) {
      return;
    }

    if (occupied.has(key)) {
      const label = buildResidenceLabel(world, resident.townProfile?.residence);
      throw new Error(`住址已被占用${label ? `: ${label}` : ''}`);
    }

    occupied.add(key);
  });
}

export function buildEditableWorldDraft(world = {}) {
  const normalized = normalizeWorldTemplate(
    Object.keys(world || {}).length > 0 ? world : buildDefaultWorldTemplate()
  );

  return {
    ...deepClone(normalized),
    isOpen: false,
    playerIdentityTemplates: normalized.playerIdentityTemplates.map((item) => ({
      ...deepClone(item),
      isOpen: false
    })),
    publicLocations: (normalized.publicLocations || []).map((item) => ({
      ...deepClone(item),
      isOpen: false
    })),
    residentialZones: (normalized.residentialZones || []).map((item) => ({
      ...deepClone(item),
      isOpen: false,
      units: (item.units || []).map((unit) => ({
        ...deepClone(unit),
        isOpen: false
      }))
    })),
    legacyPublicLocationsSnapshot: deepClone(normalized.publicLocations || []),
    locations: normalized.locations
      .filter((item) => !isResidenceUnitMirror(item.id))
      .map((item) => ({
      ...deepClone(item),
      isOpen: false
      })),
    professions: normalized.professions.map((item) => ({
      ...deepClone(item),
      isOpen: false
    })),
    starterResidents: normalized.starterResidents.map((item) => ({
      ...deepClone(item),
      isOpen: false
    }))
  };
}

export function createNewWorldDraft(overrides = {}) {
  const worldId = String(overrides.id || `world-${Date.now()}`);
  const draft = buildEditableWorldDraft({
    ...buildDefaultWorldTemplate(),
    ...overrides,
    id: worldId,
    name: overrides.name || '\u65b0\u4e16\u754c'
  });

  draft.isOpen = true;
  draft.playerIdentityTemplates = (draft.playerIdentityTemplates || []).map((item, index) => ({
    ...item,
    isOpen: index === 0
  }));
  draft.starterResidents = (draft.starterResidents || []).map((resident) => ({
    ...resident,
    worldId
  }));

  return draft;
}

export function buildWorldTemplateFromDraft(draft = {}) {
  const world = normalizeWorldTemplate(cleanupWorldReferences(stripUiFields(draft)));
  delete world.legacyPublicLocationsSnapshot;
  ensureResidenceUniqueness(world);
  return world;
}
