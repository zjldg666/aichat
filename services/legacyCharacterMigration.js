import { STORAGE_KEYS } from '@/utils/storage-keys.js';
import { normalizePlayerRelationshipState } from '@/utils/town/player-relationship.js';
import {
  createResidentAutonomyRuntime,
  resolveResidentBehaviorMode
} from '@/utils/town/town-resident-autonomy.js';

function createBaseContainers() {
  return {
    厨房: {
      冰箱: [],
      橱柜: []
    },
    卫生间: {
      浴室柜: []
    },
    卧室: {
      床头柜: []
    }
  };
}

export function normalizeLegacyCharacter(char = {}) {
  const { behaviorMode: legacyBehaviorMode, ...restChar } = char || {};
  const playerRelationship = normalizePlayerRelationshipState(char);
  const existingSettings = char.settings || {};
  const legacyEconomy = (char.economy && typeof char.economy === 'object') ? char.economy : {};
  const townProfile = char.townProfile && typeof char.townProfile === 'object' ? char.townProfile : {};
  const townRuntime = char.townRuntime && typeof char.townRuntime === 'object' ? char.townRuntime : {};
  const normalizedWallet = Number(legacyEconomy.wallet ?? legacyEconomy.userWallet ?? 1000);
  const wallet = Number.isFinite(normalizedWallet) ? normalizedWallet : 1000;
  const courierBox = Array.isArray(legacyEconomy.courierBox) ? [...legacyEconomy.courierBox] : [];
  const containers = legacyEconomy.containers
    && typeof legacyEconomy.containers === 'object'
    && !Array.isArray(legacyEconomy.containers)
    ? legacyEconomy.containers
    : createBaseContainers();

  return {
    ...restChar,
    relation: playerRelationship.summaryText,
    settings: {
      ...existingSettings,
      affinity: playerRelationship.affinity,
      userRelation: playerRelationship.summaryText,
      relationshipArchetype: playerRelationship.archetype
    },
    playerRelationship,
    townProfile: {
      ...townProfile,
      behaviorMode: resolveResidentBehaviorMode({
        ...restChar,
        behaviorMode: legacyBehaviorMode,
        townProfile
      })
    },
    townRuntime: {
      ...townRuntime,
      autonomy: createResidentAutonomyRuntime(townRuntime.autonomy)
    },
    economy: {
      ...legacyEconomy,
      wallet,
      courierBox,
      containers
    }
  };
}

function getStorage(storage = (typeof uni !== 'undefined' ? uni : null)) {
  return storage && typeof storage.getStorageSync === 'function' ? storage : null;
}

export function readLegacyContactList(storage = (typeof uni !== 'undefined' ? uni : null)) {
  const target = getStorage(storage);
  if (!target) return [];

  const stored = target.getStorageSync(STORAGE_KEYS.LEGACY_CONTACT_LIST);
  return Array.isArray(stored) ? stored.map((item) => normalizeLegacyCharacter(item)) : [];
}

export function writeLegacyContactList(list = [], storage = (typeof uni !== 'undefined' ? uni : null)) {
  const target = getStorage(storage);
  if (!target || typeof target.setStorageSync !== 'function') return;

  const normalized = Array.isArray(list) ? list.map((item) => normalizeLegacyCharacter(item)) : [];
  target.setStorageSync(STORAGE_KEYS.LEGACY_CONTACT_LIST, normalized);
}
