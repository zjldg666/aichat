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
const AGENT_TRIGGER_EVENT_TYPES = new Set([
  'player_resident_conversation_followup',
  'player_resident_invitation',
  'player_resident_activity_join',
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
    : [resident.currentAction || resident.townRuntime?.currentAction || '待在原地'];

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
    companionActionType = ''
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
    }
  };
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
  scheduledLocationId = '',
  playerResidenceLocationId = '',
  townEvents = [],
  currentTime = Date.now()
} = {}) {
  const hasMultipleCandidates = Array.isArray(candidateActions) && candidateActions.length > 1;
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
  const trigger = String(
    (freshEvent ? 'fresh_player_event' : '')
    || (isPlayerResidenceContext && hasMultipleCandidates ? 'player_home_context' : '')
    || (hasMultipleCandidates ? 'branching_schedule' : '')
  ).trim();

  return {
    trigger,
    hasMultipleCandidates,
    hasFreshPlayerEvent: Boolean(freshEvent),
    isPlayerResidenceContext,
    shouldDecide: Boolean(trigger)
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
    return buildResidentSnapshot(resident, {
      locationId: fallbackLocationId,
      locationName: fallbackLocation?.name || resident.currentLocation || resident.location || '',
      action: fallbackAction,
      currentTime,
      autonomy: createResidentAutonomyRuntime(),
      scheduledLocationId: fallbackLocationId,
      scheduledLocationName: fallbackLocation?.name || resident.currentLocation || resident.location || ''
    });
  }

  const scheduledLocationId = block.resolvedLocationId || block.locationId || fallbackLocationId;
  const scheduledLocation = findLocation(worldTemplate, scheduledLocationId);

  const candidateActions = buildResidentBehaviorCandidateActions({
    worldTemplate,
    resident,
    candidateActions: buildCandidateActions(block, resident),
    socialLinks,
    residentSnapshots,
    townEvents,
    currentTime
  });
  const defaultAutonomy = createResidentAutonomyRuntime();
  const existingAutonomy = normalizeResidentAutonomyRuntime(resident.townRuntime?.autonomy);
  const triggerState = resolveResidentAutonomyTrigger({
    resident,
    candidateActions,
    scheduledLocationId,
    playerResidenceLocationId,
    townEvents,
    currentTime
  });
  let selectedAction = candidateActions[0] || null;
  let selectedAutonomy = defaultAutonomy;

  if (candidateActions.length > 1 && isResidentAgentMode(resident)) {
    const canReuseCachedAutonomy = !triggerState.hasFreshPlayerEvent;
    const cachedAction = canReuseCachedAutonomy && existingAutonomy.validUntil > currentTime
      ? findCandidateActionById(candidateActions, existingAutonomy.actionId)
      : null;

    if (cachedAction) {
      selectedAction = cachedAction;
      selectedAutonomy = existingAutonomy;
    } else if (triggerState.shouldDecide) {
      try {
        const resolved = await decideAction({
          resident,
          candidateActions,
          currentTime,
          trigger: triggerState.trigger,
          townEvents
        });
        const resolvedAction = findCandidateActionById(candidateActions, resolved?.id) || candidateActions[0] || null;
        const resolvedAutonomy = resolved?.autonomy
          ? normalizeResidentAutonomyRuntime(resolved.autonomy)
          : defaultAutonomy;

        selectedAction = resolvedAction;
        selectedAutonomy = resolvedAction ? resolvedAutonomy : defaultAutonomy;
      } catch (error) {
        selectedAction = candidateActions[0] || null;
        selectedAutonomy = defaultAutonomy;
      }
    }
  }

  const nextLocationId = selectedAction?.locationId || scheduledLocationId || fallbackLocationId;
  const nextLocation = findLocation(worldTemplate, nextLocationId);
  const nextAction = selectedAction?.label || fallbackAction;

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
    companionActionType: selectedAction?.companionActionType || ''
  });
}
