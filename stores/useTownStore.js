import { defineStore } from 'pinia';
import { characterService } from '@/services/characterService.js';
import { messageService } from '@/services/messageService.js';
import { dispatchTownSceneChat } from '@/services/townSceneChatService.js';
import { simulateResidentSlice } from '@/services/townSimulationService.js';
import {
  advanceAutonomousConversationRuntime,
  runAutonomousConversationRound
} from '@/services/townAutonomousConversationService.js';
import { floorToSlice, townClockService } from '@/services/townClockService.js';
import { worldTemplateService } from '@/services/worldTemplateService.js';
import { getCurrentLlmConfig } from '@/services/llm.js';
import {
  buildPlayerRelationshipFocusContext,
  buildPlayerResidentActivityJoinContext,
  buildPlayerResidentHomeVisitContext,
  buildPlayerResidentInvitationContext,
  buildLocationCards,
  buildTownSnapshot,
  createEmptyTownSnapshot,
  findLocationCard
} from '@/utils/town/town-view-models.js';
import { settleSocialLinks, buildSocialLinks, applyRelationshipPatchesToSocialLinks } from '@/utils/town/town-social.js';
import { settleTownEvents } from '@/utils/town/town-events.js';
import {
  grantResidenceVisitorAccess,
  isResidenceAccessAllowed,
  isResidenceVisitRequestAllowed,
  resolvePlayerResidenceLocationId,
  resolvePlayerVisitorId
} from '@/utils/town/town-location-access.js';
import { mergeTownEvents } from '@/utils/town/town-event-order.js';
import { continueAutonomousConversationThread, closeAutonomousConversationThread } from '@/utils/town/town-autonomous-conversation-threads.js';
import { buildAutonomousConversationWriteBack } from '@/utils/town/town-autonomous-conversation-writes.js';
import {
  buildLegacyRelationshipMirrors,
  mergePlayerRelationshipState
} from '@/utils/town/player-relationship.js';
import { settleResidentSceneRelationshipEffect } from '@/utils/town/player-relationship-settlement.js';
import { buildResidentPhoneChatId, buildScenePublicChatId } from '@/utils/town/town-entry-links.js';
import {
  buildSceneDispatchMetaMessage,
  buildSceneMemoryDigest,
  formatSceneSpeakerTurn,
  mergeSceneMemoryDigests,
  resolveSceneResidentParticipation,
  scaleSceneRelationshipEffect,
  shouldPersistSceneMemoryToDiary
} from '@/utils/town/town-scene-chat.js';
import { DB } from '@/utils/db.js';

let timer = null;
let isTicking = false;
let initializationPromise = null;
const TOWN_SLICE_MS = 10 * 60 * 1000;

function buildClockStateResult(store) {
  return {
    currentTime: store.currentTime,
    timeRatio: store.timeRatio,
    sliceTimestamp: store.currentSliceTimestamp
  };
}

function normalizeResidentIds(value = []) {
  return [...new Set(
    (Array.isArray(value) ? value : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  )];
}

function applyAutonomousConversationWriteBackToResidents(
  residents = [],
  writeBack = {}
) {
  const memoryPatchMap = new Map();
  const behaviorBiasPatchMap = new Map();

  (Array.isArray(writeBack?.memoryPatches) ? writeBack.memoryPatches : []).forEach((patch) => {
    const residentId = String(patch?.residentId || '').trim();
    if (residentId) {
      memoryPatchMap.set(residentId, patch);
    }
  });

  (Array.isArray(writeBack?.behaviorBiasPatches) ? writeBack.behaviorBiasPatches : []).forEach((patch) => {
    const residentId = String(patch?.residentId || '').trim();
    if (residentId) {
      behaviorBiasPatchMap.set(residentId, patch);
    }
  });

  return (Array.isArray(residents) ? residents : []).map((resident) => {
    const residentId = String(resident?.id || '').trim();
    const memoryPatch = memoryPatchMap.get(residentId) || null;
    const behaviorBiasPatch = behaviorBiasPatchMap.get(residentId) || null;

    if (!memoryPatch && !behaviorBiasPatch) {
      return resident;
    }

    const currentAutonomy = resident?.townRuntime?.autonomy || {};
    const recentConversationSummaries = [
      ...(memoryPatch?.summary
        ? [
            {
              summary: String(memoryPatch.summary || '').trim(),
              happenedAt: Number(memoryPatch.happenedAt) || 0,
              locationId: String(memoryPatch.locationId || '').trim(),
              threadId: String(memoryPatch.threadId || '').trim(),
              participantIds: normalizeResidentIds(memoryPatch.participantIds)
            }
          ]
        : []),
      ...((Array.isArray(currentAutonomy.recentConversationSummaries)
        ? currentAutonomy.recentConversationSummaries
        : []).filter(Boolean))
    ].slice(0, 6);

    const preferredFollowUpResidentIds = behaviorBiasPatch
      ? normalizeResidentIds([
          ...(behaviorBiasPatch.preferredFollowUpResidentIds || []),
          ...(currentAutonomy.preferredFollowUpResidentIds || [])
        ])
      : normalizeResidentIds(currentAutonomy.preferredFollowUpResidentIds);

    return {
      ...resident,
      townRuntime: {
        ...(resident?.townRuntime || {}),
        autonomy: {
          ...currentAutonomy,
          ...(recentConversationSummaries.length > 0
            ? {
                recentConversationSummaries
              }
            : {}),
          ...(preferredFollowUpResidentIds.length > 0
            ? {
                preferredFollowUpResidentIds
              }
            : {})
        }
      }
    };
  });
}

function buildSimulationDebugReport({
  sliceTimestamp = 0,
  residents = [],
  saveSuccess = false
} = {}) {
  const residentEntries = (Array.isArray(residents) ? residents : [])
    .map((resident) => resident?.simulationDebug || null)
    .filter(Boolean);

  return {
    sliceTimestamp: Number(sliceTimestamp) || 0,
    residentCount: Array.isArray(residents) ? residents.length : 0,
    saveSuccess: saveSuccess !== false,
    residents: residentEntries
  };
}

async function persistAutonomousSceneRoundMessages({
  worldId = '',
  thread = {},
  round = {},
  happenedAt = 0
} = {}) {
  const safeWorldId = String(worldId || '').trim();
  const safeLocationId = String(thread?.locationId || '').trim();
  const safeThreadId = String(thread?.id || '').trim();
  const turns = Array.isArray(round?.turns) ? round.turns : [];
  const summary = String(round?.summary || '').trim();

  if (!safeWorldId || !safeLocationId || !safeThreadId || typeof messageService?.saveMessage !== 'function') {
    return false;
  }

  const sceneChatId = buildScenePublicChatId({
    worldId: safeWorldId,
    locationId: safeLocationId
  });

  for (let index = 0; index < turns.length; index += 1) {
    const turn = turns[index] || {};
    const content = formatSceneSpeakerTurn(turn);
    if (!content) {
      continue;
    }

    await messageService.saveMessage(sceneChatId, {
      id: `scene-autonomous-${safeThreadId}-${index}-${happenedAt}`,
      role: 'model',
      type: 'scene_autonomous',
      content,
      residentId: String(turn?.residentId || '').trim(),
      isSystem: false,
      timestamp: happenedAt + index,
      happenedAt: happenedAt + index
    });
  }

  if (summary) {
    await messageService.saveMessage(sceneChatId, {
      id: `scene-autonomous-meta-${safeThreadId}-${happenedAt}`,
      role: 'system',
      type: 'scene_autonomous_meta',
      content: summary,
      isSystem: true,
      timestamp: happenedAt + turns.length,
      happenedAt: happenedAt + turns.length
    });
  }

  return true;
}

function syncClockState(store, snapshot = null) {
  const safeSnapshot = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const nextCurrentTime = Number(safeSnapshot.currentTime);
  const nextTimeRatio = Number(safeSnapshot.timeRatio);
  const nextSliceTimestamp = Number(safeSnapshot.sliceTimestamp);

  if (Number.isFinite(nextCurrentTime)) {
    store.currentTime = nextCurrentTime;
  }

  if (Number.isFinite(nextTimeRatio)) {
    store.timeRatio = nextTimeRatio;
  }

  if (Number.isFinite(nextSliceTimestamp)) {
    store.currentSliceTimestamp = nextSliceTimestamp;
  }

  return {
    ...safeSnapshot,
    ...buildClockStateResult(store)
  };
}

function setClockTime(store, timestamp) {
  return syncClockState(store, townClockService.setCurrentTime(timestamp));
}

async function advanceClockAcrossSlices(
  store,
  {
    startSliceTimestamp = 0,
    targetSliceTimestamp = 0,
    residents = []
  } = {}
) {
  let crossedSlice = false;
  let nextResidents = Array.isArray(residents) ? residents : [];

  for (
    let nextSliceTimestamp = Number(startSliceTimestamp) + TOWN_SLICE_MS;
    nextSliceTimestamp <= Number(targetSliceTimestamp);
    nextSliceTimestamp += TOWN_SLICE_MS
  ) {
    crossedSlice = true;

    const sliceSnapshot = setClockTime(store, nextSliceTimestamp);
    const simulationResult = await store.simulateResidentsForSlice({
      sliceTimestamp: sliceSnapshot.sliceTimestamp,
      residentsOverride: nextResidents
    });

    nextResidents = simulationResult.residents;
  }

  return {
    crossedSlice,
    residents: nextResidents
  };
}

function buildHostResidentVisitRelationship(resident = {}) {
  const nextRelationship = mergePlayerRelationshipState(resident.playerRelationship, {
    flags: {
      householdTrackActive: true
    },
    permissions: {
      canRequestVisit: true
    }
  });
  const relationshipMirrors = buildLegacyRelationshipMirrors(nextRelationship);

  return {
    ...resident,
    relation: relationshipMirrors.relation,
    settings: {
      ...(resident.settings || {}),
      ...relationshipMirrors.settingsPatch
    },
    playerRelationship: relationshipMirrors.playerRelationship
  };
}

function resolveActiveWorldPlayerName(world = {}) {
  return String(world?.playerIdentityTemplates?.[0]?.name || '').trim() || '玩家';
}

function resolveHomeVisitLocationName(world = {}, locationId = '', fallbackName = '') {
  const safeLocationId = String(locationId || '').trim();
  const safeFallbackName = String(fallbackName || '').trim();

  return String(
    (world.locations || []).find((item) => String(item?.id || '').trim() === safeLocationId)?.name
    || safeFallbackName
    || safeLocationId
  ).trim();
}

function buildResidentRelationshipAfterFollowUp(
  resident = {},
  {
    familiarityDelta = 0,
    trustDelta = 0
  } = {}
) {
  const currentRelationship = mergePlayerRelationshipState(resident.playerRelationship, {});
  const nextRelationship = mergePlayerRelationshipState(currentRelationship, {
    familiarity: (Number(currentRelationship.familiarity) || 0) + familiarityDelta,
    trust: (Number(currentRelationship.trust) || 0) + trustDelta
  });
  const relationshipMirrors = buildLegacyRelationshipMirrors(nextRelationship);

  return {
    relation: relationshipMirrors.relation,
    settings: {
      ...(resident.settings || {}),
      ...relationshipMirrors.settingsPatch
    },
    playerRelationship: relationshipMirrors.playerRelationship
  };
}

function resolveResidentLocationId(resident = {}) {
  return String(
    resident?.townRuntime?.currentLocationId
    || resident?.townProfile?.homeLocationId
    || ''
  ).trim();
}

function resolveResidentLocationName(resident = {}) {
  return String(
    resident?.currentLocation
    || resident?.townRuntime?.currentLocationName
    || resident?.location
    || ''
  ).trim();
}

function formatDiaryDateTime(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function buildResidentRelationshipAfterSceneEffect(resident = {}, effect = {}) {
  return settleResidentSceneRelationshipEffect(resident, effect);
}

function buildSceneRelationshipPermissionUnlockEvent({
  resident = {},
  unlockedPermissions = [],
  playerName = '',
  locationId = '',
  locationName = '',
  happenedAt = Date.now(),
  reason = ''
} = {}) {
  const residentId = String(resident?.id || '').trim();
  const residentName = String(resident?.name || '').trim() || '对方';
  const safePlayerName = String(playerName || '').trim() || '玩家';
  const safeLocationId = String(locationId || '').trim();
  const safeLocationName = String(locationName || '').trim() || safeLocationId || '现场';
  const safeUnlockedPermissions = Array.from(new Set(
    (Array.isArray(unlockedPermissions) ? unlockedPermissions : []).filter(Boolean)
  ));

  if (!residentId || safeUnlockedPermissions.length === 0) {
    return null;
  }

  const unlocksHomeEntry = safeUnlockedPermissions.includes('canEnterHome');
  const summary = unlocksHomeEntry
    ? `${residentName}在${safeLocationName}这轮公开聊天后明显更信任${safePlayerName}，现在已经愿意让对方进屋。${reason || ''}`.trim()
    : `${residentName}在${safeLocationName}这轮公开聊天后对${safePlayerName}更熟也更信任，现在已经愿意接受上门拜访请求。${reason || ''}`.trim();

  return {
    id: `player-relationship-permission-unlocked-${residentId}-${happenedAt}`,
    type: 'player_relationship_permission_unlocked',
    happenedAt,
    playerName: safePlayerName,
    locationId: safeLocationId,
    locationName: safeLocationName,
    residentNames: [residentName],
    residents: [residentId],
    unlockedPermissions: safeUnlockedPermissions,
    title: unlocksHomeEntry
      ? `${residentName}对${safePlayerName}开放了更私人的住处边界`
      : `${residentName}开始接受${safePlayerName}提出上门拜访`,
    summary
  };
}

function buildSceneConversationFollowUpEvent({
  resident = {},
  playerName = '',
  locationId = '',
  locationName = '',
  relationshipStage = '',
  currentAction = '',
  replySummary = '',
  happenedAt = Date.now()
} = {}) {
  const residentId = String(resident?.id || '').trim();
  const residentName = String(resident?.name || '').trim() || '对方';
  const safePlayerName = String(playerName || '').trim() || '玩家';
  const safeLocationId = String(locationId || '').trim();
  const safeLocationName = String(locationName || '').trim() || safeLocationId || '现场';
  const safeRelationshipStage = String(relationshipStage || '').trim();
  const safeCurrentAction = String(
    currentAction
    || resident?.townRuntime?.currentAction
    || resident?.currentAction
    || ''
  ).trim();
  const safeReplySummary = String(replySummary || '').trim();

  if (!residentId || !safeReplySummary) {
    return null;
  }

  const summaryParts = [
    `${residentName}在${safeLocationName}和${safePlayerName}公开聊过之后，${safeReplySummary}`
  ];

  if (safeRelationshipStage) {
    summaryParts.push(`关系阶段：${safeRelationshipStage}。`);
  }

  if (safeCurrentAction) {
    summaryParts.push(`当时她正在${safeCurrentAction}。`);
  }

  return {
    id: `player-resident-conversation-followup-scene-${residentId}-${safeLocationId || safeLocationName}-${happenedAt}`,
    type: 'player_resident_conversation_followup',
    sourceIntent: 'scene_public_chat',
    happenedAt,
    playerName: safePlayerName,
    locationId: safeLocationId,
    locationName: safeLocationName,
    targetLocationId: '',
    targetLocationName: '',
    residentNames: [residentName],
    residents: [residentId],
    relationshipStage: safeRelationshipStage,
    currentAction: safeCurrentAction,
    visitDecision: '',
    replySummary: safeReplySummary,
    title: `${safePlayerName}和${residentName}在${safeLocationName}公开聊了聊`,
    summary: summaryParts.join(' ')
  };
}

function resolveSceneFollowUpReplySummary({
  speakerTurn = null,
  relationshipEffect = null,
  projection = null,
  sceneSummary = ''
} = {}) {
  const relationshipReason = String(relationshipEffect?.reason || '').trim();
  if (relationshipReason) {
    return relationshipReason;
  }

  const publicReply = String(speakerTurn?.content || '').trim();
  if (publicReply) {
    return `她当场回应：“${publicReply}”`;
  }

  const memorySummary = String(projection?.summary || '').trim();
  if (memorySummary) {
    return memorySummary;
  }

  return String(sceneSummary || '').trim();
}

export const useTownStore = defineStore('town', {
  state: () => ({
    isReady: false,
    isInitializing: false,
    initializationError: null,
    worldTemplates: [],
    activeWorldId: null,
    currentTime: Date.now(),
    timeRatio: 6,
    currentSliceTimestamp: 0,
    activeTownSnapshot: createEmptyTownSnapshot(),
    activeResidents: [],
    locationCards: [],
    socialLinks: [],
    townEvents: [],
    autonomousConversationThreads: [],
    latestSimulationDebug: null,
    latestAutonomousConversationDebug: null
  }),

  getters: {
    activeWorld: (state) => state.worldTemplates.find((item) => item.id === state.activeWorldId) || null
  },

  actions: {
    async refreshActiveWorldSnapshot(residentsOverride = null, {
      autonomousThreadsOverride = null
    } = {}) {
      const worldTemplate = this.activeWorld;
      const currentTimestamp = this.currentSliceTimestamp || this.currentTime;
      const autonomousConversationThreads = Array.isArray(autonomousThreadsOverride)
        ? autonomousThreadsOverride
        : this.autonomousConversationThreads;

      if (!this.activeWorldId || !worldTemplate) {
        const emptySnapshot = createEmptyTownSnapshot({
          currentTime: currentTimestamp,
          sliceTimestamp: currentTimestamp,
          autonomousConversationThreads: []
        });

        this.activeTownSnapshot = emptySnapshot;
        this.activeResidents = emptySnapshot.residents;
        this.locationCards = emptySnapshot.locationCards;
        this.socialLinks = emptySnapshot.socialLinks;
        this.townEvents = emptySnapshot.townEvents;
        this.autonomousConversationThreads = emptySnapshot.autonomousConversationThreads;
        return emptySnapshot;
      }

      const residents = Array.isArray(residentsOverride)
        ? residentsOverride
        : await characterService.getCharactersByWorldId(this.activeWorldId);
      const previousLinks = [...this.socialLinks];
      const previousResidents = [...this.activeResidents];
      const locationCards = buildLocationCards(worldTemplate, residents);
      const nextSocialLinks = settleSocialLinks(
        previousLinks,
        buildSocialLinks(residents, currentTimestamp),
        currentTimestamp
      );
      const nextTownEvents = mergeTownEvents(
        settleTownEvents({
          previousLinks,
          currentLinks: nextSocialLinks,
          previousResidents,
          currentResidents: residents,
          currentTime: currentTimestamp
        }),
        this.townEvents
      );
      const snapshot = buildTownSnapshot({
        worldTemplate,
        residents,
        locationCards,
        socialLinks: nextSocialLinks,
        townEvents: nextTownEvents,
        autonomousConversationThreads,
        currentTime: this.currentTime,
        sliceTimestamp: currentTimestamp
      });

      this.activeTownSnapshot = snapshot;
      this.activeResidents = snapshot.residents;
      this.locationCards = snapshot.locationCards;
      this.socialLinks = snapshot.socialLinks;
      this.townEvents = snapshot.townEvents;
      this.autonomousConversationThreads = snapshot.autonomousConversationThreads;

      return snapshot;
    },

    async setActiveWorld(worldId) {
      this.activeWorldId = worldId || null;
      await this.refreshActiveWorldSnapshot();
      return this.activeWorld;
    },

    async grantPlayerResidenceAccess({
      residenceLocationId = '',
      hostResidentId = '',
      hostResidentName = '',
      hostResident = null,
      requestAlreadyRecorded = false
    } = {}) {
      const activeWorld = this.activeWorld;
      if (!this.activeWorldId || !activeWorld || !residenceLocationId) {
        return {
          approved: false,
          alreadyAllowed: false,
          events: []
        };
      }

      const visitorId = resolvePlayerVisitorId(activeWorld);
      const playerResidenceLocationId = resolvePlayerResidenceLocationId(activeWorld);
      const activeHostResident = this.activeResidents.find(
        (resident) => String(resident.id) === String(hostResidentId || '')
      ) || null;
      const resolvedHostResident = activeHostResident
        || ((hostResident && typeof hostResident === 'object' && Object.keys(hostResident).length > 0)
          ? hostResident
          : null);
      const alreadyAllowed = isResidenceAccessAllowed({
        worldTemplate: activeWorld,
        locationId: residenceLocationId,
        visitorId,
        ownResidenceLocationId: playerResidenceLocationId,
        hostResident: resolvedHostResident
      });

      if (alreadyAllowed) {
        return {
          approved: true,
          alreadyAllowed: true,
          events: []
        };
      }

      const canRequestVisit = resolvedHostResident
        ? isResidenceVisitRequestAllowed({
          worldTemplate: activeWorld,
          locationId: residenceLocationId,
          visitorId,
          ownResidenceLocationId: playerResidenceLocationId,
          hostResident: resolvedHostResident
        })
        : true;

      if (!canRequestVisit) {
        return {
          approved: false,
          alreadyAllowed: false,
          events: []
        };
      }

      const nextWorld = grantResidenceVisitorAccess(activeWorld, residenceLocationId, visitorId);
      if (nextWorld !== activeWorld) {
        this.worldTemplates = worldTemplateService.saveWorldTemplates(
          this.worldTemplates.map((world) => (
            String(world.id) === String(this.activeWorldId) ? nextWorld : world
          ))
        );
      }

      const latestWorld = this.activeWorld || nextWorld;
      const locationName = (latestWorld?.locations || []).find((item) => item.id === residenceLocationId)?.name
        || residenceLocationId;
      const playerName = latestWorld?.playerIdentityTemplates?.[0]?.name || '玩家';
      const hostName = hostResidentName || resolvedHostResident?.name || '住户';
      const happenedAt = this.currentSliceTimestamp || this.currentTime || Date.now();

      if (resolvedHostResident?.id && typeof characterService.saveCharacter === 'function') {
        const nextHostResident = buildHostResidentVisitRelationship(resolvedHostResident);
        const saveSuccess = await characterService.saveCharacter(nextHostResident);

        if (saveSuccess !== false) {
          if (activeHostResident) {
            Object.assign(activeHostResident, nextHostResident);
          }

          if (hostResident && hostResident !== activeHostResident) {
            Object.assign(hostResident, nextHostResident);
          }
        }
      }

      const events = [
        {
          id: `private-visit-allowed-${hostResidentId || 'host'}-${happenedAt}`,
          type: 'private_visit_allowed',
          happenedAt,
          locationName,
          residentNames: [hostName].filter(Boolean),
          residents: [hostResidentId].filter(Boolean),
          title: `${hostName}同意${playerName}进门`,
          summary: `${hostName}同意${playerName}进入${locationName}拜访。`
        },
        {
          id: `private-visit-requested-${hostResidentId || 'host'}-${happenedAt}`,
          type: 'private_visit_requested',
          happenedAt,
          locationName,
          residentNames: [hostName].filter(Boolean),
          residents: [hostResidentId].filter(Boolean),
          title: `${playerName}申请去${hostName}家拜访`,
          summary: `${playerName}向${hostName}提出了去${locationName}拜访的请求。`
        }
      ];

      const finalEvents = requestAlreadyRecorded
        ? events.filter((item) => item.type !== 'private_visit_requested')
        : events;

      this.townEvents = mergeTownEvents(finalEvents, this.townEvents);

      return {
        approved: true,
        alreadyAllowed: false,
        events: finalEvents
      };
    },

    async createPlayerResidentHomeVisitRequest({
      residentId = '',
      residentName = '',
      residenceLocationId = '',
      residenceLocationName = '',
      currentAction = '',
      hostResident = null
    } = {}) {
      const activeWorld = this.activeWorld;

      if (!this.activeWorldId || !activeWorld) {
        return {
          created: false,
          alreadyAllowed: false,
          event: null,
          chatContext: null
        };
      }

      const activeHostResident = this.activeResidents.find(
        (resident) => String(resident.id) === String(residentId || '')
      ) || null;
      const resolvedHostResident = activeHostResident
        || ((hostResident && typeof hostResident === 'object' && Object.keys(hostResident).length > 0)
          ? hostResident
          : null);
      const visitorId = resolvePlayerVisitorId(activeWorld);
      const ownResidenceLocationId = resolvePlayerResidenceLocationId(activeWorld);
      const resolvedResidenceLocationId = String(residenceLocationId || '').trim()
        || String(resolvedHostResident?.townRuntime?.currentLocationId || '').trim()
        || String(resolvedHostResident?.townProfile?.homeLocationId || '').trim();
      const resolvedResidenceLocationName = String(residenceLocationName || '').trim()
        || String(
          (activeWorld.locations || []).find((item) => String(item.id || '').trim() === resolvedResidenceLocationId)?.name
          || resolvedHostResident?.townRuntime?.currentLocationName
          || ''
        ).trim();

      if (!resolvedResidenceLocationId || !resolvedResidenceLocationName) {
        return {
          created: false,
          alreadyAllowed: false,
          event: null,
          chatContext: null
        };
      }

      const alreadyAllowed = isResidenceAccessAllowed({
        worldTemplate: activeWorld,
        locationId: resolvedResidenceLocationId,
        visitorId,
        ownResidenceLocationId,
        hostResident: resolvedHostResident
      });

      if (alreadyAllowed) {
        return {
          created: false,
          alreadyAllowed: true,
          event: null,
          chatContext: null
        };
      }

      const canRequestVisit = isResidenceVisitRequestAllowed({
        worldTemplate: activeWorld,
        locationId: resolvedResidenceLocationId,
        visitorId,
        ownResidenceLocationId,
        hostResident: resolvedHostResident
      });

      if (!canRequestVisit) {
        return {
          created: false,
          alreadyAllowed: false,
          event: null,
          chatContext: null
        };
      }

      const playerName = activeWorld?.playerIdentityTemplates?.[0]?.name || '玩家';
      const safeResidentName = String(residentName || resolvedHostResident?.name || '').trim() || '对方';
      const safeCurrentAction = String(currentAction || '').trim()
        || String(resolvedHostResident?.townRuntime?.currentAction || '').trim();
      const chatContext = buildPlayerResidentHomeVisitContext({
        playerName,
        residentName: safeResidentName,
        residenceLocationName: resolvedResidenceLocationName,
        currentAction: safeCurrentAction
      });
      const happenedAt = this.currentSliceTimestamp || this.currentTime || Date.now();
      const event = {
        id: `player-resident-home-visit-request-${residentId || 'resident'}-${resolvedResidenceLocationId}-${happenedAt}`,
        type: 'player_resident_home_visit_request',
        happenedAt,
        playerName,
        locationId: resolvedResidenceLocationId,
        locationName: resolvedResidenceLocationName,
        residentNames: [safeResidentName].filter(Boolean),
        residents: [residentId].filter(Boolean),
        currentAction: safeCurrentAction,
        title: chatContext.title,
        summary: chatContext.summary
      };

      this.townEvents = mergeTownEvents([event], this.townEvents);

      return {
        created: true,
        alreadyAllowed: false,
        event,
        chatContext
      };
    },

    async createPlayerResidentInvitation({
      residentId = '',
      residentName = '',
      currentLocationName = '',
      targetLocationId = '',
      targetLocationName = ''
    } = {}) {
      const activeWorld = this.activeWorld;

      if (!this.activeWorldId || !activeWorld) {
        return {
          created: false,
          event: null,
          chatContext: null
        };
      }

      const resolvedTargetLocationName = String(targetLocationName || '').trim()
        || String(
          (activeWorld.publicLocations || []).find((item) => String(item.id || '') === String(targetLocationId || '').trim())?.name
          || (activeWorld.locations || []).find((item) => String(item.id || '') === String(targetLocationId || '').trim())?.name
          || ''
        ).trim();

      if (!resolvedTargetLocationName) {
        return {
          created: false,
          event: null,
          chatContext: null
        };
      }

      const playerName = resolveActiveWorldPlayerName(activeWorld);
      const chatContext = buildPlayerResidentInvitationContext({
        playerName,
        residentName,
        currentLocationName,
        targetLocationName: resolvedTargetLocationName
      });
      const happenedAt = this.currentSliceTimestamp || this.currentTime || Date.now();
      const event = {
        id: `player-resident-invitation-${residentId || 'resident'}-${targetLocationId || resolvedTargetLocationName}-${happenedAt}`,
        type: 'player_resident_invitation',
        happenedAt,
        playerName,
        locationId: String(targetLocationId || '').trim(),
        locationName: resolvedTargetLocationName,
        residentNames: [residentName].filter(Boolean),
        residents: [residentId].filter(Boolean),
        title: chatContext.title,
        summary: chatContext.summary
      };

      this.townEvents = mergeTownEvents([event], this.townEvents);

      return {
        created: true,
        event,
        chatContext
      };
    },

    async createPlayerResidentActivityJoin({
      residentId = '',
      residentName = '',
      locationId = '',
      locationName = '',
      currentAction = ''
    } = {}) {
      const activeWorld = this.activeWorld;

      if (!this.activeWorldId || !activeWorld) {
        return {
          created: false,
          event: null,
          chatContext: null
        };
      }

      const resolvedLocationName = String(locationName || '').trim()
        || String(
          (activeWorld.publicLocations || []).find((item) => String(item.id || '') === String(locationId || '').trim())?.name
          || (activeWorld.locations || []).find((item) => String(item.id || '') === String(locationId || '').trim())?.name
          || ''
        ).trim();

      if (!resolvedLocationName) {
        return {
          created: false,
          event: null,
          chatContext: null
        };
      }

      const playerName = activeWorld?.playerIdentityTemplates?.[0]?.name || '\u73a9\u5bb6';
      const chatContext = buildPlayerResidentActivityJoinContext({
        playerName,
        residentName,
        locationName: resolvedLocationName,
        currentAction
      });
      const happenedAt = this.currentSliceTimestamp || this.currentTime || Date.now();
      const event = {
        id: `player-resident-activity-join-${residentId || 'resident'}-${locationId || resolvedLocationName}-${happenedAt}`,
        type: 'player_resident_activity_join',
        happenedAt,
        playerName,
        locationId: String(locationId || '').trim(),
        locationName: resolvedLocationName,
        residentNames: [residentName].filter(Boolean),
        residents: [residentId].filter(Boolean),
        title: chatContext.title,
        summary: chatContext.summary
      };

      this.townEvents = mergeTownEvents([event], this.townEvents);

      return {
        created: true,
        event,
        chatContext
      };
    },

    async createPlayerRelationshipFocus({
      residentId = '',
      residentName = '',
      relationshipStage = '',
      relationshipSummary = '',
      focusSummary = '',
      currentLocationId = '',
      currentLocationName = '',
      currentAction = ''
    } = {}) {
      const activeWorld = this.activeWorld;

      if (!this.activeWorldId || !activeWorld) {
        return {
          created: false,
          event: null,
          chatContext: null
        };
      }

      const resolvedLocationName = String(currentLocationName || '').trim()
        || String(
          (activeWorld.publicLocations || []).find((item) => String(item.id || '') === String(currentLocationId || '').trim())?.name
          || (activeWorld.locations || []).find((item) => String(item.id || '') === String(currentLocationId || '').trim())?.name
          || activeWorld?.playerIdentityTemplates?.[0]?.address
          || '\u5c0f\u9547\u91cc'
        ).trim();

      const playerName = activeWorld?.playerIdentityTemplates?.[0]?.name || '\u73a9\u5bb6';
      const chatContext = buildPlayerRelationshipFocusContext({
        playerName,
        residentName,
        relationshipStage,
        relationshipSummary,
        focusSummary,
        currentLocationName: resolvedLocationName,
        currentAction
      });
      const happenedAt = this.currentSliceTimestamp || this.currentTime || Date.now();
      const event = {
        id: `player-relationship-focus-${residentId || 'resident'}-${currentLocationId || resolvedLocationName}-${happenedAt}`,
        type: 'player_relationship_focus',
        happenedAt,
        playerName,
        locationId: String(currentLocationId || '').trim(),
        locationName: resolvedLocationName,
        residentNames: [residentName].filter(Boolean),
        residents: [residentId].filter(Boolean),
        title: chatContext.title,
        summary: chatContext.summary
      };

      this.townEvents = mergeTownEvents([event], this.townEvents);

      return {
        created: true,
        event,
        chatContext
      };
    },

    async createPlayerResidentConversationFollowUp({
      intentType = '',
      sourceIntent = '',
      residentId = '',
      residentName = '',
      playerName = '',
      locationId = '',
      locationName = '',
      targetLocationId = '',
      targetLocationName = '',
      relationshipStage = '',
      currentAction = '',
      replySummary = '',
      visitDecision = ''
    } = {}) {
      const activeWorld = this.activeWorld;

      if (!this.activeWorldId || !activeWorld) {
        return {
          created: false,
          event: null
        };
      }

      const resolvedIntentType = String(intentType || sourceIntent || '').trim();
      const resolvedLocationName = String(locationName || '').trim()
        || String(
          (activeWorld.publicLocations || []).find((item) => String(item.id || '') === String(locationId || '').trim())?.name
          || (activeWorld.locations || []).find((item) => String(item.id || '') === String(locationId || '').trim())?.name
          || activeWorld?.playerIdentityTemplates?.[0]?.address
          || '\u5c0f\u9547\u91cc'
        ).trim();
      const resolvedTargetLocationName = String(targetLocationName || '').trim()
        || String(
          (activeWorld.publicLocations || []).find((item) => String(item.id || '') === String(targetLocationId || '').trim())?.name
          || (activeWorld.locations || []).find((item) => String(item.id || '') === String(targetLocationId || '').trim())?.name
          || ''
        ).trim();
      const safeReplySummary = String(replySummary || '').trim();

      if (!resolvedIntentType || !resolvedLocationName || !safeReplySummary) {
        return {
          created: false,
          event: null
        };
      }

      const resolvedPlayerName = String(
        playerName
        || activeWorld?.playerIdentityTemplates?.[0]?.name
        || '\u73a9\u5bb6'
      ).trim() || '\u73a9\u5bb6';
      const safeResidentName = String(residentName || '').trim() || '\u5bf9\u65b9';
      const safeRelationshipStage = String(relationshipStage || '').trim();
      const safeCurrentAction = String(currentAction || '').trim();
      const safeVisitDecision = String(visitDecision || '').trim();
      const happenedAt = this.currentSliceTimestamp || this.currentTime || Date.now();
      const summaryParts = [
        `${safeResidentName}\u5728${resolvedLocationName}\u548c${resolvedPlayerName}\u804a\u8fc7\u4e4b\u540e\uff0c${safeReplySummary}`
      ];

      if (safeRelationshipStage) {
        summaryParts.push(`\u5173\u7cfb\u9636\u6bb5\uff1a${safeRelationshipStage}\u3002`);
      }

      if (safeCurrentAction) {
        summaryParts.push(`\u5f53\u65f6\u5979\u6b63\u5728${safeCurrentAction}\u3002`);
      }

      if (resolvedTargetLocationName) {
        summaryParts.push(`\u76ee\u6807\u5730\u70b9\uff1a${resolvedTargetLocationName}\u3002`);
      }

      if (safeVisitDecision) {
        const visitDecisionLabelMap = {
          accepted: '\u540c\u610f\u8fdb\u5c4b',
          rejected: '\u62d2\u7edd\u8fdb\u5c4b',
          postponed: '\u6539\u5929\u518d\u6765'
        };
        summaryParts.push(`\u62dc\u8bbf\u7ed3\u679c\uff1a${visitDecisionLabelMap[safeVisitDecision] || safeVisitDecision}\u3002`);
      }

      const event = {
        id: `player-resident-conversation-followup-${residentId || 'resident'}-${locationId || resolvedLocationName}-${happenedAt}`,
        type: 'player_resident_conversation_followup',
        sourceIntent: resolvedIntentType,
        happenedAt,
        playerName: resolvedPlayerName,
        locationId: String(locationId || '').trim(),
        locationName: resolvedLocationName,
        targetLocationId: String(targetLocationId || '').trim(),
        targetLocationName: resolvedTargetLocationName,
        residentNames: [safeResidentName].filter(Boolean),
        residents: [residentId].filter(Boolean),
        relationshipStage: safeRelationshipStage,
        currentAction: safeCurrentAction,
        visitDecision: safeVisitDecision,
        replySummary: safeReplySummary,
        title: `${resolvedPlayerName}\u548c${safeResidentName}\u5728${resolvedLocationName}\u804a\u4e86\u804a`,
        summary: summaryParts.join(' ')
      };

      this.townEvents = mergeTownEvents([event], this.townEvents);

      return {
        created: true,
        event
      };
    },

    async leaveResidentHomeVisitMessage({
      residentId = '',
      residentName = '',
      residenceLocationId = '',
      residenceLocationName = '',
      messageContent = '',
      replySummary = ''
    } = {}) {
      const activeWorld = this.activeWorld;
      const safeResidentId = String(residentId || '').trim();
      const safeMessageContent = String(messageContent || '').trim();
      const safeReplySummary = String(replySummary || '').trim();

      if (!this.activeWorldId || !activeWorld || !safeResidentId || !safeMessageContent || !safeReplySummary) {
        return {
          created: false,
          event: null,
          replyEvent: null
        };
      }

      const activeResident = this.activeResidents.find(
        (resident) => String(resident.id || '').trim() === safeResidentId
      ) || null;
      const safeResidentName = String(residentName || activeResident?.name || '').trim() || '对方';
      const safeLocationId = String(residenceLocationId || '').trim();
      const safeLocationName = resolveHomeVisitLocationName(
        activeWorld,
        safeLocationId,
        residenceLocationName
      );

      if (!safeLocationId || !safeLocationName) {
        return {
          created: false,
          event: null,
          replyEvent: null
        };
      }

      const playerName = resolveActiveWorldPlayerName(activeWorld);
      const happenedAt = this.currentSliceTimestamp || this.currentTime || Date.now();
      const replyHappenedAt = happenedAt + 1;
      const event = {
        id: `private-visit-message-left-${safeResidentId}-${safeLocationId}-${happenedAt}`,
        type: 'private_visit_message_left',
        happenedAt,
        playerName,
        locationId: safeLocationId,
        locationName: safeLocationName,
        residentNames: [safeResidentName],
        residents: [safeResidentId],
        messageContent: safeMessageContent,
        title: `${playerName}给${safeResidentName}留了消息`,
        summary: `${playerName}去${safeLocationName}拜访时没见到${safeResidentName}，留下了消息：“${safeMessageContent}”`
      };
      const replyEvent = {
        id: `private-visit-message-replied-${safeResidentId}-${safeLocationId}-${replyHappenedAt}`,
        type: 'private_visit_message_replied',
        happenedAt: replyHappenedAt,
        playerName,
        locationId: safeLocationId,
        locationName: safeLocationName,
        residentNames: [safeResidentName],
        residents: [safeResidentId],
        replySummary: safeReplySummary,
        title: `${safeResidentName}回了你的门口留言`,
        summary: `${safeResidentName}后来看到你留在${safeLocationName}的消息后，通过手机回了你一句：“${safeReplySummary}”`
      };

      if (typeof messageService?.saveMessage === 'function') {
        await messageService.saveMessage(buildResidentPhoneChatId(safeResidentId), {
          id: `private-visit-message-${safeResidentId}-${replyHappenedAt}`,
          role: 'model',
          content: safeReplySummary,
          type: 'text',
          isSystem: false
        });
      }

      if (activeResident) {
        const relationshipPatch = buildResidentRelationshipAfterFollowUp(activeResident, {
          familiarityDelta: 1
        });
        const nextResident = {
          ...activeResident,
          unread: Math.max(0, Number(activeResident.unread) || 0) + 1,
          summary: safeReplySummary,
          ...relationshipPatch
        };

        if (typeof characterService.saveCharacter === 'function') {
          const saveSuccess = await characterService.saveCharacter(nextResident);

          if (saveSuccess !== false) {
            Object.assign(activeResident, nextResident);
          }
        } else {
          Object.assign(activeResident, nextResident);
        }
      }

      this.townEvents = mergeTownEvents([replyEvent, event], this.townEvents);

      return {
        created: true,
        event,
        replyEvent
      };
    },

    async scheduleResidentHomeVisitFollowUp({
      residentId = '',
      residentName = '',
      residenceLocationId = '',
      residenceLocationName = '',
      scheduleOptionId = '',
      scheduleLabel = '',
      replySummary = ''
    } = {}) {
      const activeWorld = this.activeWorld;
      const safeResidentId = String(residentId || '').trim();
      const safeScheduleOptionId = String(scheduleOptionId || '').trim();
      const safeScheduleLabel = String(scheduleLabel || '').trim();
      const safeReplySummary = String(replySummary || '').trim();

      if (
        !this.activeWorldId
        || !activeWorld
        || !safeResidentId
        || !safeScheduleOptionId
        || !safeScheduleLabel
        || !safeReplySummary
      ) {
        return {
          created: false,
          event: null
        };
      }

      const activeResident = this.activeResidents.find(
        (resident) => String(resident.id || '').trim() === safeResidentId
      ) || null;
      const safeResidentName = String(residentName || activeResident?.name || '').trim() || '对方';
      const safeLocationId = String(residenceLocationId || '').trim();
      const safeLocationName = resolveHomeVisitLocationName(
        activeWorld,
        safeLocationId,
        residenceLocationName
      );

      if (!safeLocationId || !safeLocationName) {
        return {
          created: false,
          event: null
        };
      }

      const playerName = resolveActiveWorldPlayerName(activeWorld);
      const happenedAt = this.currentSliceTimestamp || this.currentTime || Date.now();
      const event = {
        id: `private-visit-scheduled-${safeResidentId}-${safeLocationId}-${happenedAt}`,
        type: 'private_visit_scheduled',
        happenedAt,
        playerName,
        locationId: safeLocationId,
        locationName: safeLocationName,
        residentNames: [safeResidentName],
        residents: [safeResidentId],
        scheduleOptionId: safeScheduleOptionId,
        scheduleLabel: safeScheduleLabel,
        replySummary: safeReplySummary,
        title: `${playerName}和${safeResidentName}约了下次拜访时间`,
        summary: `${playerName}和${safeResidentName}把去${safeLocationName}拜访的时间约在“${safeScheduleLabel}”。${safeReplySummary}`
      };

      this.townEvents = mergeTownEvents([event], this.townEvents);

      return {
        created: true,
        event
      };
    },

    async createScenePublicChatTurn({
      locationId = '',
      locationName = '',
      userContent = ''
    } = {}) {
      const activeWorld = this.activeWorld;
      const safeUserContent = String(userContent || '').trim();

      if (!this.activeWorldId || !activeWorld || !safeUserContent) {
        return {
          created: false,
          errorCode: 'invalid_input',
          sceneChatId: ''
        };
      }

      const config = getCurrentLlmConfig();
      if (!config || !config.apiKey) {
        return {
          created: false,
          errorCode: 'missing_model_config',
          sceneChatId: ''
        };
      }

      const safeLocationName = String(locationName || '').trim();
      const targetLocationCard = findLocationCard(this.locationCards, safeLocationName);
      const worldLocation = (activeWorld.locations || []).find((item) => (
        String(item?.id || '').trim() === String(locationId || '').trim()
        || String(item?.name || '').trim() === safeLocationName
      )) || null;
      const resolvedLocationId = String(locationId || '').trim()
        || String(targetLocationCard?.id || '').trim()
        || String(worldLocation?.id || '').trim()
        || safeLocationName;
      const resolvedLocationName = safeLocationName
        || String(targetLocationCard?.name || '').trim()
        || String(worldLocation?.name || '').trim()
        || resolvedLocationId;
      const sceneChatId = buildScenePublicChatId({
        worldId: this.activeWorldId,
        locationId: resolvedLocationId
      });
      const presentResidents = this.activeResidents.filter((resident) => {
        const residentLocationId = resolveResidentLocationId(resident);
        const residentLocationName = resolveResidentLocationName(resident);

        return (
          (residentLocationId && residentLocationId === resolvedLocationId)
          || (residentLocationName && residentLocationName === resolvedLocationName)
        );
      });

      if (presentResidents.length === 0) {
        return {
          created: false,
          errorCode: 'no_present_residents',
          sceneChatId
        };
      }

      const happenedAt = this.currentSliceTimestamp || this.currentTime || Date.now();
      const playerName = resolveActiveWorldPlayerName(activeWorld);
      const userMessage = {
        id: `scene-public-user-${resolvedLocationId}-${happenedAt}`,
        role: 'user',
        type: 'scene_public',
        content: safeUserContent,
        isSystem: false
      };

      await messageService.saveMessage(sceneChatId, userMessage);

      const history = await messageService.getMessages(sceneChatId);
      const dispatch = await dispatchTownSceneChat({
        config,
        playerName,
        locationId: resolvedLocationId,
        locationName: resolvedLocationName,
        atmosphere: targetLocationCard?.atmosphere || worldLocation?.description || '',
        residents: presentResidents,
        history,
        townEvents: this.townEvents,
        userContent: safeUserContent
      });

      for (const turn of dispatch.speakerTurns || []) {
        const content = formatSceneSpeakerTurn(turn);
        if (!content) {
          continue;
        }

        await messageService.saveMessage(sceneChatId, {
          id: `scene-public-model-${turn.residentId}-${happenedAt}-${Math.random()}`,
          role: 'model',
          type: 'scene_public',
          content,
          isSystem: false
        });
      }

      await messageService.saveMessage(
        sceneChatId,
        buildSceneDispatchMetaMessage(dispatch, {
          sceneChatId,
          worldId: this.activeWorldId,
          locationId: resolvedLocationId,
          locationName: resolvedLocationName,
          playerName,
          happenedAt
        })
      );

      const updatedResidentsById = new Map();
      const sceneRelationshipEvents = [];
      const sceneFollowUpEvents = [];

      for (const resident of presentResidents) {
        const residentId = String(resident.id || '').trim();
        const speakerTurn = (dispatch.speakerTurns || []).find(
          (item) => String(item?.residentId || '').trim() === residentId
        ) || null;
        const projection = (dispatch.memoryProjections || []).find(
          (item) => String(item?.residentId || '').trim() === residentId
        ) || null;
        const relationshipEffect = (dispatch.relationshipEffects || []).find(
          (item) => String(item?.residentId || '').trim() === residentId
        ) || null;
        const participation = resolveSceneResidentParticipation({
          residentId,
          dispatchContext: dispatch.dispatchContext,
          projection,
          speakerTurn
        });
        const scaledRelationshipEffect = scaleSceneRelationshipEffect(relationshipEffect, {
          participationRole: participation.role,
          perspective: projection?.perspective
        });
        const nextResident = {
          ...resident
        };

        if (projection) {
          nextResident.sceneMemories = mergeSceneMemoryDigests(
            resident.sceneMemories || [],
            [
              buildSceneMemoryDigest(projection, {
                sceneChatId,
                worldId: this.activeWorldId,
                locationId: resolvedLocationId,
                locationName: resolvedLocationName,
                happenedAt
              })
            ],
            6
          );
        }

        if (scaledRelationshipEffect) {
          const relationshipSettlement = buildResidentRelationshipAfterSceneEffect(resident, scaledRelationshipEffect);
          Object.assign(nextResident, relationshipSettlement.residentPatch);

          const unlockEvent = buildSceneRelationshipPermissionUnlockEvent({
            resident: nextResident,
            unlockedPermissions: relationshipSettlement.unlockedPermissions,
            playerName,
            locationId: resolvedLocationId,
            locationName: resolvedLocationName,
            happenedAt,
            reason: scaledRelationshipEffect.reason
          });

          if (unlockEvent) {
            sceneRelationshipEvents.push(unlockEvent);
          }
        }

        if (participation.shouldCreateFollowUp) {
          const followUpEvent = buildSceneConversationFollowUpEvent({
            resident: nextResident,
            playerName,
            locationId: resolvedLocationId,
            locationName: resolvedLocationName,
            relationshipStage: nextResident.playerRelationship?.summaryText || nextResident.relation || '',
            currentAction: nextResident.townRuntime?.currentAction || nextResident.currentAction || '',
            replySummary: resolveSceneFollowUpReplySummary({
              speakerTurn,
              relationshipEffect: scaledRelationshipEffect,
              projection,
              sceneSummary: dispatch.sceneSummary
            }),
            happenedAt
          });

          if (followUpEvent) {
            sceneFollowUpEvents.push(followUpEvent);
          }
        }

        updatedResidentsById.set(residentId, nextResident);

        if (projection && shouldPersistSceneMemoryToDiary(projection, dispatch)) {
          const diaryDateStr = formatDiaryDateTime(happenedAt);
          const detail = [
            `地点：${resolvedLocationName}`,
            `现场摘要：${dispatch.sceneSummary}`,
            projection.summary ? `我的记忆：${projection.summary}` : '',
            scaledRelationshipEffect?.reason ? `关系变化原因：${scaledRelationshipEffect.reason}` : ''
          ]
            .filter(Boolean)
            .join('\n');

          await DB.execute(
            `INSERT INTO diaries (id, roleId, dateStr, brief, detail, mood) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              Number(happenedAt) * 1000 + Math.floor(Math.random() * 1000),
              residentId,
              diaryDateStr,
              projection.summary,
              detail,
              '公开聊天'
            ]
          );
        }
      }

      const nextResidents = this.activeResidents.map((resident) => {
        const residentId = String(resident.id || '').trim();
        return updatedResidentsById.get(residentId) || resident;
      });

      if (updatedResidentsById.size > 0) {
        await characterService.saveCharactersBatch(
          nextResidents.filter((resident) => updatedResidentsById.has(String(resident.id || '').trim()))
        );
        await this.refreshActiveWorldSnapshot(nextResidents);
      }

      const speakerTurns = dispatch.speakerTurns || [];
      const event = {
        id: `public-scene-chat-${resolvedLocationId}-${happenedAt}`,
        type: 'public_scene_chat',
        happenedAt,
        playerName,
        locationId: resolvedLocationId,
        locationName: resolvedLocationName,
        residentNames: speakerTurns.map((turn) => turn.residentName).filter(Boolean),
        residents: speakerTurns.map((turn) => turn.residentId).filter(Boolean),
        title: speakerTurns.length > 0
          ? `${playerName}在${resolvedLocationName}和${speakerTurns.map((turn) => turn.residentName).join('、')}聊了起来`
          : `${playerName}在${resolvedLocationName}抛出了一个公开话题`,
        summary: dispatch.sceneSummary
      };

      this.townEvents = mergeTownEvents([
        ...sceneRelationshipEvents,
        ...sceneFollowUpEvents,
        event
      ], this.townEvents);

      return {
        created: true,
        event,
        sceneChatId,
        dispatch,
        messages: [
          userMessage,
          ...(speakerTurns || []).map((turn) => ({
            role: 'model',
            type: 'scene_public',
            content: formatSceneSpeakerTurn(turn),
            isSystem: false
          }))
        ]
      };
    },

    async markResidentPhoneReplyRead({
      residentId = ''
    } = {}) {
      const safeResidentId = String(residentId || '').trim();

      if (!safeResidentId) {
        return {
          updated: false,
          resident: null
        };
      }

      const activeResident = this.activeResidents.find(
        (resident) => String(resident.id || '').trim() === safeResidentId
      ) || null;

      if (!activeResident) {
        return {
          updated: false,
          resident: null
        };
      }

      const currentUnread = Math.max(0, Number(activeResident.unread) || 0);
      if (currentUnread <= 0) {
        return {
          updated: false,
          resident: activeResident
        };
      }

      const nextResident = {
        ...activeResident,
        unread: 0
      };

      if (typeof characterService.saveCharacter === 'function') {
        const saveSuccess = await characterService.saveCharacter(nextResident);
        if (saveSuccess === false) {
          return {
            updated: false,
            resident: activeResident
          };
        }
      }

      Object.assign(activeResident, nextResident);

      return {
        updated: true,
        resident: activeResident
      };
    },

    async markResidentRemoteReplyRead(options = {}) {
      return this.markResidentPhoneReplyRead(options);
    },

    async initialize({ force = false } = {}) {
      if (this.isReady && !force) {
        return this.activeWorld;
      }

      if (initializationPromise && !force) {
        return initializationPromise;
      }

      initializationPromise = (async () => {
        this.isInitializing = true;
        this.initializationError = null;

        if (force) {
          this.isReady = false;
        }

        try {
          this.worldTemplates = worldTemplateService.ensureDefaultWorldTemplate();

          if (!this.worldTemplates.some((item) => item.id === this.activeWorldId)) {
            this.activeWorldId = this.worldTemplates[0]?.id || null;
          }

          const activeWorld = this.activeWorld;
          let residents = await characterService.getCharactersByWorldId(this.activeWorldId);
          const existingResidentIds = new Set(residents.map((resident) => String(resident.id)));
          const missingStarterResidents = (activeWorld?.starterResidents || [])
            .filter((resident) => !existingResidentIds.has(String(resident.id)))
            .map((resident) => ({
              ...resident,
              worldId: this.activeWorldId,
              currentLocation: resident.townRuntime?.currentLocationName || resident.location || '',
              currentAction: resident.townRuntime?.currentAction || resident.lastActivity || '待在原地'
            }));

          if (missingStarterResidents.length > 0) {
            await characterService.saveCharactersBatch(missingStarterResidents);
            residents = [...residents, ...missingStarterResidents];
          }

          await this.refreshActiveWorldSnapshot(residents);

          syncClockState(this, townClockService.getSnapshot());
          this.isReady = true;

          return this.activeWorld;
        } catch (error) {
          this.initializationError = error;
          this.isReady = false;
          throw error;
        } finally {
          this.isInitializing = false;
          initializationPromise = null;
        }
      })();

      return initializationPromise;
    },

    async simulateResidentsForSlice({
      sliceTimestamp = 0,
      residentsOverride = null
    } = {}) {
      const safeSliceTimestamp = Number(sliceTimestamp);
      const worldTemplate = this.activeWorld;

      if (!this.activeWorldId || !worldTemplate || !Number.isFinite(safeSliceTimestamp)) {
        return {
          simulated: false,
          residents: Array.isArray(residentsOverride) ? residentsOverride : [],
          townSnapshot: null,
          saveSuccess: false,
          debugReport: null,
          autonomousConversationDebug: null
        };
      }

      const residents = Array.isArray(residentsOverride)
        ? residentsOverride
        : await characterService.getCharactersByWorldId(this.activeWorldId);
      const playerResidenceLocationId = resolvePlayerResidenceLocationId(worldTemplate);
      let nextResidents = [];

      for (const resident of residents) {
        nextResidents.push(await simulateResidentSlice({
          resident,
          worldTemplate,
          currentTime: safeSliceTimestamp,
          socialLinks: this.socialLinks,
          residentSnapshots: residents,
          townEvents: this.townEvents,
          playerResidenceLocationId
        }));
      }

      const autonomousConversationResult = advanceAutonomousConversationRuntime({
        residents: nextResidents,
        autonomousThreads: this.autonomousConversationThreads,
        townEvents: this.townEvents,
        currentTime: safeSliceTimestamp
      });
      const nextAutonomousThreads = [...autonomousConversationResult.nextThreads];
      let nextTownEvents = [...this.townEvents];
      let pendingRelationshipPatches = [];
      const initialSaveSuccess = await characterService.saveCharactersBatch(nextResidents);
      const autonomousConversationDebug = {
        ...(autonomousConversationResult.debug || {}),
        executedRoundThreadIds: [],
        persistedSceneChatIds: [],
        lastWriteBack: ''
      };

      const executableAutonomousThreads = [
        ...(Array.isArray(autonomousConversationResult.startedThreads)
          ? autonomousConversationResult.startedThreads
          : []),
        ...(Array.isArray(autonomousConversationResult.continuedThreads)
          ? autonomousConversationResult.continuedThreads
          : [])
      ];

      if (initialSaveSuccess !== false && executableAutonomousThreads.length > 0) {
        const config = getCurrentLlmConfig();

        for (const thread of executableAutonomousThreads) {
          const round = await runAutonomousConversationRound({
            thread,
            residents: nextResidents,
            config
          });
          const writeBack = buildAutonomousConversationWriteBack({
            thread,
            round,
            currentTime: safeSliceTimestamp
          });
          const persisted = String(thread?.type || '').trim() === 'scene_autonomous'
            ? await persistAutonomousSceneRoundMessages({
              worldId: this.activeWorldId,
              thread,
              round,
              happenedAt: safeSliceTimestamp
            })
            : false;

          nextResidents = applyAutonomousConversationWriteBackToResidents(nextResidents, writeBack);
          nextTownEvents = mergeTownEvents(writeBack.events, nextTownEvents);
          pendingRelationshipPatches = [
            ...pendingRelationshipPatches,
            ...(Array.isArray(writeBack?.relationshipPatches) ? writeBack.relationshipPatches : [])
          ];

          const shouldContinue = round?.shouldContinue !== false;
          const settledThread = shouldContinue
            ? continueAutonomousConversationThread({
              thread: {
                ...thread,
                lastSummary: String(round?.summary || '').trim()
              },
              advancedAt: safeSliceTimestamp
            })
            : closeAutonomousConversationThread({
              thread: {
                ...thread,
                lastSummary: String(round?.summary || '').trim()
              },
              closedAt: safeSliceTimestamp,
              reason: 'ai_suggested_end'
            });
          const targetIndex = nextAutonomousThreads.findIndex(
            (item) => String(item?.id || '').trim() === String(thread?.id || '').trim()
          );

          if (targetIndex >= 0) {
            nextAutonomousThreads.splice(targetIndex, 1, settledThread);
          }

          autonomousConversationDebug.executedRoundThreadIds.push(String(thread?.id || '').trim());
          if (writeBack.summary) {
            autonomousConversationDebug.lastWriteBack = writeBack.summary;
          }
          if (persisted) {
            autonomousConversationDebug.persistedSceneChatIds.push(buildScenePublicChatId({
              worldId: this.activeWorldId,
              locationId: String(thread?.locationId || '').trim()
            }));
          }
        }
      }

      const saveSuccess = initialSaveSuccess !== false
        ? await characterService.saveCharactersBatch(nextResidents)
        : false;

      if (saveSuccess !== false) {
        this.townEvents = nextTownEvents;
      }

      const townSnapshot = saveSuccess === false
        ? await this.refreshActiveWorldSnapshot()
        : await this.refreshActiveWorldSnapshot(nextResidents, {
          autonomousThreadsOverride: nextAutonomousThreads
        });

      if (saveSuccess !== false && pendingRelationshipPatches.length > 0) {
        const patchedSocialLinks = applyRelationshipPatchesToSocialLinks({
          socialLinks: this.socialLinks,
          relationshipPatches: pendingRelationshipPatches,
          residents: nextResidents,
          currentTime: safeSliceTimestamp
        });

        this.socialLinks = patchedSocialLinks;
        this.activeTownSnapshot = {
          ...this.activeTownSnapshot,
          socialLinks: patchedSocialLinks
        };
      }

      const debugReport = buildSimulationDebugReport({
        sliceTimestamp: safeSliceTimestamp,
        residents: nextResidents,
        saveSuccess
      });
      this.latestSimulationDebug = debugReport;
      this.latestAutonomousConversationDebug = autonomousConversationDebug;

      return {
        simulated: true,
        residents: saveSuccess === false ? [...this.activeResidents] : nextResidents,
        townSnapshot,
        saveSuccess: saveSuccess !== false,
        debugReport,
        autonomousConversationDebug
      };
    },

    async advanceTimeTo(timestamp) {
      const targetTime = Number(timestamp);

      if (!Number.isFinite(targetTime)) {
        return {
          ...buildClockStateResult(this),
          crossedSlice: false
        };
      }

      const parsedCurrentSliceTimestamp = Number(this.currentSliceTimestamp);
      const startSliceTimestamp = Number.isFinite(parsedCurrentSliceTimestamp)
        ? parsedCurrentSliceTimestamp
        : floorToSlice(this.currentTime);

      if (!this.activeWorldId || targetTime <= this.currentTime) {
        const snapshot = setClockTime(this, targetTime);

        if (this.activeWorldId) {
          await this.refreshActiveWorldSnapshot();
        }

        return {
          ...snapshot,
          crossedSlice: false,
          debugReport: this.latestSimulationDebug
        };
      }

      let residents = Array.isArray(this.activeResidents) && this.activeResidents.length > 0
        ? this.activeResidents
        : await characterService.getCharactersByWorldId(this.activeWorldId);

      const targetSliceTimestamp = floorToSlice(targetTime);
      const advanceResult = await advanceClockAcrossSlices(this, {
        startSliceTimestamp,
        targetSliceTimestamp,
        residents
      });
      const crossedSlice = advanceResult.crossedSlice;
      residents = advanceResult.residents;
      const finalSnapshot = setClockTime(this, targetTime);

      if (!crossedSlice) {
        await this.refreshActiveWorldSnapshot(
          Array.isArray(residents) && residents.length > 0 ? residents : null
        );
      }

      return {
        ...finalSnapshot,
        crossedSlice,
        debugReport: crossedSlice ? this.latestSimulationDebug : this.latestSimulationDebug
      };
    },

    ensureClockRunning(onSlice) {
      if (timer) return;

      timer = setInterval(async () => {
        if (isTicking) return;
        isTicking = true;

        try {
          const snapshot = syncClockState(this, townClockService.tick(1000));

          if (snapshot.crossedSlice && this.activeWorldId) {
            const simulationResult = await this.simulateResidentsForSlice({
              sliceTimestamp: snapshot.sliceTimestamp
            });

            if (onSlice) {
              await onSlice({
                ...snapshot,
                townSnapshot: simulationResult.townSnapshot
              });
            }
          }
        } finally {
          isTicking = false;
        }
      }, 1000);
    },

    stopClock() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
      isTicking = false;
    },

    setCurrentTime(timestamp) {
      return setClockTime(this, timestamp);
    },

    setTimeRatio(ratio) {
      return syncClockState(this, townClockService.setTimeRatio(ratio));
    }
  }
});
