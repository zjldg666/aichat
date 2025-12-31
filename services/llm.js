// AiChat/services/llm.js

// 🔥🔥🔥 [新增] 补全缺失的配置获取函数，供 create.vue 调用 🔥🔥🔥
export const getCurrentLlmConfig = () => {
    try {
        const schemes = uni.getStorageSync('app_llm_schemes') || [];
        const index = uni.getStorageSync('app_current_scheme_index') || 0;
        
        if (schemes.length > 0 && index >= 0 && index < schemes.length) {
            return schemes[index];
        }
    } catch (e) {
        console.error('获取配置失败:', e);
    }
    return null;
};

// 👇👇👇 下面是你原有的代码，完全保持不动 👇👇👇
export const LLM = {
  /**
   * 统一的 LLM 聊天接口
   * @param {Object} params
   * @param {Object} params.config - { provider, apiKey, baseUrl, model }
   * @param {Array} params.messages - 聊天记录 [{role: 'user', content: '...'}, ...]
   * @param {String} [params.systemPrompt] - (可选) 系统指令
   * @param {Boolean} [params.jsonMode] - (可选) 是否强制 JSON 模式
   * @returns {Promise<String>} - 返回 AI 的回复文本
   */
  async chat({ config, messages, systemPrompt, temperature = 0.7, maxTokens = 1500, jsonMode = false }) {
    if (!config || !config.apiKey) throw new Error('API 配置缺失');

    let baseUrl = config.baseUrl || '';
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    
    let targetUrl = '';
    let header = { 'Content-Type': 'application/json' };
    let requestBody = {};
    
    // ---------------------------------------------------------
    // A. 适配 Gemini 格式
    // ---------------------------------------------------------
    if (config.provider === 'gemini') {
        const cleanBase = 'https://generativelanguage.googleapis.com';
        targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
        
        // Gemini 的 role 只有 'user' 和 'model'
        const geminiContents = messages.map(m => ({
            role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));
        
        requestBody = {
            contents: geminiContents,
            generationConfig: {
                temperature: temperature,
                maxOutputTokens: maxTokens,
                // 🌟 Gemini 的 JSON 模式开关
                responseMimeType: jsonMode ? "application/json" : "text/plain"
            }
        };
        
        if (systemPrompt) {
            // 🛠️ 修正：Gemini 的 system_instruction.parts 必须是数组
            requestBody.system_instruction = { 
                parts: [{ text: systemPrompt }] 
            };
        }
    } 
    // ---------------------------------------------------------
    // B. 适配 OpenAI / 兼容格式 (DeepSeek, GPT-4, etc.)
    // ---------------------------------------------------------
    else {
        targetUrl = `${baseUrl}/chat/completions`;
        header['Authorization'] = `Bearer ${config.apiKey}`;
        
        const openAIMessages = [...messages];
        // OpenAI 将 System Prompt 放在 messages 数组的第一条
        if (systemPrompt) {
            openAIMessages.unshift({ role: "system", content: systemPrompt });
        }
        
        requestBody = {
            model: config.model,
            messages: openAIMessages,
            max_tokens: maxTokens,
            temperature: temperature,
            stream: false
        };
        
        if (jsonMode) {
             // 🌟 OpenAI 的 JSON 模式开关
             // 注意：开启此模式时，Prompt 中必须包含 "JSON" 字样
             requestBody.response_format = { type: "json_object" };
        }
    }

    // ---------------------------------------------------------
    // C. 发起请求 & 统一解析
    // ---------------------------------------------------------
    try {
            const res = await uni.request({
                url: targetUrl, 
                method: 'POST', 
                header, 
                data: requestBody, 
                sslVerify: false
            });
    
            if (res.statusCode !== 200) {
                const errorMsg = res.data?.error?.message || `API 请求失败: ${res.statusCode}`;
                console.error('[LLM Error Detail]', res.data);
                throw new Error(errorMsg);
            }
    
            let content = '';
            
            // 解析 Gemini 响应
            if (config.provider === 'gemini') {
                content = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            } 
            // 👇👇👇 修改这里：解析 OpenAI / DeepSeek 响应 👇👇👇
            else {
                let data = res.data;
                // 兼容某些平台返回 string 的情况
                if (typeof data === 'string') { 
                    try { data = JSON.parse(data); } catch(e){} 
                }
                
                // 获取 message 对象
                const choice = data?.choices?.[0];
                const message = choice?.message;
                
                content = message?.content || '';
    
                // 🔥🔥🔥 [新增] 适配 DeepSeek R1 的思维链字段 🔥🔥🔥
                // DeepSeek 会把思考过程放在 reasoning_content 里
                // 我们手动把它包在 <think> 标签里拼接到开头，这样前端就能识别了
                if (message?.reasoning_content) {
                    // 防止重复拼接
                    if (!content.includes('<think>')) {
                        content = `<think>${message.reasoning_content}</think>\n${content}`;
                    }
                }
            }
        
        return content || '';
    } catch (e) {
        console.error('[LLM Service Exception]', e);
        throw e;
    }
  }
};