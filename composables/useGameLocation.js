import { computed, ref } from 'vue';
import { resolveLocationAccessState } from '@/utils/town/town-location-access.js';

function getDefaultHomeRooms() {
  return ['客厅', '卧室', '厨房', '卫生间'];
}

function getIndoorRooms({ customRooms = [], charHome = '', userHome = '' } = {}) {
  return [
    ...customRooms,
    '角色家',
    '玩家家',
    '我们的家',
    '她的家',
    '我的家',
    charHome,
    userHome
  ].filter(Boolean);
}

export function useGameLocation(context) {
  const {
    currentRole,
    userHome,
    charHome,
    currentTime,
    worldLocations,
    playerLocation,
    worldTemplate
  } = context;

  const showLocationPanel = ref(false);
  const customLocation = ref('');

  const checkIsWorking = () => {
    const settings = currentRole.value?.settings || {};
    if (!settings.workplace || settings.workplace.trim() === '') {
      return false;
    }

    const workDays = Array.isArray(settings.workDays) ? settings.workDays : [];
    if (workDays.length === 0) {
      return false;
    }

    const date = new Date(currentTime.value);
    const day = date.getDay();
    const hour = date.getHours();
    const start = settings.workStartHour !== undefined ? settings.workStartHour : 9;
    const end = settings.workEndHour !== undefined ? settings.workEndHour : 18;

    return workDays.includes(day) && hour >= start && hour < end;
  };

  const isCohabitation = () => {
    const userAddress = (userHome.value || '').trim();
    const charAddress = (charHome.value || '').trim();
    if (
      !userAddress
      || !charAddress
      || userAddress === '未知地址'
      || charAddress === '未知地址'
      || userAddress === '玩家家'
      || charAddress === '角色家'
    ) {
      return false;
    }

    return userAddress === charAddress || userAddress.includes(charAddress) || charAddress.includes(userAddress);
  };

  const locationList = computed(() => {
    const list = [];
    const isTogether = isCohabitation();
    const settings = currentRole.value?.settings || {};
    const customRooms = settings.homeRooms || getDefaultHomeRooms();
    const currentPlayerLocation = playerLocation?.value || currentRole.value?.playerLocation || userHome.value;
    const currentCharHome = charHome.value || '角色家';
    const currentUserHome = userHome.value || '玩家家';
    const currentWorldTemplate = worldTemplate?.value || {};
    const characterHomeAccess = resolveLocationAccessState({
      worldTemplate: currentWorldTemplate,
      locationName: currentCharHome,
      hostResident: currentRole.value
    });
    const canVisitCharacterHome = !characterHomeAccess.isPrivateResidence || characterHomeAccess.canPlayerEnter;
    const isPlayerInCharHome = (
      customRooms.includes(currentPlayerLocation)
      || currentPlayerLocation === currentCharHome
      || currentPlayerLocation === '她的家'
    );
    const canAccessSubScenes = isTogether || isPlayerInCharHome;

    if (canAccessSubScenes) {
      customRooms.forEach((roomName) => {
        list.push({
          name: roomName,
          type: 'indoor',
          icon: '🚪',
          mode: 'face',
          style: 'background-color:#e8f5e9; color:#2e7d32; border:1px solid #c8e6c9;'
        });
      });
    }

    if (isTogether) {
      list.push({
        name: '我们的家',
        detail: currentCharHome,
        type: 'shared_home',
        icon: '🏠',
        mode: 'face',
        style: 'background-color:#fff0f5; color:#d81b60; border:1px solid #ffcdd2;'
      });
    } else {
      if (!isPlayerInCharHome && canVisitCharacterHome) {
        list.push({
          name: '她的家',
          detail: currentCharHome || '角色家',
          type: 'char_home',
          icon: '🏡',
          mode: 'face',
          style: 'background-color:#fff0f5; color:#d81b60; border:1px solid #ffcdd2;'
        });
      }

      if (currentPlayerLocation !== currentUserHome && currentPlayerLocation !== '我的家') {
        list.push({
          name: '我的家',
          detail: currentUserHome || '我家',
          type: 'user_home',
          icon: '🏠',
          mode: 'phone',
          style: 'background-color:#e3f2fd; color:#1565c0; border:1px solid #bbdefb;'
        });
      }
    }

    if (settings.workplace) {
      list.push({
        name: settings.workplace,
        type: 'common',
        icon: '💼',
        mode: 'phone',
        style: 'background-color:#fff3e0; color:#ef6c00; border:1px solid #ffe0b2;'
      });
    }

    if (Array.isArray(settings.customLocations)) {
      settings.customLocations.forEach((location) => {
        const name = typeof location === 'string' ? location : location.name;
        const icon = location?.icon || '📍';
        if (!name) {
          return;
        }

        list.push({
          name,
          type: 'common',
          icon,
          mode: 'phone',
          style: 'background-color:#f5f5f5; color:#333; border:1px solid #eee;'
        });
      });
    }

    worldLocations.value.forEach((item) => {
      const name = typeof item === 'string' ? item : item.name;
      if (!name || name === settings.workplace) {
        return;
      }

      list.push({
        name,
        type: 'common',
        icon: item.icon || '📍',
        mode: 'phone',
        style: 'background-color:#f5f5f5; color:#333; border:1px solid #eee;'
      });
    });

    return list;
  });

  const calculateMoveResult = (locObj) => {
    const playerDestination = locObj.detail || locObj.name;
    const settings = currentRole.value?.settings || {};
    const currentWorldTemplate = worldTemplate?.value || {};
    const destinationAccess = resolveLocationAccessState({
      worldTemplate: currentWorldTemplate,
      locationName: playerDestination,
      hostResident: currentRole.value
    });

    if (destinationAccess.isPrivateResidence && !destinationAccess.canPlayerEnter) {
      return {
        blocked: true,
        targetName: playerDestination,
        playerLocation: playerLocation?.value || currentRole.value?.playerLocation || userHome.value || '玩家家',
        aiLocation: currentRole.value?.currentLocation || currentRole.value?.location || '卧室',
        newMode: currentRole.value?.interactionMode || 'phone',
        shouldNotifyAI: false,
        sysMsgUser: '这是私人住宅，先获得住户同意再去吧',
        promptAction: ''
      };
    }

    let aiActualLocation = currentRole.value?.currentLocation || currentRole.value?.location || '卧室';
    if (aiActualLocation === charHome.value || aiActualLocation === userHome.value || aiActualLocation === '角色家') {
      aiActualLocation = '卧室';
    }

    const oldPlayerLocation = currentRole.value?.playerLocation || '玩家家';
    const customRooms = settings.homeRooms || getDefaultHomeRooms();
    const indoorRooms = getIndoorRooms({
      customRooms,
      charHome: charHome.value,
      userHome: userHome.value
    });
    const isPlayerIndoor = indoorRooms.includes(playerDestination);
    const isAiIndoor = indoorRooms.includes(aiActualLocation);
    const wasPlayerIndoor = indoorRooms.includes(oldPlayerLocation);

    let newMode = 'phone';
    let shouldNotifyAI = false;
    let sysMsgUser = '';
    let promptAction = '';

    if (isPlayerIndoor && isAiIndoor) {
      newMode = 'face';
      if (playerDestination === aiActualLocation) {
        shouldNotifyAI = true;
        sysMsgUser = `你走进了${playerDestination}，看到她正好也在这里。`;
        promptAction = `[SYSTEM EVENT: INDOOR MEET] 玩家走进了${playerDestination}，正好来到你所在的房间。你们现在面对面。`;
      } else if (oldPlayerLocation === aiActualLocation) {
        shouldNotifyAI = true;
        sysMsgUser = `你离开了${oldPlayerLocation}，来到了${playerDestination}。`;
        promptAction = `[SYSTEM EVENT: PLAYER LEFT ROOM] 玩家离开了你所在的${oldPlayerLocation}，去了${playerDestination}。你可以假装没看见，或者隔着房间问他去干嘛。`;
      } else if (!wasPlayerIndoor) {
        shouldNotifyAI = true;
        sysMsgUser = `你来到了${playerDestination}。（此时她正在${aiActualLocation}）`;
        promptAction = `[SYSTEM EVENT: PLAYER RETURN] 玩家从外面回到了家，目前在${playerDestination}，而你在${aiActualLocation}。你可以听到动静并隔着房间回应。`;
      } else {
        sysMsgUser = `你来到了${playerDestination}。`;
      }
    } else if (!isPlayerIndoor && !isAiIndoor && playerDestination === aiActualLocation) {
      newMode = 'face';
      shouldNotifyAI = true;
      sysMsgUser = `你抵达了${playerDestination}，巧合的是，她也在这里。`;
      promptAction = `[SYSTEM EVENT: OUTDOOR MEET] 玩家来到${playerDestination}，正好遇到了也在这里的你。你们现在是面对面状态。`;
    } else {
      newMode = 'phone';
      const wasFace = (wasPlayerIndoor && isAiIndoor) || (oldPlayerLocation === aiActualLocation);

      if (wasFace) {
        shouldNotifyAI = true;
        sysMsgUser = `你离开了家，前往${playerDestination}。`;
        promptAction = `[SYSTEM EVENT: PLAYER LEAVE] 玩家离开了家，前往了${playerDestination}，而你留在了家里。模式切换为手机聊天(PHONE)。`;
      } else if (!wasPlayerIndoor && isPlayerIndoor && !isAiIndoor) {
        shouldNotifyAI = true;
        sysMsgUser = `你回到了家，但家里空荡荡的。（她应该在${aiActualLocation}）`;
        promptAction = `[SYSTEM EVENT: PLAYER RETURN] 玩家回到了家，但你目前正在${aiActualLocation}。模式切换为手机聊天(PHONE)。`;
      } else {
        sysMsgUser = `你抵达了${playerDestination}。`;
      }
    }

    return {
      blocked: false,
      targetName: playerDestination,
      playerLocation: playerDestination,
      aiLocation: aiActualLocation,
      newMode,
      shouldNotifyAI,
      sysMsgUser,
      promptAction
    };
  };

  return {
    showLocationPanel,
    customLocation,
    locationList,
    checkIsWorking,
    calculateMoveResult
  };
}
