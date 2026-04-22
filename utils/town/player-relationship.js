const DEFAULT_FLAGS = {
  romanceTrackActive: false,
  householdTrackActive: false,
  familyTrackActive: false,
  workTrackActive: false
};

const DEFAULT_PERMISSIONS = {
  canRequestVisit: false,
  canEnterHome: false,
  canBorrowPersonalItems: false,
  canStayOver: false,
  canCohabit: false
};

const ARCHETYPE_RULES = [
  { archetype: 'family', pattern: /(姐姐|妹妹|哥哥|弟弟|父[亲亲]|母[亲亲]|爸爸|妈妈)/ },
  { archetype: 'neighbor', pattern: /(邻居|对门|街坊|隔壁)/ },
  { archetype: 'classmate_or_coworker', pattern: /(同学|同事|上司|下属|伙伴)/ },
  { archetype: 'service', pattern: /(服务生|店员|快递|家政|司机)/ },
  { archetype: 'friend_like', pattern: /(朋友|好友|闺蜜|哥们|挚友|老铁)/ }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toFiniteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function createDefaultPlayerRelationship(overrides = {}) {
  const {
    flags: overrideFlags = {},
    permissions: overridePermissions = {},
    ...restOverrides
  } = overrides;

  const base = {
    archetype: 'auto',
    affinity: 50,
    familiarity: 50,
    trust: 50,
    respect: 50,
    tension: 0,
    summaryText: '初相识',
    ...restOverrides
  };

  return {
    ...base,
    flags: {
      ...DEFAULT_FLAGS,
      ...overrideFlags
    },
    permissions: {
      ...DEFAULT_PERMISSIONS,
      ...overridePermissions
    },
    affinity: clamp(toFiniteNumber(base.affinity ?? 50, 50), 0, 100),
    familiarity: clamp(toFiniteNumber(base.familiarity ?? 50, 50), 0, 100),
    trust: clamp(toFiniteNumber(base.trust ?? 50, 50), 0, 100),
    respect: clamp(toFiniteNumber(base.respect ?? 50, 50), 0, 100),
    tension: clamp(toFiniteNumber(base.tension ?? 0, 0), 0, 100),
    summaryText: String(base.summaryText || '初相识').trim() || '初相识'
  };
}

export function mergePlayerRelationshipState(base = {}, patch = {}) {
  const current = createDefaultPlayerRelationship(base);
  const incoming = patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {};

  return createDefaultPlayerRelationship({
    ...current,
    ...incoming,
    flags: {
      ...(current.flags || {}),
      ...(incoming.flags || {})
    },
    permissions: {
      ...(current.permissions || {}),
      ...(incoming.permissions || {})
    }
  });
}

export function buildLegacyRelationshipMirrors(relationship = {}) {
  const normalized = createDefaultPlayerRelationship(relationship);

  return {
    relation: normalized.summaryText,
    settingsPatch: {
      userRelation: normalized.summaryText,
      affinity: normalized.affinity,
      relationshipArchetype: normalized.archetype
    },
    playerRelationship: normalized
  };
}

export function inferRelationshipArchetype({
  userRelation = '',
  occupation = ''
} = {}) {
  const source = `${userRelation || ''} ${occupation || ''}`.trim();
  const matched = ARCHETYPE_RULES.find((item) => item.pattern.test(source));
  return matched ? matched.archetype : 'auto';
}

export function normalizePlayerRelationshipState(char = {}) {
  const settings = char.settings || {};
  const existing = char.playerRelationship || {};
  const summaryText = existing.summaryText || char.relation || settings.userRelation || '初相识';
  const inferenceSource = settings.userRelation || summaryText;
  const archetype = existing.archetype
    || settings.relationshipArchetype
    || inferRelationshipArchetype({
      userRelation: inferenceSource,
      occupation: settings.occupation || char.occupation
    });

  const base = createDefaultPlayerRelationship({
    ...existing,
    archetype,
    affinity: existing.affinity ?? settings.affinity ?? 50,
    summaryText
  });

  base.flags.familyTrackActive = base.flags.familyTrackActive || archetype === 'family';
  base.flags.workTrackActive = base.flags.workTrackActive
    || ['classmate_or_coworker', 'service'].includes(archetype);

  return base;
}
