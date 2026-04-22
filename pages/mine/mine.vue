<template>
	<view class="mine-container" :class="{ 'dark-mode': isDarkMode }">
		<view class="user-section">
			<view class="avatar-wrapper" @click="goToEdit">
				<image class="avatar" :src="userInfo.avatar" mode="aspectFill"></image>
				<view class="edit-badge">✏️</view>
			</view>
			<view class="info-wrapper" @click="goToEdit">
				<text class="label">我的昵称</text>
				<view class="name-display">{{ userInfo.name }} <text class="edit-hint">(点击编辑资料)</text></view>
			</view>
			<view class="gallery-btn" @click="goToGallery">
				<text class="gallery-icon">🖼️</text>
				<text class="gallery-text">我的相册</text>
			</view>
		</view>

		<view class="setting-group">
			<view class="group-header" @click="toggleSection('chat')">
				<view class="group-title-wrapper">
					<view class="group-title">对话模型 (LLM)</view>
					<text class="group-subtitle">
						当前使用: {{ currentLlmScheme ? currentLlmScheme.name : '未选择' }}
					</text>
				</view>
				<text class="arrow-icon">{{ activeSections.chat ? '▼' : '▶' }}</text>
			</view>

			<view v-show="activeSections.chat" class="group-content">
				<view class="scheme-list">
					<view v-for="(scheme, index) in llmSchemes" :key="scheme.id" class="scheme-card"
						:class="{ 'is-active': currentSchemeIndex === index }">
						<view class="scheme-card-header" @click="toggleSchemeExpand(index)">
							<view class="radio-area" @click.stop="selectScheme(index)">
								<view class="radio-circle">
									<view v-if="currentSchemeIndex === index" class="radio-inner"></view>
								</view>
							</view>
							<view class="scheme-info">
								<text class="scheme-name">{{ scheme.name }}</text>
								<text class="scheme-desc">{{ scheme.model || '未设置模型' }}</text>
							</view>
							<text class="expand-icon">{{ scheme.isExpanded ? '▲' : '▼' }}</text>
						</view>

						<view v-if="scheme.isExpanded" class="scheme-card-body">
							<view class="setting-item">
								<view class="item-label">方案名称</view>
								<input class="item-input" type="text" v-model="scheme.name" placeholder="方案别名" />
							</view>

							<view class="setting-item">
								<view class="item-label">厂商预设</view>
								<picker mode="selector" :range="LLM_PROVIDERS" range-key="label"
									@change="(e) => handleProviderChange(e, index)">
									<view class="picker-val">{{ getProviderLabel(scheme.provider) }} ▾</view>
								</picker>
							</view>

							<view class="setting-item">
								<view class="item-label">接口地址</view>
								<input class="item-input" type="text" v-model="scheme.baseUrl"
									placeholder="https://..." />
							</view>

							<view class="setting-item">
								<view class="item-label">API Key</view>
								<input class="item-input" type="text" password v-model="scheme.apiKey"
									placeholder="在此粘贴 Key" />
								<view v-if="scheme.provider === 'siliconflow'" class="input-suffix-link"
									@click.stop="openSiliconFlowLink">
									去官网申请 🔗
								</view>
							</view>

							<view class="setting-item">
								<view class="item-label">模型名称</view>
								<view class="model-input-group">
									<input class="item-input model-manual-input" type="text" v-model="scheme.model"
										placeholder="输入或刷新获取" />
									<view class="icon-btn" @click="fetchModels(index)">🔄</view>
								</view>
							</view>

							<view v-if="tempModelList.length > 0 && activeFetchIndex === index"
								class="model-select-area">
								<view class="model-tag-title">点击选择模型:</view>
								<view class="model-tags">
									<view v-for="m in tempModelList" :key="m" class="model-tag"
										@click="applyModel(index, m)">
										{{ m }}
									</view>
								</view>
							</view>

							<view class="setting-item-col">
								<view class="item-header">
									<text class="item-label">记忆深度</text>
									<text class="item-value">{{ scheme.historyLimit }} 条</text>
								</view>
								<slider :value="scheme.historyLimit" min="0" max="60" step="2" activeColor="#007aff"
									@change="(e) => scheme.historyLimit = e.detail.value" />
							</view>

							<view class="card-footer">
								<view class="delete-text" @click="deleteScheme(index)" v-if="llmSchemes.length > 1">
									删除此方案</view>
							</view>
						</view>
					</view>
				</view>

				<button class="add-scheme-btn" @click="createNewScheme">➕ 添加新方案 API</button>
			</view>
		</view>

		<view class="setting-group">
			<view class="group-header" @click="toggleSection('image')">
				<view class="group-title-wrapper">
					<view class="group-title" style="color: #ff9f43;">绘图设置 (Image Gen)</view>
					<text class="group-subtitle">{{ currentProviderLabel }} / {{ currentStyleLabel }}</text>
				</view>
				<text class="arrow-icon">{{ activeSections.image ? '▼' : '▶' }}</text>
			</view>

			<view v-show="activeSections.image" class="group-content">
				<view class="scheme-list">
					<view v-for="(scheme, index) in imageSchemes" :key="scheme.id" class="scheme-card"
						:class="{ 'is-active': currentImageSchemeIndex === index }">
						<view class="scheme-card-header" @click="toggleImageSchemeExpand(index)">
							<view class="radio-area" @click.stop="selectImageScheme(index)">
								<view class="radio-circle">
									<view v-if="currentImageSchemeIndex === index" class="radio-inner"></view>
								</view>
							</view>
							<view class="scheme-info">
								<text class="scheme-name">{{ scheme.name }}</text>
								<text class="scheme-desc">{{ scheme.provider === 'comfyui' ? 'ComfyUI' : 'OpenAI' }} -
									{{ isPresetStyle(scheme.style) ? scheme.style : '自定义风格' }}</text>
							</view>
							<text class="expand-icon">{{ scheme.isExpanded ? '▲' : '▼' }}</text>
						</view>

						<view v-if="scheme.isExpanded" class="scheme-card-body">
							<view class="setting-item">
								<view class="item-label">方案名称</view>
								<input class="item-input" type="text" v-model="scheme.name" placeholder="方案别名" />
							</view>

							<view class="setting-item">
								<view class="item-label">接口类型</view>
								<picker mode="selector" :range="['OpenAI (DALL-E)', '自建 ComfyUI']"
									:value="scheme.provider === 'comfyui' ? 1 : 0"
									@change="(e) => handleImageProviderChange(e, index)">
									<view class="picker-val">{{ scheme.provider === 'comfyui' ? 'ComfyUI' : 'OpenAI' }}
										▾</view>
								</picker>
							</view>

							<template v-if="scheme.provider === 'openai'">
								<view class="setting-item">
									<view class="item-label">接口地址</view>
									<input class="item-input" type="text" v-model="scheme.baseUrl"
										placeholder="https://..." />
								</view>
								<view class="setting-item">
									<view class="item-label">API Key</view>
									<input class="item-input" type="text" password v-model="scheme.apiKey"
										placeholder="sk-..." />
								</view>
								<view class="setting-item">
									<view class="item-label">模型名称</view>
									<input class="item-input" type="text" v-model="scheme.model"
										placeholder="dall-e-3" />
								</view>
							</template>

							<template v-else>
								<view class="setting-item">
									<view class="item-label">公网地址</view>
									<input class="item-input" type="text" v-model="scheme.baseUrl"
										placeholder="http://..." />
								</view>
								<view class="setting-tip">提示: 请确保填写 Cloudflare Tunnel 或公网可访问的地址。</view>
							</template>

							<view class="setting-item-col" v-if="currentImageSchemeIndex === index">
								<view class="sub-section-title" style="margin-top:0;">🎨 该方案画风</view>
								<view class="style-grid">
									<view class="style-card" v-for="(style, sIdx) in DRAWING_STYLES" :key="sIdx"
										:class="{ 'active': scheme.style === style.value || (style.value === 'custom' && !isPresetStyle(scheme.style)) }"
										@click.stop="handleStyleSelect(style)">
										<text class="style-emoji">{{ style.emoji }}</text>
										<text class="style-name">{{ style.label }}</text>
									</view>
								</view>
							</view>
							<view class="setting-tip" v-else>👉 请先选中此方案（点击左侧圆圈）再修改画风。</view>

							<view class="card-footer">
								<view class="delete-text" @click="deleteImageScheme(index)"
									v-if="imageSchemes.length > 1">删除此方案</view>
							</view>
						</view>
					</view>
				</view>

				<button class="add-scheme-btn" @click="createNewImageScheme(false)">➕ 添加绘图方案</button>
			</view>
		</view>

		<view class="setting-group">
			<view class="group-header" @click="toggleSection('world')">
				<view class="group-title-wrapper">
					<view class="group-title" style="color: #9c27b0;">世界观设定 (World)</view>
					<text class="group-subtitle">已创建 {{ worldSettings.length }} 个世界</text>
				</view>
				<text class="arrow-icon">{{ activeSections.world ? '▼' : '▶' }}</text>
			</view>

			<view v-show="activeSections.world" class="group-content">
				<view class="setting-tip">在此预设世界观，创建角色时可直接调用场景和职业。</view>
				<view v-for="(world, index) in worldSettings" :key="world.id" class="world-card">
					<view class="world-header" @click.stop="toggleWorldItem(index)">
						<text class="world-name">{{ world.name || '未命名世界' }}</text>
						<view class="world-actions">
							<text class="toggle-icon">{{ world.isOpen ? '收起' : '展开' }}</text>
							<text class="delete-icon" @click.stop="deleteWorld(index)">🗑️</text>
						</view>
					</view>
					<view v-show="world.isOpen" class="world-body">
						<view class="setting-item">
							<view class="item-label">世界名称</view>
							<input class="item-input" type="text" v-model="world.name" placeholder="例如：赛博朋克2077" />
						</view>
						<view class="sub-section">
							<view class="sub-title" @click.stop="togglePlayerInfo(index)"
								style="display: flex; justify-content: space-between; align-items: center; padding: 10rpx 0;">
								<text>👤 该世界玩家档案</text>
								<text
									style="font-size: 24rpx; color: #999; font-weight: normal;">{{ world.playerIdentityTemplates[0]?.isOpen ? '▼' : '▶' }}</text>
							</view>

							<view v-show="world.playerIdentityTemplates[0]?.isOpen">
								<view class="setting-item">
									<view class="item-label">玩家姓名</view>
									<input class="item-input" type="text" v-model="world.playerIdentityTemplates[0].name"
										placeholder="你在该世界的名字" />
								</view>
								<view class="setting-item">
									<view class="item-label">性别</view>
									<picker mode="selector" :range="['男', '女', '其他']"
										@change="(e) => world.playerIdentityTemplates[0].gender = ['男', '女', '其他'][e.detail.value]">
										<view class="picker-val">{{ world.playerIdentityTemplates[0].gender || '男' }} ▾</view>
									</picker>
								</view>
								<view class="setting-item">
									<view class="item-label">年龄</view>
									<input class="item-input" type="number" v-model="world.playerIdentityTemplates[0].age"
										placeholder="例如: 22" />
								</view>
								<view class="setting-item">
									<view class="item-label">住宅区</view>
									<picker mode="selector" :range="world.residentialZones" range-key="name"
										:value="getPlayerResidenceZoneIndex(index)"
										@change="(e) => handlePlayerResidenceZoneChange(index, e)">
										<view class="picker-val">{{ getPlayerResidenceZoneLabel(index) }} ▾</view>
									</picker>
								</view>
								<view class="setting-item">
									<view class="item-label">门牌号</view>
									<picker mode="selector" :range="getPlayerResidenceUnitOptions(index)" range-key="label"
										:value="getPlayerResidenceUnitIndex(index)"
										@change="(e) => handlePlayerResidenceUnitChange(index, e)">
										<view class="picker-val">{{ getPlayerResidenceUnitLabel(index) }} ▾</view>
									</picker>
								</view>
								<view class="setting-item">
									<view class="item-label">身份职业</view>
									<input class="item-input" type="text" v-model="world.playerIdentityTemplates[0].identity"
										placeholder="例如: 剑宗长老、学生" />
								</view>
								<view class="setting-item"
									style="height: auto; align-items: flex-start; padding: 20rpx 0;">
									<view class="item-label" style="margin-top: 10rpx;">外貌设定</view>
									<textarea
										style="flex: 1; min-height: 120rpx; font-size: 28rpx; padding: 16rpx; background: var(--input-bg); border-radius: 8rpx; border: 1px solid var(--border-color); color: var(--text-color);"
										v-model="world.playerIdentityTemplates[0].appearance"
										placeholder="用于双人生图，建议填英文外貌标签 (例: 1boy, black hair, tall...)"></textarea>
								</view>
								<view class="setting-tip">
									当前住址：{{ world.playerIdentityTemplates[0].address || '请先选择住宅区和门牌号' }}
								</view>
							</view>
						</view>
						<view class="sub-section">
							<view class="sub-title">📍 公共地点</view>
							<view class="tag-container">
								<view v-for="(loc, locIdx) in world.publicLocations" :key="loc.id || locIdx" class="tag-item">
									{{ loc.name }}
									<text class="tag-close" @click="removePublicLocation(index, locIdx)">×</text>
								</view>
							</view>
							<view class="add-row">
								<input class="mini-input" v-model="world.tempLoc" placeholder="输入公共地点" />
								<view class="mini-btn" @click="addPublicLocation(index)">添加</view>
							</view>
						</view>
						<view class="sub-section">
							<view class="sub-title">🏠 私人住宅区</view>
							<view class="setting-tip">私人住宅只能拜访，进入前需要得到主人同意。</view>
							<view v-for="(zone, zoneIdx) in world.residentialZones" :key="zone.id || zoneIdx" class="world-card"
								style="margin-bottom: 16rpx;">
								<view class="world-body">
									<view class="add-row">
										<input class="mini-input" v-model="zone.name" placeholder="住宅区名称" />
										<view class="mini-btn" @click="removeResidentialZone(index, zoneIdx)">删除</view>
									</view>
									<view class="tag-container" style="margin-top: 16rpx;">
										<view v-for="(unit, unitIdx) in zone.units" :key="unit.id || unitIdx" class="tag-item job-tag">
											{{ unit.label }}
											<text class="tag-close" @click="removeResidentialUnit(index, zoneIdx, unitIdx)">×</text>
										</view>
									</view>
									<view class="add-row">
										<input class="mini-input" v-model="zone.tempUnit" placeholder="输入门牌号，如 3-301" />
										<view class="mini-btn" @click="addResidentialUnit(index, zoneIdx)">添加门牌</view>
									</view>
								</view>
							</view>
							<view class="add-row">
								<input class="mini-input" v-model="world.tempZone" placeholder="输入住宅区名称" />
								<view class="mini-btn" @click="addResidentialZone(index)">添加住宅区</view>
							</view>
						</view>
						<view class="sub-section">
							<view class="sub-title">💼 职业/身份</view>
							<view class="tag-container">
								<view v-for="(job, jobIdx) in world.professions" :key="jobIdx" class="tag-item job-tag">
									{{ job.name }}
									<text class="tag-close" @click="removeOccupation(index, jobIdx)">×</text>
								</view>
							</view>
							<view class="add-row">
								<input class="mini-input" v-model="world.tempJob" placeholder="输入职业" />
								<view class="mini-btn" @click="addOccupation(index)">添加</view>
							</view>
						</view>
						<view v-if="world.worldConversationVisibility" class="sub-section">
							<view class="sub-title" @click.stop="toggleWorldEditorSection(index, 'conversationVisibility')"
								style="display: flex; justify-content: space-between; align-items: center; padding: 10rpx 0;">
								<text>角色互聊可见性</text>
								<text
									style="font-size: 24rpx; color: #999; font-weight: normal;">{{ world.editorSections?.conversationVisibility ? '▼' : '▶' }}</text>
							</view>
							<view v-show="world.editorSections?.conversationVisibility">
								<view class="setting-tip">决定玩家默认能看到多少现场互聊与远程互聊内容。</view>
								<view class="setting-item">
									<view class="item-label">现场互聊可见性</view>
									<picker mode="selector" :range="CONVERSATION_VISIBILITY_OPTIONS" range-key="label"
										:value="getConversationVisibilityIndex(world.worldConversationVisibility.sceneConversationVisibility)"
										@change="(e) => handleConversationVisibilityChange(index, 'sceneConversationVisibility', e)">
										<view class="picker-val">{{ getConversationVisibilityLabel(world.worldConversationVisibility.sceneConversationVisibility) }} ▾</view>
									</picker>
								</view>
								<view class="setting-item">
									<view class="item-label">远程互聊可见性</view>
									<picker mode="selector" :range="CONVERSATION_VISIBILITY_OPTIONS" range-key="label"
										:value="getConversationVisibilityIndex(world.worldConversationVisibility.remoteConversationVisibility)"
										@change="(e) => handleConversationVisibilityChange(index, 'remoteConversationVisibility', e)">
										<view class="picker-val">{{ getConversationVisibilityLabel(world.worldConversationVisibility.remoteConversationVisibility) }} ▾</view>
									</picker>
								</view>
								<view class="setting-item">
									<view class="item-label">互聊查看范围</view>
									<picker mode="selector" :range="CONVERSATION_SCOPE_OPTIONS" range-key="label"
										:value="getConversationScopeIndex(world.worldConversationVisibility.scopeMode)"
										@change="(e) => handleConversationScopeChange(index, e)">
										<view class="picker-val">{{ getConversationScopeLabel(world.worldConversationVisibility.scopeMode) }} ▾</view>
									</picker>
								</view>
							</view>
						</view>
						<view v-if="world.worldSemantics" class="sub-section">
							<view class="sub-title" @click.stop="toggleWorldEditorSection(index, 'worldSemantics')"
								style="display: flex; justify-content: space-between; align-items: center; padding: 10rpx 0;">
								<text>世界语义</text>
								<text
									style="font-size: 24rpx; color: #999; font-weight: normal;">{{ world.editorSections?.worldSemantics ? '▼' : '▶' }}</text>
							</view>
							<view v-show="world.editorSections?.worldSemantics">
								<view class="setting-tip">让这个世界自己定义远程联络方式、私人空间叫法和常用名词。</view>
								<view class="setting-item">
									<view class="item-label">启用远程联络</view>
									<switch
										:checked="world.worldSemantics.remoteChat.enabled"
										color="#007aff"
										@change="(e) => world.worldSemantics.remoteChat.enabled = !!e.detail.value"
									/>
								</view>
								<view class="setting-item">
									<view class="item-label">远程方式</view>
									<input class="item-input" type="text" v-model="world.worldSemantics.remoteChat.label" placeholder="例如：手机 / 书信 / 传音符" />
								</view>
								<view class="setting-item">
									<view class="item-label">远程入口</view>
									<input class="item-input" type="text" v-model="world.worldSemantics.remoteChat.entryLabel" placeholder="例如：手机聊天 / 书信往来" />
								</view>
								<view class="setting-item">
									<view class="item-label">线程前缀</view>
									<input class="item-input" type="text" v-model="world.worldSemantics.remoteChat.threadPrefix" placeholder="例如：phone / letter / talisman" />
								</view>
								<view class="setting-item">
									<view class="item-label">私人空间</view>
									<input class="item-input" type="text" v-model="world.worldSemantics.privateSpace.label" placeholder="例如：住处 / 居所 / 洞府" />
								</view>
								<view class="setting-item">
									<view class="item-label">私人区域</view>
									<input class="item-input" type="text" v-model="world.worldSemantics.privateSpace.zoneLabel" placeholder="例如：住宅区 / 居所区 / 山门内院" />
								</view>
								<view class="setting-item">
									<view class="item-label">房间标签</view>
									<input class="item-input" type="text" v-model="world.worldSemantics.privateSpace.roomLabel" placeholder="例如：门牌号 / 门位 / 洞府号" />
								</view>
								<view class="setting-item">
									<view class="item-label">拜访动作</view>
									<input class="item-input" type="text" v-model="world.worldSemantics.privateSpace.visitActionLabel" placeholder="例如：拜访 / 登门 / 求见" />
								</view>
								<view class="setting-item">
									<view class="item-label">进入动作</view>
									<input class="item-input" type="text" v-model="world.worldSemantics.privateSpace.enterActionLabel" placeholder="例如：进入 / 入内 / 入府" />
								</view>
								<view class="setting-item">
									<view class="item-label">居民称呼</view>
									<input class="item-input" type="text" v-model="world.worldSemantics.vocabulary.resident" placeholder="例如：居民 / 门人 / 镇民" />
								</view>
								<view class="setting-item">
									<view class="item-label">场景称呼</view>
									<input class="item-input" type="text" v-model="world.worldSemantics.vocabulary.publicLocation" placeholder="例如：场景 / 地点 / 历练场景" />
								</view>
								<view class="setting-item">
									<view class="item-label">职业称呼</view>
									<input class="item-input" type="text" v-model="world.worldSemantics.vocabulary.role" placeholder="例如：职业 / 身份 / 门内职司" />
								</view>
								<view class="setting-item">
									<view class="item-label">关系称呼</view>
									<input class="item-input" type="text" v-model="world.worldSemantics.vocabulary.relationship" placeholder="例如：关系 / 缘分 / 师门关系" />
								</view>
							</view>
						</view>
					</view>
				</view>
				<button class="add-world-btn" @click="addNewWorld">+ 新建世界观</button>
			</view>
		</view>

		<view class="setting-group">
					<view class="group-header" @click="toggleSection('data')">
						<view class="group-title-wrapper">
							<view class="group-title" style="color: #2ecc71;">📦 数据管理与系统</view>
							<text class="group-subtitle">导入/导出/主题设置</text>
						</view>
						<text class="arrow-icon">{{ activeSections.data ? '▼' : '▶' }}</text>
					</view>
		
					<view v-show="activeSections.data" class="group-content" style="padding-top: 20rpx;">
						<view class="setting-item item-clickable" @click="handleDataExportImport">
							<view class="item-label" style="width: auto;">角色数据导出与导入</view>
							<text style="color: #999; font-size: 24rpx;">▶</text>
						</view>
						<view class="setting-item">
							<view class="item-label" style="width: auto;">夜间模式</view>
							<switch :checked="isDarkMode" color="#007aff" @change="toggleTheme" />
						</view>
					</view>
				</view>
		
				<view style="height: 180rpx;"></view>
		
				<view class="fixed-save-bar">
					<button class="save-btn-fixed" @click="saveAllConfig">保存所有配置</button>
				</view>
		
				<CustomTabBar :current="1" />
		
	</view>
</template>

<script setup>
	import {
		ref,
		computed
	} from 'vue';
	import { characterService } from '@/services/characterService.js';
	import { useCharacterStore } from '@/stores/useCharacterStore.js';
	import { worldTemplateService } from '@/services/worldTemplateService.js';
	import {
		onShow
	} from '@dcloudio/uni-app';
	import CustomTabBar from '@/components/CustomTabBar.vue';
	import {
		buildEditableWorldDraft,
		buildWorldTemplateFromDraft,
		createNewWorldDraft
	} from '@/utils/town/world-template-editor.js';
	import {
		buildAvailableResidenceUnits,
		buildResidenceKey,
		buildResidenceLabel
	} from '@/utils/town/town-location-access.js';
	import {
		useTheme
	} from '@/composables/useTheme.js';
	const {
		isDarkMode,
		toggleTheme
	} = useTheme();

	// =========================================================================
	// 静态常量
	// =========================================================================

	const LLM_PROVIDERS = [
		// 1. Gemini: 使用你提供的官方 OpenAI 兼容 Chat 地址作为默认 BaseUrl
		{
			label: 'Google Gemini',
			value: 'gemini',
			defaultUrl: 'https://generativelanguage.googleapis.com/v1beta/openai'
		},
		// 2. 豆包 (火山引擎)
		{
			label: '火山引擎 (豆包)',
			value: 'volcengine',
			defaultUrl: 'https://ark.cn-beijing.volces.com/api/v3'
		},
		// 3. 硅基流动
		{
			label: '硅基流动 (SiliconFlow)',
			value: 'siliconflow',
			defaultUrl: 'https://api.siliconflow.cn/v1'
		},
		// 4. OpenAI / 自定义
		{
			label: 'OpenAI (自定义)',
			value: 'openai',
			defaultUrl: 'https://api.openai.com/v1'
		}
	];

	const DRAWING_STYLES = [{
			label: '标准日漫',
			value: 'anime',
			emoji: '📺'
		},
		{
			label: '厚涂风格',
			value: 'impasto',
			emoji: '🖌️'
		},
		{
			label: '90年代复古',
			value: 'retro',
			emoji: '📼'
		},
		{
			label: '新海诚风',
			value: 'shinkai',
			emoji: '☁️'
		},
		{
			label: '吉卜力',
			value: 'ghibli',
			emoji: '🧙‍♀️'
		},
		{
			label: '古风仙侠',
			value: 'gufeng',
			emoji: '🎐'
		},
		{
			label: '水彩柔和',
			value: 'pastel',
			emoji: '🌸'
		},
		{
			label: '黑白线稿',
			value: 'sketch',
			emoji: '✏️'
		},
		{
			label: '✨ 自定义',
			value: 'custom',
			emoji: '✏️'
		}
	];

	const CONVERSATION_VISIBILITY_OPTIONS = [{
			label: '仅看摘要',
			value: 'summary'
		},
		{
			label: '全部可见',
			value: 'full'
		}
	];

	const CONVERSATION_SCOPE_OPTIONS = [{
			label: '全部角色',
			value: 'all'
		},
		{
			label: '仅已接触角色',
			value: 'known_only'
		}
	];

	const DEFAULT_WORLD_EDITOR_SECTIONS = {
		conversationVisibility: false,
		worldSemantics: false
	};

	// =========================================================================
	// 状态变量
	// =========================================================================

	const userInfo = ref({
		name: '我',
		avatar: '/static/user-avatar.png'
	});
	const activeSections = ref({
		chat: false,
		image: false,
		world: false,
		data: false
	});

	// --- LLM 状态 ---
	const llmSchemes = ref([]);
	const currentSchemeIndex = ref(0);
	const tempModelList = ref([]);
	const activeFetchIndex = ref(-1);

	// --- 绘图状态 (升级为多方案) ---
	const imageSchemes = ref([]);
	const currentImageSchemeIndex = ref(0);

	const worldSettings = ref([]);

	// =========================================================================
	// 计算属性
	// =========================================================================

	const currentLlmScheme = computed(() => {
		if (llmSchemes.value.length === 0) return null;
		return llmSchemes.value[currentSchemeIndex.value];
	});

	// [新增] 当前选中的绘图方案
	const currentImageScheme = computed(() => {
		if (imageSchemes.value.length === 0) return null;
		return imageSchemes.value[currentImageSchemeIndex.value];
	});

	// 1. 修改计算属性: 绑定到当前选中的方案
	const imageConfigIndex = computed(() => {
		const scheme = currentImageScheme.value;
		if (scheme && scheme.provider === 'comfyui') return 1;
		return 0; // 默认为 OpenAI (索引0)
	});

	// 2. 修改计算属性: 绑定到当前选中的方案
	const currentProviderLabel = computed(() => {
		const scheme = currentImageScheme.value;
		if (!scheme) return 'OpenAI';
		return scheme.provider === 'comfyui' ? 'ComfyUI' : 'OpenAI';
	});

	// 辅助函数：判断当前 style 是否在预设列表中
	const isPresetStyle = (val) => {
		return DRAWING_STYLES.some(s => s.value === val && s.value !== 'custom');
	};

	const currentStyleLabel = computed(() => {
		const scheme = currentImageScheme.value;
		if (!scheme) return '默认';

		const target = DRAWING_STYLES.find(s => s.value === scheme.style);
		// 如果找到了预设值，且不是 custom，显示预设 label
		if (target && target.value !== 'custom') return target.label;
		// 否则直接显示 style 的值（即用户的自定义输入），如果没值显示“自定义”
		return scheme.style || '自定义';
	});

	const withWorldEditorFields = (draft = {}) => ({
		...draft,
		tempLoc: draft.tempLoc || '',
		tempJob: draft.tempJob || '',
		tempZone: draft.tempZone || '',
		editorSections: {
			...DEFAULT_WORLD_EDITOR_SECTIONS,
			...(draft.editorSections || {})
		},
		residentialZones: (draft.residentialZones || []).map((zone) => ({
			...zone,
			tempUnit: zone.tempUnit || ''
		}))
	});

	const createDraftItemId = (prefix = 'draft') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	const loadWorldDrafts = () => {
		const worlds = worldTemplateService.ensureDefaultWorldTemplate();
		worldSettings.value = worlds.map((world) => {
			const draft = withWorldEditorFields(buildEditableWorldDraft(world));
			syncWorldPlayerResidence(draft);
			return draft;
		});
	};

	const getConversationVisibilityIndex = (value = 'summary') => {
		const index = CONVERSATION_VISIBILITY_OPTIONS.findIndex((item) => item.value === value);
		return index > -1 ? index : 0;
	};

	const getConversationVisibilityLabel = (value = 'summary') => {
		return CONVERSATION_VISIBILITY_OPTIONS[getConversationVisibilityIndex(value)]?.label || '仅看摘要';
	};

	const getConversationScopeIndex = (value = 'all') => {
		const index = CONVERSATION_SCOPE_OPTIONS.findIndex((item) => item.value === value);
		return index > -1 ? index : 0;
	};

	const getConversationScopeLabel = (value = 'all') => {
		return CONVERSATION_SCOPE_OPTIONS[getConversationScopeIndex(value)]?.label || '全部角色';
	};

	// =========================================================================
	// 生命周期
	// =========================================================================

	onShow(() => {
		const storedUser = uni.getStorageSync('app_user_info');
		if (storedUser) userInfo.value = storedUser;

		// --- 加载 LLM 方案 ---
		const storedSchemes = uni.getStorageSync('app_llm_schemes');
		const storedIndex = uni.getStorageSync('app_current_scheme_index');

		if (storedSchemes && Array.isArray(storedSchemes) && storedSchemes.length > 0) {
			llmSchemes.value = storedSchemes.map(s => ({
				...s,
				isExpanded: false
			}));
			currentSchemeIndex.value = (storedIndex !== undefined && storedIndex < storedSchemes.length) ?
				storedIndex : 0;
		} else {
			createNewScheme(true);
		}

		// --- 加载 绘图 方案 (升级逻辑) ---
		const storedImgSchemes = uni.getStorageSync('app_image_schemes');
		const storedImgIndex = uni.getStorageSync('app_current_image_scheme_index');

		if (storedImgSchemes && Array.isArray(storedImgSchemes) && storedImgSchemes.length > 0) {
			imageSchemes.value = storedImgSchemes.map(s => ({
				...s,
				isExpanded: false
			}));
			currentImageSchemeIndex.value = (storedImgIndex !== undefined && storedImgIndex < storedImgSchemes
				.length) ? storedImgIndex : 0;
		} else {
			// 尝试迁移旧的单配置，防止用户升级后丢失数据
			const oldConfig = uni.getStorageSync('app_image_config');
			if (oldConfig && oldConfig.provider) {
				imageSchemes.value = [{
					id: Date.now(),
					name: '默认绘图',
					...oldConfig,
					isExpanded: true
				}];
			} else {
				createNewImageScheme(true);
			}
		}

		loadWorldDrafts();
	});



	const toggleSection = (key) => {
		activeSections.value[key] = !activeSections.value[key];
	};
	const goToEdit = () => {
		uni.navigateTo({
			url: '/pages/mine/edit-profile'
		});
	};
	const goToGallery = () => {
		uni.navigateTo({
			url: '/pages/mine/gallery'
		});
	};

	// --- 绘图方案管理 (新增) ---

	const createNewImageScheme = (isInit = false) => {
		const newScheme = {
			id: Date.now(),
			name: isInit ? '默认绘图' : `绘图方案 ${imageSchemes.value.length + 1}`,
			provider: 'openai',
			baseUrl: 'https://api.openai.com/v1',
			apiKey: '',
			model: 'dall-e-3',
			style: 'anime',
			isExpanded: true
		};
		if (!isInit) imageSchemes.value.forEach(s => s.isExpanded = false);
		imageSchemes.value.push(newScheme);
		if (isInit) currentImageSchemeIndex.value = 0;
	};

	const selectImageScheme = (index) => {
		currentImageSchemeIndex.value = index;
	};

	const toggleImageSchemeExpand = (index) => {
		imageSchemes.value[index].isExpanded = !imageSchemes.value[index].isExpanded;
	};

	const deleteImageScheme = (index) => {
		uni.showModal({
			title: '删除方案',
			content: '确定删除此绘图配置吗？',
			success: (res) => {
				if (res.confirm) {
					imageSchemes.value.splice(index, 1);
					if (index <= currentImageSchemeIndex.value) {
						currentImageSchemeIndex.value = Math.max(0, currentImageSchemeIndex.value - 1);
					}
					if (imageSchemes.value.length === 0) createNewImageScheme(true);
				}
			}
		});
	};

	const handleImageProviderChange = (e, index) => {
		const val = e.detail.value; // 0=OpenAI, 1=ComfyUI
		const scheme = imageSchemes.value[index];
		if (val == 0) {
			scheme.provider = 'openai';
			if (!scheme.baseUrl) scheme.baseUrl = 'https://api.openai.com/v1';
			scheme.model = 'dall-e-3';
		} else {
			scheme.provider = 'comfyui';
			scheme.baseUrl = '';
		}
	};

	// --- 处理画风选择 (升级适配多方案) ---
	const handleStyleSelect = (styleItem) => {
		const scheme = currentImageScheme.value; // 操作当前选中方案
		if (!scheme) return;

		if (styleItem.value === 'custom') {
			let currentVal = isPresetStyle(scheme.style) ? '' : scheme.style;

			uni.showModal({
				title: '自定义画风 Prompt',
				content: currentVal,
				editable: true,
				placeholderText: '例: cyberpunk, watercolor...',
				success: (res) => {
					if (res.confirm) {
						const inputVal = res.content.trim();
						if (inputVal) {
							scheme.style = inputVal;
						}
					}
				}
			});
		} else {
			scheme.style = styleItem.value;
		}
	};

	// --- LLM 方案管理 ---

	const createNewScheme = (isInit = false) => {
		const newScheme = {
			id: Date.now(),
			name: isInit ? '默认方案' : `方案 ${llmSchemes.value.length + 1}`,
			provider: 'gemini',
			baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
			apiKey: '',
			model: '',
			historyLimit: 20,
			isExpanded: true
		};
		if (!isInit) llmSchemes.value.forEach(s => s.isExpanded = false);
		llmSchemes.value.push(newScheme);
		if (isInit) currentSchemeIndex.value = 0;
	};

	const selectScheme = (index) => {
		currentSchemeIndex.value = index;
	};

	const toggleSchemeExpand = (index) => {
		llmSchemes.value[index].isExpanded = !llmSchemes.value[index].isExpanded;
		tempModelList.value = [];
		activeFetchIndex.value = -1;
	};

	const deleteScheme = (index) => {
		uni.showModal({
			title: '确认删除',
			content: '确定要删除这个API方案吗？',
			success: (res) => {
				if (res.confirm) {
					llmSchemes.value.splice(index, 1);
					if (index === currentSchemeIndex.value || currentSchemeIndex.value >= llmSchemes.value
						.length) {
						currentSchemeIndex.value = 0;
					}
					if (llmSchemes.value.length === 0) createNewScheme(true);
				}
			}
		});
	};

	const handleProviderChange = (e, index) => {
		const selectedIdx = e.detail.value;
		const selected = LLM_PROVIDERS[selectedIdx];
		const scheme = llmSchemes.value[index];
		scheme.provider = selected.value;
		scheme.baseUrl = selected.defaultUrl;
		scheme.model = '';
		tempModelList.value = [];
	};

	const getProviderLabel = (val) => {
		const f = LLM_PROVIDERS.find(p => p.value === val);
		return f ? f.label : val;
	};

	// =========================================================================
	// [核心修改] 获取模型列表逻辑
	// =========================================================================
	const fetchModels = (index) => {
		const scheme = llmSchemes.value[index];
		if (!scheme.apiKey) {
			uni.showToast({
				title: '请先填写 API Key',
				icon: 'none'
			});
			return;
		}

		uni.showLoading({
			title: '获取中...',
			mask: true
		});

		let requestUrl = '';
		let method = 'GET';
		let header = {
			'Authorization': `Bearer ${scheme.apiKey}`
		};

		if (scheme.provider === 'gemini') {
			requestUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${scheme.apiKey}`;
			header = {};
		} else {
			let baseUrl = scheme.baseUrl;
			if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
			requestUrl = `${baseUrl}/models`;
		}

		uni.request({
			url: requestUrl,
			method: method,
			header: header,
			success: (res) => {
				uni.hideLoading();
				console.log('Fetch Models Result:', res);

				let models = [];

				if (scheme.provider === 'gemini' && res.data && res.data.models) {
					models = res.data.models.map(m => m.name.replace('models/', ''));
				} else if (res.data && Array.isArray(res.data.data)) {
					models = res.data.data.map(m => m.id);
				}

				if (models.length > 0) {
					tempModelList.value = models;
					activeFetchIndex.value = index;
					uni.showToast({
						title: `获取到 ${models.length} 个模型`,
						icon: 'success'
					});
				} else {
					const errMsg = res.data?.error?.message || JSON.stringify(res.data);
					uni.showModal({
						title: '获取失败',
						content: `状态码: ${res.statusCode}\n响应: ${errMsg}`,
						showCancel: false
					});
				}
			},
			fail: (err) => {
				uni.hideLoading();
				uni.showToast({
					title: '网络请求失败',
					icon: 'none'
				});
				console.error(err);
			}
		});
	};

	const applyModel = (index, modelName) => {
		llmSchemes.value[index].model = modelName;
		tempModelList.value = [];
	};

	// [已弃用] 旧的 handleTypeChange 已被 handleImageProviderChange 替代
	const handleTypeChange = (e) => {
		// 保留空函数防止模板报错，但逻辑已转移
	};

	// --- 世界观 ---
	const addNewWorld = () => {
		const draft = createNewWorldDraft({
			id: createDraftItemId('world'),
			name: `新世界${worldSettings.value.length + 1}`
		});
		const editableDraft = withWorldEditorFields(draft);
		syncWorldPlayerResidence(editableDraft);
		worldSettings.value.push(editableDraft);
	};
	const ensurePlayerResidence = (world) => {
		const playerIdentity = world?.playerIdentityTemplates?.[0];
		if (!playerIdentity) {
			return null;
		}

		if (!playerIdentity.residence || typeof playerIdentity.residence !== 'object') {
			playerIdentity.residence = {
				zoneId: '',
				unitId: ''
			};
		}

		playerIdentity.residence.zoneId = String(playerIdentity.residence.zoneId || '').trim();
		playerIdentity.residence.unitId = String(playerIdentity.residence.unitId || '').trim();
		return playerIdentity;
	};
	const getPlayerResidenceUnitOptions = (worldIndex) => {
		const world = worldSettings.value[worldIndex];
		const playerIdentity = ensurePlayerResidence(world);
		if (!world || !playerIdentity) {
			return [];
		}

		return buildAvailableResidenceUnits({
			worldTemplate: world,
			zoneId: playerIdentity.residence.zoneId,
			residents: world.starterResidents || [],
			ignoreResidenceKey: buildResidenceKey(playerIdentity.residence)
		});
	};
	const syncWorldPlayerResidence = (world) => {
		const playerIdentity = ensurePlayerResidence(world);
		if (!playerIdentity) {
			return;
		}

		const zones = world.residentialZones || [];
		const currentResidenceKey = buildResidenceKey(playerIdentity.residence);
		if (!zones.some((zone) => String(zone.id || '').trim() === playerIdentity.residence.zoneId)) {
			playerIdentity.residence.zoneId = zones[0]?.id || '';
			playerIdentity.residence.unitId = '';
		}

		const availableUnits = buildAvailableResidenceUnits({
			worldTemplate: world,
			zoneId: playerIdentity.residence.zoneId,
			residents: world.starterResidents || [],
			ignoreResidenceKey: currentResidenceKey
		});
		if (!availableUnits.some((unit) => unit.id === playerIdentity.residence.unitId)) {
			playerIdentity.residence.unitId = availableUnits[0]?.id || '';
		}

		playerIdentity.address = buildResidenceLabel(world, playerIdentity.residence) || '';
	};
	const getPlayerResidenceZoneIndex = (worldIndex) => {
		const world = worldSettings.value[worldIndex];
		const playerIdentity = ensurePlayerResidence(world);
		if (!world || !playerIdentity) {
			return -1;
		}

		return (world.residentialZones || []).findIndex((zone) => zone.id === playerIdentity.residence.zoneId);
	};
	const getPlayerResidenceZoneLabel = (worldIndex) => {
		const world = worldSettings.value[worldIndex];
		const zoneIndex = getPlayerResidenceZoneIndex(worldIndex);
		return zoneIndex > -1 ? world.residentialZones[zoneIndex]?.name || '选择住宅区' : '选择住宅区';
	};
	const getPlayerResidenceUnitIndex = (worldIndex) => {
		const playerIdentity = ensurePlayerResidence(worldSettings.value[worldIndex]);
		const options = getPlayerResidenceUnitOptions(worldIndex);
		if (!playerIdentity) {
			return -1;
		}

		return options.findIndex((item) => item.id === playerIdentity.residence.unitId);
	};
	const getPlayerResidenceUnitLabel = (worldIndex) => {
		const unitIndex = getPlayerResidenceUnitIndex(worldIndex);
		const options = getPlayerResidenceUnitOptions(worldIndex);
		return unitIndex > -1 ? options[unitIndex]?.label || '选择门牌号' : '选择门牌号';
	};
	const handlePlayerResidenceZoneChange = (worldIndex, event) => {
		const world = worldSettings.value[worldIndex];
		const zone = (world?.residentialZones || [])[Number(event?.detail?.value)];
		const playerIdentity = ensurePlayerResidence(world);
		if (!world || !playerIdentity) {
			return;
		}

		const currentResidenceKey = buildResidenceKey(playerIdentity.residence);
		playerIdentity.residence.zoneId = zone?.id || '';
		const availableUnits = buildAvailableResidenceUnits({
			worldTemplate: world,
			zoneId: playerIdentity.residence.zoneId,
			residents: world.starterResidents || [],
			ignoreResidenceKey: currentResidenceKey
		});
		if (!availableUnits.some((item) => item.id === playerIdentity.residence.unitId)) {
			playerIdentity.residence.unitId = availableUnits[0]?.id || '';
		}
		playerIdentity.address = buildResidenceLabel(world, playerIdentity.residence) || '';
	};
	const handlePlayerResidenceUnitChange = (worldIndex, event) => {
		const world = worldSettings.value[worldIndex];
		const playerIdentity = ensurePlayerResidence(world);
		const options = getPlayerResidenceUnitOptions(worldIndex);
		const unit = options[Number(event?.detail?.value)];
		if (!world || !playerIdentity) {
			return;
		}

		playerIdentity.residence.unitId = unit?.id || '';
		playerIdentity.address = buildResidenceLabel(world, playerIdentity.residence) || '';
	};
	// C. 在 addNewWorld 下面加一个切换折叠的函数
	const togglePlayerInfo = (idx) => {
		const playerIdentity = worldSettings.value[idx]?.playerIdentityTemplates?.[0];
		if (playerIdentity) {
			playerIdentity.isOpen = !playerIdentity.isOpen;
		}
	};
	const toggleWorldEditorSection = (idx, sectionKey) => {
		const sections = worldSettings.value[idx]?.editorSections;
		if (!sections || !(sectionKey in sections)) {
			return;
		}

		sections[sectionKey] = !sections[sectionKey];
	};
	const toggleWorldItem = (idx) => {
		worldSettings.value[idx].isOpen = !worldSettings.value[idx].isOpen;
	};
	const handleConversationVisibilityChange = (worldIndex, field, event) => {
		const world = worldSettings.value[worldIndex];
		const option = CONVERSATION_VISIBILITY_OPTIONS[Number(event?.detail?.value)] || CONVERSATION_VISIBILITY_OPTIONS[0];
		if (!world?.worldConversationVisibility) {
			return;
		}

		world.worldConversationVisibility[field] = option.value;
	};
	const handleConversationScopeChange = (worldIndex, event) => {
		const world = worldSettings.value[worldIndex];
		const option = CONVERSATION_SCOPE_OPTIONS[Number(event?.detail?.value)] || CONVERSATION_SCOPE_OPTIONS[0];
		if (!world?.worldConversationVisibility) {
			return;
		}

		world.worldConversationVisibility.scopeMode = option.value;
	};
	const deleteWorld = (idx) => {
		uni.showModal({
			title: '删除',
			content: '确定删除吗？',
			success: (res) => {
				if (res.confirm) worldSettings.value.splice(idx, 1);
			}
		});
	};
	const addPublicLocation = (idx) => {
		const w = worldSettings.value[idx];
		const name = w.tempLoc?.trim();
		if (name) {
			if ((w.publicLocations || []).some((item) => item.name === name)) {
				uni.showToast({
					title: '地点已存在',
					icon: 'none'
				});
				return;
			}
			w.publicLocations.push({
				id: createDraftItemId('loc'),
				name,
				category: 'public',
				openHours: ['00:00-24:00'],
				isOpen: false
			});
			w.tempLoc = '';
		}
	};
	const removePublicLocation = (wi, li) => {
		worldSettings.value[wi].publicLocations.splice(li, 1);
	};
	const addResidentialZone = (idx) => {
		const world = worldSettings.value[idx];
		const name = world.tempZone?.trim();
		if (!name) {
			return;
		}

		if ((world.residentialZones || []).some((zone) => zone.name === name)) {
			uni.showToast({
				title: '住宅区已存在',
				icon: 'none'
			});
			return;
		}

		world.residentialZones.push({
			id: createDraftItemId('zone'),
			name,
			description: '',
			isOpen: true,
			tempUnit: '',
			units: []
		});
		world.tempZone = '';
		syncWorldPlayerResidence(world);
	};
	const removeResidentialZone = (worldIndex, zoneIndex) => {
		const world = worldSettings.value[worldIndex];
		world.residentialZones.splice(zoneIndex, 1);
		syncWorldPlayerResidence(world);
	};
	const addResidentialUnit = (worldIndex, zoneIndex) => {
		const world = worldSettings.value[worldIndex];
		const zone = world?.residentialZones?.[zoneIndex];
		const unitLabel = zone?.tempUnit?.trim();
		if (!world || !zone || !unitLabel) {
			return;
		}

		if ((zone.units || []).some((unit) => String(unit.id || '').trim() === unitLabel)) {
			uni.showToast({
				title: '门牌号已存在',
				icon: 'none'
			});
			return;
		}

		zone.units.push({
			id: unitLabel,
			label: unitLabel,
			accessPolicy: 'consent_required',
			isOpen: false
		});
		zone.tempUnit = '';
		syncWorldPlayerResidence(world);
	};
	const removeResidentialUnit = (worldIndex, zoneIndex, unitIndex) => {
		const world = worldSettings.value[worldIndex];
		world.residentialZones?.[zoneIndex]?.units?.splice(unitIndex, 1);
		syncWorldPlayerResidence(world);
	};
	const addOccupation = (idx) => {
		const w = worldSettings.value[idx];
		const name = w.tempJob?.trim();
		if (name) {
			w.professions.push({
				id: createDraftItemId('profession'),
				name,
				workLocationId: '',
				workStartHour: 9,
				workEndHour: 18,
				isOpen: false
			});
			w.tempJob = '';
		}
	};
	const removeOccupation = (wi, ji) => {
		worldSettings.value[wi].professions.splice(ji, 1);
	};


	// --- 打开外部链接逻辑 ---
	const openSiliconFlowLink = () => {
		const url = 'https://cloud.siliconflow.cn/i/lvGIlSLg';
		// #ifdef H5
		window.open(url);
		// #endif
		// #ifdef APP-PLUS
		plus.runtime.openURL(url);
		// #endif
		// #ifdef MP
		uni.setClipboardData({
			data: url,
			success: () => {
				uni.showToast({
					title: '链接已复制，请在浏览器打开',
					icon: 'none'
				});
			}
		});
		// #endif
	};

	// --- 保存 ---
	const saveAllConfig = () => {
		if (llmSchemes.value.length === 0) {
			uni.showToast({
				title: '请添加对话方案',
				icon: 'none'
			});
			return;
		}

		// 1. 保存 LLM 方案
		const cleanSchemes = llmSchemes.value.map(({
			isExpanded,
			...rest
		}) => {
			let url = rest.baseUrl.trim();
			if (url.endsWith('/')) url = url.slice(0, -1);
			return {
				...rest,
				baseUrl: url
			};
		});
		uni.setStorageSync('app_llm_schemes', cleanSchemes);
		uni.setStorageSync('app_current_scheme_index', currentSchemeIndex.value);

		// 2. [关键修改] 保存绘图方案
		if (imageSchemes.value.length === 0) {
			createNewImageScheme(true);
		}
		const cleanImgSchemes = imageSchemes.value.map(({
			isExpanded,
			...rest
		}) => {
			let url = rest.baseUrl ? rest.baseUrl.trim() : '';
			if (url.endsWith('/')) url = url.slice(0, -1);
			return {
				...rest,
				baseUrl: url
			};
		});
		uni.setStorageSync('app_image_schemes', cleanImgSchemes);
		uni.setStorageSync('app_current_image_scheme_index', currentImageSchemeIndex.value);

		// 3. [同步配置] 将当前选中的绘图方案写入 app_image_config
		// 这样 useChatGallery.js 等文件无需修改代码，直接读取此 key 即可
		const activeImgScheme = cleanImgSchemes[currentImageSchemeIndex.value];
		uni.setStorageSync('app_image_config', activeImgScheme);

		const savedWorlds = worldTemplateService.saveWorldTemplates(
			worldSettings.value.map((world) => buildWorldTemplateFromDraft(world))
		);
		worldSettings.value = savedWorlds.map((world) => {
			const draft = withWorldEditorFields(buildEditableWorldDraft(world));
			syncWorldPlayerResidence(draft);
			return draft;
		});

		uni.showToast({
			title: '保存成功',
			icon: 'success'
		});
		activeSections.value.chat = false;
		activeSections.value.image = false;
		activeSections.value.world = false;
	};
	// =========================================================================
		// ✨ 数据导入导出系统逻辑
		// =========================================================================
	
		const formatBackupDate = () => {
			const d = new Date();
			return `${d.getMonth()+1}月${d.getDate()}日_${d.getHours()}时${d.getMinutes()}分`;
		};
	
		const handleDataExportImport = () => {
				uni.showActionSheet({
					itemList: [
						'📥 恢复数据 (从剪贴板粘贴 JSON)',
						'📁 恢复数据 (选择本地 JSON 文件)',
						'📤 备份数据 (复制 JSON 到剪贴板)',
						'📁 备份数据 (手动选择文件夹 / 分享)' // ✨ 修改了这里的文案
					],
					success: (res) => {
						const idx = res.tapIndex;
						if (idx === 0) importFromClipboard();
						else if (idx === 1) importFromFile();
						else if (idx === 2) exportToClipboard();
						else if (idx === 3) exportToFile();
					}
				});
			};
	
		// --- 统一解析写入逻辑 ---
		const processImportContent = async (content) => {
			try {
				const chars = JSON.parse(content);
				if (!Array.isArray(chars)) throw new Error('数据格式错误，期望一个包含角色的数组');
				
				uni.showLoading({ title: '正在写入数据库...' });
				let count = 0;
				for (const char of chars) {
					if (char.id && char.name) {
						// 将数据逐个存入 SQLite
						await characterService.saveCharacter(char);
						count++;
					}
				}
				
				// 唤醒 Pinia 管家，重新加载刚导入的数据到首页内存
				const store = useCharacterStore();
				await store.initContacts();
				
				uni.hideLoading();
				uni.showModal({ title: '数据恢复成功', content: `成功恢复了 ${count} 个角色的心血！`, showCancel: false });
			} catch(e) {
				uni.hideLoading();
				uni.showModal({ title: '导入失败', content: e.message || '内容不是有效的数据', showCancel: false });
			}
		};
	
		// --- 📥 导入 ---
		const importFromClipboard = () => {
			uni.getClipboardData({
				success: (res) => {
					if (!res.data) return uni.showToast({ title: '剪贴板为空', icon: 'none' });
					processImportContent(res.data);
				}
			});
		};
	
		const importFromFile = () => {
			// #ifdef APP-PLUS
			uni.chooseFile({
				count: 1,
				extension: ['.json', '.txt'],
				success: (res) => {
					const tempFilePath = res.tempFilePaths[0];
					plus.io.resolveLocalFileSystemURL(tempFilePath, function(entry) {
						entry.file(function(file) {
							const reader = new plus.io.FileReader();
							reader.onloadend = function(e) { processImportContent(e.target.result); };
							reader.readAsText(file);
						});
					}, () => uni.showToast({ title: '读取文件失败', icon: 'none' }));
				}
			});
			// #endif
			// #ifndef APP-PLUS
			uni.showToast({ title: '仅 App 端支持选择文件', icon: 'none' });
			// #endif
		};
	
		// --- 📤 导出 ---
		const exportToClipboard = async () => {
			uni.showLoading({ title: '打包数据中...' });
			try {
				const chars = await characterService.getAllCharacters();
				if (!chars || chars.length === 0) {
					uni.hideLoading();
					return uni.showToast({ title: '当前没有可导出的数据', icon: 'none' });
				}
				uni.setClipboardData({
					data: JSON.stringify(chars),
					success: () => {
						uni.hideLoading();
						uni.showToast({ title: '已复制到剪贴板，请尽快找地方粘贴保存', icon: 'none', duration: 3000 });
					}
				});
			} catch (e) {
				uni.hideLoading();
				uni.showToast({ title: '导出失败', icon: 'none' });
			}
		};
	
		const exportToFile = async () => {
				uni.showLoading({ title: '打包文件中...' });
				try {
					const chars = await characterService.getAllCharacters();
					if (!chars || chars.length === 0) {
						uni.hideLoading();
						return uni.showToast({ title: '当前没有可导出的数据', icon: 'none' });
					}
					const jsonStr = JSON.stringify(chars, null, 2);
		
					// #ifdef APP-PLUS
					const fileName = `AiChat_Backup_${formatBackupDate()}.json`;
					
					// 1. 先把文件临时写入到 App 的安全沙盒目录 (_doc)
					plus.io.requestFileSystem(plus.io.PRIVATE_DOC, function(fs) {
						fs.root.getFile(fileName, {create: true}, function(fileEntry) {
							fileEntry.createWriter(function(writer) {
								writer.onwrite = function() {
									uni.hideLoading();
									
									// 2. ✨ 核心修改：呼出“手机系统分享/操作面板”
									// 这样你就可以点击面板上的“保存到文件”，或者直接发给微信传输助手了
									let fileUrl = fileEntry.toLocalURL();
									plus.share.sendWithSystem({
										type: 'file',           // 声明为文件类型
										title: 'AiChat数据备份', 
										content: '角色备份文件',
										href: fileUrl           // 传入文件的本地路径
									}, function() {
										console.log('文件导出操作成功');
									}, function(e) {
										console.log('用户取消了操作', e);
									});
								};
								writer.onerror = function() {
									uni.hideLoading();
									uni.showToast({ title: '文件生成失败', icon: 'none' });
								}
								writer.write(jsonStr);
							});
						});
					}, function(e) {
						uni.hideLoading();
						uni.showToast({ title: '获取系统目录失败', icon: 'none' });
					});
					// #endif
					
					// #ifndef APP-PLUS
					uni.hideLoading();
					uni.showToast({ title: '仅 App 端支持导出为文件', icon: 'none' });
					// #endif
				} catch (e) {
					uni.hideLoading();
					uni.showToast({ title: '导出失败', icon: 'none' });
				}
			};
</script>

<style lang="scss" scoped>
	/* --- 基础布局 --- */
	.mine-container {
		min-height: 100vh;
		background-color: var(--bg-color);
		/* Was #f5f7fa */
		padding-bottom: 120rpx;
	}

	.user-section {
		background-color: var(--card-bg);
		/* Was #ffffff */
		padding: 60rpx 40rpx;
		display: flex;
		align-items: center;
		margin-bottom: 24rpx;
		position: relative;
	}

	.avatar-wrapper {
		margin-right: 32rpx;
		position: relative;
		width: 140rpx;
		height: 140rpx;
	}

	.avatar {
		width: 140rpx;
		height: 140rpx;
		border-radius: 50%;
		background-color: var(--border-color);
		/* Was #eee */
	}

	.edit-badge {
		position: absolute;
		right: 0;
		bottom: 0;
		background: #007aff;
		color: #fff;
		font-size: 24rpx;
		width: 40rpx;
		height: 40rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2rpx solid var(--card-bg);
		/* Was #fff */
	}

	.info-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.label {
		font-size: 24rpx;
		color: var(--text-sub);
		/* Was #999 */
		margin-bottom: 10rpx;
	}

	.name-display {
		font-size: 40rpx;
		font-weight: bold;
		color: var(--text-color);
		/* Was #333 */
	}

	.edit-hint {
		font-size: 24rpx;
		color: var(--text-sub);
		/* Was #bbb */
		font-weight: normal;
		margin-left: 10rpx;
		opacity: 0.8;
	}

	.gallery-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-left: 20rpx;
		padding: 10rpx;
	}

	.gallery-icon {
		font-size: 48rpx;
		margin-bottom: 4rpx;
	}

	.gallery-text {
		font-size: 20rpx;
		color: var(--text-sub);
		/* Was #666 */
	}

	/* --- 设置分组通用 --- */
	.setting-group {
		background-color: var(--card-bg);
		/* Was #ffffff */
		margin-bottom: 24rpx;
		overflow: hidden;
	}

	.group-header {
		padding: 30rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
		border-bottom: 1px solid transparent;
		transition: background 0.2s;
	}

	.group-header:active {
		background-color: var(--tool-bg);
		/* Was #f9f9f9 */
	}

	.group-title-wrapper {
		display: flex;
		flex-direction: column;
	}

	.group-title {
		font-size: 30rpx;
		color: var(--text-color);
		/* Was #333 */
		font-weight: bold;
	}

	.group-subtitle {
		font-size: 22rpx;
		color: var(--text-sub);
		/* Was #999 */
		margin-top: 6rpx;
	}

	.arrow-icon {
		color: var(--text-sub);
		/* Was #ccc */
		font-size: 24rpx;
		opacity: 0.5;
	}

	.group-content {
		padding: 0 32rpx 20rpx;
		animation: fadeIn 0.3s ease;
		border-top: 1px solid var(--border-color);
		/* Was #f0f0f0 */
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}

		to {
			opacity: 1;
		}
	}

	/* --- 列表式方案管理样式 (重点修改) --- */
	.scheme-list {
		margin-bottom: 20rpx;
		margin-top: 10rpx;
	}

	.scheme-card {
		background: var(--card-bg);
		/* Was #fff */
		border: 1px solid var(--border-color);
		/* Was #eee */
		border-radius: 16rpx;
		margin-bottom: 20rpx;
		overflow: hidden;
		transition: all 0.2s;
		box-shadow: var(--shadow);
		/* Was hardcoded shadow */
	}

	.scheme-card.is-active {
		border-color: #007aff;
		background-color: rgba(0, 122, 255, 0.05);
		/* Was #f0f8ff */
		box-shadow: 0 4rpx 12rpx rgba(0, 122, 255, 0.1);
	}

	/* 卡片头部 */
	.scheme-card-header {
		padding: 24rpx;
		display: flex;
		align-items: center;
		cursor: pointer;
	}

	.radio-area {
		width: 60rpx;
		height: 60rpx;
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}

	.radio-circle {
		width: 36rpx;
		height: 36rpx;
		border-radius: 50%;
		border: 2rpx solid var(--text-sub);
		/* Was #ccc */
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--card-bg);
		/* Was #fff */
		opacity: 0.6;
	}

	.is-active .radio-circle {
		border-color: #007aff;
		opacity: 1;
	}

	.radio-inner {
		width: 20rpx;
		height: 20rpx;
		border-radius: 50%;
		background-color: #007aff;
	}

	.scheme-info {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.scheme-name {
		font-size: 28rpx;
		font-weight: bold;
		color: var(--text-color);
		/* Was #333 */
	}

	.scheme-desc {
		font-size: 22rpx;
		color: var(--text-sub);
		/* Was #999 */
		margin-top: 4rpx;
	}

	.expand-icon {
		padding: 10rpx;
		color: var(--text-sub);
		/* Was #ccc */
		font-size: 24rpx;
		opacity: 0.5;
	}

	/* 卡片展开内容 */
	.scheme-card-body {
		padding: 0 24rpx 24rpx 24rpx;
		border-top: 1px solid var(--border-color);
		/* Was #f0f0f0 */
		background-color: var(--tool-bg);
		/* Was #fafafa */
	}

	.card-footer {
		display: flex;
		justify-content: flex-end;
		margin-top: 20rpx;
	}

	.delete-text {
		color: #ff4d4f;
		font-size: 24rpx;
		padding: 10rpx 0;
	}

	/* 添加按钮 */
	.add-scheme-btn {
		background-color: var(--card-bg);
		/* Was #fff */
		border: 1px dashed #007aff;
		color: #007aff;
		font-size: 28rpx;
		border-radius: 40rpx;
		margin-top: 20rpx;
	}

	.add-scheme-btn:active {
		background-color: rgba(0, 122, 255, 0.05);
		/* Was #f0f8ff */
	}

	/* 模型选择气泡 */
	.model-select-area {
		background: var(--card-bg);
		/* Was #fff */
		border: 1px solid var(--border-color);
		/* Was #eee */
		border-radius: 12rpx;
		padding: 20rpx;
		margin-bottom: 20rpx;
	}

	.model-tag-title {
		font-size: 24rpx;
		color: var(--text-sub);
		/* Was #999 */
		margin-bottom: 12rpx;
	}

	.model-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 16rpx;
	}

	.model-tag {
		background: rgba(0, 122, 255, 0.1);
		/* Was #e3f2fd */
		color: #007aff;
		font-size: 24rpx;
		padding: 8rpx 20rpx;
		border-radius: 30rpx;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* --- 通用 Setting Item --- */
	.setting-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 100rpx;
		border-bottom: 1px solid var(--border-color);
		/* Was #e0e0e0 */
	}

	.item-label {
		font-size: 30rpx;
		color: var(--text-color);
		/* Was #333 */
		width: 180rpx;
	}

	.item-input {
		flex: 1;
		text-align: right;
		font-size: 30rpx;
		color: var(--text-color);
		/* Was #333 */
	}

	.picker-val {
		font-size: 30rpx;
		color: #007aff;
		font-weight: bold;
	}

	.setting-item-col {
		padding: 20rpx 0;
		border-bottom: 1px solid var(--border-color);
		/* Was #e0e0e0 */
	}

	.item-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 10rpx;
	}

	.item-value {
		font-size: 28rpx;
		color: #007aff;
		font-weight: bold;
	}

	.setting-tip {
		font-size: 24rpx;
		color: var(--text-sub);
		/* Was #999 */
		padding: 20rpx 0;
		line-height: 1.5;
	}

	/* 模型输入+刷新 */
	.model-input-group {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	.model-manual-input {
		flex: 1;
		text-align: right;
		margin-right: 16rpx;
	}

	.icon-btn {
		width: 60rpx;
		height: 60rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--border-color);
		/* Was #e6e6e6 */
		border-radius: 50%;
		font-size: 30rpx;
		flex-shrink: 0;
		color: var(--text-color);
	}

	.icon-btn:active {
		opacity: 0.7;
	}

	/* --- World 样式 --- */
	.world-card {
		background-color: var(--tool-bg);
		/* Was #f8f9fa */
		border-radius: 12rpx;
		margin-bottom: 20rpx;
		overflow: hidden;
		border: 1px solid var(--border-color);
		/* Was #eee */
	}

	.world-header {
		padding: 20rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--card-bg);
		/* Was #fff */
		border-bottom: 1px solid var(--border-color);
		/* Was #eee */
	}

	.world-name {
		font-weight: bold;
		font-size: 28rpx;
		color: var(--text-color);
		/* Was #333 */
	}

	.world-actions {
		display: flex;
		gap: 20rpx;
		align-items: center;
	}

	.toggle-icon {
		font-size: 24rpx;
		color: #007aff;
	}

	.delete-icon {
		font-size: 28rpx;
		padding: 10rpx;
	}

	.world-body {
		padding: 20rpx;
	}

	.sub-section {
		margin-top: 20rpx;
	}

	.sub-title {
		font-size: 26rpx;
		color: var(--text-sub);
		/* Was #666 */
		margin-bottom: 12rpx;
		font-weight: bold;
	}

	.tag-container {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
		margin-bottom: 12rpx;
	}

	.tag-item {
		background-color: rgba(0, 122, 255, 0.1);
		/* Was #e3f2fd */
		color: #007aff;
		padding: 6rpx 16rpx;
		border-radius: 20rpx;
		font-size: 24rpx;
		display: flex;
		align-items: center;
	}

	.job-tag {
		background-color: rgba(156, 39, 176, 0.1);
		/* Was #f3e5f5 */
		color: #9c27b0;
	}

	.tag-close {
		margin-left: 8rpx;
		font-weight: bold;
		opacity: 0.6;
		padding: 0 4rpx;
	}

	.add-row {
		display: flex;
		gap: 10rpx;
	}

	.mini-input {
		flex: 1;
		background: var(--input-bg);
		/* Was #fff */
		height: 60rpx;
		border: 1px solid var(--border-color);
		/* Was #ddd */
		border-radius: 8rpx;
		padding: 0 16rpx;
		font-size: 24rpx;
		color: var(--text-color);
	}

	.mini-btn {
		width: 100rpx;
		height: 60rpx;
		background: var(--text-color);
		/* Was #333 */
		color: var(--card-bg);
		/* Was #fff */
		border-radius: 8rpx;
		font-size: 24rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.add-world-btn {
		background-color: var(--card-bg);
		/* Was #fff */
		color: #9c27b0;
		border: 1px dashed #9c27b0;
		font-size: 28rpx;
		margin-top: 20rpx;
	}




	/* --- 画风 --- */
	.sub-section-title {
		font-size: 28rpx;
		color: var(--text-sub);
		/* Was #666 */
		margin: 30rpx 0 20rpx 0;
		font-weight: bold;
	}

	.style-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 20rpx;
	}

	.style-card {
		background-color: var(--tool-bg);
		/* Was #f8f9fa */
		border: 2rpx solid transparent;
		border-radius: 12rpx;
		padding: 20rpx;
		display: flex;
		align-items: center;
		transition: all 0.2s;
	}

	.style-card.active {
		background-color: rgba(255, 159, 67, 0.1);
		/* Was #fff3e0 */
		border-color: #ff9f43;
		box-shadow: 0 4rpx 8rpx rgba(255, 159, 67, 0.2);
	}

	.style-emoji {
		font-size: 40rpx;
		margin-right: 16rpx;
	}

	.style-name {
		font-size: 26rpx;
		color: var(--text-color);
		/* Was #333 */
		font-weight: 500;
	}

	/* --- 新增：输入框内的右侧链接样式 --- */
	.input-suffix-link {
		font-size: 24rpx;
		color: #007aff;
		background-color: rgba(0, 122, 255, 0.1);
		/* Was #e3f2fd */
		padding: 6rpx 16rpx;
		border-radius: 30rpx;
		margin-left: 16rpx;
		white-space: nowrap;
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.input-suffix-link:active {
		opacity: 0.6;
		background-color: rgba(0, 122, 255, 0.2);
		/* Was #d0e4f7 */
	}

	/* --- 夜间模式菜单样式 --- */


	.menu-item .left {
		display: flex;
		align-items: center;
	}

	.menu-item .icon {
		font-size: 40rpx;
		margin-right: 20rpx;
	}

	.menu-item .label {
		font-size: 30rpx;
		color: var(--text-color);
	}
	/* --- ✨ 新增：固定底部保存按钮样式 --- */
		.fixed-save-bar {
			position: fixed;
			left: 0;
			right: 0;
			/* 避开底部导航栏 CustomTabBar (大概 110rpx 高度) 和系统底部安全区 */
			bottom: calc(110rpx + constant(safe-area-inset-bottom));
			bottom: calc(110rpx + env(safe-area-inset-bottom));
			padding: 20rpx 40rpx;
			background-color: var(--bg-color);
			border-top: 1px solid var(--border-color);
			box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.05); /* 顶部边缘阴影 */
			z-index: 99;
		}
	
		.save-btn-fixed {
			background-color: #007aff;
			color: #ffffff;
			font-size: 32rpx;
			font-weight: bold;
			border-radius: 40rpx;
			height: 84rpx;
			line-height: 84rpx;
			width: 100%;
			box-shadow: 0 6rpx 16rpx rgba(0, 122, 255, 0.25);
		}
		
		.save-btn-fixed:active {
			background-color: #0062cc;
			transform: scale(0.98);
		}
	
		/* 增加点击反馈样式 */
		.item-clickable:active {
			background-color: var(--tool-bg);
		}
</style>
