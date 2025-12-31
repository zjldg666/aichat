// AiChat/services/comfyui.js
import { COMFY_WORKFLOW_TEMPLATE, NEGATIVE_PROMPTS } from '@/utils/constants.js';

export const Comfy = {
    /**
     * 生成图片 (包含自动轮询逻辑)
     * @param {String} baseUrl - ComfyUI 地址
     * @param {String} promptText - 正向提示词
     * @param {Boolean} isDuo - 是否双人模式 (用于自动选负面 Prompt)
     * @returns {Promise<String>} - 图片 URL
     */
    async generateImage(baseUrl, promptText, isDuo = false) {
        if (!baseUrl) throw new Error("ComfyUI 地址未配置");
        
        // 1. 准备工作流
        const workflow = JSON.parse(JSON.stringify(COMFY_WORKFLOW_TEMPLATE));
        workflow["3"].inputs.text = promptText;
        workflow["4"].inputs.text = isDuo ? NEGATIVE_PROMPTS.DUO : NEGATIVE_PROMPTS.SOLO;
        workflow["5"].inputs.seed = Math.floor(Math.random() * 999999999999999);
        
        // 2. 发送任务到队列
        const queueRes = await uni.request({
            url: `${baseUrl}/prompt`, method: 'POST', 
            header: { 'Content-Type': 'application/json' },
            data: { prompt: workflow }, sslVerify: false
        });
        
        if (queueRes.statusCode !== 200) throw new Error(`ComfyUI 队列错误: ${queueRes.statusCode}`);
        const promptId = queueRes.data.prompt_id;
        
        // 3. 轮询等待结果 (最多等 60 秒)
        for (let i = 0; i < 120; i++) {
            await new Promise(r => setTimeout(r, 1000));
            
            const historyRes = await uni.request({ 
                url: `${baseUrl}/history/${promptId}`, method: 'GET', sslVerify: false 
            });
            
            if (historyRes.statusCode === 200 && historyRes.data[promptId]) {
                const outputs = historyRes.data[promptId].outputs;
                if (outputs && outputs["46"] && outputs["46"].images.length > 0) {
                    const imgInfo = outputs["46"].images[0];
                    return `${baseUrl}/view?filename=${imgInfo.filename}&subfolder=${imgInfo.subfolder}&type=${imgInfo.type}`;
                }
            }
        }
        throw new Error('生图超时');
    }
};