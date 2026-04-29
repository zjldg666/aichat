import { buildResidentInvitationOptions } from '@/utils/town/town-shell-view-models.js';

export function shouldShowResidentInviteAction({
  interactionMode = '',
  residentId = ''
} = {}) {
  const normalizedMode = String(interactionMode || '').trim();
  const normalizedResidentId = String(residentId || '').trim();

  return normalizedMode === 'face' && Boolean(normalizedResidentId);
}

export function buildChatResidentInviteOptions({
  worldTemplate = {},
  resident = {},
  townEvents = [],
  townSnapshot = null
} = {}) {
  const resolvedTownEvents = townSnapshot ? (townSnapshot.townEvents || []) : townEvents;
  const currentLocationName = resident.currentLocation
    || resident.townRuntime?.currentLocationName
    || resident.location
    || '';

  return buildResidentInvitationOptions(worldTemplate, currentLocationName, resolvedTownEvents);
}
