import { LLM, getCurrentLlmConfig } from '@/services/llm.js';
import { buildPlayerResidentHomeVisitContext } from '@/utils/town/town-view-models.js';
import { resolveHomeVisitDecision } from '@/utils/town/town-player-intent-followups.js';

function stripReasoningBlocks(content = '') {
  return String(content || '')
    .replace(/<think>[\s\S]*?<\/think>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildDoorstepTranscriptBlock(transcript = [], residentName = '') {
  const safeResidentName = String(residentName || '').trim() || '住户';

  return (Array.isArray(transcript) ? transcript : [])
    .map((item) => {
      if (!item || item.isSystem || item.type === 'think') {
        return '';
      }

      const content = String(item.content || '').trim();
      if (!content) {
        return '';
      }

      return `${item.role === 'user' ? '玩家' : safeResidentName}：${content}`;
    })
    .filter(Boolean)
    .join('\n');
}

function buildFallbackDoorReply({
  residentName = '',
  currentAction = '',
  hostResident = null
} = {}) {
  const safeResidentName = String(residentName || '').trim() || '对方';
  const safeCurrentAction = String(currentAction || '').trim();
  const relationship = hostResident?.playerRelationship || {};
  const trust = Number(relationship.trust) || 0;
  const familiarity = Number(relationship.familiarity) || 0;
  const affinity = Number(relationship.affinity) || 0;
  const tension = Number(relationship.tension) || 0;
  const busyPattern = /(洗澡|睡|休息|整理|收拾|忙|工作|备课|接诊|看诊|赶工|做饭)/;

  if (relationship?.permissions?.canEnterHome || trust >= 68 || familiarity >= 68 || affinity >= 72) {
    return {
      decision: 'accepted',
      replySummary: `${safeResidentName}把门打开了一点，轻声说：“进来吧，我现在方便。”`
    };
  }

  if (tension >= 60) {
    return {
      decision: 'rejected',
      replySummary: `${safeResidentName}隔着门回应：“今天先别进来，我现在不方便见人。”`
    };
  }

  if (busyPattern.test(safeCurrentAction)) {
    return {
      decision: 'postponed',
      replySummary: `${safeResidentName}在门内回了一句：“我现在正忙着${safeCurrentAction}，改天再来吧。”`
    };
  }

  return {
    decision: 'postponed',
    replySummary: `${safeResidentName}在门口回道：“我这会儿不太方便，改天再来吧。”`
  };
}

function buildResidentDoorReplyPrompt({
  context,
  residentName = '',
  residenceLocationName = '',
  currentAction = '',
  residentSummary = '',
  playerMessage = '',
  transcript = []
} = {}) {
  const doorstepTranscript = buildDoorstepTranscriptBlock(transcript, residentName);
  const safePlayerMessage = String(playerMessage || '').trim();

  return [
    context?.systemOverride || '',
    `【住户名字】${residentName || '对方'}`,
    residenceLocationName ? `【住处】${residenceLocationName}` : '',
    currentAction ? `【当前动作】${currentAction}` : '',
    residentSummary ? `【住户补充信息】${residentSummary}` : '',
    doorstepTranscript ? `【门口对话记录】\n${doorstepTranscript}` : '',
    safePlayerMessage ? `【玩家刚说】${safePlayerMessage}` : '',
    '【输出要求】只输出住户此刻在门口对玩家说的一句简短中文口语，不要加旁白，不要加引号。'
  ]
    .filter(Boolean)
    .join('\n');
}

export async function requestResidentDoorstepConversationTurn({
  residentName = '',
  residenceLocationName = '',
  currentAction = '',
  hostResident = null,
  playerName = '',
  playerMessage = '',
  transcript = []
} = {}) {
  const fallback = buildFallbackDoorReply({
    residentName,
    currentAction,
    hostResident
  });
  const config = getCurrentLlmConfig();

  if (!config?.apiKey) {
    return fallback;
  }

  const context = buildPlayerResidentHomeVisitContext({
    playerName,
    residentName,
    residenceLocationName,
    currentAction
  });
  const residentSummary = [
    hostResident?.bio,
    hostResident?.personality,
    hostResident?.settings?.userRelation,
    hostResident?.relation
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join('；');
  const prompt = buildResidentDoorReplyPrompt({
    context,
    residentName,
    residenceLocationName,
    currentAction,
    residentSummary,
    playerMessage,
    transcript
  });

  try {
    const rawReply = await LLM.chat({
      config,
      messages: [{
        role: 'user',
        content: prompt
      }],
      systemPrompt: '你正在扮演小镇里的住户。你和玩家正在门口多轮交谈。请自然回应玩家，并且在一句中文里让当前态度足够清楚：允许进屋、拒绝进屋、改天再来，或先让对方继续在门口等。',
      temperature: 0.6,
      maxTokens: 120
    });
    const replySummary = stripReasoningBlocks(rawReply) || fallback.replySummary;
    const decision = resolveHomeVisitDecision(replySummary) || fallback.decision;

    return {
      decision,
      replySummary
    };
  } catch (error) {
    console.error('[townDoorReplyService] failed to request doorstep conversation turn', error);
    return fallback;
  }
}

export async function requestResidentHomeVisitDoorReply({
  residentName = '',
  residenceLocationName = '',
  currentAction = '',
  hostResident = null,
  playerName = ''
} = {}) {
  return requestResidentDoorstepConversationTurn({
    residentName,
    residenceLocationName,
    currentAction,
    hostResident,
    playerName,
    playerMessage: '',
    transcript: []
  });
}
