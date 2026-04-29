function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeTags(tags = []) {
  if (Array.isArray(tags)) {
    return Array.from(new Set(
      tags
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    ));
  }

  return Array.from(new Set(
    String(tags || '')
      .split(/[\n,，、]/)
      .map((item) => item.trim())
      .filter(Boolean)
  ));
}

function normalizeSceneActivity(activity = {}, index = 0) {
  const id = String(activity?.id || `scene-activity-${index + 1}`).trim();
  if (!id) {
    return null;
  }

  return {
    ...deepClone(activity),
    id,
    name: String(activity?.name || id).trim(),
    description: String(activity?.description || '').trim(),
    tags: normalizeTags(activity?.tags),
    isSocial: Boolean(activity?.isSocial)
  };
}

function normalizeSceneZone(zone = {}, index = 0) {
  const id = String(zone?.id || `scene-zone-${index + 1}`).trim();
  if (!id) {
    return null;
  }

  const activityMap = new Map();
  (zone?.activities || []).forEach((activity, activityIndex) => {
    const normalized = normalizeSceneActivity(activity, activityIndex);
    if (!normalized) {
      return;
    }

    activityMap.set(normalized.id, normalized);
  });

  return {
    ...deepClone(zone),
    id,
    name: String(zone?.name || id).trim(),
    description: String(zone?.description || '').trim(),
    activities: Array.from(activityMap.values())
  };
}

function isResidenceRuntimeLocationId(locationId = '') {
  return /^residence:[^:]+:.+$/.test(String(locationId || '').trim());
}

function extractResidenceZoneId(locationId = '') {
  const match = String(locationId || '').trim().match(/^residence:([^:]+):.+$/);
  return match ? match[1] : '';
}

function findTargetByName(collection = [], locationName = '') {
  const safeName = String(locationName || '').trim();
  if (!safeName) {
    return {
      item: null,
      index: -1
    };
  }

  const index = (collection || []).findIndex((item) => String(item?.name || '').trim() === safeName);
  return {
    item: index > -1 ? collection[index] : null,
    index
  };
}

function normalizeSceneContentCollections(world = {}) {
  return {
    ...deepClone(world),
    publicLocations: (world?.publicLocations || []).map((location) => ({
      ...deepClone(location),
      sceneContent: normalizeSceneContent(location?.sceneContent)
    })),
    residentialZones: (world?.residentialZones || []).map((zone) => ({
      ...deepClone(zone),
      sceneContent: normalizeSceneContent(zone?.sceneContent)
    }))
  };
}

export function normalizeSceneContent(sceneContent = {}) {
  const zoneMap = new Map();

  (sceneContent?.zones || []).forEach((zone, zoneIndex) => {
    const normalized = normalizeSceneZone(zone, zoneIndex);
    if (!normalized) {
      return;
    }

    zoneMap.set(normalized.id, normalized);
  });

  return {
    zones: Array.from(zoneMap.values())
  };
}

export function resolveSceneContentTarget(world = {}, {
  locationId = '',
  locationName = ''
} = {}) {
  const normalizedWorld = normalizeSceneContentCollections(world);
  const safeLocationId = String(locationId || '').trim();
  const safeLocationName = String(locationName || '').trim();
  const publicLocations = normalizedWorld.publicLocations || [];
  const residentialZones = normalizedWorld.residentialZones || [];

  let publicIndex = publicLocations.findIndex((item) => String(item?.id || '').trim() === safeLocationId);
  if (publicIndex === -1 && safeLocationName) {
    publicIndex = findTargetByName(publicLocations, safeLocationName).index;
  }
  if (publicIndex > -1) {
    const target = publicLocations[publicIndex];
    return {
      targetType: 'publicLocation',
      targetId: target.id,
      targetName: target.name,
      index: publicIndex,
      sceneContent: normalizeSceneContent(target.sceneContent)
    };
  }

  const residenceZoneId = isResidenceRuntimeLocationId(safeLocationId)
    ? extractResidenceZoneId(safeLocationId)
    : safeLocationId;
  let residentialIndex = residentialZones.findIndex((item) => String(item?.id || '').trim() === residenceZoneId);
  if (residentialIndex === -1 && safeLocationName) {
    residentialIndex = findTargetByName(residentialZones, safeLocationName).index;
  }
  if (residentialIndex > -1) {
    const target = residentialZones[residentialIndex];
    return {
      targetType: 'residentialZone',
      targetId: target.id,
      targetName: target.name,
      index: residentialIndex,
      sceneContent: normalizeSceneContent(target.sceneContent)
    };
  }

  return {
    targetType: '',
    targetId: safeLocationId,
    targetName: safeLocationName,
    index: -1,
    sceneContent: normalizeSceneContent()
  };
}

export function patchWorldSceneContent(world = {}, {
  locationId = '',
  locationName = '',
  sceneContent = {}
} = {}) {
  const normalizedWorld = normalizeSceneContentCollections(world);
  const target = resolveSceneContentTarget(normalizedWorld, {
    locationId,
    locationName
  });
  const normalizedSceneContent = normalizeSceneContent(sceneContent);

  if (target.targetType === 'publicLocation') {
    normalizedWorld.publicLocations = normalizedWorld.publicLocations.map((location, index) => (
      index === target.index
        ? {
          ...location,
          sceneContent: normalizedSceneContent
        }
        : location
    ));
  }

  if (target.targetType === 'residentialZone') {
    normalizedWorld.residentialZones = normalizedWorld.residentialZones.map((zone, index) => (
      index === target.index
        ? {
          ...zone,
          sceneContent: normalizedSceneContent
        }
        : zone
    ));
  }

  return normalizedWorld;
}
