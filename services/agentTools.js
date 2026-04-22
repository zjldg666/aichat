// AiChat/services/agentTools.js

/**
 * 🛠️ 智能体专属工具库 (Tool Registry)
 * 采用策略模式注册所有可用技能。
 * 每个技能都是一个异步函数，接收 (skillParam, context) 并返回查询到的文本结果。
 */
export const ToolRegistry = {
	
	// 1. 查阅全屋物品 (ENV)
	'ENV': async (skillParam, context) => {
		const { currentRole } = context;
		let toolResult = "";
		const allContainers = currentRole.value?.economy?.containers;
		
		if (allContainers) {
			toolResult += `【环境检视报告】：你回想了一下，家里的物品状态如下：\n`;
			let hasItem = false;
			for (const rName in allContainers) {
				for (const cName in allContainers[rName]) {
					const items = allContainers[rName][cName].map(i => i.name).join('、');
					if (items) {
						toolResult += `- 【${rName}】的${cName}里有: ${items}。\n`;
						hasItem = true;
					}
				}
			}
			if (!hasItem) toolResult += "家里空空如也，没有任何物品。";
		} else {
			toolResult += `你回想了一下，家里目前没有任何家具和物品。`;
		}
		return toolResult;
	},

	// 2. 查阅钱包余额 (WALLET)
	'WALLET': async (skillParam, context) => {
		const { currentRole } = context;
		let toolResult = "";
		const eco = currentRole.value?.economy || {};
		
		const money = eco.isSharedWallet 
			? ((Number(eco.userWallet) || 0) + (Number(eco.charWallet) || 0))
			: (eco.wallet || 0);
			
		toolResult += `【财务检视报告】：你确认了一下，当前可用的总余额为 ¥${money}。`;
		return toolResult;
	},

	// 3. 查阅日记与长期记忆 (MEMORY)
	'MEMORY': async (skillParam, context) => {
		const { checkHistoryRecall } = context;
		let toolResult = "";
		
		// 调用传进来的查询方法
		const recallContent = await checkHistoryRecall(skillParam);
		if (recallContent) {
			toolResult += `【记忆检视报告】：你想起了以下关于“${skillParam}”的具体往事：\n${recallContent}`;
		} else {
			toolResult += `【记忆检视报告】：你在脑海中搜索了关于“${skillParam}”的记忆，但什么都没想起来。也许这是你们还没经历过的事，或者你需要让玩家多提示一点。`;
		}
		return toolResult;
	}
	
	// 💡 未来你只需要在这里接着往下写：'WEATHER': async () => {...}, 'CLOTHES': async () => {...}
};