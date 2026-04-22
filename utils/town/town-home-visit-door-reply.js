const DEFAULT_REPLY_SUMMARY = '门内没有传来更明确的回应。';

function buildHomeVisitAvailableActions(decision = '') {
  switch (String(decision || '').trim()) {
    case 'absent_or_no_answer':
      return [
        {
          id: 'leave_message',
          label: '留消息'
        }
      ];
    case 'postponed':
      return [
        {
          id: 'wait_outside',
          label: '楼下等一会'
        },
        {
          id: 'schedule_later',
          label: '约下次时间'
        }
      ];
    default:
      return [];
  }
}

export function buildHomeVisitDoorReplyState({
  flowResult = null,
  residentName = '',
  residenceLocationName = '',
  locationName = ''
} = {}) {
  const decision = String(
    flowResult?.decision || flowResult?.status || 'postponed'
  ).trim() || 'postponed';
  const resolvedLocationName = String(locationName || residenceLocationName || '').trim();
  const replySummary = String(flowResult?.replySummary || '').trim() || DEFAULT_REPLY_SUMMARY;
  const availableActions = buildHomeVisitAvailableActions(decision);

  return {
    decision,
    replySummary,
    residentName: String(residentName || '').trim(),
    residenceLocationName: String(residenceLocationName || resolvedLocationName).trim(),
    canEnter: Boolean(flowResult?.shouldEnter),
    locationName: resolvedLocationName,
    ...(availableActions.length > 0 ? { availableActions } : {})
  };
}

export function resolveHomeVisitDoorReplyLabel(decision = '') {
  switch (String(decision || '').trim()) {
    case 'accepted':
      return '同意';
    case 'rejected':
      return '拒绝';
    case 'postponed':
      return '改天';
    case 'absent_or_no_answer':
      return '没见到人';
    default:
      return '结果';
  }
}
