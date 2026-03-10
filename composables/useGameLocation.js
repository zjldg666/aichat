// AiChat/composables/useGameLocation.js
// 地点和工作逻辑
import {
	ref,
	computed
} from 'vue';

export function useGameLocation(context) {
	const {
		currentRole,
		userHome,
		charHome,
		currentTime,
		worldLocations
	} = context;

	const showLocationPanel = ref(false);
	const customLocation = ref('');

	// 检查角色当前是否处于工作时间
	const checkIsWorking = () => {
		const s = currentRole.value?.settings || {};
		if (!s.workplace || s.workplace.trim() === '') return false;
		const workDays = s.workDays || [];
		if (workDays.length === 0) return false;
		const date = new Date(currentTime.value);
		const day = date.getDay();
		const hour = date.getHours();
		const start = s.workStartHour !== undefined ? s.workStartHour : 9;
		const end = s.workEndHour !== undefined ? s.workEndHour : 18;
		return (workDays.includes(day) && hour >= start && hour < end);
	};

	// 检查是否同居
	const isCohabitation = () => {
		const u = (userHome.value || '').trim();
		const c = (charHome.value || '').trim();
		if (!u || !c || u === '未知地址' || c === '未知地址' || u === '角色家' || u === '玩家家') return false;
		return u === c || u.includes(c) || c.includes(u);
	};

	// 动态生成地点列表
	const locationList = computed(() => {
		const list = [];
		const isTogether = isCohabitation();
		const s = currentRole.value?.settings || {}; // 获取当前角色设定

		const customRooms = s.homeRooms || ['客厅', '卧室', '厨房', '卫生间'];
		customRooms.forEach(roomName => {
			list.push({
				name: roomName,
				type: 'indoor',
				icon: '🚪',
				mode: 'face',
				style: 'background-color:#e8f5e9; color:#2e7d32; border:1px solid #c8e6c9;'
			});
		});

		// 1. 处理“家”的逻辑 (保留作为宏观地址)
		if (isTogether) {
			list.push({
				name: '我们的家',
				detail: charHome.value,
				type: 'shared_home',
				icon: '🏡',
				mode: 'face',
				style: 'background-color:#fff0f5; color:#d81b60; border:1px solid #ffcdd2;'
			});
		} else {
			list.push({
				name: '她的家',
				detail: charHome.value || '角色家',
				type: 'char_home',
				icon: '🏠',
				mode: 'face',
				style: 'background-color:#fff0f5; color:#d81b60; border:1px solid #ffcdd2;'
			});
			list.push({
				name: '我的家',
				detail: userHome.value || '我家',
				type: 'user_home',
				icon: '🏡',
				mode: 'phone',
				style: 'background-color:#e3f2fd; color:#1565c0; border:1px solid #bbdefb;'
			});
		}

		// 2. 动态注入：工作地点
		if (s.workplace) {
			list.push({
				name: s.workplace,
				type: 'common',
				icon: '💼',
				mode: 'phone',
				style: 'background-color:#fff3e0; color:#ef6c00; border:1px solid #ffe0b2;'
			});
		}

		// 3. 动态注入：角色设定中的自定义地点
		if (s.customLocations && Array.isArray(s.customLocations)) {
			s.customLocations.forEach(loc => {
				const name = typeof loc === 'string' ? loc : loc.name;
				const icon = loc.icon || '📍';
				list.push({
					name: name,
					type: 'common',
					icon: icon,
					mode: 'phone',
					style: 'background-color:#f5f5f5; color:#333; border:1px solid #eee;'
				});
			});
		}

		// 4. 处理全局公共地点
		worldLocations.value.forEach(item => {
			const name = typeof item === 'string' ? item : item.name;
			if (name === s.workplace) return;
			const icon = item.icon || '📍';
			list.push({
				name: name,
				type: 'common',
				icon: icon,
				mode: 'phone',
				style: 'background-color:#f5f5f5; color:#333; border:1px solid #eee;'
			});
		});

		return list;
	});
	// ✨ 核心修改：计算移动后的双位置结果 (加入了“无关移动免打扰”逻辑)
	    const calculateMoveResult = (locObj) => {
	        const playerDestination = locObj.detail || locObj.name; 
	        const s = currentRole.value?.settings || {}; 
	        
	        let aiActualLocation = currentRole.value?.currentLocation || currentRole.value?.location || '卧室';
	        if (aiActualLocation === charHome.value || aiActualLocation === userHome.value || aiActualLocation === '角色家') {
	            aiActualLocation = '卧室';
	        }
	        
	        // ✨ 获取玩家移动【前】的位置，用来判定是不是“离开”
	        const oldPlayerLocation = currentRole.value?.playerLocation || '玩家家';
	        
	        const customRooms = s.homeRooms || ['客厅', '卧室', '厨房', '卫生间'];
	        const INDOOR_ROOMS = [
	            ...customRooms, 
	            '角色家', '玩家家', '我们的家', 
	            charHome.value, userHome.value
	        ];
	        
	        const isPlayerIndoor = INDOOR_ROOMS.includes(playerDestination);
	        const isAiIndoor = INDOOR_ROOMS.includes(aiActualLocation);
	        const wasPlayerIndoor = INDOOR_ROOMS.includes(oldPlayerLocation);
	        
	        let newMode = 'phone'; 
	        let shouldNotifyAI = false; // ✨ 默认不打扰AI，除非判定有关联
	        let sysMsgUser = "";   
	        let promptAction = ""; 
	
	        // B. 核心状态矩阵判断
	        if (isPlayerIndoor && isAiIndoor) {
	            // 🏠 场景 1：两人都在室内
	            newMode = 'face'; 
	            if (playerDestination === aiActualLocation) {
	                // 情况 1：玩家走进了 AI 所在的房间 (相遇)
	                shouldNotifyAI = true;
	                sysMsgUser = `你走进了${playerDestination}，看到她正好也在这里。`;
	                promptAction = `[SYSTEM EVENT: INDOOR MEET] 玩家走进了${playerDestination}，正好来到了你所在的房间。你们现在面对面。`;
	            } else if (oldPlayerLocation === aiActualLocation) {
	                // 情况 2：玩家离开了 AI 所在的房间 (离开)
	                shouldNotifyAI = true;
	                sysMsgUser = `你离开了${oldPlayerLocation}，来到了${playerDestination}。`;
	                promptAction = `[SYSTEM EVENT: PLAYER LEFT ROOM] 玩家离开了你所在的${oldPlayerLocation}，去了${playerDestination}。你可以假装没看见，或者隔着房间问他去干嘛。`;
	            } else if (!wasPlayerIndoor) {
	                // 情况 3：玩家从外面回家了 (虽然没直接进AI房间，但会听到开门声)
	                shouldNotifyAI = true;
	                sysMsgUser = `你回到了家（${playerDestination}）。（此时她正在${aiActualLocation}）`;
	                promptAction = `[SYSTEM EVENT: PLAYER RETURN] 玩家从外面回到了家，目前在${playerDestination}，而你在${aiActualLocation}。你可以听到动静并隔着房间回应。`;
	            } else {
	                // 情况 4：无效/无关移动 ✨ (AI在卧室，玩家从客厅去厨房)
	                shouldNotifyAI = false; // 不触发大模型！
	                sysMsgUser = `你来到了${playerDestination}。`;
	            }
	        } else if (!isPlayerIndoor && !isAiIndoor && playerDestination === aiActualLocation) {
	            // 🏢 场景 2：两人都在室外，且巧合在同一地点相遇
	            newMode = 'face'; 
	            shouldNotifyAI = true;
	            sysMsgUser = `你抵达了${playerDestination}，巧合的是，她也在这里。`;
	            promptAction = `[SYSTEM EVENT: OUTDOOR MEET] 玩家来到了${playerDestination}，正好遇到了也在这里的你。你们现在是面对面状态。`;
	        } else {
	            // 📱 场景 3：异地状态
	            newMode = 'phone'; 
	            const wasFace = (wasPlayerIndoor && isAiIndoor) || (oldPlayerLocation === aiActualLocation);
	
	            if (wasFace) {
	                // 情况 1：玩家离开家出门了
	                shouldNotifyAI = true;
	                sysMsgUser = `你离开了家，前往${playerDestination}。`;
	                promptAction = `[SYSTEM EVENT: PLAYER LEAVE] 玩家离开了家，前往了${playerDestination}，而你留在了家里。模式切换为手机聊天(PHONE)。`;
	            } else if (!wasPlayerIndoor && isPlayerIndoor && !isAiIndoor) {
	                // 情况 2：玩家回家了，但 AI 不在家
	                shouldNotifyAI = true;
	                sysMsgUser = `你回到了家，但家里空荡荡的。（她应该在${aiActualLocation}）`;
	                promptAction = `[SYSTEM EVENT: PLAYER RETURN] 玩家回到了家，但你目前正在${aiActualLocation}。模式切换为手机聊天(PHONE)。`;
	            } else {
	                // 情况 3：玩家在外地瞎溜达 (比如从超市去了公司) ✨
	                shouldNotifyAI = false; // 在外地移动不乱发消息，除非玩家主动说话
	                sysMsgUser = `你抵达了${playerDestination}。`;
	            }
	        }
	
	        return { 
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