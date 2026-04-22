import { defineStore } from 'pinia';
import { characterService } from '@/services/characterService.js';
import { normalizeLegacyCharacter } from '@/services/legacyCharacterMigration.js';
import {
  buildLegacyRelationshipMirrors,
  mergePlayerRelationshipState
} from '@/utils/town/player-relationship.js';

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function mergeNestedObjects(base = {}, patch = {}) {
  const source = isPlainObject(base) ? base : {};
  const incoming = isPlainObject(patch) ? patch : {};
  const merged = { ...source };

  Object.entries(incoming).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(source[key])) {
      merged[key] = mergeNestedObjects(source[key], value);
      return;
    }

    merged[key] = value;
  });

  return merged;
}

function buildRelationshipPatchFromLegacyData(data = {}) {
  const patch = {};
  const settingsPatch = isPlainObject(data.settings) ? data.settings : {};

  if (data.relation !== undefined) {
    patch.summaryText = data.relation;
  } else if (settingsPatch.userRelation !== undefined) {
    patch.summaryText = settingsPatch.userRelation;
  }

  if (settingsPatch.affinity !== undefined) {
    patch.affinity = settingsPatch.affinity;
  }

  if (settingsPatch.relationshipArchetype !== undefined) {
    patch.archetype = settingsPatch.relationshipArchetype;
  }

  return patch;
}

export const useCharacterStore = defineStore('character', {
  state: () => ({
    contactList: [],
    currentCharacterId: null
  }),

  getters: {
    currentCharacter: (state) => {
      return state.contactList.find((item) => String(item.id) === String(state.currentCharacterId)) || null;
    }
  },

  actions: {
    async initContacts() {
      await characterService.migrateLegacyCharactersIfNeeded();
      const stored = await characterService.getAllCharacters();
      this.contactList = Array.isArray(stored) ? stored.map((char) => normalizeLegacyCharacter(char)) : [];
    },

    setCurrentId(id) {
      this.currentCharacterId = id;
    },

    async loadCharacterById(id) {
      const targetId = String(id);
      const existing = this.contactList.find((item) => String(item.id) === targetId);

      if (existing) {
        this.currentCharacterId = id;
        return existing;
      }

      const loaded = await characterService.getCharacterById(id);
      if (!loaded) return null;

      this.upsertCharacter(loaded);
      this.currentCharacterId = id;
      return loaded;
    },

    saveCharacterData(data) {
      const char = this.currentCharacter;
      if (!char) return;
      const nextSettings = data.settings
        ? mergeNestedObjects(char.settings || {}, data.settings)
        : (char.settings || {});
      const nextPlayerRelationship = mergePlayerRelationshipState(
        mergePlayerRelationshipState(
          char.playerRelationship || {},
          buildRelationshipPatchFromLegacyData(data)
        ),
        data.playerRelationship || {}
      );
      const relationshipMirrors = buildLegacyRelationshipMirrors(nextPlayerRelationship);

      const nextChar = normalizeLegacyCharacter({
        ...char,
        ...data,
        relation: relationshipMirrors.relation,
        settings: {
          ...nextSettings,
          ...relationshipMirrors.settingsPatch
        },
        playerRelationship: relationshipMirrors.playerRelationship
      });

      Object.assign(char, nextChar);
      characterService.saveCharacter(nextChar);
    },

    savePlayerRelationshipPatch(patch = {}) {
      this.saveCharacterData({
        playerRelationship: patch
      });
    },

    async addNewCharacter(newChar) {
      const normalized = normalizeLegacyCharacter(newChar);
      this.contactList.unshift(normalized);
      await characterService.saveCharacter(normalized);
    },

    upsertCharacter(char) {
      const normalized = normalizeLegacyCharacter(char);
      const index = this.contactList.findIndex((item) => String(item.id) === String(normalized.id));
      if (index === -1) {
        this.contactList.unshift(normalized);
        return;
      }

      this.contactList.splice(index, 1, normalized);
    },

    replaceCharacters(list = []) {
      this.contactList = Array.isArray(list) ? list.map((item) => normalizeLegacyCharacter(item)) : [];
    },

    removeCharacter(id) {
      this.contactList = this.contactList.filter((item) => String(item.id) !== String(id));
      characterService.deleteCharacter(id);
    }
  }
});
