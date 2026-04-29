function resolveResidentLocationName(resident = {}) {
  return resident.townRuntime?.currentLocationName || resident.currentLocation || resident.location || '';
}

function resolveResidentAction(resident = {}) {
  return resident.townRuntime?.currentAction || resident.currentAction || '活动';
}

const FAMILIAR_SOCIAL_SCORE = 2;
const STRONG_TIE_SOCIAL_SCORE = 4;
const SOCIAL_DECAY_INTERVAL_MS = 24 * 60 * 60 * 1000;
const AWKWARD_FRICTION_SCORE = 1;
const STRAINED_FRICTION_SCORE = 3;

function resolveSocialStatus(score = 1) {
  return score >= FAMILIAR_SOCIAL_SCORE ? '已熟悉' : '刚碰面';
}

export function resolveSocialBondProfile(score = 1) {
  const normalizedScore = Math.max(1, Number(score) || 1);

  if (normalizedScore >= STRONG_TIE_SOCIAL_SCORE) {
    return {
      status: '已熟悉',
      bondStage: 'close',
      bondLabel: '关系亲近',
      isStrongTie: true
    };
  }

  if (normalizedScore >= FAMILIAR_SOCIAL_SCORE) {
    return {
      status: '已熟悉',
      bondStage: 'familiar',
      bondLabel: '已熟悉',
      isStrongTie: false
    };
  }

  return {
    status: '刚碰面',
    bondStage: 'new',
    bondLabel: '刚碰面',
    isStrongTie: false
  };
}

export function resolveSocialConflictProfile(frictionScore = 0) {
  const normalizedFrictionScore = Math.max(0, Number(frictionScore) || 0);

  if (normalizedFrictionScore >= STRAINED_FRICTION_SCORE) {
    return {
      frictionScore: normalizedFrictionScore,
      conflictStage: 'strained',
      conflictLabel: '关系紧张',
      isAvoidingTie: true
    };
  }

  if (normalizedFrictionScore >= AWKWARD_FRICTION_SCORE) {
    return {
      frictionScore: normalizedFrictionScore,
      conflictStage: 'awkward',
      conflictLabel: '有点别扭',
      isAvoidingTie: false
    };
  }

  return {
    frictionScore: 0,
    conflictStage: 'calm',
    conflictLabel: '关系平稳',
    isAvoidingTie: false
  };
}

function withResolvedSocialBond(link = {}, score = 1) {
  const normalizedScore = Math.max(1, Number(score) || 1);
  const normalizedFrictionScore = Math.max(0, Number(link?.frictionScore) || 0);

  return {
    ...link,
    score: normalizedScore,
    ...resolveSocialBondProfile(normalizedScore),
    ...resolveSocialConflictProfile(normalizedFrictionScore)
  };
}

export function isSocialLinkFamiliar(link = {}) {
  if (!link || typeof link !== 'object') {
    return false;
  }

  if (link.isStrongTie === true) {
    return true;
  }

  const explicitBondStage = String(link.bondStage || '').trim();
  if (explicitBondStage) {
    return explicitBondStage === 'familiar' || explicitBondStage === 'close';
  }

  const numericScore = Number(link.score);
  if (Number.isFinite(numericScore)) {
    return numericScore >= FAMILIAR_SOCIAL_SCORE;
  }

  return String(link.status || '').trim() === '已熟悉';
}

export function isSocialLinkStrongTie(link = {}) {
  if (!link || typeof link !== 'object') {
    return false;
  }

  if (link.isStrongTie === true) {
    return true;
  }

  const explicitBondStage = String(link.bondStage || '').trim();
  if (explicitBondStage) {
    return explicitBondStage === 'close';
  }

  const numericScore = Number(link.score);
  if (Number.isFinite(numericScore)) {
    return numericScore >= STRONG_TIE_SOCIAL_SCORE;
  }

  return false;
}

export function isSocialLinkAvoiding(link = {}) {
  if (!link || typeof link !== 'object') {
    return false;
  }

  if (link.isAvoidingTie === true) {
    return true;
  }

  const explicitConflictStage = String(link.conflictStage || '').trim();
  if (explicitConflictStage) {
    return explicitConflictStage === 'strained';
  }

  const numericFrictionScore = Number(link.frictionScore);
  if (Number.isFinite(numericFrictionScore)) {
    return numericFrictionScore >= STRAINED_FRICTION_SCORE;
  }

  return false;
}

export function isSocialLinkGuarded(link = {}) {
  if (!link || typeof link !== 'object') {
    return false;
  }

  if (link.isAvoidingTie === true) {
    return true;
  }

  const explicitConflictStage = String(link.conflictStage || '').trim();
  if (explicitConflictStage) {
    return explicitConflictStage === 'awkward' || explicitConflictStage === 'strained';
  }

  const numericFrictionScore = Number(link.frictionScore);
  if (Number.isFinite(numericFrictionScore)) {
    return numericFrictionScore >= AWKWARD_FRICTION_SCORE;
  }

  return false;
}

function normalizeRelationshipMemories(value = []) {
  return (Array.isArray(value) ? value : [])
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      summary: String(item.summary || '').trim(),
      happenedAt: Number(item.happenedAt) || 0,
      warmthDelta: Number(item.warmthDelta) || 0,
      memoryType: String(item.memoryType || '').trim()
    }))
    .filter((item) => item.summary || item.memoryType || item.happenedAt > 0 || item.warmthDelta !== 0);
}

function buildRelationshipMemoryEntry({
  patch = {},
  warmthDelta = 0,
  settledAt = Date.now(),
  existingLink = null,
  conflictDelta = 0
} = {}) {
  const summary = String(patch?.summary || '').trim();
  const explicitMemoryType = String(patch?.memoryType || '').trim();
  const existingFrictionScore = Math.max(0, Number(existingLink?.frictionScore) || 0);
  const memoryType = explicitMemoryType || (
    warmthDelta > 0 && existingFrictionScore > 0
      ? 'conflict_repair'
      : (conflictDelta >= 2 || warmthDelta < 0
        ? 'awkward_autonomous_moment'
        : 'autonomous_followup')
  );
  const happenedAt = Number(patch?.happenedAt) || settledAt;

  if (!summary && !memoryType) {
    return null;
  }

  return {
    summary,
    happenedAt,
    warmthDelta,
    memoryType
  };
}

function resolveConflictDelta(patch = {}, warmthDelta = 0) {
  const explicitConflictDelta = Number(patch?.conflictDelta);
  if (Number.isFinite(explicitConflictDelta)) {
    return explicitConflictDelta;
  }

  const memoryType = String(patch?.memoryType || '').trim();
  if (memoryType === 'strained_conflict') {
    return 2;
  }

  if (warmthDelta < 0) {
    return 1;
  }

  if (warmthDelta > 0) {
    return -1;
  }

  return 0;
}

function resolveDecayAnchor(link = {}, settledAt = Date.now()) {
  const lastSeenAt = Number(link?.lastSeenAt) || 0;
  const lastDecayAt = Number(link?.lastDecayAt) || 0;
  return Math.max(lastSeenAt, lastDecayAt, 0) || settledAt;
}

function decayInactiveSocialLink(link = {}, settledAt = Date.now()) {
  const baseScore = Math.max(1, Number(link?.score) || 1);
  const decayAnchor = resolveDecayAnchor(link, settledAt);
  const elapsedMs = Math.max(0, settledAt - decayAnchor);
  const decaySteps = Math.max(0, Math.floor(elapsedMs / SOCIAL_DECAY_INTERVAL_MS));
  const nextScore = Math.max(1, baseScore - decaySteps);
  const nextLastDecayAt = decaySteps > 0
    ? decayAnchor + (decaySteps * SOCIAL_DECAY_INTERVAL_MS)
    : (Number(link?.lastDecayAt) || decayAnchor);

  return withResolvedSocialBond({
    ...link,
    lastSettledAt: settledAt,
    lastDecayAt: nextLastDecayAt,
    isActive: false
  }, nextScore);
}

function normalizeLinkResidents(link = {}) {
  const residents = Array.isArray(link.residents) ? link.residents : [];
  const residentNames = Array.isArray(link.residentNames) ? link.residentNames : [];

  return residents.map((residentId, index) => ({
    id: String(residentId),
    name: residentNames[index] || ''
  }));
}

export function buildSocialLinks(residents = [], currentTime = Date.now()) {
  const groupedResidents = new Map();

  residents.forEach((resident) => {
    const locationName = resolveResidentLocationName(resident);
    if (!locationName) return;

    const residentGroup = groupedResidents.get(locationName) || [];
    residentGroup.push(resident);
    groupedResidents.set(locationName, residentGroup);
  });

  const links = [];

  groupedResidents.forEach((group, locationName) => {
    for (let index = 0; index < group.length; index += 1) {
      for (let offset = index + 1; offset < group.length; offset += 1) {
        const currentResident = group[index];
        const targetResident = group[offset];
        const residentPair = [
          { id: String(currentResident.id), name: currentResident.name || '' },
          { id: String(targetResident.id), name: targetResident.name || '' }
        ].sort((left, right) => left.id.localeCompare(right.id));

        links.push({
          id: residentPair.map((resident) => resident.id).join('__'),
          residents: residentPair.map((resident) => resident.id),
          residentNames: residentPair.map((resident) => resident.name),
          locationName,
          interactionType: 'co_present',
          lastSeenAt: currentTime,
          summary: `${currentResident.name}和${targetResident.name}此刻都在${locationName}。`
        });
      }
    }
  });

  return links;
}

export function settleSocialLinks(previousLinks = [], currentLinks = [], currentTime = Date.now()) {
  const settledAt = Number.isFinite(currentTime) && currentTime > 0 ? currentTime : Date.now();
  const previousMap = new Map(
    (Array.isArray(previousLinks) ? previousLinks : []).map((link) => [link.id, link])
  );

  const nextLinks = (Array.isArray(currentLinks) ? currentLinks : []).map((link) => {
    const currentResidents = normalizeLinkResidents(link);
    const previousLink = previousMap.get(link.id);
    const nextScore = Math.max(1, Number(previousLink?.score) || 0) + (previousLink ? 1 : 0);
    previousMap.delete(link.id);

    return withResolvedSocialBond({
      ...previousLink,
      ...link,
      id: currentResidents.map((resident) => resident.id).join('__'),
      residents: currentResidents.map((resident) => resident.id),
      residentNames: currentResidents.map((resident) => resident.name),
      firstSeenAt: previousLink?.firstSeenAt || link.lastSeenAt || settledAt,
      lastSeenAt: link.lastSeenAt || settledAt,
      lastSettledAt: settledAt,
      lastDecayAt: link.lastSeenAt || settledAt,
      isActive: true
    }, nextScore);
  });

  previousMap.forEach((link) => {
    nextLinks.push(decayInactiveSocialLink(link, settledAt));
  });

  return nextLinks;
}

export function applyRelationshipPatchesToSocialLinks({
  socialLinks = [],
  relationshipPatches = [],
  residents = [],
  currentTime = Date.now()
} = {}) {
  const settledAt = Number.isFinite(currentTime) && currentTime > 0 ? currentTime : Date.now();
  const nextLinks = Array.isArray(socialLinks) ? socialLinks.map((link) => ({ ...link })) : [];
  const linkMap = new Map(nextLinks.map((link, index) => [String(link?.id || '').trim(), index]));
  const residentNameMap = new Map(
    (Array.isArray(residents) ? residents : [])
      .map((resident) => [String(resident?.id || '').trim(), String(resident?.name || '').trim()])
      .filter(([residentId]) => residentId)
  );

  (Array.isArray(relationshipPatches) ? relationshipPatches : []).forEach((patch) => {
    const residentIds = [...new Set(
      (Array.isArray(patch?.residentIds) ? patch.residentIds : [])
        .map((residentId) => String(residentId || '').trim())
        .filter(Boolean)
    )].sort();

    if (residentIds.length < 2) {
      return;
    }

    const linkId = residentIds.join('__');
    const existingIndex = linkMap.get(linkId);
    const existingLink = existingIndex >= 0 ? nextLinks[existingIndex] : null;
    const residentNames = residentIds.map((residentId, index) => (
      residentNameMap.get(residentId)
      || String(existingLink?.residentNames?.[index] || '').trim()
    ));
    const warmthDelta = Number.isFinite(Number(patch?.warmthDelta))
      ? Number(patch?.warmthDelta)
      : 0;
    const conflictDelta = resolveConflictDelta(patch, warmthDelta);
    const baseScore = Math.max(1, Number(existingLink?.score) || 1);
    const nextScore = Math.max(1, baseScore + warmthDelta);
    const baseFrictionScore = Math.max(0, Number(existingLink?.frictionScore) || 0);
    const nextFrictionScore = Math.max(0, baseFrictionScore + conflictDelta);
    const nextRelationshipMemory = buildRelationshipMemoryEntry({
      patch,
      warmthDelta,
      settledAt,
      existingLink,
      conflictDelta
    });
    const relationshipMemories = [
      ...(nextRelationshipMemory ? [nextRelationshipMemory] : []),
      ...normalizeRelationshipMemories(existingLink?.relationshipMemories)
    ].slice(0, 5);
    const nextLink = withResolvedSocialBond({
      ...(existingLink || {}),
      id: linkId,
      residents: residentIds,
      residentNames,
      interactionType: 'autonomous_conversation',
      summary: String(patch?.summary || existingLink?.summary || '').trim(),
      firstSeenAt: Number(existingLink?.firstSeenAt) || Number(patch?.happenedAt) || settledAt,
      lastSeenAt: Number(patch?.happenedAt) || Number(existingLink?.lastSeenAt) || settledAt,
      lastSettledAt: settledAt,
      isActive: Boolean(existingLink?.isActive),
      lastAutonomousSummary: String(patch?.summary || '').trim(),
      lastWarmthDelta: warmthDelta,
      frictionScore: nextFrictionScore,
      relationshipMemories
    }, nextScore);

    if (existingIndex >= 0) {
      nextLinks.splice(existingIndex, 1, nextLink);
    } else {
      nextLinks.push(nextLink);
      linkMap.set(linkId, nextLinks.length - 1);
    }
  });

  return nextLinks;
}

export function findResidentActiveCompanions(residentId, socialLinks = []) {
  const targetResidentId = String(residentId || '');

  if (!targetResidentId) {
    return [];
  }

  const companionNames = new Set();

  (Array.isArray(socialLinks) ? socialLinks : []).forEach((link) => {
    if (!link?.isActive) return;

    const residentEntries = normalizeLinkResidents(link);

    if (!residentEntries.some((resident) => resident.id === targetResidentId)) {
      return;
    }

    residentEntries.forEach((resident) => {
      if (resident.id !== targetResidentId && resident.name) {
        companionNames.add(resident.name);
      }
    });
  });

  return [...companionNames];
}

export function buildLocationAtmosphere(locationName = '', residents = []) {
  if (!Array.isArray(residents) || residents.length === 0) {
    return `${locationName || '这里'}现在很安静。`;
  }

  if (residents.length === 1) {
    const resident = residents[0];
    return `${resident.name}正在${resolveResidentAction(resident)}，${locationName}里显得很安静。`;
  }

  const names = residents.slice(0, 3).map((resident) => resident.name).join('、');
  return `${locationName}里有${names}，现场气氛明显热闹了起来。`;
}
