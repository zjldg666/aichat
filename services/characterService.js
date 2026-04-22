import { DB } from '@/utils/db.js';
import {
  normalizeLegacyCharacter,
  readLegacyContactList,
  writeLegacyContactList
} from '@/services/legacyCharacterMigration.js';

function hydrateCharacterRow(row = {}) {
  let charData = {};

  try {
    charData = row.data ? JSON.parse(row.data) : {};
  } catch (error) {
    charData = {};
  }

  return normalizeLegacyCharacter({
    id: row.id,
    name: row.name,
    worldId: row.worldId,
    ...charData
  });
}

async function saveCharacterRecord(char = {}) {
  try {
    const normalized = normalizeLegacyCharacter(char);
    const { id, name, worldId, ...restData } = normalized;
    const dataStr = JSON.stringify(restData);

    await DB.execute(
      `INSERT OR REPLACE INTO characters (id, name, worldId, data) VALUES (?, ?, ?, ?)`,
      [String(id), name || '', String(worldId || ''), dataStr]
    );

    await syncLegacyContactMirror();
    return true;
  } catch (error) {
    console.error('保存角色失败', error);
    return false;
  }
}

async function syncLegacyContactMirror() {
  if (typeof uni === 'undefined') return;

  try {
    const result = await DB.select(`SELECT * FROM characters`);
    const normalized = Array.isArray(result) ? result.map((row) => hydrateCharacterRow(row)) : [];
    writeLegacyContactList(normalized);
  } catch (error) {
    console.error('同步旧角色缓存失败', error);
  }
}

export const characterService = {
  async migrateLegacyCharactersIfNeeded() {
    try {
      const rows = await DB.select(`SELECT id FROM characters LIMIT 1`);
      if (Array.isArray(rows) && rows.length > 0) return false;
    } catch (error) {
      console.error('检查角色迁移状态失败', error);
      return false;
    }

    const legacyList = readLegacyContactList();
    if (legacyList.length === 0) return false;

    for (const char of legacyList) {
      const success = await saveCharacterRecord(char);
      if (!success) return false;
    }

    return true;
  },

  async getAllCharacters() {
    try {
      const result = await DB.select(`SELECT * FROM characters`);
      if (!Array.isArray(result) || result.length === 0) return [];
      return result.map((row) => hydrateCharacterRow(row));
    } catch (error) {
      console.error('获取角色列表失败', error);
      return [];
    }
  },

  async getCharacterById(id) {
    if (id === undefined || id === null || id === '') return null;

    try {
      const result = await DB.select(`SELECT * FROM characters WHERE id = ?`, [String(id)]);
      if (Array.isArray(result) && result.length > 0) {
        return hydrateCharacterRow(result[0]);
      }
    } catch (error) {
      console.error('按 ID 读取角色失败', error);
    }

    const legacyChar = readLegacyContactList().find((item) => String(item.id) === String(id));
    if (!legacyChar) return null;

    const normalized = normalizeLegacyCharacter(legacyChar);
    const success = await saveCharacterRecord(normalized);
    return success ? normalized : null;
  },

  async getCharactersByWorldId(worldId) {
    if (!worldId) return [];

    try {
      const result = await DB.select(`SELECT * FROM characters WHERE worldId = ?`, [String(worldId)]);
      if (!Array.isArray(result) || result.length === 0) return [];
      return result.map((row) => hydrateCharacterRow(row));
    } catch (error) {
      console.error('按世界读取角色失败', error);
      return [];
    }
  },

  async saveCharacter(char) {
    return saveCharacterRecord(char);
  },

  async saveCharactersBatch(list = []) {
    if (!Array.isArray(list) || list.length === 0) return true;

    for (const item of list) {
      const success = await saveCharacterRecord(item);
      if (!success) return false;
    }

    return true;
  },

  async deleteCharacter(id) {
    try {
      await DB.execute(`DELETE FROM characters WHERE id = ?`, [String(id)]);
      await syncLegacyContactMirror();
      return true;
    } catch (error) {
      console.error('删除角色失败', error);
      return false;
    }
  }
};
