function normalizeLabel(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function normalizeVisibilityMode(value, fallback = 'summary') {
  const normalized = normalizeLabel(value).toLowerCase();
  return normalized === 'full' || normalized === 'summary' ? normalized : fallback;
}

function normalizeScopeMode(value, fallback = 'all') {
  const normalized = normalizeLabel(value).toLowerCase();
  return normalized === 'known_only' || normalized === 'all' ? normalized : fallback;
}

export const DEFAULT_WORLD_CONVERSATION_VISIBILITY = {
  sceneConversationVisibility: 'summary',
  remoteConversationVisibility: 'summary',
  scopeMode: 'all'
};

function resolveWorldConversationVisibilitySource(input = {}) {
  if (
    input
    && typeof input === 'object'
    && input.worldConversationVisibility
    && typeof input.worldConversationVisibility === 'object'
  ) {
    return input.worldConversationVisibility;
  }

  return input && typeof input === 'object' ? input : {};
}

export function normalizeWorldConversationVisibility(input = {}) {
  const source = resolveWorldConversationVisibilitySource(input);

  return {
    sceneConversationVisibility: normalizeVisibilityMode(
      source.sceneConversationVisibility,
      DEFAULT_WORLD_CONVERSATION_VISIBILITY.sceneConversationVisibility
    ),
    remoteConversationVisibility: normalizeVisibilityMode(
      source.remoteConversationVisibility,
      DEFAULT_WORLD_CONVERSATION_VISIBILITY.remoteConversationVisibility
    ),
    scopeMode: normalizeScopeMode(
      source.scopeMode,
      DEFAULT_WORLD_CONVERSATION_VISIBILITY.scopeMode
    )
  };
}
