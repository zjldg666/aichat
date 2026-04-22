import { resolveHomeVisitDecision } from './town-player-intent-followups.js';

function normalizeText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

const PHONE_FACE_TO_FACE_ACTION_PATTERN = /(?:给你开门|替你开门|门开着|留门|拉开门|请进|进来吧|进门吧|进屋吧|来客厅|来卧室|上楼吧|到我身边|坐我旁边|坐到我身边|抱(?:住|了)?你|亲(?:了|一下)?你|吻(?:了|一下)?你|牵住你|拉着你|摸(?:了|了了)?你的|拍(?:了|了了)?你的|递给你|塞到你手里|看着你|望着你|凑到你面前|靠到你身边|把你带进|领你进|带你进屋)/;
const PHONE_FACE_TO_FACE_STAGE_PATTERN = /[（(][^）)]*(?:开门|进来|进门|进屋|走到你面前|抱|亲|吻|牵住|拉着|摸|拍|递给|塞到你手里|看着你|望着你|靠到你身边|带你进|领你进)[^）)]*[）)]/g;
const PHONE_DIRECT_ACTION_PATTERN = /(?:给你开门|替你开门|门开着|请进|进来吧|进门吧|进屋吧|来客厅|来卧室|上楼吧|坐我旁边|坐到我身边|抱(?:住|了)?你|亲(?:了|一下)?你|吻(?:了|一下)?你|牵住你|拉着你|摸(?:了|了了)?你的|拍(?:了|了了)?你的|递给你|塞到你手里|看着你|望着你|凑到你面前|靠到你身边|把你带进|领你进|带你进屋)/g;

export function buildPhoneRemoteConversationSystemOverride() {
  return [
    '[SYSTEM RULE: PHONE_REMOTE_ONLY]',
    '**Channel Rule**: This is a remote phone conversation. The player and resident are not currently face to face.',
    '**Hard Rule**: Do not describe any in-person physical action, including opening the door, seeing the player in front of you, entering rooms together, sitting together, touching, hugging, kissing, handing over items, or pulling the player closer.',
    '**Hard Rule**: If the topic is a future visit, reply only with a remote decision or plan: agree, refuse, or postpone. Do not narrate the player as already arriving or already inside.'
  ].join('\n');
}

export function containsPhoneFaceToFaceAction(content = '') {
  const normalized = normalizeText(content);

  if (!normalized) {
    return false;
  }

  return PHONE_FACE_TO_FACE_ACTION_PATTERN.test(normalized);
}

export function buildPhoneRemoteRewritePrompt({
  residentName = '',
  intentType = ''
} = {}) {
  const safeResidentName = normalizeText(residentName) || '对方';
  const safeIntentType = normalizeText(intentType);
  const visitRule = safeIntentType === 'resident_home_visit_request'
    ? '**Visit Rule**: If the draft agrees to a visit, rewrite it as remote permission for a later in-person visit. If it refuses or postpones, keep that outcome remote too.'
    : '**Visit Rule**: Keep everything in a remote-only phone context.';

  return [
    `You are rewriting ${safeResidentName}'s phone reply for a town-life simulator.`,
    `Intent Type: ${safeIntentType || 'generic_phone_chat'}`,
    'Return only the rewritten reply in Simplified Chinese.',
    'Keep the original speaker intent, emotional tone, and key decision.',
    'Do not describe any face-to-face physical action.',
    'Do not describe opening doors, seeing the player in front of you, moving into the same room, sitting together, touching, hugging, kissing, or handing objects directly.',
    visitRule
  ].join('\n');
}

export function fallbackRewritePhoneReply({
  content = '',
  session = null
} = {}) {
  const normalized = normalizeText(content);

  if (!normalized) {
    return '';
  }

  if (!containsPhoneFaceToFaceAction(normalized)) {
    return normalized;
  }

  if (session?.intentType === 'resident_home_visit_request') {
    const decision = resolveHomeVisitDecision(normalized);

    if (decision === 'accepted') {
      return '可以，你之后过来找我吧，我这边同意这次拜访。';
    }

    if (decision === 'rejected') {
      return '今天先别来了，我现在不方便接待。';
    }

    if (decision === 'postponed') {
      return '改天吧，我这会儿不方便，等合适的时候再约。';
    }
  }

  const stripped = normalizeText(
    normalized
      .replace(PHONE_FACE_TO_FACE_STAGE_PATTERN, ' ')
      .replace(PHONE_DIRECT_ACTION_PATTERN, ' ')
      .replace(/[，。！？；、]{2,}/g, '。')
  );

  if (stripped && !containsPhoneFaceToFaceAction(stripped)) {
    return stripped;
  }

  return '我在电话这头安静了一下，语气放轻了些。你继续说吧。';
}
