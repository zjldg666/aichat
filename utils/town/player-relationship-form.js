import {
  buildLegacyRelationshipMirrors,
  mergePlayerRelationshipState,
  normalizePlayerRelationshipState
} from '@/utils/town/player-relationship.js';

export function createRelationshipFormDraft(character = null) {
  if (!character) {
    return {
      userRelation: '',
      affinity: 50,
      relationshipArchetype: 'auto'
    };
  }

  const relationship = normalizePlayerRelationshipState(character);

  return {
    userRelation: relationship.summaryText || '',
    affinity: relationship.affinity,
    relationshipArchetype: relationship.archetype || 'auto'
  };
}

export function buildRelationshipFieldsFromForm(formData = {}, currentCharacter = null) {
  const existingRelationship = currentCharacter
    ? normalizePlayerRelationshipState(currentCharacter)
    : {};
  const nextRelationship = mergePlayerRelationshipState(existingRelationship, {
    archetype: formData.relationshipArchetype ?? existingRelationship.archetype ?? 'auto',
    affinity: formData.affinity ?? existingRelationship.affinity ?? 50,
    summaryText: String(formData.userRelation || '').trim() || existingRelationship.summaryText
  });

  return buildLegacyRelationshipMirrors(nextRelationship);
}
