import {
  buildLegacyRelationshipMirrors,
  mergePlayerRelationshipState
} from '@/utils/town/player-relationship.js';

const FAMILIARITY_PATTERN = /(?:\u719f\u6089|\u719f\u4eba|\u670b\u53cb|\u90bb\u5c45|\u73a9\u4f34|\u53d1\u5c0f)/;
const TRUST_PATTERN = /(?:\u4fe1\u4efb|\u4f9d\u8d56|\u4f9d\u9760|\u9760\u5f97\u4f4f)/;
const RESPECT_PATTERN = /(?:\u5c0a\u91cd|\u656c\u4f69|\u6b23\u8d4f|\u8ba4\u53ef)/;
const HOSTILE_PATTERN = /(?:\u654c\u610f|\u51b7\u6218|\u538c\u6076|\u7d27\u5f20|\u5bf9\u7acb|\u9632\u5907|\u6392\u65a5)/;
const ROMANCE_PATTERN = /(?:\u66a7\u6627|\u559c\u6b22|\u5fc3\u52a8|\u604b\u7231|\u604b\u4eba|\u4f34\u4fa3)/;
const SCENE_VISIT_REQUEST_THRESHOLD = {
  familiarity: 60,
  trust: 58,
  maxTension: 35
};
const SCENE_HOME_ENTRY_THRESHOLD = {
  familiarity: 74,
  trust: 72,
  affinity: 64,
  maxTension: 20
};

function clampScore(value) {
  return Math.max(0, Math.min(100, value));
}

function shouldUnlockVisitRequestFromScene(relationship = {}) {
  return (Number(relationship.familiarity) || 0) >= SCENE_VISIT_REQUEST_THRESHOLD.familiarity
    && (Number(relationship.trust) || 0) >= SCENE_VISIT_REQUEST_THRESHOLD.trust
    && (Number(relationship.tension) || 0) <= SCENE_VISIT_REQUEST_THRESHOLD.maxTension;
}

function shouldUnlockHomeEntryFromScene(relationship = {}) {
  return (Number(relationship.familiarity) || 0) >= SCENE_HOME_ENTRY_THRESHOLD.familiarity
    && (Number(relationship.trust) || 0) >= SCENE_HOME_ENTRY_THRESHOLD.trust
    && (Number(relationship.affinity) || 0) >= SCENE_HOME_ENTRY_THRESHOLD.affinity
    && (Number(relationship.tension) || 0) <= SCENE_HOME_ENTRY_THRESHOLD.maxTension;
}

export function buildPlayerRelationshipPatchFromAgent(currentRelationship = {}, {
  newRelation = '',
  newLabel = ''
} = {}) {
  const next = mergePlayerRelationshipState(currentRelationship);
  const relationText = String(newRelation || '').trim();
  const labelText = String(newLabel || '').trim();
  const signalText = `${labelText} ${relationText}`.trim();

  if (relationText) {
    next.summaryText = relationText;
  }

  if (!signalText) {
    return next;
  }

  if (FAMILIARITY_PATTERN.test(signalText)) {
    next.familiarity = clampScore(next.familiarity + 6);
    next.affinity = clampScore(next.affinity + 2);
  }

  if (TRUST_PATTERN.test(signalText)) {
    next.trust = clampScore(next.trust + 6);
    next.affinity = clampScore(next.affinity + 2);
  }

  if (RESPECT_PATTERN.test(signalText)) {
    next.respect = clampScore(next.respect + 6);
  }

  if (HOSTILE_PATTERN.test(signalText)) {
    next.tension = clampScore(next.tension + 8);
    next.affinity = clampScore(next.affinity - 5);
  }

  if (ROMANCE_PATTERN.test(signalText)) {
    next.flags.romanceTrackActive = true;
    next.affinity = clampScore(next.affinity + 4);
    next.trust = clampScore(next.trust + 2);
  }

  return next;
}

export function settleResidentSceneRelationshipEffect(resident = {}, effect = {}) {
  const currentRelationship = mergePlayerRelationshipState(resident.playerRelationship, {});
  const relationshipAfterDelta = mergePlayerRelationshipState(currentRelationship, {
    trust: (Number(currentRelationship.trust) || 0) + (Number(effect?.trustDelta) || 0),
    familiarity: (Number(currentRelationship.familiarity) || 0) + (Number(effect?.familiarityDelta) || 0),
    affinity: (Number(currentRelationship.affinity) || 0) + (Number(effect?.affinityDelta) || 0),
    tension: (Number(currentRelationship.tension) || 0) + (Number(effect?.tensionDelta) || 0)
  });
  const unlockedPermissions = [];
  const permissionPatch = {};
  const shouldOpenHouseholdTrack = Boolean(
    currentRelationship.flags?.householdTrackActive
    || currentRelationship.permissions?.canRequestVisit
    || currentRelationship.permissions?.canEnterHome
  );

  if (!currentRelationship.permissions?.canRequestVisit && shouldUnlockVisitRequestFromScene(relationshipAfterDelta)) {
    unlockedPermissions.push('canRequestVisit');
    permissionPatch.canRequestVisit = true;
  }

  if (!currentRelationship.permissions?.canEnterHome && shouldUnlockHomeEntryFromScene(relationshipAfterDelta)) {
    if (!currentRelationship.permissions?.canRequestVisit && !unlockedPermissions.includes('canRequestVisit')) {
      unlockedPermissions.push('canRequestVisit');
      permissionPatch.canRequestVisit = true;
    }
    unlockedPermissions.push('canEnterHome');
    permissionPatch.canEnterHome = true;
  }

  const nextRelationship = mergePlayerRelationshipState(relationshipAfterDelta, {
    flags: {
      householdTrackActive: shouldOpenHouseholdTrack || unlockedPermissions.length > 0
    },
    permissions: permissionPatch
  });
  const relationshipMirrors = buildLegacyRelationshipMirrors(nextRelationship);

  return {
    residentPatch: {
      relation: relationshipMirrors.relation,
      settings: {
        ...(resident.settings || {}),
        ...relationshipMirrors.settingsPatch
      },
      playerRelationship: relationshipMirrors.playerRelationship
    },
    unlockedPermissions
  };
}
