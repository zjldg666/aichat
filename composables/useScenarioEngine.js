/**
 * composables/useScenarioEngine.js
 * 小剧场模式的核心逻辑引擎
 * 修复版：适配 LLM.chat 对象调用
 */
import { ref } from 'vue';
import { DB } from '@/utils/db.js';
// 🔴 修复 1：导入 LLM 对象，而不是不存在的 sendLLMRequest
import { LLM, getCurrentLlmConfig } from '@/services/llm.js'; 
import { 
    buildDirectorPrompt, 
    buildActorPrompt, 
    buildLogUpdatePrompt, 
    buildLeaveScenePrompt, 
    buildTitleGenPrompt 
} from '@/core/scenario-prompts.js';

export function useScenarioEngine() {
    // === 核心状态 ===
    const currentScenario = ref(null); 
    const messages = ref([]);          
    const loading = ref(false);        
    
    // === 游戏资源 ===
    const availableNpcs = ref([]);     
    const availableItems = ref([]);    
    
    // === 记忆系统 ===
    const sceneLog = ref("");          
    const lastSummaryIndex = ref(0);   
    
    // 配置
    const summaryFreq = ref(6);
    const historyLimit = ref(20);

    /**
     * 🔴 修复 2：本地定义适配器函数
     * 这样下面所有的逻辑都不用改，直接调用这个函数即可
     */
    const sendLLMRequest = async (params) => {
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) {
            throw new Error("请先在'我的'页面配置 AI 模型");
        }

        // 调用你 llm.js 中的 LLM.chat 方法
        const responseText = await LLM.chat({
            config: config,
            messages: params.messages,
            temperature: params.temperature || 0.7,
            jsonMode: params.jsonMode || false,
            maxTokens: 2000 // 稍微给大点，防止截断
        });
        
        return responseText;
    };

    /**
     * 1. 初始化场景
     */
    const initScenario = async (scenarioId) => {
        loading.value = true;
        messages.value = [];
        sceneLog.value = "";
        lastSummaryIndex.value = 0;

        try {
            // A. 加载场景数据
            const res = await DB.select(`SELECT * FROM scenarios WHERE id = '${scenarioId}'`);
            if (!res || res.length === 0) throw new Error("场景不存在");
            
            const data = res[0];
            
            // 解析 JSON 字段
            try { data.npcs = JSON.parse(data.npcs); } catch(e) { data.npcs = []; }
            try { data.items = JSON.parse(data.items); } catch(e) { data.items = []; }
            
            // 解析配置项
            let playerSetup = {};
            try { playerSetup = JSON.parse(data.player_setup); } catch(e) {}
            
            summaryFreq.value = playerSetup.summaryFrequency || 6;
            historyLimit.value = playerSetup.historyLimit || 20;

            currentScenario.value = data;
            availableNpcs.value = data.npcs;
            availableItems.value = data.items;

            // B. 加载历史存档
            const logs = await DB.select(
                `SELECT detail FROM diaries WHERE roleId = '${scenarioId}' ORDER BY id DESC LIMIT 1`
            );
            
            if (logs && logs.length > 0) {
                sceneLog.value = logs[0].detail; 
                messages.value.push({
                    role: 'system_display',
                    content: '已加载历史剧情存档...'
                });
            } else {
                sceneLog.value = "玩家刚刚进入场景。";
                // 首次进入，触发开场
                await triggerNarratorOpening();
            }

        } catch (e) {
            console.error("加载场景失败:", e);
            uni.showToast({ title: '加载失败', icon: 'none' });
        } finally {
            loading.value = false;
        }
    };

    /**
     * 2. 核心交互循环：发送文本
     */
    const sendText = async (content) => {
        if (loading.value) return;
        
        messages.value.push({ role: 'user', content: content });
        loading.value = true;

        try {
            await runGameLoop();
        } catch (e) {
            console.error("Game Loop Error:", e);
            messages.value.push({ role: 'system', content: `[系统错误]: ${e.message}` });
        } finally {
            loading.value = false;
            tryTriggerLogUpdate();
        }
    };

    /**
     * 3. 使用道具
     */
    const useItem = async (index, targetName) => {
        const item = availableItems.value[index];
        if (!item) return;

        const eventText = `[System Event]: 玩家对【${targetName}】使用了道具【${item.name}】。\n效果定义: ${item.effect}`;
        
        messages.value.push({ 
            role: 'system_display', 
            content: `使用了 [${item.name}] -> ${targetName}` 
        });

        // 隐式推入历史
        messages.value.push({ role: 'system', content: eventText });

        loading.value = true;
        try {
            await runGameLoop();
        } finally {
            loading.value = false;
            tryTriggerLogUpdate();
        }
    };

    /**
     * 🔄 游戏主循环 (Director -> Actor)
     */
    const runGameLoop = async () => {
        // === Step 1: 导演调度 ===
        const recentHistory = messages.value
            .filter(m => m.role !== 'system_display')
            .slice(-10);

        const activeNpcNames = availableNpcs.value.map(n => n.name);
        
        const directorPrompt = buildDirectorPrompt(currentScenario.value, recentHistory, activeNpcNames);
        
        // 调用 AI (导演)
        const directorRes = await sendLLMRequest({
            messages: [{ role: 'user', content: directorPrompt }],
            temperature: 0.3, 
            jsonMode: true    
        });

        // 解析导演指令
        let targetRole = "Narrator";
        let directorNote = "";
        
        try {
            // 清洗可能存在的 markdown
            const jsonStr = directorRes.replace(/```json/g, '').replace(/```/g, '').trim();
            const instruction = JSON.parse(jsonStr);
            targetRole = instruction.target || "Narrator";
            directorNote = instruction.context_note || "";
        } catch (e) {
            console.warn("导演指令解析失败，回退到旁白模式", e);
        }

        console.log(`🎬 导演指令: 让 [${targetRole}] 说话。备注: ${directorNote}`);

        // === Step 2: 演员表演 ===
        let actorPrompt = "";
        
        if (targetRole === "Narrator" || targetRole === "旁白") {
            actorPrompt = `你现在是旁白。请根据以下导演备注，描写当前场景或动作结果：${directorNote}。请保持客观、沉浸。`;
        } else {
            const npcData = availableNpcs.value.find(n => n.name === targetRole);
            if (!npcData) {
                targetRole = "Narrator";
                actorPrompt = `导演指向了不存在的角色，请作为旁白描述尴尬的沉默。`;
            } else {
                let persona = `姓名: ${npcData.name}\n身份: ${npcData.role}\n性别: ${npcData.gender}\n性格: ${npcData.desc}`;
                if (npcData.appearance) persona += `\n外貌: ${npcData.appearance}`;
                
                actorPrompt = buildActorPrompt(persona, currentScenario.value, sceneLog.value, directorNote);
            }
        }

        // 组装历史记录
        const contextMessages = messages.value
            .filter(m => m.role !== 'system_display')
            .slice(-historyLimit.value)
            .map(m => ({
                role: m.role === 'user' ? 'user' : (m.role === 'system' ? 'system' : 'assistant'),
                content: m.content
            }));

        // 插入 Actor System Prompt
        const finalMessages = [
            { role: 'system', content: actorPrompt },
            ...contextMessages
        ];

        // 调用 AI (演员)
        const actorRes = await sendLLMRequest({
            messages: finalMessages,
            temperature: 0.9 
        });

        // 上屏
        messages.value.push({
            role: targetRole,
            content: actorRes
        });
    };

    /**
     * 📝 滚动日志更新
     */
    const tryTriggerLogUpdate = async () => {
        const total = messages.value.length;
        if (total - lastSummaryIndex.value >= summaryFreq.value) {
            await performLogUpdate();
        }
    };

    const performLogUpdate = async () => {
        const total = messages.value.length;
        if (total <= lastSummaryIndex.value) return;

        const newMsgs = messages.value.slice(lastSummaryIndex.value)
            .filter(m => m.role !== 'system' && m.role !== 'system_display')
            .map(m => `[${m.role}]: ${m.content}`)
            .join('\n');

        if (!newMsgs.trim()) return;

        try {
            const prompt = buildLogUpdatePrompt(sceneLog.value, newMsgs);
            const newLog = await sendLLMRequest({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3
            });
            
            if (newLog) {
                sceneLog.value = newLog;
                lastSummaryIndex.value = total;
                console.log("✅ 日志已更新");
            }
        } catch (e) {
            console.warn("日志更新失败", e);
        }
    };

    /**
     * 🚪 离开场景
     */
    const handleLeaveScene = async () => {
        if (loading.value) return;
        loading.value = true;
        uni.showLoading({ title: '正在存档...', mask: true });

        try {
            // 1. 剧情收尾
            const leavePrompt = buildLeaveScenePrompt(currentScenario.value, sceneLog.value);
            const closureRes = await sendLLMRequest({
                messages: [{ role: 'system', content: leavePrompt }],
                temperature: 0.7
            });
            
            messages.value.push({ role: 'Narrator', content: closureRes });
            
            // 2. 强制日志更新
            await performLogUpdate();

            // 3. 生成标题
            const titlePrompt = buildTitleGenPrompt(sceneLog.value);
            let title = await sendLLMRequest({ messages: [{ role: 'user', content: titlePrompt }] });
            title = title.replace(/["《》]/g, '').trim();

            // 4. 存库
            const now = new Date();
            const dateStr = `${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}`;
            
            await DB.execute(
                `INSERT INTO diaries (id, roleId, dateStr, brief, detail, mood) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    Date.now(),
                    currentScenario.value.id,
                    dateStr,
                    title || "未知冒险",
                    sceneLog.value,
                    "scenario"
                ]
            );

            uni.hideLoading();
            uni.showToast({ title: '存档成功', icon: 'success' });
            setTimeout(() => uni.navigateBack(), 1000);

        } catch (e) {
            console.error(e);
            uni.hideLoading();
            uni.showToast({ title: '存档失败', icon: 'none' });
            setTimeout(() => uni.navigateBack(), 1500);
        } finally {
            loading.value = false;
        }
    };

    // 开场白
    // 辅助：开场白 (修改版：强制中文)
        const triggerNarratorOpening = async () => {
            // ✨ 修改 Prompt，明确要求中文，并加上引导词
            const prompt = `
    [System Command: NARRATOR_INTRO]
    【任务】：游戏开始了。请根据场景设定，生成一段引人入胜的**开场旁白**。
    【场景】：${currentScenario.value.name} - ${currentScenario.value.description}
    【玩家身份】：${currentScenario.value.playerIdentity || '冒险者'}
    【要求】：
    1. 使用**简体中文**。
    2. 描写环境氛围，并给出一个初始的行动契机。
    3. 语气要沉浸，像小说开头一样。
    `;
            
            // 这一步不走 Director，直接生成 Narrator 消息
            const res = await sendLLMRequest({
                messages: [{ role: 'system', content: prompt }]
            });
            messages.value.push({ role: 'Narrator', content: res });
        };

    return {
        currentScenario,
        messages,
        loading,
        availableNpcs,
        availableItems,
        sceneLog,
        initScenario,
        sendText,
        useItem,
        handleLeaveScene,
        tryTriggerLogUpdate
    };
}