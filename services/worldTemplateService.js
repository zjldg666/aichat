import { STORAGE_KEYS } from '@/utils/storage-keys.js';
import {
  buildDefaultWorldTemplate,
  buildWorldLegacyMirror,
  normalizeWorldTemplate
} from '@/utils/town/town-schema.js';

const fallbackStorage = {
  getStorageSync() {
    return undefined;
  },
  setStorageSync() {}
};

function mapLegacyLocationToPublicLocation(location, index = 0) {
  if (typeof location === 'string') {
    const id = String(location).trim();
    return {
      id,
      name: id,
      category: 'public',
      openHours: ['00:00-24:00']
    };
  }

  const id = String(location?.id || location?.name || `legacy-public-location-${index + 1}`).trim();
  const name = String(location?.name || id).trim();
  return {
    id,
    name,
    category: String(location?.category || location?.type || 'public').trim(),
    openHours: Array.isArray(location?.openHours) && location.openHours.length > 0
      ? [...location.openHours]
      : ['00:00-24:00']
  };
}

function mapLegacyToWorld(item = {}, index = 0) {
  const occupations = Array.isArray(item.occupations) ? item.occupations : [];
  const legacyLocations = Array.isArray(item.locations) ? item.locations : [];
  const defaultPlayer = buildDefaultWorldTemplate().playerIdentityTemplates[0] || {};
  const legacyPlayerInfo = item.playerInfo && typeof item.playerInfo === 'object' ? item.playerInfo : {};

  return {
    id: item.id || `legacy-world-${index + 1}`,
    name: item.name || `\u65e7\u4e16\u754c ${index + 1}`,
    publicLocations: legacyLocations.map((location, locationIndex) => (
      mapLegacyLocationToPublicLocation(location, locationIndex)
    )),
    residentialZones: [],
    locations: legacyLocations,
    playerIdentityTemplates: [
      {
        ...defaultPlayer,
        name: legacyPlayerInfo.name || defaultPlayer.name,
        address: legacyPlayerInfo.address || defaultPlayer.address,
        identity: legacyPlayerInfo.identity || defaultPlayer.identity,
        age: legacyPlayerInfo.age || '',
        gender: legacyPlayerInfo.gender || '',
        appearance: legacyPlayerInfo.appearance || ''
      }
    ],
    professions: occupations.map((name, occupationIndex) => ({
      id: `legacy-profession-${occupationIndex + 1}`,
      name,
      workLocationId: '',
      workStartHour: 9,
      workEndHour: 18
    }))
  };
}

export function createWorldTemplateService(storage = (typeof uni !== 'undefined' ? uni : fallbackStorage)) {
  function getWorldTemplates() {
    const stored = storage.getStorageSync(STORAGE_KEYS.WORLD_TEMPLATES);
    if (Array.isArray(stored)) {
      return stored.map((item) => normalizeWorldTemplate(item));
    }

    const legacy = storage.getStorageSync(STORAGE_KEYS.LEGACY_WORLD_SETTINGS);
    if (Array.isArray(legacy)) {
      return legacy.map((item, index) => normalizeWorldTemplate(mapLegacyToWorld(item, index)));
    }

    return [];
  }

  function getWorldTemplateById(worldId) {
    return getWorldTemplates().find((item) => String(item.id) === String(worldId)) || null;
  }

  function saveWorldTemplates(worlds = []) {
    const normalized = worlds.map((item) => normalizeWorldTemplate(item));

    storage.setStorageSync(STORAGE_KEYS.WORLD_TEMPLATES, normalized);
    storage.setStorageSync(
      STORAGE_KEYS.LEGACY_WORLD_SETTINGS,
      normalized.map((item) => buildWorldLegacyMirror(item))
    );

    return normalized;
  }

  function ensureDefaultWorldTemplate() {
    const worlds = getWorldTemplates();
    if (worlds.length > 0) {
      return saveWorldTemplates(worlds);
    }

    return saveWorldTemplates([buildDefaultWorldTemplate()]);
  }

  return {
    getWorldTemplates,
    getWorldTemplateById,
    saveWorldTemplates,
    ensureDefaultWorldTemplate
  };
}

export const worldTemplateService = createWorldTemplateService();
