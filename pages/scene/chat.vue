<template>
  <view class="chat-container" :class="{ 'dark-mode': isDarkMode }">
    
    <view class="custom-navbar">
      <view class="status-bar"></view> <view class="nav-content">
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
          <text>🎭 剧本已加载: {{ sceneData.playerIdentity }} 进入了场景</text>
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
import { buildSceneSystemPrompt } from '@/core/scenario-prompts.js';
import { useAgents } from '@/composables/useAgents.js';
import { buildSystemPrompt } from '@/core/prompt-builder.js'; // 👈 引入你最强的私聊构建器

const { isDarkMode, applyNativeTheme } = useTheme();
const { currentTime, formattedTime, initTimeSync, handleTimeSkip } = useGameTime();

// 核心状态
const sceneId = ref(null);
const sceneData = ref({});
const activeNpcs = ref([]); 
const messageList = ref([]);
const inputText = ref('');
// 修改原本的 isLoading
const loadingStatus = ref(''); // 空字符串表示空闲，'director' 表示导演思考中，'actor' 表示演员正在回复
const currentSpeakerName = ref(''); // 用于 UI 显示当前是谁在组织语言
const scrollIntoView = ref('');
const userAvatar = ref('/static/user-avatar.png');

// 虚拟状态适配 useAgents
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

// --- 基础函数 ---
const scrollToBottom = () => {
    nextTick(() => {
        scrollIntoView.value = '';
        setTimeout(() => { scrollIntoView.value = 'scroll-bottom'; }, 100);
    });
};

const saveCharacterState = () => {
    if (sceneId.value) {
         const allScenes = uni.getStorageSync('app_scene_list') || [];
         const idx = allScenes.findIndex(s => String(s.id) === String(sceneId.value));
         if (idx !== -1) {
             allScenes[idx].summary = currentSummary.value;
             uni.setStorageSync('app_scene_list', allScenes);
         }
    }
};
const saveHistory = async () => {}; 

// --- 初始化 Agents ---
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

// --- UI 交互函数 ---
const handleLeaveScene = () => {
    uni.showModal({
        title: '离开场景',
        content: '确定要离开这里回家吗？',
        success: (res) => {
            if (res.confirm) {
                const contacts = uni.getStorageSync('contact_list') || [];
                let hasChange = false;
                
                // 解除锁定
                activeNpcs.value.forEach(npc => {
                    const idx = contacts.findIndex(c => String(c.id) === String(npc.id));
                    if (idx !== -1) {
                        contacts[idx].playerInSceneId = null; 
                        contacts[idx].interactionMode = 'phone'; 
                        contacts[idx].playerLocation = contacts[idx].settings?.userLocation || '玩家家'; 
                        hasChange = true;
                    }
                });
                
                if (hasChange) uni.setStorageSync('contact_list', contacts);
                uni.navigateBack();
            }
        }
    });
};

const openSettings = () => {
    uni.showActionSheet({
        itemList: ['清空本场景聊天记录', '删除并退出场景', '查看场景详情'],
        itemColor: '#007aff',
        success: (res) => {
            if (res.tapIndex === 0) {
                // 1. 清空聊天记录
                uni.showModal({
                    title: '确认清空',
                    content: '这只会清空当前场景的对话气泡，不会影响角色记忆 summaries。',
                    success: async (mRes) => {
                        if (mRes.confirm) {
                            await DB.execute(`DELETE FROM messages WHERE chatId = ?`, [String(sceneId.value)]);
                            messageList.value = []; // 清空 UI
                            uni.showToast({ title: '记录已清空', icon: 'none' });
                        }
                    }
                });
            } else if (res.tapIndex === 1) {
                // 2. 删除场景 (这解决了你想清理场景内容的需求)
                uni.showModal({
                    title: '危险操作',
                    content: '确定要解散这个场景吗？所有数据将丢失。',
                    success: (mRes) => {
                        if (mRes.confirm) {
                            // 从缓存列表中移除
                            const list = uni.getStorageSync('app_scene_list') || [];
                            const newList = list.filter(s => String(s.id) !== String(sceneId.value));
                            uni.setStorageSync('app_scene_list', newList);
                            // 顺便把消息也删了
                            DB.execute(`DELETE FROM messages WHERE chatId = ?`, [String(sceneId.value)]);
                            uni.navigateBack();
                        }
                    }
                });
            } else if (res.tapIndex === 2) {
                // 3. 查看详情 (可选)
                uni.showModal({
                    title: sceneData.value.name,
                    content: sceneData.value.background || '暂无描述',
                    showCancel: false
                });
            }
        }
    });
};

// --- 加载逻辑 ---
onLoad(async (options) => {
    applyNativeTheme();
    if (options.id) {
        sceneId.value = options.id;
        loadSceneData(options.id, options.visitorId);
        
        // 隐藏原生导航栏，使用自定义的
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
                    messageList.value.push({
                        role: 'system', isSystem: true,
                        content: `👋 你来到了 ${sceneData.value.name}，正在寻找 ${visitor.name}...`
                    });
                }
            }
        } catch (e) { console.error('历史加载失败', e); }
    }
});

onUnload(() => { saveCharacterState(); });

// --- 数据组装 (关键：确保人设字段完整) ---
const loadSceneData = (id, visitorId) => {
    const allScenes = uni.getStorageSync('app_scene_list') || [];
    const target = allScenes.find(s => String(s.id) === String(id));
    if (!target) return;

    sceneData.value = target;
    
    if (target.summary) currentSummary.value = target.summary;
    if (target.memorySettings) enableSummary.value = target.memorySettings.enableSummary !== false;

    initTimeSync(Date.now(), target.worldId);

    const allContacts = uni.getStorageSync('contact_list') || [];
    
    // 1. 加载场景预设 NPC (确保读取完整人设！)
    let npcs = target.npcs.map(simpleNpc => {
        // 去总表里查完整数据
        const fullProfile = allContacts.find(c => String(c.id) === String(simpleNpc.id));
        return {
            ...simpleNpc, // 包含场景里的 initialState, sceneRole
            // ⚠️ 关键补充：把性格、说话风格都补全
            name: fullProfile?.name || simpleNpc.name,
            avatar: fullProfile?.avatar || '/static/ai-avatar.png',
            settings: fullProfile?.settings || {}, // 🔥 必须要有这个，Prompt 才能读到 description
            persona: fullProfile?.settings?.description || '普通人', // 兜底
            clothing: fullProfile?.clothing 
        };
    });

    // 2. 动态加入访客
    if (visitorId) {
        const isAlreadyIn = npcs.some(n => String(n.id) === String(visitorId));
        if (!isAlreadyIn) {
            const visitor = allContacts.find(c => String(c.id) === String(visitorId));
            if (visitor) {
                console.log(`➕ 加入访客: ${visitor.name}`);
                npcs.push({
                    id: visitor.id,
                    name: visitor.name,
                    avatar: visitor.avatar || '/static/ai-avatar.png',
                    settings: visitor.settings || {}, // 🔥 关键
                    persona: visitor.settings?.description || '普通人',
                    clothing: visitor.clothing,
                    initialState: '刚走进来',
                    sceneRole: '被寻找的目标',
                    worldId: visitor.worldId
                });
            }
        }
    }

    activeNpcs.value = npcs;
};

const getNpcAvatar = (roleName) => {
    // 模糊匹配防止名字带前缀
    const target = activeNpcs.value.find(n => roleName.includes(n.name));
    return target ? target.avatar : '/static/ai-avatar.png'; 
};

// --- 消息发送 ---
const saveMsgToDB = async (msg) => {
    if (!sceneId.value) return;
    await DB.execute(
        `INSERT OR REPLACE INTO messages (id, chatId, role, content, type, isSystem, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [msg.id, String(sceneId.value), msg.role, msg.content, 'text', msg.isSystem ? 1 : 0, Date.now()]
    );
};

const parseAndSaveResponse = async (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    for (const line of lines) {
        // 增强正则：支持中文冒号、英文冒号，甚至名字带空格
        const match = line.match(/^(.+?)[:：]\s*([\s\S]+)$/);
        
        if (match) {
            const name = match[1].trim();
            const content = match[2].trim();
            const isSystem = name === '系统' || name === 'System' || name === '旁白';
            
            // 过滤掉思考过程
            if (name === 'think') continue;

            const msg = {
                id: Date.now() + Math.random(),
                role: isSystem ? 'system' : name, 
                content: content,
                isSystem: isSystem,
                timestamp: Date.now()
            };
            messageList.value.push(msg);
            await saveMsgToDB(msg);
        } else {
            // 没有名字前缀的行，如果是系统提示或旁白
            if (line.trim() && !line.includes('<think>')) {
                const sysMsg = {
                   id: Date.now() + Math.random(),
                   role: 'system',
                   content: line.trim(),
                   isSystem: true
                };
                messageList.value.push(sysMsg);
                await saveMsgToDB(sysMsg);
            }
        }
        scrollToBottom();
    }
};

const sendMessage = async () => {
    if (!inputText.value.trim() || loadingStatus.value) return;
    const config = getCurrentLlmConfig();
    if (!config) return uni.showToast({ title: '请先配置模型', icon: 'none' });

    const text = inputText.value;
    const userMsg = { id: Date.now(), role: 'user', content: text, timestamp: Date.now() };
    
    messageList.value.push(userMsg);
    inputText.value = '';
    await saveMsgToDB(userMsg);
    scrollToBottom();

    try {
        // =================================================================
        // 🎬 第一步：导演分配 (支持多选)
        // =================================================================
        loadingStatus.value = 'director'; // 更新状态
        
        const npcNames = activeNpcs.value.map(n => n.name).join('、');
        // 修改 Prompt，要求返回 JSON 数组
        const directorPrompt = `
        [Director Mode]
        Current Scene: ${sceneData.value.name}
        Characters: ${npcNames}
        User said: "${text}"
        
        Task: Decide who should speak next.
        Rules:
        1. Return a JSON Array of names. Example: ["Alice", "Bob"]
        2. If User speaks to everyone, or says something funny, multiple people can reply.
        3. Order matters. The first name speaks first.
        4. Output JSON ONLY.
        `;

        const directorResponse = await LLM.chat({
            config,
            messages: [{ role: 'user', content: directorPrompt }],
            temperature: 0.1, // 保持绝对理性
            response_format: { type: "json_object" } // 如果模型支持 JSON 模式最好，不支持也没关系，下面有解析
        });
        
        // 解析 JSON (兼容可能的 Markdown 包裹)
        let cleanJson = directorResponse.replace(/```json|```/g, '').trim();
        let nextSpeakers = [];
        try {
            // 尝试解析数组，如果解析失败则回退到单人匹配
            if (cleanJson.startsWith('[')) {
                nextSpeakers = JSON.parse(cleanJson);
            } else {
                // 兜底：如果模型没听话返回了纯文本
                const name = cleanJson.trim().replace(/['"。. ]/g, '');
                nextSpeakers = [name];
            }
        } catch (e) {
            console.error("导演 JSON 解析失败，回退到首位 NPC", e);
            nextSpeakers = [activeNpcs.value[0].name];
        }
        
        // 过滤掉不在场的人
        nextSpeakers = nextSpeakers.filter(name => activeNpcs.value.find(n => n.name === name));
        
        if (nextSpeakers.length === 0) nextSpeakers = [activeNpcs.value[0].name];

        console.log(`🎬 导演调度顺序: ${JSON.stringify(nextSpeakers)}`);

        // =================================================================
        // 🎭 第二步：演员轮流登场 (串行执行，保证上下文连贯)
        // =================================================================
        
        for (const speakerName of nextSpeakers) {
            loadingStatus.value = 'actor';
            currentSpeakerName.value = speakerName; // UI 显示“夏轻轻正在思考...”
            
            const targetNpc = activeNpcs.value.find(n => n.name === speakerName);
            if (!targetNpc) continue;

            // 1. 构建私聊级 Prompt (复用你原本的逻辑)
            let charSystemPrompt = buildSystemPrompt({
                role: targetNpc,
                userName: sceneData.value.playerIdentity || 'Player',
                summary: targetNpc.summary || '',
                formattedTime: formattedTime.value,
                location: sceneData.value.name,
                mode: 'face', 
                activity: targetNpc.initialState || 'standby',
                clothes: targetNpc.clothing || 'default',
                relation: targetNpc.currentRelation || 'acquaintance'
            });

            // 2. 注入场景补丁
            const otherNames = activeNpcs.value
                .filter(n => n.id !== targetNpc.id)
                .map(n => n.name)
                .join('、');
            
            charSystemPrompt += `\n\n【⚠️ 场景模式特殊修正】\n`;
            charSystemPrompt += `你现在并不在私密空间，而是在【${sceneData.value.name}】。\n`;
            if (otherNames) charSystemPrompt += `在场其他人：${otherNames}。\n`;
            charSystemPrompt += `请直接输出回复内容，不要带名字前缀，不要带冒号。\n`; // 👈 明确禁止带名字

            // 3. 构造上下文 (关键：要把刚才前一个 NPC 说的话也放进去！)
            // 我们直接用 messageList.value 即可，因为如果是多人回复，
            // 循环第一次生成的 msg 已经 push 进 messageList 了，
            // 所以循环第二次时，NPC B 能“看到”NPC A 刚才说的话。
            const context = messageList.value.slice(-15).map(m => {
                if (m.isSystem) return { role: 'system', content: m.content };
                if (m.role === 'user') return { role: 'user', content: m.content };
                if (m.role === targetNpc.name) return { role: 'assistant', content: m.content };
                // 别人的话 -> 伪装成 System 或 User 观察到的
                return { role: 'user', content: `(你听到 ${m.role} 说): "${m.content}"` };
            });

            // 4. 生成回复
            let reply = await LLM.chat({
                config,
                messages: context,
                systemPrompt: charSystemPrompt
            });

            // =================================================================
            // 🛡️ 防 OOC 核心逻辑：强制覆盖 Role
            // =================================================================
            if (reply) {
                // 清洗回复：有时候 AI 还是会忍不住带 "夏轻轻: "，我们这里手动切掉
                // 增强正则：匹配行首的 "名字:" 或 "名字："
                const namePrefixRegex = new RegExp(`^${targetNpc.name}[:：]\\s*`, 'i');
                const cleanContent = reply.replace(namePrefixRegex, '').trim();

                const finalMsg = {
                    id: Date.now() + Math.random(),
                    role: targetNpc.name, // 🔥 强制指定，不管 AI 输出什么名字，都算这个人的
                    content: cleanContent,
                    isSystem: false,
                    timestamp: Date.now()
                };
                
                messageList.value.push(finalMsg);
                await saveMsgToDB(finalMsg);
                scrollToBottom();
            }
        }
        
        // 全部说完后，触发一次记忆总结
        checkAndRunSummary();

    } catch (e) {
        console.error(e);
        uni.showToast({ title: 'AI 响应出错', icon: 'none' });
    } finally {
        loadingStatus.value = ''; // 结束 loading
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
</style>