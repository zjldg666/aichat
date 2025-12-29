<template>
  <view class="chat-container" :class="{ 'dark-mode': isDarkMode }">
    
    <view class="custom-navbar">
      <view class="status-bar"></view> 
      <view class="nav-content">
        <view class="nav-btn left" @click="handleLeaveScene">
          <text class="btn-text warning">🚪 离开</text>
        </view>
        
	<view class="nav-title" @click="handleLocationSwitch">
	<text class="title-text">{{ sceneData.name || '未知场景' }}</text>
	<text class="sub-text">📍 {{ currentSubLocation || '大厅' }} <text style="font-size: 20rpx; margin-left:6rpx;">▼</text></text>
	</view>
	
	<view class="npc-list">
	<image 
		v-for="npc in activeNpcs" 
		:key="npc.id" 
		:src="npc.avatar || '/static/ai-avatar.png'" 
		class="mini-avatar"
		:class="{ 'is-visitor': npc.isVisitor }"
		mode="aspectFill"
	></image>
	
	<view class="invite-btn" @click="handleInvite">
		<text>+</text>
	</view>
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
import { runAutonomousActor } from '@/core/director.js'; // 只需要引入这个新函数

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

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
// --- 基础工具函数 ---
const scrollToBottom = () => {
    nextTick(() => {
        scrollIntoView.value = '';
        setTimeout(() => { scrollIntoView.value = 'scroll-bottom'; }, 100);
    });
};

// 🔥 修复版：保存玩家状态 (增加 lastSubLocation)
const saveCharacterState = (mode, loc, summary) => {
    // 1. 接收更新
    if (summary) currentSummary.value = summary;
    
    // 2. 保存到本地存储
    if (sceneId.value) {
         const allScenes = uni.getStorageSync('app_scene_list') || [];
         const idx = allScenes.findIndex(s => String(s.id) === String(sceneId.value));
         if (idx !== -1) {
             // 保存记忆摘要
             allScenes[idx].summary = currentSummary.value; 
             
             // 🔥 核心修复：保存玩家最后所在的子场景
             // 这样下次进来看，你就在休息室，而不是大厅
             allScenes[idx].lastSubLocation = currentSubLocation.value;
             
             uni.setStorageSync('app_scene_list', allScenes);
             console.log(`💾 [Scene] 玩家位置已存档: ${currentSubLocation.value}`);
         }
    }
};
const saveHistory = async () => {}; // 占位
// 🔥 新增函数：根据当前地点刷新在场 NPC
const refreshActiveNpcs = () => {
    if (!allNpcs.value || allNpcs.value.length === 0) {
        activeNpcs.value = [];
        return;
    }
    // 只保留：当前位置 == 玩家当前子场景 的 NPC
    activeNpcs.value = allNpcs.value.filter(n => n.currentSubLocation === currentSubLocation.value);
};
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


// 🔥 修改函数：handleLeaveScene (多视角并行记忆写入)
const handleLeaveScene = () => {
    uni.showModal({
        title: '离开场景',
        content: '确定要离开吗？每位角色将整理这段经历并写入记忆。',
        success: async (res) => {
            if (res.confirm) {
                // 如果场景里没人，直接走
                if (activeNpcs.value.length === 0) {
                    uni.navigateBack();
                    return;
                }

                uni.showLoading({ title: '正在同步记忆...', mask: true });

                try {
					// 1. 获取本次场景的完整对话记录
					let chatLog = messageList.value
						.filter(m => !m.isSystem)
						.map(m => `${m.role}: ${m.content}`)
						.join('\n');
					
					// 🔥🔥🔥 核心修复：手动注入“离开事件”到剧本末尾 🔥🔥🔥
					// 这样 AI 总结时，就会知道故事已经结束了，而不是“正在进行中”
					const playerName = sceneData.value.playerIdentity || '玩家';
					chatLog += `\n【系统旁白】: ${playerName} 看了看时间，决定结束对话并离开这里。`;
                        
                    if (!chatLog || chatLog.length < 10) {
                        uni.hideLoading();
                        uni.navigateBack();
                        return;
                    }

                    const config = getCurrentLlmConfig();
                    const timeStr = formattedTime.value;
                    const dateStr = new Date().toLocaleDateString();
                    const sceneName = sceneData.value.name;
                    const locationName = currentSubLocation.value;

                    // 2. 🔥 核心：并行触发每个 NPC 的主观总结 (Promise.all)
                    // 我们要为 activeNpcs 里的每一个人生成一份独特的记忆
                    const summaryTasks = activeNpcs.value.map(async (npc) => {
                        
                        // 构建“主观视角” Prompt
                        // 告诉 AI：你是 ${npc.name}，这是刚才发生的事，请你写日记。
                        const perspectivePrompt = `
                        [Memory Generator: Subjective Perspective]
                        Role: You are ${npc.name}.
                        Current Scene: ${sceneName} (${locationName})
                        Time: ${timeStr}
                        
                        Transcript of events:
                        ${chatLog}
                        
                        Task: Summarize what just happened from YOUR perspective (${npc.name}). 
                        - Focus on what YOU did, heard, and felt.
                        - Mention interactions with Player and other characters present.
                        - Keep it concise (1-2 sentences).
                        
                        Output (Chinese):
                        `;

                        try {
                            const mySummary = await LLM.chat({
                                config,
                                messages: [{ role: 'user', content: perspectivePrompt }],
                                temperature: 0.3, // 稍微有点温度，让记忆带点个人色彩
                                maxTokens: 300
                            });

                            if (mySummary) {
                                // 构造记忆文本：【场景@时间】+ 主观内容
                                const memoryText = `\n[${timeStr} @ ${sceneName}] ${mySummary}`;
                                
                                // 返回处理结果，以便后续写入数据库
                                return {
                                    npcId: npc.privateChatId,
                                    npcName: npc.name,
                                    memory: memoryText
                                };
                            }
                        } catch (e) {
                            console.error(`${npc.name} 总结失败`, e);
                        }
                        return null;
                    });

                    // 等待所有人写完日记
                    const results = await Promise.all(summaryTasks);

                    // 3. 写入数据库与缓存
                    const contacts = uni.getStorageSync('contact_list') || [];
                    let hasChange = false;

                    for (const res of results) {
                        if (!res) continue;

                        const contact = contacts.find(c => String(c.id) === String(res.npcId));
                        if (contact) {
                            // A. 写入通讯录摘要 (用于私聊上下文)
                            contact.summary = (contact.summary || "") + res.memory;
                            
                            // B. 解除绑定 (玩家走了)
                            if (String(contact.playerInSceneId) === String(sceneId.value)) {
                                contact.playerInSceneId = null;
                                contact.interactionMode = 'phone'; // 变回手机模式
                            }
                            
                            hasChange = true;

					// C. 写入日记表 (永久存储)
					await DB.execute(
						`INSERT INTO diaries (id, roleId, dateStr, brief, detail, mood) VALUES (?, ?, ?, ?, ?, ?)`,
						[
							// ✅ 修复：使用 Math.floor() 强制转为整数
							Math.floor(Date.now() + Math.random() * 10000), 
							String(contact.id), 
							dateStr, 
							"场景经历", // brief
							res.memory, // detail
							"平静"      // mood (可扩展)
						]
					);
                            console.log(`✅ [记忆写入] ${res.npcName}: ${res.memory}`);
                        }
                    }

                    if (hasChange) {
                        uni.setStorageSync('contact_list', contacts);
                    }

                } catch (err) {
                    console.error("离场结算出错", err);
                } finally {
                    uni.hideLoading();
                    uni.navigateBack();
                }
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
	
	    const userInfo = uni.getStorageSync('user_info');
	    if (userInfo && userInfo.avatar) {
	        userAvatar.value = userInfo.avatar;
	    }
		
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


// 🔥 修复版：loadSceneData (调整读取优先级 + 考勤机制)
// 🔥 修复版：loadSceneData (彻底移除访客强制拉人逻辑)
const loadSceneData = (id, visitorId) => {
    // 1. 读取场景基础信息
    const allScenes = uni.getStorageSync('app_scene_list') || [];
    const target = allScenes.find(s => String(s.id) === String(id));
    if (!target) return;

    sceneData.value = target;
    const currentSceneName = target.name; 
    
    // 2. 确定子场景结构与玩家位置
    const subScenes = target.subScenes && target.subScenes.length > 0 ? target.subScenes : ['大厅'];
    
    // 玩家位置逻辑：优先去上次退出的位置
    currentSubLocation.value = target.lastSubLocation || subScenes[0];

    // 加载记忆设置
    if (target.summary) currentSummary.value = target.summary;
    if (target.memorySettings) {
        enableSummary.value = target.memorySettings.enableSummary !== false;
        summaryFrequency.value = target.memorySettings.summaryFrequency || 10;
    }

    // 初始化时间
    initTimeSync(Date.now(), target.worldId);

    // 3. 读取通讯录全局状态，进行“考勤”
    const allContacts = uni.getStorageSync('contact_list') || [];
    
    allNpcs.value = target.npcs.map(simpleNpc => {
        const fullProfile = allContacts.find(c => String(c.id) === String(simpleNpc.id));
        
        // --- 🕵️‍♂️ 考勤逻辑开始 ---
        
        // A. 获取 NPC 在真实世界里的位置
        const realGlobalLoc = fullProfile?.currentLocation || '';
        
        // B. 判定是否就在本场景
        const isPresentHere = realGlobalLoc && (
            realGlobalLoc === currentSceneName || 
            currentSceneName.includes(realGlobalLoc) || 
            realGlobalLoc.includes(currentSceneName)
        );

        // C. 确定子房间状态
        let rtLocation = null; 

        if (isPresentHere) {
            // 逻辑优先级：动态位置 > 初始设定 > 保底
            rtLocation = simpleNpc.currentSubLocation || simpleNpc.initialSubLocation || subScenes[0];
        } else {
            // 人不在这里 (比如他在"公司")，直接标记为 null
            // ❌❌❌ 【已删除 D 段：特殊通道】 ❌❌❌
            // 原逻辑：if (visitorId == simpleNpc.id) 强制拉过来
            // 新逻辑：无论是不是 visitorId，只要她物理位置不在这里，就不显示
            rtLocation = null; 
        }

        return {
            ...simpleNpc,
            name: fullProfile?.name || simpleNpc.name,
            avatar: fullProfile?.avatar || '/static/ai-avatar.png',
            settings: fullProfile?.settings || {},
            persona: fullProfile?.settings?.description || '普通人',
            clothing: fullProfile?.clothing,
            privateChatId: fullProfile?.id || simpleNpc.id,
            
            // 绑定运行时位置 (null 会被过滤掉)
            currentSubLocation: rtLocation,
            
            realGlobalLoc: realGlobalLoc 
        };
    });

    // ❌❌❌ 【已删除：更新通讯录逻辑】 ❌❌❌
    // 既然我们不再强制拉人，就不需要在这里更新 contact_list 了

    // 5. 刷新当前视野
    refreshActiveNpcs();

    // 空房间提示
    if (activeNpcs.value.length === 0) {
        messageList.value.push({
            role: 'system', isSystem: true,
            content: `(你来到了 [${currentSubLocation.value}]，但大家似乎都不在...)`
        });
    }
};

const getNpcAvatar = (roleName) => {
    const target = allNpcs.value?.find(n => roleName.includes(n.name));
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


// 🔥 彻底重构的 sendMessage
// 3. 新增函数：处理 NPC 移动/离场逻辑
const handleNpcMove = async (npc, targetLocation) => {
    console.log(`🏃 [Move] ${npc.name} 正在前往 -> ${targetLocation}`);

    // A. 找到源数据中的 NPC 对象 (allNpcs)
    const targetInList = allNpcs.value.find(n => n.id === npc.id);
    if (targetInList) {
        targetInList.currentSubLocation = targetLocation;
    }

    // B. 更新本地存储 (app_scene_list) - 保证下次进来他还在那个房间
    const allScenes = uni.getStorageSync('app_scene_list') || [];
    const sceneIdx = allScenes.findIndex(s => String(s.id) === String(sceneId.value));
    if (sceneIdx !== -1) {
        const sceneNpcs = allScenes[sceneIdx].npcs || [];
        const npcInStore = sceneNpcs.find(n => String(n.id) === String(npc.id));
        if (npcInStore) {
            npcInStore.currentSubLocation = targetLocation;
            uni.setStorageSync('app_scene_list', allScenes);
        }
    }

    // C. 更新全局通讯录 (contact_list)
    const contacts = uni.getStorageSync('contact_list') || [];
    const contactIdx = contacts.findIndex(c => String(c.id) === String(npc.privateChatId));
    if (contactIdx !== -1) {
        contacts[contactIdx].currentLocation = sceneData.value.name; 
        uni.setStorageSync('contact_list', contacts);
    }

    // D. 插入一条系统提示
    const sysMsg = {
        id: Date.now(),
        role: 'system', isSystem: true,
        content: `👣 ${npc.name} 离开了这里，前往了 [${targetLocation}]。`
    };
    messageList.value.push(sysMsg);
    await saveMsgToDB(sysMsg);

    // E. 立即刷新在场名单 (将该 NPC 移除出 activeNpcs)
    refreshActiveNpcs();
};

// 4. 🔥 彻底重构的 sendMessage (自主模式 + 移动支持)
const sendMessage = async () => {
    // A. 基础校验
    if (!inputText.value.trim() || loadingStatus.value) return;
    const config = getCurrentLlmConfig();
    if (!config) return uni.showToast({ title: '请先配置模型', icon: 'none' });

    // B. 用户消息上屏
    const text = inputText.value;
    const userMsg = { id: Date.now(), role: 'user', content: text, timestamp: Date.now() };
    
    console.log(`玩家发送：${text}`);
    messageList.value.push(userMsg);
    inputText.value = '';
    await saveMsgToDB(userMsg);
    scrollToBottom();

    try {
        loadingStatus.value = 'director'; // 借用 loading 状态
        
        // C. 乱序遍历：打乱在场 NPC 的顺序，防止固定顺序抢麦
        // 复制一份数组来打乱，避免影响界面显示顺序
        const interactionQueue = shuffleArray([...activeNpcs.value]);
        
        const allContacts = uni.getStorageSync('contact_list') || [];
        let anyoneSpoke = false;

        // D. 串行遍历：逐个询问
        for (const targetNpc of interactionQueue) {
            
            currentSpeakerName.value = targetNpc.name; 
            
            // 获取角色自己的记忆深度
            const realProfile = allContacts.find(c => String(c.id) === String(targetNpc.privateChatId));
            const charContextLimit = realProfile?.historyLimit || 20;

            // 🔥 调用自主决策函数
            const replyContent = await runAutonomousActor({
                targetNpc,
                locationName: currentSubLocation.value,
                formattedTime: formattedTime.value,
                userName: sceneData.value.playerIdentity || '玩家',
                activeNpcs: activeNpcs.value, // 传入当前的 activeNpcs (注意：如果有人中途走了，refreshActiveNpcs 会更新这个值吗？vue的响应式是实时的，但 interactionQueue 是快照。不过这符合逻辑：这一轮对话开始时他还在)
                history: messageList.value, // ✨ 传入实时更新的历史
                allContacts,
                config,
                contextLimit: charContextLimit,
                
                // 🔥 传入合法的子场景列表，防止 AI 瞎跑
                subScenes: sceneData.value.subScenes || ['大厅'] 
            });

            if (replyContent) {
                 // --- 解析 [MOVE] 指令 ---
                 let finalContent = replyContent;
                 let moveTarget = null;
                 
                 const moveMatch = replyContent.match(/\[MOVE:\s*(.+?)\]/i);
                 if (moveMatch) {
                     moveTarget = moveMatch[1].trim();
                     // 从显示内容中移除指令
                     finalContent = replyContent.replace(moveMatch[0], '').trim();
                 }

                 console.log(`🗣️ ${targetNpc.name} 发言：${finalContent}`);
                 
                 if (finalContent) {
                     const finalMsg = {
                        id: Date.now() + Math.random(),
                        role: targetNpc.name, 
                        content: finalContent,
                        isSystem: false,
                        timestamp: Date.now()
                    };
                    
                    messageList.value.push(finalMsg);
                    await saveMsgToDB(finalMsg);
                    scrollToBottom();
                    anyoneSpoke = true;
                 }

                 // --- 执行移动 ---
                 if (moveTarget) {
                    await handleNpcMove(targetNpc, moveTarget);
                 }
            }
        }
        
        // E. 尴尬冷场保底
        if (!anyoneSpoke && activeNpcs.value.length > 0) {
            console.log("😶 全员沉默");
            // 可选：加个系统旁白
             messageList.value.push({
                role: 'system', isSystem: true,
                content: '空气中弥漫着一丝安静...' 
            });
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

// 🔥 新增函数：手动切换当前子场景
const handleLocationSwitch = () => {
    // 从 sceneData 里读取子场景列表
    const subScenes = sceneData.value.subScenes || ['大厅'];
    
    uni.showActionSheet({
        itemList: subScenes,
        success: (res) => {
            const targetLoc = subScenes[res.tapIndex];
            if (targetLoc === currentSubLocation.value) return;

            // 1. 切换位置
            currentSubLocation.value = targetLoc;
            
            // 2. 刷新人头 (因为人不会瞬移，所以切过去后，activeNpcs 会变)
            refreshActiveNpcs();
            saveCharacterState(); // 🔥 立即保存玩家新位置，防止闪退丢失
            // 3. 插入系统提示
            const sysMsg = {
                id: Date.now(),
                role: 'system', isSystem: true,
                content: `🚶 你移动到了 [${targetLoc}]。`
            };
            messageList.value.push(sysMsg);
            saveMsgToDB(sysMsg);
            
            // 4. 如果切过去发现有人，可以让他们打个招呼 (可选)
            if (activeNpcs.value.length > 0) {
                const names = activeNpcs.value.map(n => n.name).join('、');
                messageList.value.push({
                    role: 'system', isSystem: true,
                    content: `👀 你看到 ${names} 正待在这里。`
                });
            } else {
                 messageList.value.push({
                    role: 'system', isSystem: true,
                    content: `💨 这里静悄悄的，一个人都没有。`
                });
            }
        }
    });
};

// 🔥 修复版：邀请功能 (同步保存 NPC 的场景内位置)
const handleInvite = () => {
    const absentNpcs = allNpcs.value.filter(n => n.currentSubLocation !== currentSubLocation.value);
    
    if (absentNpcs.length === 0) {
        return uni.showToast({ title: '大家都已经在这里了', icon: 'none' });
    }

    const names = absentNpcs.map(n => {
        const locInfo = n.realGlobalLoc ? `(在 ${n.realGlobalLoc})` : '(行踪不明)';
        return `${n.name} ${locInfo}`;
    });
    
    uni.showActionSheet({
        itemList: names,
        success: (res) => {
            const targetNpc = absentNpcs[res.tapIndex];
            const originName = (targetNpc.realGlobalLoc && targetNpc.realGlobalLoc !== sceneData.value.name) 
                ? targetNpc.realGlobalLoc 
                : (targetNpc.initialSubLocation || '别处');

            uni.showLoading({ title: `正在呼叫 ${targetNpc.name}...` });
            
            setTimeout(() => {
                uni.hideLoading();
                
                // 1. 修改内存状态
                targetNpc.currentSubLocation = currentSubLocation.value;
                targetNpc.realGlobalLoc = sceneData.value.name;
                
				
				const oldState = targetNpc.initialState ? `，之前正在${targetNpc.initialState}` : '';
				targetNpc.initialState = `收到邀请，刚从[${originName}]赶过来${oldState}`;
                // 2. 同步到全局通讯录 (contact_list)
                const contacts = uni.getStorageSync('contact_list') || [];
                const contactIdx = contacts.findIndex(c => String(c.id) === String(targetNpc.privateChatId));
                if (contactIdx !== -1) {
                    contacts[contactIdx].currentLocation = sceneData.value.name;
                    contacts[contactIdx].playerInSceneId = sceneId.value;
                    contacts[contactIdx].interactionMode = 'face';
                    uni.setStorageSync('contact_list', contacts);
                }

                // 3. 🔥 核心修复：同步到场景存档 (app_scene_list)
                // 必须把 "NPC在休息室" 写入场景数据，否则重进场景他又回初始位置了
                const allScenes = uni.getStorageSync('app_scene_list') || [];
                const sceneIdx = allScenes.findIndex(s => String(s.id) === String(sceneId.value));
                if (sceneIdx !== -1) {
                    const sceneNpcs = allScenes[sceneIdx].npcs || [];
                    const npcInScene = sceneNpcs.find(n => String(n.id) === String(targetNpc.id));
                    if (npcInScene) {
                        // 记录他的最新位置
                        npcInScene.currentSubLocation = currentSubLocation.value;
                        uni.setStorageSync('app_scene_list', allScenes);
                        console.log(`💾 [Invite] NPC位置已固化: ${targetNpc.name} -> ${currentSubLocation.value}`);
                    }
                }

                // 4. 刷新与提示
                refreshActiveNpcs();
                
                const sysMsg = {
                    id: Date.now(),
                    role: 'system', isSystem: true,
                    content: `👋 ${targetNpc.name} 接受了邀请，从 [${originName}] 赶了过来。`
                };
                messageList.value.push(sysMsg);
                saveMsgToDB(sysMsg);
                scrollToBottom();
                
            }, 800);
        }
    });
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
.invite-btn {
  width: 60rpx; height: 60rpx; 
  border-radius: 50%; 
  border: 2rpx dashed #999; 
  color: #999;
  display: flex; align-items: center; justify-content: center;
  font-size: 40rpx; font-weight: 300;
  margin-left: 10rpx; /* 稍微隔开一点 */
}
.invite-btn:active { background: rgba(0,0,0,0.05); }
</style>