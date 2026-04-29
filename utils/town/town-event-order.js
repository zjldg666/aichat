const EVENT_TYPE_PRIORITY = {
  private_visit_allowed: 85,
  private_visit_message_replied: 84,
  private_visit_message_left: 83,
  private_visit_scheduled: 82,
  private_visit_waited: 81,
  private_visit_requested: 80,
  player_relationship_permission_unlocked: 79,
  public_scene_chat: 78,
  companion_invitation_confirmed: 70,
  player_resident_conversation_followup: 69,
  player_resident_home_visit_request: 68,
  player_resident_invitation_accepted: 68,
  player_relationship_focus: 67,
  player_resident_activity_join: 66,
  player_resident_invitation: 65,
  companion_invitation_accepted: 60,
  companion_outing_started: 50,
  companion_chat_started: 40,
  companion_meetup: 30,
  companion_visit: 20,
  relationship_warmed: 10,
  co_present: 0
};

const EVENT_DOMINANCE = {
  co_present: [
    'private_visit_allowed',
    'private_visit_message_replied',
    'private_visit_message_left',
    'private_visit_scheduled',
    'private_visit_waited',
    'private_visit_requested',
    'player_relationship_permission_unlocked',
    'public_scene_chat',
    'companion_invitation_confirmed',
    'player_resident_conversation_followup',
    'player_resident_home_visit_request',
    'player_resident_invitation_accepted',
    'player_relationship_focus',
    'player_resident_activity_join',
    'player_resident_invitation',
    'companion_invitation_accepted',
    'companion_outing_started',
    'companion_chat_started',
    'companion_meetup',
    'companion_visit'
  ],
  relationship_warmed: [
    'private_visit_allowed',
    'private_visit_message_replied',
    'private_visit_message_left',
    'private_visit_scheduled',
    'private_visit_waited',
    'private_visit_requested',
    'player_relationship_permission_unlocked',
    'public_scene_chat',
    'companion_invitation_confirmed',
    'player_resident_conversation_followup',
    'player_resident_home_visit_request',
    'player_resident_invitation_accepted',
    'player_relationship_focus',
    'player_resident_activity_join',
    'player_resident_invitation',
    'companion_invitation_accepted',
    'companion_outing_started',
    'companion_chat_started',
    'companion_meetup',
    'companion_visit'
  ]
};

const DEFAULT_TOWN_EVENT_LIMIT = 10;

function resolveTownEventPriority(event = {}) {
  return EVENT_TYPE_PRIORITY[event.type] ?? 0;
}

function normalizeResidentsKey(event = {}) {
  const residents = Array.isArray(event?.residents)
    ? event.residents.map((item) => String(item || '').trim()).filter(Boolean).sort()
    : [];

  return residents.join('__');
}

function isSameTownEventLocation(left = {}, right = {}) {
  const leftLocationId = String(left.locationId || '').trim();
  const rightLocationId = String(right.locationId || '').trim();

  if (leftLocationId && rightLocationId) {
    return leftLocationId === rightLocationId;
  }

  return String(left.locationName || '').trim() === String(right.locationName || '').trim();
}

function shouldSuppressTownEvent(candidate = {}, existingEvent = {}) {
  if (!candidate?.type || !existingEvent?.type) {
    return false;
  }

  const dominatedTypes = EVENT_DOMINANCE[candidate.type] || [];
  if (!dominatedTypes.includes(existingEvent.type)) {
    return false;
  }

  if ((Number(candidate.happenedAt) || 0) !== (Number(existingEvent.happenedAt) || 0)) {
    return false;
  }

  if (!isSameTownEventLocation(candidate, existingEvent)) {
    return false;
  }

  return normalizeResidentsKey(candidate) === normalizeResidentsKey(existingEvent);
}

function settleTownEvents(events = []) {
  const nextEvents = [];

  sortTownEvents(events).forEach((event) => {
    if (nextEvents.some((existingEvent) => shouldSuppressTownEvent(event, existingEvent))) {
      return;
    }

    nextEvents.push(event);
  });

  return nextEvents;
}

export function compareTownEvents(left = {}, right = {}) {
  const timeDelta = (Number(right.happenedAt) || 0) - (Number(left.happenedAt) || 0);

  if (timeDelta !== 0) {
    return timeDelta;
  }

  return resolveTownEventPriority(right) - resolveTownEventPriority(left);
}

export function sortTownEvents(townEvents = []) {
  return [...(Array.isArray(townEvents) ? townEvents : [])]
    .sort(compareTownEvents);
}

export function mergeTownEvents(nextEvents = [], existingEvents = [], limit = DEFAULT_TOWN_EVENT_LIMIT) {
  return settleTownEvents([
    ...(Array.isArray(nextEvents) ? nextEvents : []),
    ...(Array.isArray(existingEvents) ? existingEvents : [])
  ]).slice(0, Number(limit) > 0 ? Number(limit) : DEFAULT_TOWN_EVENT_LIMIT);
}
