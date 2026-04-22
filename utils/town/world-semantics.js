function normalizeLabel(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 0 || value === 1) {
    return Boolean(value);
  }

  return fallback;
}

export const DEFAULT_WORLD_SEMANTICS = {
  vocabulary: {
    resident: '居民',
    publicLocation: '场景',
    residentialZone: '住宅区',
    residence: '住处',
    room: '门牌号',
    role: '职业',
    relationship: '关系'
  },
  remoteChat: {
    enabled: true,
    key: 'phone',
    label: '手机',
    entryLabel: '手机聊天',
    threadPrefix: 'phone'
  },
  privateSpace: {
    enabled: true,
    label: '住处',
    zoneLabel: '住宅区',
    roomLabel: '门牌号',
    visitActionLabel: '拜访',
    enterActionLabel: '进入'
  },
  scheduleAnchors: {
    rest: 'home',
    duty: 'work',
    free: 'location'
  }
};

function resolveWorldSemanticsSource(input = {}) {
  if (input && typeof input === 'object' && input.worldSemantics && typeof input.worldSemantics === 'object') {
    return input.worldSemantics;
  }

  return input && typeof input === 'object' ? input : {};
}

export function normalizeWorldSemantics(input = {}) {
  const source = resolveWorldSemanticsSource(input);
  const vocabulary = source.vocabulary && typeof source.vocabulary === 'object' ? source.vocabulary : {};
  const remoteChat = source.remoteChat && typeof source.remoteChat === 'object' ? source.remoteChat : {};
  const privateSpace = source.privateSpace && typeof source.privateSpace === 'object' ? source.privateSpace : {};
  const scheduleAnchors = source.scheduleAnchors && typeof source.scheduleAnchors === 'object'
    ? source.scheduleAnchors
    : {};

  return {
    vocabulary: {
      resident: normalizeLabel(vocabulary.resident, DEFAULT_WORLD_SEMANTICS.vocabulary.resident),
      publicLocation: normalizeLabel(vocabulary.publicLocation, DEFAULT_WORLD_SEMANTICS.vocabulary.publicLocation),
      residentialZone: normalizeLabel(vocabulary.residentialZone, DEFAULT_WORLD_SEMANTICS.vocabulary.residentialZone),
      residence: normalizeLabel(vocabulary.residence, DEFAULT_WORLD_SEMANTICS.vocabulary.residence),
      room: normalizeLabel(vocabulary.room, DEFAULT_WORLD_SEMANTICS.vocabulary.room),
      role: normalizeLabel(vocabulary.role, DEFAULT_WORLD_SEMANTICS.vocabulary.role),
      relationship: normalizeLabel(vocabulary.relationship, DEFAULT_WORLD_SEMANTICS.vocabulary.relationship)
    },
    remoteChat: {
      enabled: normalizeBoolean(remoteChat.enabled, DEFAULT_WORLD_SEMANTICS.remoteChat.enabled),
      key: normalizeLabel(remoteChat.key, DEFAULT_WORLD_SEMANTICS.remoteChat.key),
      label: normalizeLabel(remoteChat.label, DEFAULT_WORLD_SEMANTICS.remoteChat.label),
      entryLabel: normalizeLabel(remoteChat.entryLabel, DEFAULT_WORLD_SEMANTICS.remoteChat.entryLabel),
      threadPrefix: normalizeLabel(remoteChat.threadPrefix, DEFAULT_WORLD_SEMANTICS.remoteChat.threadPrefix)
    },
    privateSpace: {
      enabled: normalizeBoolean(privateSpace.enabled, DEFAULT_WORLD_SEMANTICS.privateSpace.enabled),
      label: normalizeLabel(privateSpace.label, DEFAULT_WORLD_SEMANTICS.privateSpace.label),
      zoneLabel: normalizeLabel(privateSpace.zoneLabel, DEFAULT_WORLD_SEMANTICS.privateSpace.zoneLabel),
      roomLabel: normalizeLabel(privateSpace.roomLabel, DEFAULT_WORLD_SEMANTICS.privateSpace.roomLabel),
      visitActionLabel: normalizeLabel(
        privateSpace.visitActionLabel,
        DEFAULT_WORLD_SEMANTICS.privateSpace.visitActionLabel
      ),
      enterActionLabel: normalizeLabel(
        privateSpace.enterActionLabel,
        DEFAULT_WORLD_SEMANTICS.privateSpace.enterActionLabel
      )
    },
    scheduleAnchors: {
      rest: normalizeLabel(scheduleAnchors.rest, DEFAULT_WORLD_SEMANTICS.scheduleAnchors.rest),
      duty: normalizeLabel(scheduleAnchors.duty, DEFAULT_WORLD_SEMANTICS.scheduleAnchors.duty),
      free: normalizeLabel(scheduleAnchors.free, DEFAULT_WORLD_SEMANTICS.scheduleAnchors.free)
    }
  };
}

export function buildWorldSemanticsView(input = {}) {
  const semantics = normalizeWorldSemantics(input);
  const residenceLabel = normalizeLabel(
    semantics.privateSpace.label,
    semantics.vocabulary.residence || DEFAULT_WORLD_SEMANTICS.privateSpace.label
  );
  const residentialZoneLabel = normalizeLabel(
    semantics.privateSpace.zoneLabel,
    semantics.vocabulary.residentialZone || DEFAULT_WORLD_SEMANTICS.privateSpace.zoneLabel
  );
  const roomLabel = normalizeLabel(
    semantics.privateSpace.roomLabel,
    semantics.vocabulary.room || DEFAULT_WORLD_SEMANTICS.privateSpace.roomLabel
  );

  return {
    remoteChatEnabled: semantics.remoteChat.enabled !== false,
    remoteChatKey: semantics.remoteChat.key,
    remoteChatLabel: semantics.remoteChat.label,
    remoteChatEntryLabel: semantics.remoteChat.entryLabel,
    remoteChatThreadPrefix: semantics.remoteChat.threadPrefix,
    residentLabel: semantics.vocabulary.resident,
    publicLocationLabel: semantics.vocabulary.publicLocation,
    residentialZoneLabel,
    residenceLabel,
    roomLabel,
    roleLabel: semantics.vocabulary.role,
    relationshipLabel: semantics.vocabulary.relationship,
    visitActionLabel: semantics.privateSpace.visitActionLabel,
    enterActionLabel: semantics.privateSpace.enterActionLabel
  };
}
