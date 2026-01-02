<template>
  <view class="chat-container" :class="{ 'dark-mode': isDarkMode }">
    
    <view class="custom-navbar">
          <view class="status-bar"></view> 
          <view class="nav-content">
            
            <view class="left-area">
                 <view class="nav-icon-btn back-btn" @click="handleLeaveScene">
                    <text class="icon">⬅️</text>
                 </view>
            </view>
            
            <view class="center-area" @click="handleLocationSwitch">
              <text class="scene-title">{{ sceneData.name || '未知场景' }}</text>
              
              <view class="scene-info-row">
                  <view class="info-tag location-tag">
                      <text>📍 {{ currentSubLocation || '大厅' }}</text>
                      <text class="dropdown-arrow">▼</text>
                  </view>
                  <view class="info-tag time-tag" @click.stop="handleTimeAction">
                      <text>🕒 {{ timeParts.week }} {{ timeParts.time }}</text>
                  </view>
              </view>
            </view>
            
            <view class="right-area">
                <view class="avatar-pile">
                    <image 
                        v-for="(npc, idx) in activeNpcs.slice(0, 3)" 
                        :key="npc.id" 
                        :src="npc.avatar || '/static/ai-avatar.png'" 
                        class="pile-avatar"
                        :class="{ 'is-visitor': npc.isVisitor }"
                        :style="{ zIndex: 10 - idx, right: (idx * 24) + 'rpx' }"
                        mode="aspectFill"
                    ></image>
                    <view v-if="activeNpcs.length > 3" class="pile-more">
                        <text>···</text>
                    </view>
                </view>
    
                <view class="nav-icon-btn invite-btn" @click="handleInvite">
                    <text class="icon-plus">＋</text>
                </view>
                
                <view class="nav-icon-btn setting-btn" @click="openSettings">
                    <text class="icon-gear">⚙️</text>
                </view>
            </view>
    
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

        <ChatMessageItem
          v-for="(msg, index) in messageList"
          :key="msg.id || index"
          :id="'msg-' + index"
          :msg="msg"
          :isEditMode="isEditMode"
          :isSelected="selectedIds.includes(msg.id)"
        
          :userAvatar="userAvatar"
          :specificAvatar="getNpcAvatar(msg.role)"
          :showName="true" 
        
          @longPress="enterEditMode"
          @toggleSelect="toggleSelect"
          @retry="handleRetry"
          @preview="previewImage"
        />
        
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

    <ChatFooter
        v-model="inputText"
        :isEditMode="isEditMode"
        :selectedCount="selectedIds.length"
        :isToolbarOpen="isToolbarOpen"
        :showThought="showThought"
        :isEmbedded="false" 
    
        @cancelEdit="cancelEdit"
        @confirmDelete="confirmDelete"
        @toggleToolbar="toggleToolbar"
        @send="sendMessage"
    
        @clickTime="handleTimeAction"
        @clickLocation="handleLocationSwitch" 
        @clickContinue="triggerNextStep"
        @toggleThought="toggleThought"
    />
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
import { onShow } from '@dcloudio/uni-app';
import { runAutonomousActor, analyzeNpcRelation } from '@/core/director.js';
import ChatMessageItem from '@/components/ChatMessageItem.vue';
import ChatFooter from '@/components/ChatFooter.vue';
const allNpcs = ref([]); // 👥 保存该场景的所有 NPC（大名单）
const currentSubLocation = ref(''); // 📍 当前子区域 (如: "卫生间", "包厢")
const { isDarkMode, applyNativeTheme } = useTheme();
const { currentTime, formattedTime, initTimeSync, handleTimeSkip } = useGameTime();
// 🔥 新增：拆解时间，用于头部美观显示
const timeParts = computed(() => {
    if (!formattedTime.value) return { week: '', time: '--:--' };
    const parts = formattedTime.value.split(' ');
    return { week: parts[0] || '', time: parts[1] || '' };
});
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
const isEditMode = ref(false);
const selectedIds = ref([]);
const isToolbarOpen = ref(false);
// 读取心理活动开关设置
const showThought = ref(uni.getStorageSync('setting_show_thought') === true);
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

onShow(() => {
    // 每次页面显示时，重新加载场景数据
    // 这样如果刚才去设置页改名了，回来标题会自动变
    if (sceneId.value) {
        loadSceneData(sceneId.value);
    }
});
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
const { checkAndRunSummary, runDayEndSummary,runVisualDirectorCheck, 
    runCameraManCheck } = useAgents({
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
// 🔥 3. 获取 NPC 头像 (用于传给 MessageItem)
const getNpcAvatar = (roleName) => {
    // 移除可能存在的冒号 (例如 "Alice: ")
    const cleanName = roleName.replace(/[:：]/g, '').trim();
    const target = allNpcs.value?.find(n => cleanName.includes(n.name) || n.name.includes(cleanName));
    return target ? target.avatar : ''; 
};

// 🔥 4. UI 交互 Handler (复制自 chat/chat.vue)
const toggleToolbar = () => { isToolbarOpen.value = !isToolbarOpen.value; };
const toggleThought = () => { 
    showThought.value = !showThought.value; 
    uni.setStorageSync('setting_show_thought', showThought.value); 
};

// 多选编辑逻辑
const enterEditMode = (msg) => { isEditMode.value = true; selectedIds.value = [msg.id]; uni.vibrateShort(); };
const toggleSelect = (msg) => {
    const idx = selectedIds.value.indexOf(msg.id);
    if (idx > -1) selectedIds.value.splice(idx, 1);
    else selectedIds.value.push(msg.id);
    if (selectedIds.value.length === 0) isEditMode.value = false;
};
const cancelEdit = () => { isEditMode.value = false; selectedIds.value = []; };
const confirmDelete = async () => {
    uni.showModal({
        title: '删除消息', content: '确定删除选中的消息吗？',
        success: async (res) => {
            if (res.confirm) {
                messageList.value = messageList.value.filter(m => !selectedIds.value.includes(m.id));
                const ids = selectedIds.value.map(id => `'${id}'`).join(',');
                if (ids) await DB.execute(`DELETE FROM messages WHERE id IN (${ids})`);
                cancelEdit();
            }
        }
    });
};
const handleRetry = (msg) => { /* 暂时留空，可加重试逻辑 */ };
const previewImage = (url) => { uni.previewImage({ urls: [url] }); };
const triggerNextStep = () => { if (!loadingStatus.value) sendMessage(true); };
// 🔥 5. 核心消息处理管道 (移植自 chat/chat.vue)
const processAIResponse = async (npcName, rawText) => {
    let thinkContent = "";
    let mainContent = rawText; 
    
    // A. 提取 <think>
    const thinkMatch = rawText.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch) {
        thinkContent = thinkMatch[1].trim(); 
        mainContent = rawText.replace(/<think>([\s\S]*?<\/think>)/i, '').trim(); 
    }

    // B. 显示思考气泡 (如果开启)
    if (showThought.value && thinkContent) {
        const thinkMsg = {
            id: Date.now() + Math.random(),
            role: npcName, 
            type: 'think', 
            content: `💭 ${thinkContent}`,
            isSystem: false 
        };
        messageList.value.push(thinkMsg);
        await saveMsgToDB(thinkMsg);
    }

    // C. 正文处理 (分段上屏 + 指令识别)
    if (mainContent) {
         // 使用正则预处理文本，以便分段
         let tempText = mainContent
            .replace(/\n\s*([”"’])/g, '$1')     
            .replace(/([“"‘])\s*\n/g, '$1')     
            .replace(/([（\(])/g, '|||$1')      
            .replace(/([）\)])/g, '$1|||')      
            .replace(/(\r\n|\n|\r)+/g, '|||')   
            .replace(/(?:\|\|\|)+/g, '|||');    
            
         const parts = tempText.split('|||');
         
         for (const part of parts) {
             let cleanPart = part.trim();
             if (cleanPart) {
                 // 检查 [MOVE: xxx] 指令
                 const moveMatch = cleanPart.match(/\[MOVE:\s*(.+?)\]/i);
                 if (moveMatch) {
                     const targetLoc = moveMatch[1].trim();
                     const targetNpc = activeNpcs.value.find(n => n.name === npcName);
                     if (targetNpc) await handleNpcMove(targetNpc, targetLoc);
                     cleanPart = cleanPart.replace(moveMatch[0], '').trim();
                 }

                 if (cleanPart) {
                     const newMsg = {
                         id: Date.now() + Math.random(),
                         role: npcName, 
                         content: cleanPart,
                         type: 'text'
                     };
                     messageList.value.push(newMsg);
                     await saveMsgToDB(newMsg);
                 }
             }
         }
    }
    scrollToBottom();
};

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



// 🔥 修复版：loadSceneData
// pages/scene/chat.vue

const loadSceneData = (id, visitorId) => {
    // 1. 读取场景基础信息
    const allScenes = uni.getStorageSync('app_scene_list') || [];
    const target = allScenes.find(s => String(s.id) === String(id));
    if (!target) return;

    sceneData.value = target;
    const currentSceneName = target.name; 
    
    // 2. 确定子场景结构与玩家位置
    const subScenes = target.subScenes && target.subScenes.length > 0 ? target.subScenes : ['大厅'];
    currentSubLocation.value = target.lastSubLocation || subScenes[0];

    // 加载记忆设置
    if (target.summary) currentSummary.value = target.summary;
    if (target.memorySettings) {
        enableSummary.value = target.memorySettings.enableSummary !== false;
        summaryFrequency.value = target.memorySettings.summaryFrequency || 10;
    }

    initTimeSync(Date.now(), target.worldId);

    // 3. 🔥🔥🔥 核心修复：基于“实际位置”的全员大考勤 🔥🔥🔥
    const allContacts = uni.getStorageSync('contact_list') || [];
    
    // 我们不再只看 target.npcs，而是看全服谁在这里
    // 筛选出所有位置匹配的 NPC
    const presentContacts = allContacts.filter(c => {
        const loc = c.currentLocation || '';
        // 只要地点名字匹配，就算在这里
        return loc === currentSceneName || currentSceneName.includes(loc) || loc.includes(currentSceneName);
    });

    allNpcs.value = presentContacts.map(fullProfile => {
        // 尝试从场景原始数据里找一下子场景记录 (如果有的话)
        // 这样能保留“他在卫生间”这种状态，而不是全都重置到大厅
        const sceneRecord = (target.npcs || []).find(n => String(n.id) === String(fullProfile.id));
        
        let rtLocation = null;
        if (sceneRecord && sceneRecord.currentSubLocation) {
            rtLocation = sceneRecord.currentSubLocation;
        } else {
            // 如果没记录，但人确实在这里，默认分配到大厅
            rtLocation = subScenes[0];
        }

        return {
            id: fullProfile.id, // 确保 ID 正确
            name: fullProfile.name,
            avatar: fullProfile.avatar || '/static/ai-avatar.png',
            settings: fullProfile.settings || {},
            persona: fullProfile.settings?.description || '普通人',
            clothing: fullProfile.clothing,
            privateChatId: fullProfile.id,
            currentSubLocation: rtLocation,
            realGlobalLoc: fullProfile.currentLocation
        };
    });

    // 5. 刷新当前视野
    refreshActiveNpcs();

    // 空房间提示
    if (activeNpcs.value.length === 0) {
        messageList.value.push({
            role: 'system', isSystem: true,
            content: `(你来到了 [${currentSubLocation.value}]，暂时只有你一个人...)`
        });
    }
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
// 🔥 发送消息与导演调度函数
// 🔥 发送消息与导演调度函数 (最终完整版)
const sendMessage = async (isContinue = false) => {
    // 1. 基础校验
    if (!isContinue && !inputText.value.trim() && !loadingStatus.value) return;
    
    let userText = "";

    // 2. 处理用户发送
    if (!isContinue) {
        userText = inputText.value;
        const userMsg = { 
            id: Date.now(), 
            role: 'user', 
            content: userText, 
            timestamp: Date.now() 
        };
        messageList.value.push(userMsg);
        inputText.value = '';
        await saveMsgToDB(userMsg);
        scrollToBottom();

        // 📸 视觉触发 A：用户发言后，尝试触发“摄影师”抓拍 (用于捕捉场景氛围)
        // 传入 userText 和 空AI回复
        runCameraManCheck(userText, "");
    } else {
        // 如果是“继续生成”，尝试找上一条用户消息作为上下文
        const lastUserMsg = messageList.value.slice().reverse().find(m => m.role === 'user');
        userText = lastUserMsg ? lastUserMsg.content : "";
    }
    
    // 3. 进入导演调度流程
    try {
        loadingStatus.value = 'director';
        const config = getCurrentLlmConfig();
        if (!config) return uni.showToast({ title: '请先配置模型', icon: 'none' });

        const allContacts = uni.getStorageSync('contact_list') || [];
        
        // A. 乱序遍历 (防止发言顺序固化)
        const interactionQueue = shuffleArray([...activeNpcs.value]);
        let anyoneSpoke = false;

        // B. 逐个 NPC 决策
        for (const targetNpc of interactionQueue) {
            currentSpeakerName.value = targetNpc.name; 
            
            // 获取记忆深度
            const realProfile = allContacts.find(c => String(c.id) === String(targetNpc.privateChatId));
            const charContextLimit = realProfile?.historyLimit || 20;

            // 🔥 C. 自主决策 (已包含 DB 记忆读取)
            const replyContent = await runAutonomousActor({
                targetNpc,
                locationName: currentSubLocation.value,
                formattedTime: formattedTime.value,
                userName: sceneData.value.playerIdentity || '玩家',
                activeNpcs: activeNpcs.value,
                history: messageList.value,
                allContacts,
                config,
                contextLimit: charContextLimit,
                subScenes: sceneData.value.subScenes || ['大厅']
            });

            // D. 如果 NPC 决定发言
            if (replyContent) {
                // 1. 消息上屏 (支持 <think> 和分段)
                await processAIResponse(targetNpc.name, replyContent);
                anyoneSpoke = true;

                // ❤️ 2. 情感反馈 (Heart) - 异步执行
                // 这一步会更新 contact_list 里的 relation 和 activeTime
                analyzeNpcRelation({
                    targetNpc,
                    userMsg: userText,
                    aiMsg: replyContent,
                    config,
                    allContacts
                });

                // 🎨 3. 视觉触发 B (Visuals) - 异步执行
                // 尝试触发该 NPC 的相关生图 (如自拍、动作特写)
                // 注意：由于 currentRole 绑定的是 sceneData，这里生成的图片 prompt 会基于场景描述，
                // 但 runVisualDirectorCheck 会尝试捕捉当前对话内容进行构图。
                runVisualDirectorCheck(userText, replyContent);
            }
        }
        
        // E. 冷场保底
        if (!anyoneSpoke && activeNpcs.value.length > 0) {
            console.log("😶 全员沉默");
            const silenceMsg = {
                role: 'system', 
                isSystem: true,
                content: '空气中弥漫着一丝安静...' 
            };
            messageList.value.push(silenceMsg);
        }
        
        // F. 触发后台总结
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
/* ==========================================================================
   1. 基础容器与布局
   ========================================================================== */
.chat-container { 
    display: flex; 
    flex-direction: column; 
    height: 100vh; 
    background-color: var(--bg-color); 
    overflow: hidden;
}

/* 占位符：给固定定位的导航栏留出空间 */
/* 高度 = 状态栏 + 导航栏内容高度(100rpx) */
.nav-placeholder { 
    width: 100%; 
    height: calc(var(--status-bar-height) + 100rpx); 
    flex-shrink: 0;
}

/* ==========================================================================
   2. 顶部自定义导航栏 (Glassmorphism 毛玻璃风格)
   ========================================================================== */
.custom-navbar {
    position: fixed; 
    top: 0; 
    left: 0; 
    width: 100%; 
    z-index: 999;
    
    /* 背景处理：半透明 + 模糊 */
    background: rgba(255, 255, 255, 0.85); 
    backdrop-filter: blur(20px);            
    -webkit-backdrop-filter: blur(20px);
    
    border-bottom: 1px solid rgba(0,0,0,0.05);
    transition: background 0.3s;
    
    display: flex;
    flex-direction: column;
}

/* 暗黑模式适配 */
.dark-mode .custom-navbar {
    background: rgba(30, 30, 30, 0.85);
    border-bottom: 1px solid rgba(255,255,255,0.05);
}

.status-bar { 
    height: var(--status-bar-height); 
    width: 100%; 
}

/* 导航栏主体内容区 */
.nav-content {
    height: 100rpx; 
    display: flex; 
    align-items: center; 
    justify-content: space-between; 
    padding: 0 24rpx;
}

/* --- 区域布局 --- */
.left-area { 
    flex: 0 0 80rpx; 
    display: flex; 
    align-items: center; 
}
.right-area { 
    flex: 0 0 auto; 
    display: flex; 
    align-items: center; 
    gap: 16rpx; /* 按钮之间的间距 */
}
.center-area { 
    flex: 1; 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    justify-content: center;
    margin: 0 20rpx;
    /* 增加点击区域 */
    height: 100%; 
}

/* --- 中间信息展示 --- */
.scene-title { 
    font-size: 32rpx; 
    font-weight: 700; 
    color: var(--text-color); 
    margin-bottom: 6rpx; 
    line-height: 1.2;
    max-width: 300rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.scene-info-row { 
    display: flex; 
    align-items: center; 
    gap: 12rpx; 
}

/* 信息胶囊标签 */
.info-tag {
    display: flex; 
    align-items: center;
    background: rgba(0,0,0,0.04);
    padding: 4rpx 12rpx; 
    border-radius: 8rpx;
    transition: background 0.2s;
}
.info-tag:active { background: rgba(0,0,0,0.08); }
.dark-mode .info-tag { background: rgba(255,255,255,0.08); }

.location-tag text { 
    font-size: 20rpx; 
    color: #007aff; 
    font-weight: 600; 
}

.time-tag text { 
    font-size: 20rpx; 
    color: var(--text-sub); 
}

.dropdown-arrow { 
    margin-left: 6rpx; 
    opacity: 0.6; 
    font-size: 18rpx; 
    transform: translateY(-1rpx);
}

/* --- 按钮样式 --- */
.nav-icon-btn {
    width: 64rpx; 
    height: 64rpx;
    border-radius: 50%;
    background: transparent;
    display: flex; 
    align-items: center; 
    justify-content: center;
    transition: all 0.2s;
}
.nav-icon-btn:active { 
    background: rgba(0,0,0,0.05); 
    transform: scale(0.92); 
}
.dark-mode .nav-icon-btn:active { 
    background: rgba(255,255,255,0.1); 
}

.back-btn .icon { font-size: 38rpx; line-height: 1; }

.invite-btn { 
    border: 2rpx dashed #999; 
    width: 60rpx; 
    height: 60rpx; 
} 
.icon-plus { 
    font-size: 34rpx; 
    color: #999; 
    font-weight: 300; 
    margin-top: -2rpx; /* 视觉垂直居中微调 */
}

.setting-btn .icon-gear { 
    font-size: 38rpx; 
    opacity: 0.8; 
}

/* --- 头像堆叠效果 --- */
.avatar-pile { 
    display: flex; 
    align-items: center; 
    position: relative; 
    height: 60rpx; 
    width: 100rpx; /* 根据显示3个头像的宽度预留 */
    margin-right: 6rpx;
}

.pile-avatar {
    width: 60rpx; 
    height: 60rpx; 
    border-radius: 50%;
    border: 3rpx solid var(--card-bg); /* 用背景色做描边实现切割感 */
    position: absolute; 
    top: 0;
    transition: transform 0.2s;
    background: #e0e0e0;
}
.dark-mode .pile-avatar { border-color: #1e1e1e; }

/* 访客高亮圈 */
.pile-avatar.is-visitor {
    border-color: #007aff;
    z-index: 20 !important; /* 访客总是在最上面 */
}

/* 更多头像指示器 (+...) */
.pile-more {
    position: absolute; 
    right: 0; 
    top: 0;
    width: 60rpx; 
    height: 60rpx; 
    border-radius: 50%;
    background: rgba(0,0,0,0.1); 
    color: #666;
    display: flex; 
    align-items: center; 
    justify-content: center;
    font-size: 20rpx; 
    font-weight: bold;
    border: 3rpx solid var(--card-bg); 
    z-index: 25;
}

/* ==========================================================================
   3. 聊天内容区域
   ========================================================================== */
.chat-scroll { 
    flex: 1; 
    overflow: hidden; 
}

.chat-content { 
    padding: 30rpx; 
    padding-bottom: 40rpx; /* 底部留白 */
}

/* 系统事件 (如剧本加载) */
.system-event { 
    text-align: center; 
    margin-bottom: 30rpx; 
    
    text {
        font-size: 24rpx; 
        color: var(--text-sub); 
        background: rgba(0,0,0,0.03);
        padding: 6rpx 20rpx;
        border-radius: 20rpx;
    }
}

/* ==========================================================================
   4. 加载动画
   ========================================================================== */
.loading-wrapper { 
    display: flex; 
    justify-content: center; 
    margin-top: 20rpx; 
    margin-bottom: 20rpx;
}

.loading-content { 
    display: flex; 
    align-items: center; 
    background: rgba(0,0,0,0.6); 
    padding: 10rpx 24rpx; 
    border-radius: 30rpx; 
    backdrop-filter: blur(4px);
}

.loading-spinner { 
    width: 30rpx; 
    height: 30rpx; 
    border: 3rpx solid #fff; 
    border-top-color: transparent; 
    border-radius: 50%; 
    animation: spin 1s linear infinite; 
    margin-right: 16rpx; 
}

.loading-text { 
    font-size: 24rpx; 
    color: #fff; 
    font-weight: 500;
}

@keyframes spin { 
    from { transform: rotate(0deg); } 
    to { transform: rotate(360deg); } 
}
</style>