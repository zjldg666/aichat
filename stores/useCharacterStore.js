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
        // ✨ 核心修改：数据结构升级与向下兼容 ✨
        // 遍历所有角色/空间，如果没有财产和容器系统，就给他们补上默认值
        let needSave = false;
        this.contactList = stored.map(char => {
          if (!char.economy) {
            needSave = true;
            char.economy = {
              wallet: 1000, // 💰 玩家初始资金：1000元
              courierBox: [], // 📦 客厅的快递纸箱（用来临时存放买来的东西）
              containers: {
                // 🏠 房间绑定的固定容器
                '厨房': {
                  '冰箱': [],     // 存放食材、饮料
                  '橱柜': []      // 存放厨具、调料
                },
                '卫生间': {
                  '浴室柜': []    // 存放洗浴用品
                },
                '卧室': {
                  '床头柜': []    // 存放私密物品、礼物
                }
              }
            };
          }
          return char;
        });

        // 如果发现旧存档被升级了，顺手保存覆盖一下本地缓存
        if (needSave) {
          uni.setStorageSync('contact_list', this.contactList);
        }
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

      // 把传进来的新数据（如衣服、位置、好感度、经济数据等）合并到当前角色身上
      Object.assign(char, data);

      // 统一保存回缓存
      uni.setStorageSync('contact_list', this.contactList);
    }
  }
});