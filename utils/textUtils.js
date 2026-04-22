// AiChat/utils/textUtils.js

/**
 * 🧹 终极 AI 文本清洗器
 * 专门用于剔除大模型返回的 <think> 标签、Markdown 思考过程等“内心戏”
 * @param {String} rawText 大模型返回的原始文本
 * @returns {String} 清洗后的纯净文本
 */
export const cleanAiResponse = (rawText) => {
	if (!rawText) return "";
	
	// 1. 暴力清除 <think> ... </think> 块 (忽略大小写，跨行匹配)
	let cleanText = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
	
	// 2. 清除 Markdown 格式的思考过程 (如 **思考**: ... )
	cleanText = cleanText.replace(/(?:\*\*思考\*\*|思考)[\s]*[:：]\s*([\s\S]*?)(?=(?:\*\*回复\*\*|回复|Response)[\s]*[:：]|\[|$)/gi, '').trim();
	
	// 🔥 3. 兜底救援：如果清理后什么都不剩了（大模型把回复吞进 think 里了）
	if (cleanText.length === 0 && rawText.toLowerCase().includes('<think>')) {
		console.warn('⚠️ [文本清洗] 检测到模型将回复写在了 <think> 内部，触发兜底救援！');
		const match = rawText.match(/<think>([\s\S]*?)<\/think>/i);
		if (match && match[1]) {
			const innerText = match[1].trim();
			// 提取最后一段（大模型通常会在思考的最后一段写出真正的回复）
			const paragraphs = innerText.split('\n').filter(p => p.trim().length > 0);
			if (paragraphs.length > 0) {
				cleanText = paragraphs[paragraphs.length - 1].trim();
			} else {
				cleanText = innerText; 
			}
		} else {
			// 如果连 </think> 都没闭合，直接取最后一段去标签
			const paragraphs = rawText.split('\n').filter(p => p.trim().length > 0);
			cleanText = paragraphs[paragraphs.length - 1].replace(/<\/?think>/gi, '').trim();
		}
	}
	
	return cleanText || rawText.replace(/<\/?think>/gi, '').trim(); // 实在不行就只去标签返回，防止对话卡死
};

/**
 * ✂️ 标签属性单行截断器
 * 专门用于提取 [ACTION]、[RELATION] 等单个标签内容，防止后面跟着乱码或多余文本
 * @param {String} str 正则匹配出来的初步内容
 * @returns {String} 最纯净的一句话状态
 */
export const cleanSingleTag = (str) => {
	if (!str) return "";
	// 1. 物理截断：只取第一行，抛弃换行符后面的脏数据
	let s = str.split('\n')[0];
	// 2. 剔除开头的逗号、句号、冒号或空格
	s = s.replace(/^[,，。:：\s]+/, "");
	return s.trim();
};