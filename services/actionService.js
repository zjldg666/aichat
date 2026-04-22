// AiChat/services/actionService.js

export const ActionService = {
	/**
	 * 处理 AI 输出的 [ACTION: xxx] 指令
	 * 目前支持 CONSUME (消耗物品)
	 */
	processActions(mainContent, currentRole, charStore) {
		let cleanContent = mainContent;
		let sysMsgs = [];
		const charData = currentRole.value;

		// 正则匹配 [ACTION: CONSUME, 物品名]
		const consumeRegex = /\[ACTION:\s*CONSUME\s*,\s*([^\]]+)\]/gi;
		let match;

		while ((match = consumeRegex.exec(cleanContent)) !== null) {
			const itemName = match[1].trim();
			let itemConsumed = false;

			// 遍历家里的容器，寻找该物品
			if (charData && charData.economy && charData.economy.containers) {
				const containers = charData.economy.containers;
				
				// 寻找逻辑：遍历所有房间 -> 所有容器 -> 找到该物品
				searchLoop: 
				for (const roomName in containers) {
					for (const containerName in containers[roomName]) {
						const itemsList = containers[roomName][containerName];
						
						// 倒序遍历，方便删除
						for (let i = itemsList.length - 1; i >= 0; i--) {
							let item = itemsList[i];
							if (item.name === itemName || item.name.includes(itemName)) {
								// 扣减耐久度或直接删除
								if (item.usesLeft && item.usesLeft > 1) {
									item.usesLeft -= 1;
								} else {
									// 耐久度耗尽或没有耐久度，直接从数组中移除
									itemsList.splice(i, 1);
								}
								itemConsumed = true;
								sysMsgs.push(`📦 (系统判定：【${itemName}】已被她消耗)`);
								break searchLoop; // 找到一个扣掉就行，跳出所有循环
							}
						}
					}
				}
			}

			// 如果没找到该物品的兜底提示
			if (!itemConsumed) {
				sysMsgs.push(`⚠️ (她试图消耗【${itemName}】，但家里好像并没有这个东西...)`);
			}
		}

		// 把暗号从文本中清洗掉，不让玩家看到
		cleanContent = cleanContent.replace(/\[ACTION:\s*CONSUME\s*,\s*([^\]]+)\]/gi, '').trim();

		// 如果发生了库存变动，保存到本地
		if (sysMsgs.length > 0) {
			charStore.saveCharacterData({ economy: charData.economy });
		}

		return { cleanContent, sysMsgs };
	}
};