import { computed, ref } from 'vue';
import { requestResidentDoorstepConversationTurn } from '@/services/townDoorReplyService.js';
import { startResidentHomeVisitConversation } from '@/utils/town/town-home-visit-conversation.js';
import { resolveHomeVisitDoorReplyLabel } from '@/utils/town/town-home-visit-door-reply.js';
import {
  buildDefaultHomeVisitLeaveMessage,
  buildHomeVisitAbsenceResult,
  buildHomeVisitLeaveMessageReplySummary,
  buildHomeVisitScheduleReplySummary,
  createHomeVisitScheduleOptions
} from '@/utils/town/town-home-visit-follow-ups.js';
import { buildDoorstepChatActions } from '@/utils/town/town-doorstep-chat-actions.js';

const DEFAULT_WAIT_OUTSIDE_MESSAGE = '我在门口再等一会。';
const DEFAULT_WAIT_OUTSIDE_FALLBACK_REPLY = '你在门口又等了一会，但屋里暂时没有新的回应。';
const DEFAULT_CONVERSATION_FALLBACK_REPLY = '门内没有传来更明确的新回应。';
const DEFAULT_LEAVE_MESSAGE_SUCCESS_REPLY = '你把消息留在了门口。她之后会通过手机回你，首页“手机”里已经能看到这条回复。';

function createDoorstepMessage({
  role = 'model',
  content = '',
  prefix = 'doorstep'
} = {}) {
  return {
    id: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content: String(content || '').trim(),
    type: 'text',
    isSystem: false
  };
}

function resolveReplySummary(replySummary = '', fallbackSummary = '') {
  const safeReplySummary = String(replySummary || '').trim();
  return safeReplySummary || String(fallbackSummary || '').trim();
}

export function useResidentDoorstepConversation({
  townStore,
  resolvePlayerName = () => '玩家'
} = {}) {
  const sheetVisible = ref(false);
  const messageList = ref([]);
  const decision = ref('postponed');
  const panelMode = ref('chat');
  const chatDraft = ref('');
  const leaveMessageDraft = ref('');
  const isStartingConversation = ref(false);
  const isSubmittingAction = ref(false);
  const sessionContext = ref(null);
  const actionMode = ref('default');
  const scheduleOptions = createHomeVisitScheduleOptions();

  const decisionLabel = computed(() => resolveHomeVisitDoorReplyLabel(decision.value));
	  const actionList = computed(() => {
	    const actions = buildDoorstepChatActions({
	      decision: decision.value
	    }).filter((item) => String(item?.id || '').trim() !== 'enter_home');

    if (actionMode.value === 'end_only') {
      return actions.filter((item) => String(item?.id || '').trim() === 'end_visit');
    }

    return actions;
  });
  const residentName = computed(() => String(sessionContext.value?.residentName || '').trim());
  const residenceLocationName = computed(() => String(sessionContext.value?.residenceLocationName || '').trim());
  const isBusy = computed(() => isStartingConversation.value || isSubmittingAction.value);
  const canSend = computed(() => String(chatDraft.value || '').trim().length > 0);
  const canSubmitLeaveMessage = computed(() => String(leaveMessageDraft.value || '').trim().length > 0);
  const canEnterResidence = computed(() => (
    decision.value === 'accepted' && Boolean(sessionContext.value?.canEnter)
  ));
  const showChatInput = computed(() => (
    panelMode.value === 'chat'
    && actionMode.value !== 'end_only'
    && decision.value !== 'absent_or_no_answer'
  ));

  function appendMessage({
    role = 'model',
    content = '',
    prefix = 'doorstep'
  } = {}) {
    const message = createDoorstepMessage({
      role,
      content,
      prefix
    });

    if (!message.content) {
      return null;
    }

    messageList.value.push(message);
    return message;
  }

  async function createConversationFollowUp({
    intentType = '',
    replySummary = '',
    visitDecision = ''
  } = {}) {
    if (!sessionContext.value || !replySummary || typeof townStore?.createPlayerResidentConversationFollowUp !== 'function') {
      return;
    }

    await townStore.createPlayerResidentConversationFollowUp({
      intentType,
      sourceIntent: intentType,
      residentId: sessionContext.value.residentId || '',
      residentName: sessionContext.value.residentName || '',
      locationId: sessionContext.value.residenceLocationId || '',
      locationName: sessionContext.value.residenceLocationName || '',
      currentAction: sessionContext.value.currentAction || '',
      replySummary,
      visitDecision
    });
  }

  async function ensureResidenceAccessIfAccepted({
    visitDecision = ''
  } = {}) {
    if (visitDecision !== 'accepted' || !sessionContext.value || typeof townStore?.grantPlayerResidenceAccess !== 'function') {
      return false;
    }

    const result = await townStore.grantPlayerResidenceAccess({
      residenceLocationId: sessionContext.value.residenceLocationId || '',
      hostResidentId: sessionContext.value.residentId || '',
      hostResidentName: sessionContext.value.residentName || '',
      hostResident: sessionContext.value.hostResident || null,
      requestAlreadyRecorded: true
    });

    return Boolean(result?.approved);
  }

  async function requestDoorstepTurn({
    playerMessage = '',
    intentType = 'resident_home_visit_conversation_turn',
    fallbackReplySummary = DEFAULT_CONVERSATION_FALLBACK_REPLY
  } = {}) {
    if (!sessionContext.value) {
      return null;
    }

    const trimmedMessage = String(playerMessage || '').trim();
    if (trimmedMessage) {
      appendMessage({
        role: 'user',
        content: trimmedMessage,
        prefix: 'doorstep-user'
      });
    }

    isSubmittingAction.value = true;
    panelMode.value = 'chat';
    actionMode.value = 'default';

    try {
      const turnReply = await requestResidentDoorstepConversationTurn({
        residentId: sessionContext.value.residentId || '',
        residentName: sessionContext.value.residentName || '',
        residenceLocationId: sessionContext.value.residenceLocationId || '',
        residenceLocationName: sessionContext.value.residenceLocationName || '',
        currentAction: sessionContext.value.currentAction || '',
        hostResident: sessionContext.value.hostResident || null,
        playerName: resolvePlayerName(),
        playerMessage: trimmedMessage,
        transcript: messageList.value.filter((item) => !item.isSystem),
        visitSessionId: sessionContext.value.visitSessionId || '',
        doorstepConversationId: sessionContext.value.doorstepConversationId || ''
      });

      const nextDecision = String(turnReply?.decision || '').trim() || 'postponed';
      const replySummary = resolveReplySummary(turnReply?.replySummary, fallbackReplySummary);

      if (replySummary) {
        appendMessage({
          role: 'model',
          content: replySummary,
          prefix: 'doorstep-model'
        });
      }

      if (replySummary) {
        await createConversationFollowUp({
          intentType,
          replySummary,
          visitDecision: nextDecision
        });
      }

      let canEnter = false;
      if (nextDecision === 'accepted') {
        canEnter = await ensureResidenceAccessIfAccepted({
          visitDecision: nextDecision
        });
      }

      decision.value = nextDecision;
      sessionContext.value = {
        ...(sessionContext.value || {}),
        canEnter
      };

      return {
        decision: nextDecision,
        replySummary,
        canEnter
      };
    } finally {
      isSubmittingAction.value = false;
    }
  }

  function resetConversation() {
    sheetVisible.value = false;
    messageList.value = [];
    decision.value = 'postponed';
    panelMode.value = 'chat';
    chatDraft.value = '';
    leaveMessageDraft.value = '';
    isStartingConversation.value = false;
    isSubmittingAction.value = false;
    sessionContext.value = null;
    actionMode.value = 'default';
  }

  function closeSheet() {
    resetConversation();
  }

  function cancelSubpanel() {
    panelMode.value = 'chat';
  }

  async function startConversation({
    residentId = '',
    residentName: nextResidentName = '',
    residenceLocationId = '',
    residenceLocationName = '',
    currentAction = '',
    hostResident = null,
    isResidentHomeNow = true,
    happenedAt = Date.now()
  } = {}) {
    resetConversation();
    isStartingConversation.value = true;

    try {
      sessionContext.value = {
        residentId: String(residentId || '').trim(),
        residentName: String(nextResidentName || '').trim(),
        residenceLocationId: String(residenceLocationId || '').trim(),
        residenceLocationName: String(residenceLocationName || '').trim(),
        currentAction: String(currentAction || '').trim(),
        hostResident,
        visitSessionId: '',
        doorstepConversationId: '',
        canEnter: false
      };

      if (!isResidentHomeNow) {
        const absentResult = buildHomeVisitAbsenceResult({
          residentName: nextResidentName
        });
        const replySummary = String(absentResult.replySummary || '').trim();
        decision.value = absentResult.decision || 'absent_or_no_answer';
        panelMode.value = 'chat';
        actionMode.value = 'default';
        sheetVisible.value = true;

        if (replySummary) {
          appendMessage({
            role: 'model',
            content: replySummary,
            prefix: 'doorstep-initial'
          });
        }

        return {
          status: 'opened',
          visitSessionId: '',
          decision: decision.value
        };
      }

      const conversationResult = await startResidentHomeVisitConversation({
        townStore,
        requestConversationTurn: requestResidentDoorstepConversationTurn,
        residentId,
        residentName: nextResidentName,
        residenceLocationId,
        residenceLocationName,
        currentAction,
        hostResident,
        playerName: resolvePlayerName(),
        happenedAt
      });
      const visitSessionId = String(conversationResult?.visitSessionId || '').trim();
      const doorstepConversationId = String(conversationResult?.doorstepConversationId || '').trim();

      sessionContext.value = {
        ...(sessionContext.value || {}),
        visitSessionId,
        doorstepConversationId
      };

      if (conversationResult?.alreadyAllowed) {
        return {
          status: 'already_allowed',
          visitSessionId,
          decision: 'accepted'
        };
      }

      if (!conversationResult?.requestResult?.created) {
        return {
          status: 'blocked',
          visitSessionId,
          decision: 'blocked'
        };
      }

      const initialDecision = String(conversationResult?.decision || '').trim() || 'postponed';
      const initialReplySummary = String(conversationResult?.initialTurn?.content || '').trim();
      decision.value = initialDecision;
      panelMode.value = 'chat';
      actionMode.value = 'default';
      sheetVisible.value = true;

      if (initialReplySummary) {
        appendMessage({
          role: 'model',
          content: initialReplySummary,
          prefix: 'doorstep-initial'
        });
        await createConversationFollowUp({
          intentType: 'resident_home_visit_request',
          replySummary: initialReplySummary,
          visitDecision: initialDecision
        });
      }

      if (initialDecision === 'accepted') {
        const canEnter = await ensureResidenceAccessIfAccepted({
          visitDecision: initialDecision
        });
        sessionContext.value = {
          ...(sessionContext.value || {}),
          canEnter
        };
      }

      return {
        status: 'opened',
        visitSessionId,
        decision: initialDecision
      };
    } finally {
      isStartingConversation.value = false;
    }
  }

  async function sendMessage() {
    if (!canSend.value || !sessionContext.value) {
      return false;
    }

    const playerMessage = String(chatDraft.value || '').trim();
    chatDraft.value = '';
    await requestDoorstepTurn({
      playerMessage,
      intentType: 'resident_home_visit_conversation_turn',
      fallbackReplySummary: DEFAULT_CONVERSATION_FALLBACK_REPLY
    });
    return true;
  }

  async function submitLeaveMessage() {
    if (!sessionContext.value || !canSubmitLeaveMessage.value || isSubmittingAction.value) {
      return false;
    }

    const messageContent = String(leaveMessageDraft.value || '').trim();
    isSubmittingAction.value = true;

    try {
      const result = await townStore.leaveResidentHomeVisitMessage({
        residentId: sessionContext.value.residentId || '',
        residentName: sessionContext.value.residentName || '',
        residenceLocationId: sessionContext.value.residenceLocationId || '',
        residenceLocationName: sessionContext.value.residenceLocationName || '',
        messageContent,
        replySummary: buildHomeVisitLeaveMessageReplySummary()
      });

      if (!result?.created) {
        return false;
      }

      decision.value = 'absent_or_no_answer';
      panelMode.value = 'chat';
      actionMode.value = 'end_only';
      leaveMessageDraft.value = '';
      sessionContext.value = {
        ...(sessionContext.value || {}),
        canEnter: false
      };
      appendMessage({
        role: 'model',
        content: DEFAULT_LEAVE_MESSAGE_SUCCESS_REPLY,
        prefix: 'doorstep-followup'
      });
      return true;
    } finally {
      isSubmittingAction.value = false;
    }
  }

  async function submitScheduleOption(option = null) {
    if (!sessionContext.value || !option?.id || isSubmittingAction.value) {
      return false;
    }

    const replySummary = buildHomeVisitScheduleReplySummary(option);
    isSubmittingAction.value = true;

    try {
      const result = await townStore.scheduleResidentHomeVisitFollowUp({
        residentId: sessionContext.value.residentId || '',
        residentName: sessionContext.value.residentName || '',
        residenceLocationId: sessionContext.value.residenceLocationId || '',
        residenceLocationName: sessionContext.value.residenceLocationName || '',
        scheduleOptionId: option.id,
        scheduleLabel: option.label || '',
        replySummary
      });

      if (!result?.created) {
        return false;
      }

      decision.value = 'postponed';
      panelMode.value = 'chat';
      actionMode.value = 'end_only';
      sessionContext.value = {
        ...(sessionContext.value || {}),
        canEnter: false
      };
      appendMessage({
        role: 'model',
        content: replySummary,
        prefix: 'doorstep-followup'
      });
      return true;
    } finally {
      isSubmittingAction.value = false;
    }
  }

  async function handleAction(actionId = '') {
    const normalizedActionId = String(actionId || '').trim();

    switch (normalizedActionId) {
      case 'leave_message':
        if (decision.value === 'absent_or_no_answer') {
          leaveMessageDraft.value = leaveMessageDraft.value || buildDefaultHomeVisitLeaveMessage();
          panelMode.value = 'leave_message';
        }
        return null;
      case 'wait_outside':
        await requestDoorstepTurn({
          playerMessage: DEFAULT_WAIT_OUTSIDE_MESSAGE,
          intentType: 'resident_home_visit_wait_outside',
          fallbackReplySummary: DEFAULT_WAIT_OUTSIDE_FALLBACK_REPLY
        });
        return null;
      case 'schedule_later':
        panelMode.value = 'schedule';
        return null;
      case 'enter_home': {
        const payload = enterResidence();
        return payload
          ? {
            type: 'enter_scene',
            payload
          }
          : null;
      }
      case 'end_visit':
        closeSheet();
        return null;
      default:
        return null;
    }
  }

  function enterResidence() {
    if (!canEnterResidence.value || !sessionContext.value) {
      return null;
    }

    const payload = {
      locationName: sessionContext.value.residenceLocationName || '',
      visitSessionId: sessionContext.value.visitSessionId || '',
      residentId: sessionContext.value.residentId || ''
    };

    closeSheet();
    return payload;
  }

  return {
    sheetVisible,
    messageList,
    decision,
    decisionLabel,
    actionList,
    residentName,
    residenceLocationName,
    panelMode,
    chatDraft,
    leaveMessageDraft,
    scheduleOptions,
    isBusy,
    canSend,
    canSubmitLeaveMessage,
    canEnterResidence,
    showChatInput,
    startConversation,
    sendMessage,
    submitLeaveMessage,
    submitScheduleOption,
    handleAction,
    closeSheet,
    cancelSubpanel,
    enterResidence,
    resetConversation
  };
}
