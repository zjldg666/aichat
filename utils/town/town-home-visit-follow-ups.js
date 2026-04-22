const HOME_VISIT_SCHEDULE_OPTIONS = [
  {
    id: 'later_today',
    label: '今天晚些',
    description: '默认理解为今天晚一点再上门'
  },
  {
    id: 'tomorrow_daytime',
    label: '明天白天',
    description: '默认理解为明天白天再来'
  },
  {
    id: 'this_weekend',
    label: '这周末',
    description: '默认理解为这个周末找个合适时间'
  }
];

function resolveResidentName(residentName = '') {
  return String(residentName || '').trim() || '对方';
}

export function buildDefaultHomeVisitLeaveMessage() {
  return '我来找过你了，等你回家后如果方便，给我回个消息。';
}

export function buildHomeVisitLeaveMessageReplySummary() {
  return '我刚看到你留的消息了，今晚回家后再联系你。';
}

export function buildHomeVisitScheduleReplySummary(option = {}) {
  const safeLabel = String(option?.label || '').trim() || '之后';
  return `那就${safeLabel}吧，你来之前也可以先给我发个消息。`;
}

export function buildHomeVisitAbsenceResult({
  residentName = '',
  replySummary = ''
} = {}) {
  const safeResidentName = resolveResidentName(residentName);
  const safeReplySummary = String(replySummary || '').trim()
    || `${safeResidentName}现在应该不在家，屋里一直没有回应。`;

  return {
    status: 'absent_or_no_answer',
    decision: 'absent_or_no_answer',
    replySummary: safeReplySummary,
    shouldEnter: false
  };
}

export function createHomeVisitScheduleOptions() {
  return HOME_VISIT_SCHEDULE_OPTIONS.map((option) => ({ ...option }));
}
