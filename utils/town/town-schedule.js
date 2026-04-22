import { buildResidenceLocationId } from '@/utils/town/town-location-access.js';

function getDayType(date) {
  const day = date.getDay();
  return day === 0 || day === 6 ? 'weekend' : 'weekday';
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function resolveResidentHomeLocationId(resident = {}) {
  const homeLocationId = resident.townProfile?.homeLocationId || '';
  if (homeLocationId) {
    return homeLocationId;
  }

  const residence = resident.townProfile?.residence || {};
  return buildResidenceLocationId(residence.zoneId, residence.unitId);
}

function resolveResidentWorkLocationId(worldTemplate = {}, resident = {}) {
  const professionId = resident.townProfile?.professionId;
  if (!professionId) {
    return '';
  }

  return (worldTemplate.professions || []).find((item) => item.id === professionId)?.workLocationId || '';
}

export function resolveScheduleLocationId(worldTemplate = {}, resident = {}, block = {}) {
  if (block.locationId) {
    return block.locationId;
  }

  const type = block.locationRef?.type || '';
  if (type === 'home') {
    return resolveResidentHomeLocationId(resident);
  }

  if (type === 'work') {
    return resolveResidentWorkLocationId(worldTemplate, resident);
  }

  if (type === 'location') {
    return block.locationRef?.locationId || '';
  }

  return '';
}

export function findResidentScheduleBlock(worldTemplate = {}, resident = {}, currentTime) {
  const date = new Date(currentTime);
  const currentHHmm = formatTime(date);
  const scheduleTemplateId = resident.townProfile?.scheduleTemplateId;
  const schedule = (worldTemplate.scheduleTemplates || []).find((item) => {
    if (item.id !== scheduleTemplateId) return false;

    const dayTypes = Array.isArray(item.dayTypes) && item.dayTypes.length > 0
      ? item.dayTypes
      : ['weekday', 'weekend'];

    return dayTypes.includes(getDayType(date));
  });

  if (!schedule) return null;

  const block = schedule.blocks?.find((item) => currentHHmm >= item.start && currentHHmm < item.end)
    || schedule.blocks?.[0]
    || null;

  return block
    ? {
      ...block,
      resolvedLocationId: resolveScheduleLocationId(worldTemplate, resident, block)
    }
    : null;
}
