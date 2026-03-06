import { defineStore } from 'pinia';

export const useCharacterStore = defineStore('character', {
  state: () => ({
    contactList: [], 
    currentCharacterId: null, // 当前聊天的对象 ID
  }),

  getters: {
    // 自动找到当前正在聊天的角色详细信息
    currentCharacter: (state) => {
      return state.contactList.find(c => String(c.id) === String(state.currentCharacterId)) || null;
    }
  },

  actions: {
    initContacts() {
      const stored = uni.getStorageSync('contact_list');
      if (stored) {
        this.contactList = stored;
      }
    },

    // 告诉管家现在正在和谁聊天
    setCurrentId(id) {
        this.currentCharacterId = id;
    },

    // 一键保存/更新当前角色的任何数据，自动存入缓存
    saveCharacterData(data) {
      const char = this.currentCharacter;
      if (!char) return;

      // 把传进来的新数据（如衣服、位置、好感度等）合并到当前角色身上
      Object.assign(char, data);

      // 统一保存回缓存
      uni.setStorageSync('contact_list', this.contactList);
    }
  }
});