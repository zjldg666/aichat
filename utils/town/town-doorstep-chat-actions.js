const DOORSTEP_ACTIONS = {
  enter_home: {
    id: 'enter_home',
    label: '进屋'
  },
  wait_outside: {
    id: 'wait_outside',
    label: '楼下等一会'
  },
  schedule_later: {
    id: 'schedule_later',
    label: '约下次时间'
  },
  leave_message: {
    id: 'leave_message',
    label: '留消息'
  },
  end_visit: {
    id: 'end_visit',
    label: '结束拜访'
  }
};

function cloneDoorstepAction(actionId = '') {
  const action = DOORSTEP_ACTIONS[actionId];
  return action ? { ...action } : null;
}

export function buildDoorstepChatActions({
  decision = ''
} = {}) {
  const normalizedDecision = String(decision || '').trim();
  let actionIds = ['end_visit'];

  switch (normalizedDecision) {
    case 'accepted':
      actionIds = ['enter_home', 'end_visit'];
      break;
    case 'postponed':
      actionIds = ['wait_outside', 'schedule_later', 'end_visit'];
      break;
    case 'absent_or_no_answer':
      actionIds = ['leave_message', 'end_visit'];
      break;
    case 'rejected':
    default:
      actionIds = ['end_visit'];
      break;
  }

  return actionIds
    .map((actionId) => cloneDoorstepAction(actionId))
    .filter(Boolean);
}
