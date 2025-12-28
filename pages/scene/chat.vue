<template>
  <view class="chat-container" :class="{ 'dark-mode': isDarkMode }">
    
    <view class="custom-navbar">
      <view class="status-bar"></view> 
      <view class="nav-content">
        <view class="nav-btn left" @click="handleLeaveScene">
          <text class="btn-text warning">🚪 离开</text>
        </view>
        
        <view class="nav-title">
          <text class="title-text">{{ sceneData.name || '未知场景' }}</text>
          <text class="sub-text">🕒 {{ formattedTime }}</text>
        </view>
        
        <view class="nav-btn right" @click="openSettings">
          <text class="btn-text">⚙️</text>
        </view>
      </view>
      
      <view class="npc-bar">
        <scroll-view scroll-x class="npc-scroll">
          <view class="npc-list">
            <image 
              v-for="npc in activeNpcs" 
              :key="npc.id" 
              :src="npc.avatar || '/static/ai-avatar.png'" 
              class="mini-avatar"
              :class="{ 'is-visitor': npc.isVisitor }"
              mode="aspectFill"
            ></image>
          </view>
        </scroll-view>
      </view>
    </view>
    
    <view class="nav-placeholder"></view>

    <scroll-view 
      class="chat-scroll" 
      scroll-y="true" 
      :scroll-into-view="scrollIntoView" 
      :scroll-with-animation="true"
    >
      <view class="chat-content">
        <view class="system-event">
          <text>🎭 剧本已加载: {{ sceneData.playerIdentity || '玩家' }} 进入了场景</text>
        </view>

        <view 
          v-for="(msg, index) in messageList" 
          :key="msg.id || index" 
          :id="'msg-' + index" 
          class="message-item" 
          :class="msg.role === 'user' ? 'right' : 'left'"
        >
          <image v-if="msg.role === 'user'" class="avatar" :src="userAvatar" mode="aspectFill"></image>
          <image 
            v-if="msg.role !== 'user' && !msg.isSystem" 
            class="avatar" 
            :src="getNpcAvatar(msg.role)" 
            mode="aspectFill"
          ></image>

          <view class="bubble-wrapper">
             <view v-if="msg.role !== 'user' && !msg.isSystem" class="sender-name">{{ msg.role }}</view>
             
             <view v-if="msg.isSystem" class="system-bubble">
                <text>{{ msg.content }}</text>
             </view>

             <view v-else class="bubble" :class="msg.role === 'user' ? 'right-bubble' : 'left-bubble'">
                <text class="msg-text" user-select>{{ msg.content }}</text>
             </view>
          </view>
        </view>
        
        <view v-if="loadingStatus" class="loading-wrapper">
          <view class="loading-content">
            <view class="loading-spinner"></view>
            <text class="loading-text">
              {{ loadingStatus === 'director' ? '🎬 导演正在调度...' : `👤 ${currentSpeakerName} 正在组织语言...` }}
            </text>
          </view>
        </view>
        <view id="scroll-bottom" style="height: 20rpx;"></view>
      </view>
    </scroll-view>

    <view class="footer">
      <view class="input-area">
        <view class="action-btn" @click="handleTimeAction">⏳</view>
        <input class="input" v-model="inputText" confirm-type="send" @confirm="sendMessage()" placeholder="描述你的行动或说话..." />
        <view class="send-btn" @click="sendMessage()">发送</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, nextTick, computed } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { DB } from '@/utils/db.js';
import { LLM, getCurrentLlmConfig } from '@/services/llm.js';
import { useTheme } from '@/composables/useTheme.js';
import { useGameTime } from '@/composables/useGameTime.js';
import { useAgents } from '@/composables/useAgents.js';
import { buildSystemPrompt } from '@/core/prompt-builder.js';
import { useWorldScheduler } from '@/composables/useWorldScheduler.js'; // 引入世界调度器
const allNpcs = ref([]); // 👥 保存该场景的所有 NPC（大名单）
const currentSubLocation = ref(''); // 📍 当前子区域 (如: "卫生间", "包厢")
const { isDarkMode, applyNativeTheme } = useTheme();
const { currentTime, formattedTime, initTimeSync, handleTimeSkip } = useGameTime();
const { tickWorldState } = useWorldScheduler(); // 初始化调度器

// --- 核心状态 ---
const sceneId = ref(null);
const sceneData = ref({});
const activeNpcs = ref([]); 
const messageList = ref([]);
const inputText = ref('');
const loadingStatus = ref(''); // '' | 'director' | 'actor'
const currentSpeakerName = ref('');
const scrollIntoView = ref('');
const userAvatar = ref('/static/user-avatar.png');

// --- 虚拟状态适配 useAgents (为了复用 summary 逻辑) ---
const currentLocation = ref('场景中');
const currentClothing = ref('默认');
const currentAction = ref('互动');
const interactionMode = ref('face');
const currentRelation = ref('队友'); 
const currentAffection = ref(50);
const currentActivity = ref('多人互动');
const playerLocation = ref('场景中');
const enableSummary = ref(true);
const summaryFrequency = ref(10);
const currentSummary = ref('');

// --- 基础工具函数 ---
const scrollToBottom = () => {
    nextTick(() => {
        scrollIntoView.value = '';
        setTimeout(() => { scrollIntoView.value = 'scroll-bottom'; }, 100);
    });
};

const saveCharacterState = (mode, loc, summary) => {
    // 1. 接收来自 useAgents 的更新 (如果有)
    if (summary) {
        currentSummary.value = summary; // 核心修复：更新当前内存中的摘要
    }
    
    // 2. 保存到本地存储
    if (sceneId.value) {
         const allScenes = uni.getStorageSync('app_scene_list') || [];
         const idx = allScenes.findIndex(s => String(s.id) === String(sceneId.value));
         if (idx !== -1) {
             // 确保存入的是最新的 currentSummary.value
             allScenes[idx].summary = currentSummary.value; 
             uni.setStorageSync('app_scene_list', allScenes);
             console.log('💾 [Scene] 场景记忆已保存');
         }
    }
};
const saveHistory = async () => {}; // 占位

// --- 初始化 Agents (用于自动总结) ---
const { checkAndRunSummary, runDayEndSummary } = useAgents({
    chatId: sceneId, 
    messageList,
    currentRole: sceneData, 
    chatName: computed(() => sceneData.value.name || '未知场景'),
    currentLocation, currentClothing, currentAction,
    interactionMode, currentRelation, currentAffection,
    currentActivity, playerLocation, formattedTime,
    enableSummary, summaryFrequency, currentSummary,
    saveCharacterState, saveHistory, scrollToBottom,
    getCurrentLlmConfig,
    sceneParticipants: activeNpcs 
});

// --- 核心交互逻辑 ---

// 离开场景：触发记忆融合
// 离开场景：触发记忆融合与状态解绑
const handleLeaveScene = () => {
    uni.showModal({
        title: '离开场景',
        content: '确定要离开这里回家吗？',
        success: async (res) => {
            if (res.confirm) {
                // 读取最新的通讯录数据，准备统一修改
                let contacts = uni.getStorageSync('contact_list') || [];
                let hasChange = false;

                // =========================================================
                // 1. 记忆融合协议 (将场景发生的剧情摘要同步给在场 NPC 的私聊存档)
                // =========================================================
                if (enableSummary.value && currentSummary.value) {
                    uni.showLoading({ title: '正在同步记忆...' });
                    
                    const sceneName = sceneData.value.name || '未知场景';
                    let syncCount = 0;
                    // 构建记忆片段，例如：【周一 10:00 于 咖啡馆】: 聊得很开心...
                    const memoryFragment = `\n【${formattedTime.value} 于 ${sceneName}】: ${currentSummary.value}`;

                    for (const npc of activeNpcs.value) {
                        // 找到 NPC 在通讯录里的真身
                        const realIndex = contacts.findIndex(c => String(c.id) === String(npc.privateChatId));
                        
                        if (realIndex !== -1) {
                            const contact = contacts[realIndex];
                            const originalSummary = contact.summary || '';
                            
                            // 简单查重：防止短时间内重复进出导致重复添加相同的记忆
                            // 只要原记忆里不包含这段摘要的前15个字，就认为是一段新记忆
                            if (!originalSummary.includes(currentSummary.value.slice(0, 15))) { 
                                contact.summary = originalSummary + memoryFragment;
                                hasChange = true;
                                syncCount++;
                            }
                        }
                    }

                    if (syncCount > 0) {
                        uni.showToast({ title: `记忆已同步给${syncCount}人`, icon: 'success' });
                    }
                    
                    // 稍微等待一下 UI 显示，提升体验
                    await new Promise(r => setTimeout(r, 800));
                    uni.hideLoading();
                }

                // =========================================================
                // 2. 解除绑定 (核心修复：只解绑同场关系，不改变 NPC 物理位置)
                // =========================================================
                contacts.forEach(contact => {
                    // 只要这个人的“同场标记”是当前场景 ID，说明刚才玩家和他在一起
                    if (String(contact.playerInSceneId) === String(sceneId.value)) {
                        
                        // A. 解除绑定：玩家走了，不再和他在同一个场景了
                        //    (这样你在首页点他，才会进入私聊，而不是被吸回场景)
                        contact.playerInSceneId = null; 
                        
                        // B. 模式切换：变成了远程通讯
                        contact.interactionMode = 'phone'; 
                        
                        // C. 【重要】不要修改 contact.currentLocation
                        // 让 NPC 继续留在场景里（直到 WorldScheduler 调度他下班）
                        // 这样即使玩家走了，NPC 依然在咖啡馆，保持世界真实性
                        
                        hasChange = true;
                        console.log(`🔓 [解绑] 玩家离开了 ${contact.name} 所在的场景`);
                    }
                });

                // =========================================================
                // 3. 统一保存所有变更并退出
                // =========================================================
                if (hasChange) {
                    uni.setStorageSync('contact_list', contacts);
                }

                uni.navigateBack();
            }
        }
    });
};

// 打开设置
const openSettings = () => {
    // 直接跳转到编辑页
    uni.navigateTo({
        url: `/pages/scene/create?id=${sceneId.value}`
    });
};

// --- 加载数据逻辑 ---
onLoad(async (options) => {
    applyNativeTheme();
    if (options.id) {
        sceneId.value = options.id;
        loadSceneData(options.id, options.visitorId);
        
        uni.hideNavigationBarLoading();
        
        try {
            const history = await DB.select(
                `SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC`,
                [String(options.id)]
            );
            if (history) {
                messageList.value = history.map(m => ({ ...m, isSystem: !!m.isSystem }));
                scrollToBottom();
            }
            
            if (options.visitorId) {
                const contacts = uni.getStorageSync('contact_list') || [];
                const visitor = contacts.find(c => String(c.id) === String(options.visitorId));
                if (visitor) {
                    // 如果是访客，且不在历史记录最后一条，发个系统提示
                    const lastMsg = messageList.value[messageList.value.length - 1];
                    if (!lastMsg || lastMsg.content.indexOf(visitor.name) === -1) {
                        messageList.value.push({
                            role: 'system', isSystem: true,
                            content: `👋 你来到了 ${sceneData.value.name}，正在寻找 ${visitor.name}...`
                        });
                    }
                }
            }
        } catch (e) { console.error('历史加载失败', e); }
    }
});

onUnload(() => { saveCharacterState(); });

// 加载场景数据 (含考勤过滤)
const loadSceneData = (id, visitorId) => {
    const allScenes = uni.getStorageSync('app_scene_list') || [];
    const target = allScenes.find(s => String(s.id) === String(id));
    if (!target) return;

    sceneData.value = target;
    
    // 加载记忆配置
    if (target.summary) currentSummary.value = target.summary;
    if (target.memorySettings) {
        enableSummary.value = target.memorySettings.enableSummary !== false;
        summaryFrequency.value = target.memorySettings.summaryFrequency || 10;
    }

    initTimeSync(Date.now(), target.worldId);

    const allContacts = uni.getStorageSync('contact_list') || [];
    
    // 1. 准备候选名单
    let potentialNpcs = target.npcs.map(simpleNpc => {
        const fullProfile = allContacts.find(c => String(c.id) === String(simpleNpc.id));
        return {
            ...simpleNpc,
            name: fullProfile?.name || simpleNpc.name,
            avatar: fullProfile?.avatar || '/static/ai-avatar.png',
            settings: fullProfile?.settings || {},
            persona: fullProfile?.settings?.description || '普通人',
            clothing: fullProfile?.clothing,
            resetTime: fullProfile?.resetTime || 0,
            privateChatId: fullProfile?.id || simpleNpc.id,
            realCurrentLocation: fullProfile?.currentLocation || '未知' // 读取真实位置
        };
    });

    // 2. 考勤过滤
    const presentNpcs = potentialNpcs.filter(npc => {
        if (visitorId && String(npc.id) === String(visitorId)) return true;
        
        // 模糊匹配位置
        const isHere = npc.realCurrentLocation.includes(target.name) || 
                       target.name.includes(npc.realCurrentLocation);
                       
        return isHere;
    });

    // 3. 强制加入访客 (如果被过滤掉了)
    if (visitorId) {
        const isAlreadyIn = presentNpcs.some(n => String(n.id) === String(visitorId));
        if (!isAlreadyIn) {
            const visitor = allContacts.find(c => String(c.id) === String(visitorId));
            if (visitor) {
                presentNpcs.push({
                    id: visitor.id,
                    name: visitor.name,
                    avatar: visitor.avatar || '/static/ai-avatar.png',
                    settings: visitor.settings || {},
                    persona: visitor.settings?.description || '普通人',
                    clothing: visitor.clothing,
                    initialState: '刚走进来',
                    sceneRole: '被寻找的目标',
                    worldId: visitor.worldId,
                    privateChatId: visitor.id,
                    realCurrentLocation: '这里'
                });
            }
        }
    }

    // 4. 空场景提示
    if (presentNpcs.length === 0) {
        messageList.value.push({
            role: 'system', isSystem: true,
            content: `(当前时间 ${formattedTime.value}，场景里空荡荡的，大家都去忙别的事了...)`
        });
    }

    // 🔥🔥🔥 修改这里 🔥🔥🔥
        activeNpcs.value = presentNpcs;
        allNpcs.value = [...presentNpcs]; // 备份全员名单，方便以后从厕所出来时把 Bob 找回来
        currentSubLocation.value = target.name; // 初始位置就是大厅
};

const getNpcAvatar = (roleName) => {
    const target = activeNpcs.value.find(n => roleName.includes(n.name));
    return target ? target.avatar : '/static/ai-avatar.png'; 
};

// --- 消息处理 ---
const saveMsgToDB = async (msg) => {
    if (!sceneId.value) return;
    await DB.execute(
        `INSERT OR REPLACE INTO messages (id, chatId, role, content, type, isSystem, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [msg.id, String(sceneId.value), msg.role, msg.content, 'text', msg.isSystem ? 1 : 0, Date.now()]
    );
};

// 核心发送逻辑 (完整版：包含空间调度 + 记忆读取 + 演员演绎)
const sendMessage = async () => {
    // 1. 基础校验
    if (!inputText.value.trim() || loadingStatus.value) return;
    const config = getCurrentLlmConfig();
    if (!config) return uni.showToast({ title: '请先配置模型', icon: 'none' });

    // 2. 用户消息上屏与存库
    const text = inputText.value;
    const userMsg = { id: Date.now(), role: 'user', content: text, timestamp: Date.now() };
    

	    console.log(`玩家发送：${text}`, "color:#333; font-weight:bold;");

    messageList.value.push(userMsg);
    inputText.value = '';
    await saveMsgToDB(userMsg);
    scrollToBottom();

    try {
        // =================================================================
        // 🎬 第一步：导演调度 (Director Agent) - 负责空间与发言权
        // =================================================================
        loadingStatus.value = 'director';
        
        // 准备名单：全员(All) vs 当前在场(Active)
        // allNpcs 需要在 loadSceneData 时初始化，如果未定义则回退到 activeNpcs
        const fullRoster = allNpcs.value && allNpcs.value.length > 0 ? allNpcs.value : activeNpcs.value;
        const allNames = fullRoster.map(n => n.name).join('、');
        const activeNames = activeNpcs.value.map(n => n.name).join('、');
        
        // 动态读取 historyLimit (默认 15)
        const historyLimit = sceneData.value.memorySettings?.historyLimit || 15;
        
        // 发给导演完整的最近记录
        const recentHistory = messageList.value.slice(-historyLimit).map(m => { 
            const roleName = m.role === 'user' ? 'User' : m.role;
            return `${roleName}: "${m.content}"`; 
        }).join('\n');

        console.log(`\n%c========== [🔍 SCENE-DIRECTOR] ==========`, "color:#e67e22; font-weight:bold");
        
        // 构建超级导演 Prompt
        const directorPrompt = `
        [Director Mode]
        Current Scene: ${sceneData.value.name}
        Current Sub-Location: ${currentSubLocation.value || 'Main Area'}
        
        ALL Characters available in this scene: ${allNames}
        Characters currently with User: ${activeNames}
        
        User Input: "${text}"
        
        Task: 
        1. Detect Spatial Movement: Did the user move to a new sub-location? (e.g., "Go to restroom", "Leave the room", "Go back to hall").
        2. Update Participants: If moved, who is with the user now? (Select from ALL Characters).
        3. Assign Speakers: Who should reply?
        
        Output JSON Format ONLY:
        {
            "new_location": "Restroom" or null, 
            "visible_characters": ["Alice"], 
            "next_speakers": ["Alice"] 
        }
        
        Rule: 
        - If user goes to a private place (e.g. restroom) with someone, exclude others.
        - If user goes back to public area, include everyone again.
        `;

        const directorResponse = await LLM.chat({
            config,
            messages: [{ role: 'user', content: directorPrompt }],
            temperature: 0.2, 
            response_format: { type: "json_object" }
        });
        


        let nextSpeakers = [];
        try {
            let cleanJson = directorResponse.replace(/```json|```/g, '').trim();
            // 简单容错：如果 LLM 返回了非 JSON 文本，尝试提取
            if (cleanJson.indexOf('{') > -1) {
                cleanJson = cleanJson.substring(cleanJson.indexOf('{'), cleanJson.lastIndexOf('}') + 1);
            }
            const instruction = JSON.parse(cleanJson);
            
            // --- 🚀 核心：执行空间转移 ---
            if (instruction.visible_characters && Array.isArray(instruction.visible_characters)) {
                // 从全员名单里过滤出新的在场名单
                const newActiveList = fullRoster.filter(npc => 
                    instruction.visible_characters.includes(npc.name)
                );
                
                // 只有当名单真的变了，才更新状态 (防止闪烁)
                const isRosterChanged = newActiveList.length !== activeNpcs.value.length || 
                                      !newActiveList.every((n, i) => n.id === activeNpcs.value[i].id);

                if (isRosterChanged) {
                    activeNpcs.value = newActiveList;
                    
                    // 如果有地点更新，发个系统提示
                    if (instruction.new_location && instruction.new_location !== currentSubLocation.value) {
                        currentSubLocation.value = instruction.new_location;
                        const sysTip = {
                            id: Date.now() + 1,
                            role: 'system', isSystem: true,
                            content: `📍 移动至 [${instruction.new_location}]，当前在场: ${instruction.visible_characters.join('、')}`
                        };
                        messageList.value.push(sysTip);
                        await saveMsgToDB(sysTip);
                    }
                }
            }

            nextSpeakers = instruction.next_speakers || [];
        } catch (e) {
            console.error("导演解析失败，启用降级策略", e);
            // 降级：默认让当前在场的第一个人说话
            nextSpeakers = [activeNpcs.value[0]?.name].filter(Boolean);
        }
        
        // 再次校验发言人 (确保发言人必须在当前视野内)
        nextSpeakers = nextSpeakers.filter(name => activeNpcs.value.find(n => n.name === name));
        if (nextSpeakers.length === 0 && activeNpcs.value.length > 0) nextSpeakers = [activeNpcs.value[0].name];

        console.log(`🎤 最终发言名单: ${JSON.stringify(nextSpeakers)}`);

        // =================================================================
        // 🎭 第二步：演员轮流登场 (Actor Agent)
        // =================================================================
        
        for (const speakerName of nextSpeakers) {
            loadingStatus.value = 'actor';
            currentSpeakerName.value = speakerName; 
            
            const targetNpc = activeNpcs.value.find(n => n.name === speakerName);
            if (!targetNpc) continue;


            
            // --- 记忆注入逻辑 (完整保留) ---
            let memoryContext = "";
            let paradoxInstruction = "";
            
            try {
                // 读取私聊长时记忆
                const globalMem = await DB.select(
                    `SELECT detail FROM diaries WHERE roleId = ? ORDER BY id DESC LIMIT 1`,
                    [String(targetNpc.privateChatId)]
                );
                
                // 读取最近一条私聊记录
                const lastMsgObj = await DB.select(
                    `SELECT content, timestamp, role FROM messages WHERE chatId = ? ORDER BY timestamp DESC LIMIT 1`,
                    [String(targetNpc.privateChatId)]
                );
                
                // 检查是否重置过
                const isReset = targetNpc.resetTime && targetNpc.resetTime > (Date.now() - 1000 * 60 * 60 * 24 * 365);
                
                if (isReset) {
                    console.warn(`⚠️ 触发失忆补丁`);
                    const resetDate = new Date(targetNpc.resetTime).toLocaleString();
                    paradoxInstruction = `\n【⚠️ 系统强制设定】注意：你在 ${resetDate} 发生过记忆重置。你不认识玩家，也不记得之前的私聊。`;
                } else {
                    if (globalMem && globalMem.length > 0) {
                        memoryContext += `\n[长期记忆(私聊)]: ${globalMem[0].detail}\n`;
                    }
                    if (lastMsgObj && lastMsgObj.length > 0) {
                        const timeDiff = Date.now() - lastMsgObj[0].timestamp;
                        // 20分钟内的私聊才算“刚刚”
                        if (timeDiff < 20 * 60 * 1000 && lastMsgObj[0].timestamp > targetNpc.resetTime) {
                            const sender = lastMsgObj[0].role === 'user' ? '玩家' : '你';
                            memoryContext += `\n[刚刚的手机短信]: ${sender}发了 "${lastMsgObj[0].content}"\n`;
                        }
                    }
                }
            } catch (e) { console.error("记忆读取失败", e); }
            
            // 构建 System Prompt
            // 注意：这里传入 location 为动态的子场景
            let charSystemPrompt = buildSystemPrompt({
                role: targetNpc,
                userName: sceneData.value.playerIdentity || 'Player',
                summary: targetNpc.summary || '',
                formattedTime: formattedTime.value,
                location: currentSubLocation.value || sceneData.value.name, // ✨ 使用动态子场景
                mode: 'face', 
                activity: targetNpc.initialState || 'interactive',
                clothes: targetNpc.clothing || 'default',
                relation: targetNpc.currentRelation || 'acquaintance'
            });

            const otherNames = activeNpcs.value.filter(n => n.id !== targetNpc.id).map(n => n.name).join('、');
            charSystemPrompt += `\n\n### 当前具体位置: [${currentSubLocation.value || sceneData.value.name}]\n`;
            if (otherNames) charSystemPrompt += `在场其他人: ${otherNames}。\n`;
            
            if (paradoxInstruction) {
                charSystemPrompt += paradoxInstruction;
            } else if (memoryContext) {
                charSystemPrompt += `\n### 📱 关联记忆\n${memoryContext}\n`;
            }

            charSystemPrompt += `\n要求: 直接输出回复内容，不要带名字前缀，不要带冒号。`;

            // 构建上下文 (动态 historyLimit)
            const context = messageList.value.slice(-historyLimit).map(m => {
                if (m.isSystem) return { role: 'system', content: m.content };
                if (m.role === 'user') return { role: 'user', content: m.content };
                if (m.role === targetNpc.name) {
                    if (targetNpc.resetTime && m.timestamp < targetNpc.resetTime) {
                        return { role: 'user', content: `(这是重置前的${targetNpc.name}说的): "${m.content}"` };
                    }
                    return { role: 'assistant', content: m.content };
                }
                return { role: 'user', content: `(你听到 ${m.role} 说): "${m.content}"` };
            });

            console.log(`📚 上下文条数: ${context.length}`);

            let reply = await LLM.chat({
                config,
                messages: context,
                systemPrompt: charSystemPrompt
            });

            if (reply) {
                const namePrefixRegex = new RegExp(`^${targetNpc.name}[:：]\\s*`, 'i');
                const cleanContent = reply.replace(namePrefixRegex, '').trim();
				// 🔥🔥🔥 [新增] 控制台打印 AI 回复 🔥🔥🔥
				             
				                console.log(`${targetNpc.name} 回复：${cleanContent}`, "color:#333; font-weight:bold;");
				   
                const finalMsg = {
                    id: Date.now() + Math.random(),
                    role: targetNpc.name, 
                    content: cleanContent,
                    isSystem: false,
                    timestamp: Date.now()
                };
                
                messageList.value.push(finalMsg);
                await saveMsgToDB(finalMsg);
                scrollToBottom();
            }
        }
        
        checkAndRunSummary();

    } catch (e) {
        console.error("出错:", e);
        uni.showToast({ title: 'AI 响应出错', icon: 'none' });
    } finally {
        loadingStatus.value = '';
        currentSpeakerName.value = '';
        scrollToBottom();
    }
};

const handleTimeAction = () => {
    uni.showActionSheet({
        itemList: ['休息一会 (1小时)', '跳过半天', '等到明天'],
        success: (res) => {
            let type = '';
            if (res.tapIndex === 0) type = 'custom'; 
            if (res.tapIndex === 1) type = 'afternoon';
            if (res.tapIndex === 2) type = 'day';
            const isNextDay = handleTimeSkip(type);
            
            // 🔥 时间变了，驱动世界运转
            if (sceneData.value.worldId) {
                tickWorldState(currentTime.value, sceneData.value.worldId);
            }
            
            const tip = { id: Date.now(), role: 'system', isSystem: true, content: `⏳ 时间流逝... ${formattedTime.value}` };
            messageList.value.push(tip);
            saveMsgToDB(tip);
            
            if (isNextDay) runDayEndSummary();
        }
    });
};
</script>

<style lang="scss" scoped>
/* 容器 */
.chat-container { display: flex; flex-direction: column; height: 100vh; background-color: var(--bg-color); }

/* --- 🔥 1. 自定义导航栏样式 (Fixed Top) --- */
.custom-navbar {
    position: fixed; top: 0; left: 0; width: 100%; z-index: 999;
    background-color: var(--card-bg); border-bottom: 1px solid var(--border-color);
    padding-bottom: 10rpx;
}
.status-bar { height: var(--status-bar-height); width: 100%; background-color: var(--card-bg); }

.nav-content {
    height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 20rpx;
}
.nav-btn {
    padding: 10rpx 20rpx; border-radius: 12rpx; background: rgba(0,0,0,0.03);
    &:active { background: rgba(0,0,0,0.1); }
}
.btn-text { font-size: 28rpx; color: var(--text-color); }
.warning { color: #ff4d4f; font-weight: bold; }

.nav-title { display: flex; flex-direction: column; align-items: center; }
.title-text { font-size: 32rpx; font-weight: bold; color: var(--text-color); }
.sub-text { font-size: 22rpx; color: #007aff; }

/* NPC 头像条 */
.npc-bar { padding: 10rpx 20rpx; }
.npc-scroll { white-space: nowrap; width: 100%; }
.npc-list { display: flex; gap: 16rpx; }
.mini-avatar { 
    width: 60rpx; height: 60rpx; border-radius: 50%; border: 2rpx solid #fff; 
    &.is-visitor { border-color: #007aff; box-shadow: 0 0 8rpx rgba(0,122,255,0.5); }
}

/* 占位符 (Status + Nav + NPC Bar) */
.nav-placeholder { width: 100%; height: calc(var(--status-bar-height) + 88rpx + 80rpx); }

/* --- 2. 聊天区 --- */
.chat-scroll { flex: 1; overflow: hidden; }
.chat-content { padding: 30rpx; padding-bottom: 180rpx; }

.message-item { display: flex; margin-bottom: 30rpx; 
    &.left { flex-direction: row; }
    &.right { flex-direction: row-reverse; }
}
.avatar { width: 80rpx; height: 80rpx; border-radius: 10rpx; flex-shrink: 0; background: #ccc; margin: 0 20rpx; }
.bubble-wrapper { max-width: 70%; display: flex; flex-direction: column; }
.sender-name { font-size: 22rpx; color: var(--text-sub); margin-bottom: 6rpx; }
.bubble { padding: 18rpx 24rpx; border-radius: 12rpx; font-size: 30rpx; line-height: 1.5; word-wrap: break-word;}
.left-bubble { background: var(--card-bg); color: var(--text-color); border: 1px solid var(--border-color); }
.right-bubble { background: #95ec69; color: #000; }
.system-bubble { background: rgba(0,0,0,0.05); padding: 10rpx 20rpx; border-radius: 8rpx; font-size: 24rpx; color: var(--text-sub); font-style: italic; }
.system-event { text-align: center; margin-bottom: 30rpx; font-size: 24rpx; color: var(--text-sub); }

/* --- 3. 底部 --- */
.footer { position: fixed; bottom: 0; width: 100%; background: var(--card-bg); border-top: 1px solid var(--border-color); padding-bottom: env(safe-area-inset-bottom); }
.input-area { display: flex; padding: 20rpx; align-items: center; }
.input { flex: 1; background: var(--input-bg); height: 72rpx; border-radius: 36rpx; padding: 0 30rpx; color: var(--text-color); }
.action-btn { font-size: 40rpx; padding: 0 20rpx; }
.send-btn { margin-left: 20rpx; background: #007aff; color: #fff; padding: 10rpx 30rpx; border-radius: 30rpx; font-size: 28rpx;}

.loading-wrapper { display: flex; justify-content: center; margin-top: 20rpx; }
.loading-content { display: flex; align-items: center; background: rgba(0,0,0,0.6); padding: 10rpx 20rpx; border-radius: 30rpx; }
.loading-spinner { width: 30rpx; height: 30rpx; border: 3rpx solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 15rpx; }
.loading-text { font-size: 24rpx; color: #fff; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>