function resolveResidentLocationName(resident = {}) {
  return resident.currentLocation || resident.townRuntime?.currentLocationName || resident.location || '';
}

function resolveResidentAction(resident = {}) {
  return resident.currentAction || resident.townRuntime?.currentAction || '活动';
}

function resolveSocialStatus(score = 1) {
  return score >= 2 ? '已熟悉' : '刚碰面';
}

function normalizeLinkResidents(link = {}) {
  const residents = Array.isArray(link.residents) ? link.residents : [];
  const residentNames = Array.isArray(link.residentNames) ? link.residentNames : [];

  return residents.map((residentId, index) => ({
    id: String(residentId),
    name: residentNames[index] || ''
  }));
}

export function buildSocialLinks(residents = [], currentTime = Date.now()) {
  const groupedResidents = new Map();

  residents.forEach((resident) => {
    const locationName = resolveResidentLocationName(resident);
    if (!locationName) return;

    const residentGroup = groupedResidents.get(locationName) || [];
    residentGroup.push(resident);
    groupedResidents.set(locationName, residentGroup);
  });

  const links = [];

  groupedResidents.forEach((group, locationName) => {
    for (let index = 0; index < group.length; index += 1) {
      for (let offset = index + 1; offset < group.length; offset += 1) {
        const currentResident = group[index];
        const targetResident = group[offset];
        const residentPair = [
          { id: String(currentResident.id), name: currentResident.name || '' },
          { id: String(targetResident.id), name: targetResident.name || '' }
        ].sort((left, right) => left.id.localeCompare(right.id));

        links.push({
          id: residentPair.map((resident) => resident.id).join('__'),
          residents: residentPair.map((resident) => resident.id),
          residentNames: residentPair.map((resident) => resident.name),
          locationName,
          interactionType: 'co_present',
          lastSeenAt: currentTime,
          summary: `${currentResident.name}和${targetResident.name}此刻都在${locationName}。`
        });
      }
    }
  });

  return links;
}

export function settleSocialLinks(previousLinks = [], currentLinks = [], currentTime = Date.now()) {
  const settledAt = Number.isFinite(currentTime) && currentTime > 0 ? currentTime : Date.now();
  const previousMap = new Map(
    (Array.isArray(previousLinks) ? previousLinks : []).map((link) => [link.id, link])
  );

  const nextLinks = (Array.isArray(currentLinks) ? currentLinks : []).map((link) => {
    const currentResidents = normalizeLinkResidents(link);
    const previousLink = previousMap.get(link.id);
    const nextScore = Math.max(1, Number(previousLink?.score) || 0) + (previousLink ? 1 : 0);
    previousMap.delete(link.id);

    return {
      ...previousLink,
      ...link,
      id: currentResidents.map((resident) => resident.id).join('__'),
      residents: currentResidents.map((resident) => resident.id),
      residentNames: currentResidents.map((resident) => resident.name),
      firstSeenAt: previousLink?.firstSeenAt || link.lastSeenAt || settledAt,
      lastSeenAt: link.lastSeenAt || settledAt,
      lastSettledAt: settledAt,
      score: nextScore,
      status: resolveSocialStatus(nextScore),
      isActive: true
    };
  });

  previousMap.forEach((link) => {
    nextLinks.push({
      ...link,
      lastSettledAt: settledAt,
      status: resolveSocialStatus(Number(link.score) || 1),
      isActive: false
    });
  });

  return nextLinks;
}

export function findResidentActiveCompanions(residentId, socialLinks = []) {
  const targetResidentId = String(residentId || '');

  if (!targetResidentId) {
    return [];
  }

  const companionNames = new Set();

  (Array.isArray(socialLinks) ? socialLinks : []).forEach((link) => {
    if (!link?.isActive) return;

    const residentEntries = normalizeLinkResidents(link);

    if (!residentEntries.some((resident) => resident.id === targetResidentId)) {
      return;
    }

    residentEntries.forEach((resident) => {
      if (resident.id !== targetResidentId && resident.name) {
        companionNames.add(resident.name);
      }
    });
  });

  return [...companionNames];
}

export function buildLocationAtmosphere(locationName = '', residents = []) {
  if (!Array.isArray(residents) || residents.length === 0) {
    return `${locationName || '这里'}现在很安静。`;
  }

  if (residents.length === 1) {
    const resident = residents[0];
    return `${resident.name}正在${resolveResidentAction(resident)}，${locationName}里显得很安静。`;
  }

  const names = residents.slice(0, 3).map((resident) => resident.name).join('、');
  return `${locationName}里有${names}，现场气氛明显热闹了起来。`;
}
