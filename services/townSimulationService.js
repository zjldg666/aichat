import { decideResidentAction } from '@/services/townResidentAgentService.js';
import { resolvePlayerResidenceLocationId } from '@/utils/town/town-location-access.js';
import { buildResidentBehaviorCandidateActions } from '@/utils/town/town-behavior-bias.js';
import {
  createResidentAutonomyRuntime,
  isResidentAgentMode,
  normalizeResidentAutonomyRuntime
} from '@/utils/town/town-resident-autonomy.js';
import { findResidentScheduleBlock } from '@/utils/town/town-schedule.js';

const FRESH_PLAYER_EVENT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_LIGHTWEIGHT_AUTONOMY_DURATION_MS = 10 * 60 * 1000;
const AGENT_TRIGGER_EVENT_TYPES = new Set([
  'player_resident_conversation_followup',
  'player_resident_invitation',
  'player_resident_activity_join',
  'player_relationship_focus',
  'public_scene_chat'
]);
const AGENT_DECISION_ACTION_TYPES = new Set([
  'player_invitation',
  'player_activity_join',
  'player_relationship_focus',
  'public_scene_chat'
]);

function findLocation(worldTemplate = {}, locationId) {
  return (worldTemplate.locations || []).find((item) => item.id === locationId) || null;
}

function buildCandidateActions(block = {}, resident = {}) {
  const scheduledLocationId = block.resolvedLocationId || block.locationId || '';
  const actions = Array.isArray(block.actions) && block.actions.length > 0
    ? block.actions
    : [resident.townRuntime?.currentAction || resident.currentAction || '待在原地'];

  return actions.map((label, index) => ({
    id: `${scheduledLocationId || 'stay'}-${index}`,
    label,
    locationId: scheduledLocationId
  }));
}

function buildResidentSnapshot(
  resident = {},
  {
    locationId,
    locationName,
    action,
    currentTime,
    autonomy = createResidentAutonomyRuntime(),
    targetResidentId = '',
    targetResidentName = '',
    scheduledLocationId = '',
    scheduledLocationName = '',
    companionActionType = '',
    simulationDebug = null
  }
) {
  const normalizedAutonomy = normalizeResidentAutonomyRuntime(autonomy);

  return {
    ...resident,
    currentLocation: locationName || resident.currentLocation || resident.location || '',
    currentAction: action,
    lastActivity: action,
    townRuntime: {
      ...(resident.townRuntime || {}),
      currentLocationId: locationId,
      currentLocationName: locationName || resident.currentLocation || resident.location || '',
      currentAction: action,
      currentTargetResidentId: targetResidentId,
      currentTargetResidentName: targetResidentName,
      currentScheduledLocationId: scheduledLocationId,
      currentScheduledLocationName: scheduledLocationName,
      currentCompanionActionType: companionActionType,
      autonomy: normalizedAutonomy,
      lastSimulatedSlice: currentTime
    },
    ...(simulationDebug && typeof simulationDebug === 'object'
      ? { simulationDebug }
      : {})
  };
}

function buildLightweightAutonomy({
  actionId = '',
  currentTime = 0,
  trigger = ''
} = {}) {
  return createResidentAutonomyRuntime({
    source: 'lightweight',
    actionId: String(actionId || '').trim(),
    lastDecisionAt: Number(currentTime) || 0,
    validUntil: (Number(currentTime) || 0) + DEFAULT_LIGHTWEIGHT_AUTONOMY_DURATION_MS,
    trigger: String(trigger || '').trim()
  });
}

function findFreshAgentTriggerEvent({
  residentId = '',
  scheduledLocationId = '',
  townEvents = [],
  currentTime = Date.now()
} = {}) {
  const safeResidentId = String(residentId || '').trim();
  const safeScheduledLocationId = String(scheduledLocationId || '').trim();

  return (Array.isArray(townEvents) ? townEvents : [])
    .filter((event) => AGENT_TRIGGER_EVENT_TYPES.has(String(event?.type || '').trim()))
    .filter((event) => {
      const happenedAt = Number(event?.happenedAt) || 0;
      return happenedAt > 0 && currentTime - happenedAt <= FRESH_PLAYER_EVENT_WINDOW_MS;
    })
    .find((event) => {
      const residentIds = Array.isArray(event?.residents)
        ? event.residents.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
      const eventLocationId = String(event?.locationId || '').trim();

      return residentIds.includes(safeResidentId)
        || (safeScheduledLocationId && eventLocationId === safeScheduledLocationId);
    }) || null;
}

function resolveResidentAutonomyTrigger({
  resident = {},
  candidateActions = [],
  scheduledCandidateActions = [],
  scheduledLocationId = '',
  playerResidenceLocationId = '',
  townEvents = [],
  currentTime = Date.now()
} = {}) {
  const hasMultipleCandidates = Array.isArray(candidateActions) && candidateActions.length > 1;
  const hasMultipleScheduledCandidates = Array.isArray(scheduledCandidateActions) && scheduledCandidateActions.length > 1;
  const freshEvent = findFreshAgentTriggerEvent({
    residentId: resident?.id,
    scheduledLocationId,
    townEvents,
    currentTime
  });
  const isPlayerResidenceContext = Boolean(
    scheduledLocationId
      && playerResidenceLocationId
      && String(scheduledLocationId).trim() === String(playerResidenceLocationId).trim()
  );
  const hasDecisionWorthyFreshPlayerAction = (Array.isArray(candidateActions) ? candidateActions : []).some((action) => (
    AGENT_DECISION_ACTION_TYPES.has(String(action?.companionActionType || '').trim())
  ));
  const trigger = String(
    (freshEvent ? 'fresh_player_event' : '')
    || (isPlayerResidenceContext && hasMultipleScheduledCandidates ? 'player_home_context' : '')
    || (hasMultipleScheduledCandidates ? 'branching_schedule' : '')
  ).trim();
  const shouldDecide = Boolean(
    hasMultipleCandidates
      && (
        hasMultipleScheduledCandidates
        || (Boolean(freshEvent) && hasDecisionWorthyFreshPlayerAction)
      )
  );

  return {
    trigger,
    hasMultipleCandidates,
    hasMultipleScheduledCandidates,
    hasFreshPlayerEvent: Boolean(freshEvent),
    hasDecisionWorthyFreshPlayerAction,
    isPlayerResidenceContext,
    shouldDecide
  };
}

function findCandidateActionById(candidateActions = [], actionId = '') {
  const safeActionId = String(actionId || '').trim();
  if (!safeActionId) {
    return null;
  }

  return (Array.isArray(candidateActions) ? candidateActions : []).find(
    (action) => String(action?.id || '').trim() === safeActionId
  ) || null;
}

function normalizeResidentPairKey(residentId = '', targetResidentId = '') {
  return [String(residentId || '').trim(), String(targetResidentId || '').trim()]
    .filter(Boolean)
    .sort()
    .join('__');
}

function hasFreshCompanionChatAfterglow({
  residentId = '',
  targetResidentId = '',
  townEvents = [],
  currentTime = Date.now()
} = {}) {
  const pairKey = normalizeResidentPairKey(residentId, targetResidentId);
  if (!pairKey) {
    return false;
  }

  return (Array.isArray(townEvents) ? townEvents : []).some((event) => {
    if (String(event?.type || '').trim() !== 'companion_chat_started') {
      return false;
    }

    const happenedAt = Number(event?.happenedAt) || 0;
    if (happenedAt <= 0 || currentTime - happenedAt > FRESH_PLAYER_EVENT_WINDOW_MS) {
      return false;
    }

    const eventPairKey = normalizeResidentPairKey(
      Array.isArray(event?.residents) ? event.residents[0] : '',
      Array.isArray(event?.residents) ? event.residents[1] : ''
    );

    return eventPairKey === pairKey;
  });
}

function findActiveCompanionIdsAtLocation({
  resident = {},
  socialLinks = [],
  locationName = ''
} = {}) {
  const residentId = String(resident?.id || '').trim();
  const safeLocationName = String(locationName || '').trim();

  if (!residentId || !safeLocationName) {
    return [];
  }

  return [...new Set(
    (Array.isArray(socialLinks) ? socialLinks : [])
      .filter((link) => link?.isActive && String(link?.locationName || '').trim() === safeLocationName)
      .filter((link) => Array.isArray(link?.residents) && link.residents.map((item) => String(item || '').trim()).includes(residentId))
      .flatMap((link) => (Array.isArray(link?.residents) ? link.residents : []))
      .map((item) => String(item || '').trim())
      .filter((item) => item && item !== residentId)
  )];
}

function buildAutonomousLifeContactMetadata({
  resident = {},
  selectedAction = null,
  selectedAutonomy = null,
  socialLinks = [],
  townEvents = [],
  currentTime = 0,
  nextLocationId = '',
  nextLocationName = ''
} = {}) {
  const safeLocationId = String(nextLocationId || '').trim();
  const safeLocationName = String(nextLocationName || '').trim();
  const targetResidentId = String(selectedAction?.targetResidentId || '').trim();
  const companionActionType = String(selectedAction?.companionActionType || '').trim();
  const recentContactResidentIds = [];
  const recentContactReasonTags = [];

  if (targetResidentId) {
    recentContactResidentIds.push(targetResidentId);
  }

  if (companionActionType === 'invitation_host'
    || companionActionType === 'invitation_accepted'
    || companionActionType === 'companion_outing'
    || companionActionType === 'continued_outing') {
    recentContactReasonTags.push('outing_coordination');
  } else if (targetResidentId) {
    recentContactReasonTags.push(
      hasFreshCompanionChatAfterglow({
        residentId: resident?.id,
        targetResidentId,
        townEvents,
        currentTime
      })
        ? 'fresh_chat_afterglow'
        : 'companion_visit_followup'
    );
  } else {
    recentContactResidentIds.push(...findActiveCompanionIdsAtLocation({
      resident,
      socialLinks,
      locationName: safeLocationName
    }));

    if (recentContactResidentIds.length > 0) {
      recentContactReasonTags.push('after_work_overlap');
    }
  }

  return normalizeResidentAutonomyRuntime({
    ...(selectedAutonomy || createResidentAutonomyRuntime()),
    recentContactResidentIds,
    recentContactReasonTags,
    lastContactLocationId: recentContactResidentIds.length > 0 ? safeLocationId : '',
    lastContactLocationName: recentContactResidentIds.length > 0 ? safeLocationName : '',
    lastContactAt: recentContactResidentIds.length > 0 ? currentTime : 0
  });
}

function buildSimulationDebug({
  resident = {},
  currentTime = 0,
  block = null,
  triggerState = {},
  candidateActions = [],
  selectedAction = null,
  selectedAutonomy = null,
  scheduledLocationId = '',
  scheduledLocationName = '',
  nextLocationId = '',
  nextLocationName = '',
  nextAction = '',
  usedAgentDecision = false,
  reusedCachedAutonomy = false,
  fallbackReason = ''
} = {}) {
  const previousLocationId = String(
    resident?.townRuntime?.currentLocationId
    || resident?.townProfile?.homeLocationId
    || ''
  ).trim();
  const previousLocationName = String(
    resident?.townRuntime?.currentLocationName
    || resident?.currentLocation
    || resident?.location
    || ''
  ).trim();
  const previousAction = String(
    resident?.townRuntime?.currentAction
    || resident?.currentAction
    || resident?.lastActivity
    || ''
  ).trim();

  return {
    residentId: String(resident?.id || '').trim(),
    residentName: String(resident?.name || '').trim() || 'Unknown Resident',
    sliceTimestamp: Number(currentTime) || 0,
    trigger: String(triggerState?.trigger || '').trim(),
    hasFreshPlayerEvent: Boolean(triggerState?.hasFreshPlayerEvent),
    usedAgentDecision: Boolean(usedAgentDecision),
    reusedCachedAutonomy: Boolean(reusedCachedAutonomy),
    fallbackReason: String(fallbackReason || '').trim(),
    autonomySource: String(selectedAutonomy?.source || '').trim() || 'lightweight',
    scheduleTemplateId: String(resident?.townProfile?.scheduleTemplateId || '').trim(),
    scheduleBlockWindow: block
      ? `${String(block?.start || '').trim()}-${String(block?.end || '').trim()}`
      : '',
    scheduledLocationId: String(scheduledLocationId || '').trim(),
    scheduledLocationName: String(scheduledLocationName || '').trim(),
    previousLocationId,
    previousLocationName,
    previousAction,
    selectedActionId: String(selectedAction?.id || '').trim(),
    selectedActionLabel: String(selectedAction?.label || '').trim() || String(nextAction || '').trim(),
    selectedLocationId: String(nextLocationId || selectedAction?.locationId || '').trim(),
    selectedLocationName: String(nextLocationName || '').trim(),
    selectedTargetResidentId: String(selectedAction?.targetResidentId || '').trim(),
    selectedTargetResidentName: String(selectedAction?.targetResidentName || '').trim(),
    recentContactResidentIds: Array.isArray(selectedAutonomy?.recentContactResidentIds)
      ? [...selectedAutonomy.recentContactResidentIds]
      : [],
    recentContactReasonTags: Array.isArray(selectedAutonomy?.recentContactReasonTags)
      ? [...selectedAutonomy.recentContactReasonTags]
      : [],
    locationChanged: previousLocationId !== String(nextLocationId || '').trim(),
    actionChanged: previousAction !== String(nextAction || '').trim(),
    candidateActions: (Array.isArray(candidateActions) ? candidateActions : []).map((action) => ({
      id: String(action?.id || '').trim(),
      label: String(action?.label || '').trim(),
      locationId: String(action?.locationId || '').trim(),
      targetResidentId: String(action?.targetResidentId || '').trim(),
      targetResidentName: String(action?.targetResidentName || '').trim(),
      companionActionType: String(action?.companionActionType || '').trim()
    }))
  };
}

export async function simulateResidentSlice({
  resident,
  worldTemplate,
  currentTime,
  socialLinks = [],
  residentSnapshots = [],
  townEvents = [],
  playerResidenceLocationId = resolvePlayerResidenceLocationId(worldTemplate),
  decideAction = decideResidentAction
}) {
  if (!resident || !worldTemplate) return resident;

  const block = findResidentScheduleBlock(worldTemplate, resident, currentTime);
  const fallbackLocationId = resident.townRuntime?.currentLocationId || resident.townProfile?.homeLocationId || null;
  const fallbackLocation = findLocation(worldTemplate, fallbackLocationId);
  const fallbackAction = resident.townRuntime?.currentAction || resident.currentAction || resident.lastActivity || '待在原地';

  if (!block) {
    const simulationDebug = buildSimulationDebug({
      resident,
      currentTime,
      block: null,
      triggerState: {
        trigger: 'no_schedule_block',
        hasFreshPlayerEvent: false
      },
      candidateActions: [],
      selectedAction: null,
      selectedAutonomy: buildLightweightAutonomy({
        currentTime,
        trigger: 'no_schedule_block'
      }),
      scheduledLocationId: fallbackLocationId,
      scheduledLocationName: fallbackLocation?.name || resident.currentLocation || resident.location || '',
      nextLocationId: fallbackLocationId,
      nextLocationName: fallbackLocation?.name || resident.currentLocation || resident.location || '',
      nextAction: fallbackAction,
      fallbackReason: 'no_schedule_block'
    });

    return buildResidentSnapshot(resident, {
      locationId: fallbackLocationId,
      locationName: fallbackLocation?.name || resident.currentLocation || resident.location || '',
      action: fallbackAction,
      currentTime,
      autonomy: buildLightweightAutonomy({
        currentTime,
        trigger: 'no_schedule_block'
      }),
      scheduledLocationId: fallbackLocationId,
      scheduledLocationName: fallbackLocation?.name || resident.currentLocation || resident.location || '',
      simulationDebug
    });
  }

  const scheduledLocationId = block.resolvedLocationId || block.locationId || fallbackLocationId;
  const scheduledLocation = findLocation(worldTemplate, scheduledLocationId);
  const scheduledCandidateActions = buildCandidateActions(block, resident);

  const candidateActions = buildResidentBehaviorCandidateActions({
    worldTemplate,
    resident,
    candidateActions: scheduledCandidateActions,
    socialLinks,
    residentSnapshots,
    townEvents,
    currentTime
  });
  const existingAutonomy = normalizeResidentAutonomyRuntime(resident.townRuntime?.autonomy);
  const triggerState = resolveResidentAutonomyTrigger({
    resident,
    candidateActions,
    scheduledCandidateActions,
    scheduledLocationId,
    playerResidenceLocationId,
    townEvents,
    currentTime
  });
  const defaultAction = isResidentAgentMode(resident)
    ? (scheduledCandidateActions[0] || candidateActions[0] || null)
    : (candidateActions[0] || scheduledCandidateActions[0] || null);
  const defaultAutonomy = buildLightweightAutonomy({
    actionId: defaultAction?.id || '',
    currentTime,
    trigger: triggerState.trigger || (candidateActions.length > 1 ? 'branching_schedule' : 'scheduled_action')
  });
  let selectedAction = defaultAction;
  let selectedAutonomy = defaultAutonomy;
  let usedAgentDecision = false;
  let reusedCachedAutonomy = false;
  let fallbackReason = '';

  if (isResidentAgentMode(resident) && candidateActions.length > 0) {
    const canReuseCachedAutonomy = !triggerState.hasFreshPlayerEvent;
    const cachedAction = canReuseCachedAutonomy && existingAutonomy.validUntil > currentTime
      ? findCandidateActionById(candidateActions, existingAutonomy.actionId)
      : null;

    if (cachedAction) {
      selectedAction = cachedAction;
      selectedAutonomy = existingAutonomy;
      reusedCachedAutonomy = true;
    } else {
      try {
        const resolved = await decideAction({
          resident,
          candidateActions,
          currentTime,
          trigger: triggerState.trigger,
          townEvents,
          allowCreativeAction: candidateActions.length <= 1
        });
        const resolvedAction = resolved?.id === '__creative__'
          ? resolved
          : (findCandidateActionById(candidateActions, resolved?.id) || candidateActions[0] || null);
        const resolvedAutonomy = resolved?.autonomy
          ? normalizeResidentAutonomyRuntime(resolved.autonomy)
          : defaultAutonomy;

        selectedAction = resolvedAction;
        selectedAutonomy = resolvedAction ? resolvedAutonomy : defaultAutonomy;
        usedAgentDecision = Boolean(resolvedAction);
        fallbackReason = resolvedAction ? '' : 'empty_agent_resolution';
      } catch (error) {
        selectedAction = candidateActions[0] || null;
        selectedAutonomy = defaultAutonomy;
        fallbackReason = 'agent_error';
      }
    }
  }

  const nextLocationId = selectedAction?.locationId || scheduledLocationId || fallbackLocationId;
  const nextLocation = findLocation(worldTemplate, nextLocationId);
  const nextAction = selectedAction?.label || fallbackAction;
  selectedAutonomy = buildAutonomousLifeContactMetadata({
    resident,
    selectedAction,
    selectedAutonomy,
    socialLinks,
    townEvents,
    currentTime,
    nextLocationId,
    nextLocationName: nextLocation?.name || resident.currentLocation || resident.location || ''
  });
  const simulationDebug = buildSimulationDebug({
    resident,
    currentTime,
    block,
    triggerState,
    candidateActions,
    selectedAction,
    selectedAutonomy,
    scheduledLocationId: scheduledLocationId || '',
    scheduledLocationName: scheduledLocation?.name || '',
    nextLocationId,
    nextLocationName: nextLocation?.name || resident.currentLocation || resident.location || '',
    nextAction,
    usedAgentDecision,
    reusedCachedAutonomy,
    fallbackReason
  });

  return buildResidentSnapshot(resident, {
    locationId: nextLocationId,
    locationName: nextLocation?.name || resident.currentLocation || resident.location || '',
    action: nextAction,
    currentTime,
    autonomy: selectedAutonomy,
    targetResidentId: selectedAction?.targetResidentId || '',
    targetResidentName: selectedAction?.targetResidentName || '',
    scheduledLocationId: scheduledLocationId || '',
    scheduledLocationName: scheduledLocation?.name || '',
    companionActionType: selectedAction?.companionActionType || '',
    simulationDebug
  });
}
