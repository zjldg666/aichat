// AiChat/composables/useCharacterState.js
// 专门负责与 Store 交互，提供角色各项属性的双向绑定 (读/写)
import { computed } from 'vue';

export function useCharacterState(context) {
    const { charStore } = context;

    const currentAction = computed({
        get: () => charStore.currentCharacter?.currentAction || '站立/闲逛',
        set: (v) => charStore.saveCharacterData({ currentAction: v })
    });
    
    const currentAffection = computed({
        get: () => charStore.currentCharacter?.affection || 0,
        set: (v) => charStore.saveCharacterData({ affection: v })
    });
    
    const currentLust = computed({
        get: () => charStore.currentCharacter?.lust || 0,
        set: (v) => charStore.saveCharacterData({ lust: v })
    });
    
    const currentLocation = computed({
        get: () => charStore.currentCharacter?.currentLocation || charStore.currentCharacter?.location || '角色家',
        set: (v) => charStore.saveCharacterData({ currentLocation: v })
    });
    
    const interactionMode = computed({
        get: () => charStore.currentCharacter?.interactionMode || 'phone',
        set: (v) => charStore.saveCharacterData({ interactionMode: v })
    });
    
    const currentClothing = computed({
        get: () => charStore.currentCharacter?.clothing || '便服',
        set: (v) => charStore.saveCharacterData({ clothing: v })
    });
    
    const currentActivity = computed({
        get: () => charStore.currentCharacter?.lastActivity || '自由活动',
        set: (v) => charStore.saveCharacterData({ lastActivity: v })
    });
    
    const currentRelation = computed({
        get: () => charStore.currentCharacter?.relation || '初相识',
        set: (v) => charStore.saveCharacterData({ relation: v })
    });
    
    const playerLocation = computed({
        get: () => charStore.currentCharacter?.playerLocation || '玩家家',
        set: (v) => charStore.saveCharacterData({ playerLocation: v })
    });
    
    const currentSummary = computed({
        get: () => charStore.currentCharacter?.summary || '',
        set: (v) => charStore.saveCharacterData({ summary: v })
    });

    return {
        currentAction, currentAffection, currentLust, currentLocation,
        interactionMode, currentClothing, currentActivity, currentRelation,
        playerLocation, currentSummary
    };
}