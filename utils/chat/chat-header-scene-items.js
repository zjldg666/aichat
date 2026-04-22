export function resolveCurrentRoomContainers(economy = null, playerLocation = '') {
  if (!economy || !economy.containers || !playerLocation) {
    return null;
  }

  return economy.containers[playerLocation] || null;
}

export function shouldShowChatSceneBanner({
  economy = null,
  playerLocation = '',
  currentRoomContainers = null
} = {}) {
  if (!economy) {
    return false;
  }

  if (playerLocation === '客厅') {
    return true;
  }

  if (currentRoomContainers && Object.keys(currentRoomContainers).length > 0) {
    return true;
  }

  // 钱包入口本身也是常驻场景入口，不能再被容器条件一起隐藏。
  return true;
}
