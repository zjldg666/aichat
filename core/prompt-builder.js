import { CORE_INSTRUCTION_LOGIC_MODE } from '@/utils/prompts.js';
import { createWorldTemplateService } from '@/services/worldTemplateService.js';
import { normalizePlayerRelationshipState } from '@/utils/town/player-relationship.js';

const FALLBACK_STORAGE = {
  getStorageSync() {
    return undefined;
  }
};

function getStorage() {
  if (typeof uni !== 'undefined' && uni && typeof uni.getStorageSync === 'function') {
    return uni;
  }

  return FALLBACK_STORAGE;
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function padHour(value, fallback) {
  const parsed = Number(value);
  const hour = Number.isFinite(parsed) ? parsed : fallback;
  return `${String(hour).padStart(2, '0')}:00`;
}

function parseResidenceLocationId(locationId = '') {
  const match = String(locationId || '').trim().match(/^residence:([^:]+):(.+)$/);
  return {
    zoneId: match?.[1] || '',
    unitId: match?.[2] || ''
  };
}

function findWorldLocationMeta(worldTemplate = {}, locationId = '', locationName = '') {
  const normalizedLocationId = String(locationId || '').trim();
  const locations = [
    ...(Array.isArray(worldTemplate.locations) ? worldTemplate.locations : []),
    ...(Array.isArray(worldTemplate.publicLocations) ? worldTemplate.publicLocations : [])
  ];
  const runtimeLocation = locations.find((item) => item.id === normalizedLocationId)
    || locations.find((item) => item.name === locationName)
    || null;
  const parsedResidence = parseResidenceLocationId(normalizedLocationId || runtimeLocation?.id || '');

  if (parsedResidence.zoneId && parsedResidence.unitId) {
    const zone = (worldTemplate.residentialZones || []).find((item) => item.id === parsedResidence.zoneId);
    const unit = (zone?.units || []).find((item) => item.id === parsedResidence.unitId);

    if (zone && unit) {
      return {
        id: normalizedLocationId || runtimeLocation?.id || '',
        name: runtimeLocation?.name || `${zone.name || zone.id} ${unit.label || unit.id}`,
        access: unit.accessPolicy || runtimeLocation?.access || 'consent_required'
      };
    }
  }

  return {
    id: runtimeLocation?.id || normalizedLocationId || '',
    name: runtimeLocation?.name || locationName || '',
    access: runtimeLocation?.access || 'public'
  };
}

function buildUserProfile({
  settings = {},
  userName = '',
  appUser = {},
  worldPlayer = {},
  relationText = ''
}) {
  const finalUserName = worldPlayer.name || settings.userNameOverride || userName || appUser.name || 'User';
  const age = worldPlayer.age || settings.userAge || appUser.age;
  const gender = worldPlayer.gender || settings.userGender;
  const identity = worldPlayer.identity || settings.userOccupation;
  const appearance = worldPlayer.appearance || settings.userAppearance || appUser.appearance;
  const home = worldPlayer.address || settings.userLocation;

  let profile = `[User Profile]\nName: ${finalUserName}`;
  if (age) profile += `\nAge: ${age}`;
  if (gender) profile += `\nGender: ${gender}`;
  if (identity) profile += `\nIdentity/Occupation: ${identity}`;
  if (relationText) profile += `\nRelation to Char: ${relationText}`;
  if (settings.userPersona) profile += `\nPersonality: ${settings.userPersona}`;
  if (appearance) profile += `\nAppearance: ${appearance}`;
  if (home) profile += `\nHome: ${home}`;

  return profile;
}

function buildCharacterBio(settings = {}) {
  const segments = [];

  if (settings.age) segments.push(`[Age: ${settings.age}]`);
  if (settings.personality) segments.push(`[Personality: ${settings.personality}]`);
  if (settings.flaws) segments.push(`[Flaws: ${settings.flaws}]`);
  if (settings.secret) segments.push(`[Secret: ${settings.secret}]`);
  if (settings.conflictMode) segments.push(`[Conflict Mode: ${settings.conflictMode}]`);

  segments.push(`[Bio]: ${settings.bio || 'No bio provided.'}`);
  return segments.join('\n');
}

function buildDiaryIndexText(storage, role = {}) {
  const diaryKey = `diary_logs_${role.id || 'default'}`;
  const logs = storage.getStorageSync(diaryKey) || [];
  const limit = role.diaryHistoryLimit !== undefined ? role.diaryHistoryLimit : 5;

  if (limit <= 0 || !Array.isArray(logs) || logs.length === 0) {
    return '';
  }

  return `\n\n【往事大纲 (仅供连续性参考，除非用户提起细节，否则不要主动复述)】\n${
    logs.slice(0, limit).map((log) => `- [${log.dateStr}]: ${log.brief}`).join('\n')
  }`;
}

function formatActiveTracks(flags = {}) {
  const trackLabels = [
    ['householdTrackActive', 'household'],
    ['familyTrackActive', 'family'],
    ['workTrackActive', 'work'],
    ['romanceTrackActive', 'romance']
  ];

  const active = trackLabels
    .filter(([key]) => Boolean(flags[key]))
    .map(([, label]) => label);

  return active.join(', ') || 'none';
}

function buildRelationshipState(role = {}, relation = '') {
  const settings = role.settings || {};
  const structuredRelationship = normalizePlayerRelationshipState(role);
  const defaultRelationText = '初始状态：尚未产生互动，请严格基于[背景故事(Bio)]判定与玩家的初始关系。';
  const looseRelation = String(relation || '').trim();
  const hasLooseRelation = looseRelation && looseRelation !== defaultRelationText && looseRelation.length > 2;
  const fallbackRelation = hasLooseRelation
    ? looseRelation
    : String(settings.userRelation || '').trim() || '初相识，还没有具体印象';
  const structuredSummary = String(structuredRelationship.summaryText || '').trim();
  const resolvedSummary = structuredSummary || fallbackRelation;
  const activeTracks = formatActiveTracks(structuredRelationship.flags);
  const anchor = [
    '',
    '',
    '【RELATIONSHIP STATUS (HARD FACT)】',
    `RELATIONSHIP ARCHETYPE: ${structuredRelationship.archetype}`,
    `CURRENT SUMMARY: ${structuredSummary || resolvedSummary}`,
    `CURRENT TEXT STATUS (fallback): ${resolvedSummary}`,
    `CURRENT AFFINITY: ${structuredRelationship.affinity} / 100`,
    `FAMILIARITY: ${structuredRelationship.familiarity}`,
    `TRUST: ${structuredRelationship.trust}`,
    `RESPECT: ${structuredRelationship.respect}`,
    `TENSION: ${structuredRelationship.tension}`,
    `ACTIVE TRACKS: ${activeTracks}`
  ].join('\n');

  return {
    structuredRelationship,
    resolvedSummary,
    anchor
  };
}

export function buildSystemPrompt({
  role,
  userName,
  summary,
  formattedTime,
  location,
  mode,
  activity,
  clothes,
  relation
}) {
  const safeRole = isPlainObject(role) ? role : {};
  const settings = safeRole.settings || {};
  const storage = getStorage();
  const appUser = storage.getStorageSync('app_user_info') || {};
  const worldService = createWorldTemplateService(storage);
  const worldTemplate = safeRole.worldId ? worldService.getWorldTemplateById(safeRole.worldId) : null;
  const worldPlayer = worldTemplate?.playerIdentityTemplates?.[0] || {};
  const locationMeta = findWorldLocationMeta(
    worldTemplate || {},
    safeRole.townRuntime?.currentLocationId || '',
    safeRole.townRuntime?.currentLocationName || location || ''
  );
  const { resolvedSummary, anchor } = buildRelationshipState(safeRole, relation);
  const profileRelation = resolvedSummary || settings.userRelation || '';
  const myProfile = buildUserProfile({
    settings,
    userName,
    appUser,
    worldPlayer,
    relationText: profileRelation
  });
  const workStart = padHour(settings.workStartHour, 9);
  const workEnd = padHour(settings.workEndHour, 17);
  const charName = safeRole.name || 'AI';
  const charBio = buildCharacterBio(settings);
  const coreLogic = settings.personalityCore
    || settings.personalityNormal
    || '以背景故事与性格为准，像真人一样自然互动；保持一致的动机、底线与说话风格。';
  const dynamicBias = settings.personalityDynamic || '';
  const diaryIndexText = buildDiaryIndexText(storage, safeRole);
  const memoryBlock = summary ? `\n\n【长期记忆摘要 (Long-term Memory)】\n${summary}` : '';
  const dynamicLogic = `${coreLogic}\n\n【关系动态行为偏置 (Relation-based Bias)】\n${
    dynamicBias || '（无额外偏置）'
  }${diaryIndexText}${memoryBlock}${anchor}\n\n【当前心理状态与对玩家印象 (Current Psychology)】\n${
    resolvedSummary
  }`;

  let prompt = CORE_INSTRUCTION_LOGIC_MODE
    .replace(/{{work_start}}/g, workStart)
    .replace(/{{work_end}}/g, workEnd)
    .replace(/{{char}}/g, charName)
    .replace(/{{bio}}/g, charBio)
    .replace(/{{evolution_level}}/g, settings.evolutionLevel || 1)
    .replace(/{{logic}}/g, dynamicLogic)
    .replace(/{{core_logic}}/g, coreLogic)
    .replace(/{{dynamic_logic}}/g, dynamicBias || '（关系基线：无额外偏置）')
    .replace(/{{likes}}/g, settings.likes || 'Unknown')
    .replace(/{{dislikes}}/g, settings.dislikes || 'Unknown')
    .replace(/{{speaking_style}}/g, settings.speakingStyle || 'Normal')
    .replace(/{{current_time}}/g, formattedTime || '')
    .replace(/{{current_location}}/g, location || '')
    .replace(/{{interaction_mode}}/g, mode || '')
    .replace(/{{current_activity}}/g, activity || '')
    .replace(/{{current_clothes}}/g, clothes || '')
    .replace(/{{user_profile}}/g, myProfile);

  if (locationMeta.access === 'consent_required') {
    prompt += '\n[Private Residence Rule]\nCurrent scene is a private residence. Treat entry as permission-based, not public access.';
  }

  return prompt;
}
