const EVENT_TYPE_PRIORITY = {
  private_visit_allowed: 85,
  private_visit_message_replied: 84,
  private_visit_message_left: 83,
  private_visit_scheduled: 82,
  private_visit_waited: 81,
  private_visit_requested: 80,
  player_relationship_permission_unlocked: 79,
  companion_invitation_confirmed: 70,
  player_resident_conversation_followup: 69,
  player_resident_home_visit_request: 68,
  player_relationship_focus: 67,
  player_resident_invitation_accepted: 68,
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

function resolveTownEventPriority(event = {}) {
  return EVENT_TYPE_PRIORITY[event.type] ?? 0;
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
