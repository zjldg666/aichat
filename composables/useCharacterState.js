import { computed } from 'vue';

export function useCharacterState(context) {
  const { charStore } = context;

  const currentAction = computed({
    get: () => charStore.currentCharacter?.currentAction || 'standing',
    set: (v) => charStore.saveCharacterData({ currentAction: v })
  });

  const currentLocation = computed({
    get: () => charStore.currentCharacter?.currentLocation || charStore.currentCharacter?.location || 'character home',
    set: (v) => charStore.saveCharacterData({ currentLocation: v })
  });

  const interactionMode = computed({
    get: () => charStore.currentCharacter?.interactionMode || 'face',
    set: (v) => charStore.saveCharacterData({ interactionMode: v })
  });

  const currentClothing = computed({
    get: () => charStore.currentCharacter?.clothing || 'casual',
    set: (v) => charStore.saveCharacterData({ clothing: v })
  });

  const currentActivity = computed({
    get: () => charStore.currentCharacter?.lastActivity || 'free activity',
    set: (v) => charStore.saveCharacterData({ lastActivity: v })
  });

  const currentRelation = computed({
    get: () => charStore.currentCharacter?.playerRelationship?.summaryText || charStore.currentCharacter?.relation || 'newly met',
    set: (v) => charStore.savePlayerRelationshipPatch({ summaryText: v })
  });

  const playerLocation = computed({
    get: () => charStore.currentCharacter?.playerLocation || 'player home',
    set: (v) => charStore.saveCharacterData({ playerLocation: v })
  });

  const currentSummary = computed({
    get: () => charStore.currentCharacter?.summary || '',
    set: (v) => charStore.saveCharacterData({ summary: v })
  });

  return {
    currentAction,
    currentLocation,
    interactionMode,
    currentClothing,
    currentActivity,
    currentRelation,
    playerLocation,
    currentSummary
  };
}
