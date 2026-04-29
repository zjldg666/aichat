<template>
	<view class="chat-container" :class="{ 'dark-mode': isDarkMode }">
		<ChatHeader
			:wallet="sceneWallet"
			:residentEconomy="sceneHostResident?.economy || null"
			:currentLocation="sceneHeaderLocation"
			:currentActivity="sceneHeaderActivity"
			:playerLocation="scenePlayerLocation"
			:timeParts="timeParts"
			@clickPlayer="focusResidentPresence"
			@clickTime="showTimeSettingPanel = true"
			@clickWallet="openSceneShop"
			@clickCourier="handleOpenContainer('快递箱')"
			@clickContainer="handleOpenContainer"
		/>

		<ShopPanel
			:visible="showShopPanel"
			:wallet="sceneWallet"
			:currentRole="sceneHostResident || {}"
			@close="showShopPanel = false"
			@buy="handleBuyItem"
		/>

		<scroll-view
			class="chat-scroll"
			scroll-y
			:scroll-into-view="sceneScrollIntoView"
			:scroll-with-animation="true"
		>
			<view class="chat-content">
				<view id="scene-presence-top" class="scene-presence-strip">
					<view class="scene-presence-header">
						<view class="scene-presence-copy">
							<text class="scene-presence-title">
								{{ sceneViewModel.sceneFocus?.title || sceneHeaderLocation }}
							</text>
							<text class="scene-presence-meta">
								{{ sceneStageModeLabel }} · 在场 {{ presentCharacters.length }} 人
							</text>
						</view>
						<text class="scene-presence-summary">
							{{ sceneViewModel.presenceSummary || sceneHeaderActivity }}
						</text>
					</view>

					<view class="scene-focus-card">
						<text class="scene-focus-badge">
							{{ sceneViewModel.sceneFocus?.badgeLabel || '现场线索' }}
						</text>
						<text class="scene-focus-summary">
							{{ sceneViewModel.sceneFocus?.summary || sceneViewModel.emptyMessage }}
						</text>
					</view>

					<scroll-view v-if="presentCharacters.length > 0" scroll-x class="scene-presence-avatar-list" :show-scrollbar="false">
						<view class="scene-presence-avatar-row">
							<view
								v-for="char in presentCharacters"
								:key="char.id"
								class="scene-presence-card"
								:class="{ 'scene-presence-card--host': isHostResident(char) }"
								@click="openResidentChat(char)"
							>
								<image
									:src="char.avatar || '/static/ai-avatar.png'"
									mode="aspectFill"
									class="scene-presence-avatar"
								></image>
								<view class="scene-presence-info">
									<text class="scene-presence-name">{{ char.name || '居民' }}</text>
									<text class="scene-presence-action">
										{{ char.presenceNote || char.townRuntime?.currentAction || char.currentAction || '待在这里' }}
									</text>
									<text class="scene-presence-action-label">{{ char.actionLabel }}</text>
								</view>
							</view>
						</view>
					</scroll-view>

					<view v-else class="scene-presence-empty">
						<text class="scene-presence-empty-title">{{ sceneViewModel.emptyMessage }}</text>
						<text class="scene-presence-empty-desc">
							{{ sceneViewModel.sceneFocus?.summary || '先抛一个话题，或者换个地点看看。' }}
						</text>
					</view>

					<view
						v-if="sceneViewModel.joinAction"
						class="scene-join-card"
						@click="joinSceneActivity(sceneViewModel.joinAction)"
					>
						<text class="scene-join-title">{{ sceneViewModel.joinAction.label }}</text>
						<text class="scene-join-desc">{{ sceneViewModel.joinAction.description }}</text>
					</view>
				</view>

				<view class="system-tip">
					<text>点击头像可切到单独私聊，留在这里是多人现场聊天。</text>
				</view>

				<view v-if="showThought && sceneViewModel.eventFeed.length > 0" class="scene-event-feed">
					<view v-for="event in sceneViewModel.eventFeed" :key="event.id" class="scene-event-item">
						<text class="scene-event-title">{{ event.title }}</text>
						<text class="scene-event-summary">{{ event.summary }}</text>
						<text class="scene-event-reason">{{ event.reason }}</text>
						<text class="scene-event-action">{{ event.actionLabel }}</text>
					</view>
				</view>

				<view v-if="sceneRenderableMessages.length === 0 && !isSendingPublicMessage" class="scene-empty-card">
					<text class="scene-empty-title">{{ sceneViewModel.publicChat.emptyState }}</text>
					<text class="scene-empty-desc">先抛一个话题，看看谁会先接住你。</text>
				</view>

				<ChatMessageItem
					v-for="(msg, index) in sceneRenderableMessages"
					:key="msg.id || index"
					:id="`scene-public-msg-${index}`"
					:msg="msg"
					:isEditMode="false"
					:isSelected="false"
					:roleAvatar="sceneHostResident?.avatar"
					:userAvatar="'/static/user-avatar.png'"
				/>

				<view v-if="isSendingPublicMessage" class="loading-wrapper">
					<view class="loading-dots">现场正在判断该由谁开口……</view>
				</view>

				<view id="scene-shell-bottom" style="height: 20rpx;"></view>
			</view>
		</scroll-view>

		<ChatFooter
			:isEditMode="false"
			:selectedCount="0"
			:isToolbarOpen="isToolbarOpen"
			v-model="sceneDraft"
			:wakeTime="sceneWakeTime"
			:showThought="showThought"
			:showInviteAction="false"
			@toggleToolbar="toggleToolbar"
			@send="sendPublicMessage"
			@clickTime="showTimePanel = true"
			@clickLocation="showLocationPanel = true"
			@sleepTimeChange="handleSceneSleepTimeChange"
			@clickCamera="showSceneUnavailableActionToast('摄影')"
			@clickStealthCamera="showSceneUnavailableActionToast('偷拍')"
			@clickGroupCamera="showSceneUnavailableActionToast('合拍')"
			@clickGodView="showSceneUnavailableActionToast('上帝视角')"
			@clickContinue="continueSceneConversation"
			@toggleThought="toggleThought"
		/>

		<ChatModals
			:visibleModal="activeModal"
			:locationList="sceneLocationList"
			:currentRole="sceneHostResident || {}"
			v-model:tempDateStr="tempDateStr"
			v-model:tempTimeStr="tempTimeStr"
			v-model:tempTimeRatio="tempTimeRatio"
			@close="closeModal"
			@timeSkip="handleSceneTimeSkip"
			@confirmTime="handleConfirmManualTime"
			@moveTo="handleSceneMoveTo"
		/>

		<ContainerPanel
			:visible="showContainerPanel"
			:containerName="activeContainerName"
			:economy="sceneHostResident?.economy"
			@close="showContainerPanel = false"
			@transfer="handleTransferItem"
			@use="handleUseItem"
		/>

		<view v-if="showUseModal" class="custom-modal-mask" @click="showUseModal = false">
			<view class="custom-modal" @click.stop>
				<text class="modal-title">拿起「{{ pendingUseItem?.item?.name }}」</text>
				<text class="modal-desc">请描述你打算怎么使用它，这段描述会直接作为现场公开动作发出去。</text>
				<textarea
					v-model="useItemAction"
					class="modal-textarea"
					placeholder="例如：把刚买的点心放到桌上，请大家一起尝尝。"
				></textarea>
				<view class="modal-btns">
					<button class="btn-cancel" @click="showUseModal = false">取消</button>
					<button class="btn-confirm" @click="confirmUseItem">执行动作</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
	import { computed, nextTick, ref, watch } from 'vue';
	import { onHide, onLoad, onNavigationBarButtonTap, onShow, onUnload } from '@dcloudio/uni-app';
	import ChatFooter from '@/components/ChatFooter.vue';
	import ChatHeader from '@/components/ChatHeader.vue';
	import ChatMessageItem from '@/components/ChatMessageItem.vue';
	import ChatModals from '@/components/ChatModals.vue';
	import ContainerPanel from '@/components/ContainerPanel.vue';
	import ShopPanel from '@/components/ShopPanel.vue';
	import { useGameTime } from '@/composables/useGameTime.js';
	import { useTheme } from '@/composables/useTheme.js';
	import { characterService } from '@/services/characterService.js';
	import { messageService } from '@/services/messageService.js';
	import { useTownStore } from '@/stores/useTownStore.js';
	import { buildTownSceneViewModel } from '@/utils/town/town-shell-view-models.js';
	import {
		buildSceneAmbientEventMessages,
		extractVisibleSceneMessages,
		mergeRenderableSceneMessages
	} from '@/utils/town/town-scene-chat.js';
	import {
		buildResidentEncounterChatUrl,
		buildResidentActivityJoinChatUrl,
		buildResidentSceneUrl,
		buildSceneEditorUrl,
		buildScenePublicChatId
	} from '@/utils/town/town-entry-links.js';
	import { resolvePlayerResidenceLocationId } from '@/utils/town/town-location-access.js';
	import {
		buildWorldLocationOptions,
		findTownSnapshotResident,
		selectLocationState,
		selectPlayerAccessForLocation
	} from '@/utils/town/town-view-models.js';

	const { isDarkMode } = useTheme();
	const townStore = useTownStore();

	const worldId = ref('');
	const locationName = ref('');
	const sceneDraft = ref('');
	const sceneWakeTime = ref('08:00');
	const sceneMessages = ref([]);
	const sceneScrollIntoView = ref('');
	const scenePlayerRoom = ref('');
	const isSendingPublicMessage = ref(false);
	const isToolbarOpen = ref(false);
	const showShopPanel = ref(false);
	const showLocationPanel = ref(false);
	const showContainerPanel = ref(false);
	const activeContainerName = ref('');
	const showUseModal = ref(false);
	const pendingUseItem = ref(null);
	const useItemAction = ref('');
	const showThought = ref(uni.getStorageSync('setting_show_thought') === true);

	const currentWorld = computed(() => (
		townStore.worldTemplates.find((item) => String(item.id) === String(worldId.value)) || null
	));

	const sceneViewModel = computed(() => buildTownSceneViewModel({
		townSnapshot: townStore.activeTownSnapshot,
		locationName: locationName.value
	}));
	const currentSceneLocationId = computed(() => (
		String(sceneViewModel.value.header?.locationId || '').trim()
	));
	const presentCharacters = computed(() => sceneViewModel.value.residentEntries || []);
	const sceneResidentsForVisibility = computed(() => {
		const resolvedResidents = [];
		const seenResidentIds = new Set();
		const snapshot = townStore.activeTownSnapshot;

		const appendResident = (resident) => {
			const residentId = String(resident?.id || '').trim();
			if (!residentId || seenResidentIds.has(residentId)) {
				return;
			}

			seenResidentIds.add(residentId);
			resolvedResidents.push(findTownSnapshotResident(snapshot, residentId) || resident);
		};

		appendResident(sceneViewModel.value.hostResident);
		presentCharacters.value.forEach((resident) => appendResident(resident));
		return resolvedResidents;
	});

	const {
		currentTime,
		formattedTime,
		tempDateStr,
		tempTimeStr,
		tempTimeRatio,
		customMinutes,
		showTimePanel,
		showTimeSettingPanel,
		startTimeFlow,
		stopTimeFlow,
		handleTimeSkip,
		confirmManualTime: baseConfirmManualTime
	} = useGameTime(() => {});

	const timeParts = computed(() => {
		if (!formattedTime.value) {
			return { week: '--', time: '--:--' };
		}

		const parts = formattedTime.value.split(' ');
		return {
			week: parts[0] || '',
			time: parts[1] || '--:--'
		};
	});

	const sceneIsResidence = computed(() => Boolean(sceneViewModel.value.header?.isPrivateResidence));
	const sceneHostResidentId = computed(() => String(sceneViewModel.value.hostResidentId || '').trim());
	const sceneHostResident = computed(() => sceneViewModel.value.hostResident || null);
	const sceneResidenceRooms = computed(() => (
		Array.isArray(sceneViewModel.value.residenceRooms) ? sceneViewModel.value.residenceRooms : []
	));

	const sceneStageModeLabel = computed(() => (
		sceneIsResidence.value ? '住处场景' : '现场公共聊天'
	));
	const sceneHeaderLocation = computed(() => (
		locationName.value || sceneViewModel.value.header.locationName || '当前场景'
	));
	const scenePlayerLocation = computed(() => (
		scenePlayerRoom.value || sceneHeaderLocation.value
	));

	const sceneHeaderActivity = computed(() => {
		if (scenePlayerRoom.value) {
			return '正在 ' + scenePlayerRoom.value + ' 活动';
		}
		if (sceneHostResident.value?.townRuntime?.currentAction || sceneHostResident.value?.currentAction) {
			return sceneHostResident.value.townRuntime?.currentAction || sceneHostResident.value.currentAction;
		}
		if (presentCharacters.value.length > 0) {
			return '和 ' + presentCharacters.value.length + ' 位居民待在这里';
		}
		return '先观察这里的气氛';
	});

	const sceneWallet = computed(() => {
		const economy = sceneHostResident.value?.economy || null;
		if (!economy) return 0;
		if (economy.isSharedWallet) {
			return (Number(economy.userWallet) || 0) + (Number(economy.charWallet) || 0);
		}
		return economy.userWallet !== undefined
			? Number(economy.userWallet) || 0
			: (Number(economy.wallet) || 0);
	});

	const playerResidenceLocation = computed(() => {
		const worldTemplate = townStore.activeWorld || currentWorld.value || {};
		const residenceLocationId = resolvePlayerResidenceLocationId(worldTemplate);
		if (!residenceLocationId) return null;

		const locationState = selectLocationState(townStore.activeTownSnapshot, residenceLocationId);
		if (locationState?.locationId) {
			return {
				id: locationState.locationId,
				name: locationState.locationName
			};
		}

		return (worldTemplate.locations || []).find(
			(item) => String(item.id || '').trim() === String(residenceLocationId).trim()
		) || null;
	});

	const sceneLocationList = computed(() => {
		const list = [];
		const seen = new Set();
		const currentWorldTemplate = townStore.activeWorld || currentWorld.value || {};

		sceneResidenceRooms.value.forEach((roomName) => {
			const safeRoomName = String(roomName || '').trim();
			if (!safeRoomName) return;
			const key = `room:${safeRoomName}`;
			if (safeRoomName === scenePlayerLocation.value || seen.has(key)) return;
			seen.add(key);
			list.push({
				name: safeRoomName,
				detail: sceneHeaderLocation.value,
				type: 'room',
				icon: '🚪',
				style: 'background-color:#e8f5e9; color:#2e7d32; border:1px solid #c8e6c9;'
			});
		});

		const topLevelLocations = [
			playerResidenceLocation.value
				? {
					name: playerResidenceLocation.value.name || '',
					type: 'scene',
					icon: '🏠',
					style: 'background-color:#fff0f5; color:#d81b60; border:1px solid #ffcdd2;'
				}
				: null,
			...buildWorldLocationOptions(currentWorldTemplate).map((item) => ({
				...item,
				type: 'scene',
				style: 'background-color:#f5f5f5; color:#333; border:1px solid #eee;'
			}))
		].filter(Boolean);

		topLevelLocations.forEach((item) => {
			const safeName = String(item.name || '').trim();
			if (!safeName || safeName === sceneHeaderLocation.value) return;
			const key = `scene:${safeName}`;
			if (seen.has(key)) return;
			seen.add(key);
			list.push(item);
		});

		return list;
	});

	const sceneChatId = computed(() => buildScenePublicChatId({
		worldId: worldId.value || townStore.activeWorldId || '',
		locationId: currentSceneLocationId.value || locationName.value || ''
	}));
	const visibleSceneMessages = computed(() => extractVisibleSceneMessages(sceneMessages.value || []));
	const sceneAmbientMessages = computed(() => {
		const activeWorld = townStore.activeWorld || currentWorld.value || {};
		const conversationVisibility = activeWorld.worldConversationVisibility || {};
		const safeLocationName = String(sceneHeaderLocation.value || '').trim();

		if (!safeLocationName) {
			return [];
		}

		return buildSceneAmbientEventMessages(
			(townStore.activeTownSnapshot?.townEvents || []).filter((event) => (
				String(event?.locationName || '').trim() === safeLocationName
			)),
			{
				...conversationVisibility,
				residents: sceneResidentsForVisibility.value
			}
		);
	});
	const sceneRenderableMessages = computed(() => (
		mergeRenderableSceneMessages(
			sceneMessages.value || [],
			sceneAmbientMessages.value
		).map((message, index) => ({
			...message,
			id: message.id || `scene-public-${index}`,
			type: message.isSystem ? (message.type || 'text') : 'text'
		}))
	));

	const canSendPublicMessage = computed(() => (
		sceneDraft.value.trim().length > 0
		&& presentCharacters.value.length > 0
		&& !isSendingPublicMessage.value
	));

	const activeModal = computed(() => {
		if (showTimePanel.value) return 'timeSkip';
		if (showTimeSettingPanel.value) return 'timeSetting';
		if (showLocationPanel.value) return 'location';
		return '';
	});

	watch(
		() => `${sceneHostResidentId.value}::${sceneResidenceRooms.value.join('|')}::${sceneIsResidence.value}::${sceneHeaderLocation.value}`,
		() => {
			if (!sceneIsResidence.value || sceneResidenceRooms.value.length === 0) {
				scenePlayerRoom.value = '';
				return;
			}

			if (!sceneResidenceRooms.value.includes(scenePlayerRoom.value)) {
				scenePlayerRoom.value = sceneResidenceRooms.value.includes('客厅')
					? '客厅'
					: sceneResidenceRooms.value[0];
			}
		},
		{ immediate: true }
	);

	watch(() => sceneChatId.value, async () => {
		await loadSceneMessages();
	});

	watch(() => sceneRenderableMessages.value.length, () => {
		scrollSceneToBottom();
	});

	onLoad((options = {}) => {
		worldId.value = decodeURIComponent(options.worldId || '');
		locationName.value = decodeURIComponent(options.location || '');
	});

	onNavigationBarButtonTap((event) => {
		if (event.key === 'setting') {
			openSceneEditor();
		}
	});

	onShow(async () => {
		await townStore.initialize();
		if (!worldId.value) {
			worldId.value = townStore.activeWorldId || '';
		}
		if (worldId.value && String(townStore.activeWorldId) !== String(worldId.value)) {
			await townStore.setActiveWorld(worldId.value);
		}
		if (!ensureSceneAccess()) return;
		townStore.ensureClockRunning(async () => {
			await reloadSceneMessages();
		});
		await loadSceneMessages();
	});

	onHide(() => {
		townStore.stopClock();
	});

	onUnload(() => {
		townStore.stopClock();
	});

	function isHostResident(char = {}) {
		return String(char.id || '').trim() === sceneHostResidentId.value;
	}

	function ensureSceneAccess() {
		if (!sceneIsResidence.value) {
			return true;
		}

		if (sceneViewModel.value.header?.canPlayerEnter) {
			return true;
		}

		uni.showToast({
			title: '这是私人住处，先获得住户同意再来吧',
			icon: 'none'
		});
		setTimeout(() => {
			uni.navigateBack();
		}, 300);
		return false;
	}

	function scrollSceneToBottom() {
		nextTick(() => {
			sceneScrollIntoView.value = '';
			setTimeout(() => {
				sceneScrollIntoView.value = 'scene-shell-bottom';
			}, 30);
		});
		void startTimeFlow();
	}

	function focusResidentPresence() {
		nextTick(() => {
			sceneScrollIntoView.value = '';
			setTimeout(() => {
				sceneScrollIntoView.value = 'scene-presence-top';
			}, 30);
		});
	}

	async function loadSceneMessages() {
		if (!sceneChatId.value) {
			sceneMessages.value = [];
			return;
		}

		sceneMessages.value = await messageService.getMessages(sceneChatId.value);
		scrollSceneToBottom();
	}

	let reloadCount = 0;
	async function reloadSceneMessages() {
		if (!sceneChatId.value) return;
		const fresh = await messageService.getMessages(sceneChatId.value);
		if (fresh.length !== sceneMessages.value.length) {
			sceneMessages.value = fresh;
		}
	}

	function toggleToolbar() {
		isToolbarOpen.value = !isToolbarOpen.value;
	}

	function toggleThought() {
		showThought.value = !showThought.value;
		uni.setStorageSync('setting_show_thought', showThought.value);
		uni.showToast({
			title: showThought.value ? '已展开现场线索' : '已收起现场线索',
			icon: 'none'
		});
		void startTimeFlow();
	}

	function handleOpenContainer(containerName = '') {
		if (!containerName) return;
		activeContainerName.value = containerName;
		showContainerPanel.value = true;
	}

	function cloneSceneEconomy(economy = {}) {
		const containers = {};
		Object.entries(economy.containers || {}).forEach(([roomName, roomContainers]) => {
			containers[roomName] = {};
			Object.entries(roomContainers || {}).forEach(([containerName, items]) => {
				containers[roomName][containerName] = Array.isArray(items)
					? items.map((entry) => ({ ...entry }))
					: [];
			});
		});

		return {
			...economy,
			wallet: Number(economy.wallet) || 0,
			userWallet: economy.userWallet !== undefined ? Number(economy.userWallet) || 0 : economy.userWallet,
			charWallet: economy.charWallet !== undefined ? Number(economy.charWallet) || 0 : economy.charWallet,
			courierBox: Array.isArray(economy.courierBox)
				? economy.courierBox.map((entry) => ({ ...entry }))
				: [],
			containers
		};
	}

	async function saveSceneResidentEconomy(nextEconomy = {}) {
		const hostResident = sceneHostResident.value;
		if (!hostResident?.id) return false;

		const saveSuccess = await characterService.saveCharacter({
			...hostResident,
			economy: nextEconomy
		});
		if (saveSuccess === false) return false;

		await townStore.refreshActiveWorldSnapshot();
		return true;
	}

	function findSceneContainerItemContext(itemId = '', containerName = '') {
		const containers = sceneHostResident.value?.economy?.containers || {};
		for (const [roomName, roomContainers] of Object.entries(containers)) {
			const roomItems = Array.isArray(roomContainers?.[containerName]) ? roomContainers[containerName] : [];
			const itemIndex = roomItems.findIndex(
				(entry) => String(entry.id || '').trim() === String(itemId || '').trim()
			);
			if (itemIndex > -1) {
				return { roomName, itemIndex };
			}
		}
		return null;
	}

	function openSceneShop() {
		if (!sceneHostResident.value?.economy) {
			uni.showToast({
				title: '这里暂时没有可用的生活入口',
				icon: 'none'
			});
			return;
		}
		showShopPanel.value = true;
	}

	async function handleBuyItem(item = {}) {
		const hostResident = sceneHostResident.value;
		if (!hostResident?.id || !hostResident.economy) {
			uni.showToast({
				title: '当前还没有可承接购买的角色',
				icon: 'none'
			});
			return;
		}

		const price = Number(item.price) || 0;
		if (sceneWallet.value < price) {
			uni.showToast({
				title: '余额不足',
				icon: 'none'
			});
			return;
		}

		const nextEconomy = cloneSceneEconomy(hostResident.economy || {});
		if (nextEconomy.isSharedWallet) {
			let remainCost = price;
			const safeUserWallet = Number(nextEconomy.userWallet) || 0;
			const safeCharWallet = Number(nextEconomy.charWallet) || 0;

			if (safeUserWallet >= remainCost) {
				nextEconomy.userWallet = safeUserWallet - remainCost;
				nextEconomy.charWallet = safeCharWallet;
			} else {
				remainCost -= safeUserWallet;
				nextEconomy.userWallet = 0;
				nextEconomy.charWallet = Math.max(0, safeCharWallet - remainCost);
			}
		} else if (nextEconomy.userWallet !== undefined) {
			nextEconomy.userWallet = Math.max(0, (Number(nextEconomy.userWallet) || 0) - price);
		} else {
			nextEconomy.wallet = Math.max(0, (Number(nextEconomy.wallet) || 0) - price);
		}

		nextEconomy.wallet = nextEconomy.isSharedWallet
			? (Number(nextEconomy.userWallet) || 0) + (Number(nextEconomy.charWallet) || 0)
			: (nextEconomy.userWallet !== undefined
				? (Number(nextEconomy.userWallet) || 0)
				: (Number(nextEconomy.wallet) || 0));
		nextEconomy.courierBox = Array.isArray(nextEconomy.courierBox) ? nextEconomy.courierBox : [];
		nextEconomy.courierBox.push({
			id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
			name: item.name,
			icon: item.icon,
			type: item.type,
			desc: item.desc,
			maxUses: item.maxUses || 1,
			usesLeft: item.maxUses || 1
		});

		const saved = await saveSceneResidentEconomy(nextEconomy);
		if (!saved) {
			uni.showToast({
				title: '购买失败，请稍后再试',
				icon: 'none'
			});
			return;
		}

		uni.showToast({
			title: `已购买${item.name || '物品'}，送到快递箱里`,
			icon: 'none',
			duration: 2400
		});
	}

	async function handleTransferItem({ item, targetContainer, roomName } = {}) {
		const hostResident = sceneHostResident.value;
		if (!hostResident?.id || !hostResident.economy) {
			uni.showToast({
				title: '当前还没有可操作的收纳',
				icon: 'none'
			});
			return;
		}
		if (!item?.id || !targetContainer || !roomName) {
			uni.showToast({
				title: '这次收纳信息不完整',
				icon: 'none'
			});
			return;
		}

		const nextEconomy = cloneSceneEconomy(hostResident.economy || {});
		const courierBox = Array.isArray(nextEconomy.courierBox) ? nextEconomy.courierBox : [];
		const itemIndex = courierBox.findIndex(
			(entry) => String(entry.id || '').trim() === String(item.id || '').trim()
		);
		if (itemIndex < 0) {
			uni.showToast({
				title: '这个物品已经不在快递箱里了',
				icon: 'none'
			});
			return;
		}

		const [pickedItem] = courierBox.splice(itemIndex, 1);
		nextEconomy.courierBox = courierBox;
		if (!nextEconomy.containers[roomName]) {
			nextEconomy.containers[roomName] = {};
		}

		let successTitle = '';
		if (targetContainer === 'NEW_FURNITURE') {
			if (!nextEconomy.containers[roomName][pickedItem.name]) {
				nextEconomy.containers[roomName][pickedItem.name] = [];
			}
			successTitle = `已把${pickedItem.name}布置在${roomName}`;
		} else {
			if (!Array.isArray(nextEconomy.containers[roomName][targetContainer])) {
				nextEconomy.containers[roomName][targetContainer] = [];
			}
			nextEconomy.containers[roomName][targetContainer].push(pickedItem);
			successTitle = `已收纳到${targetContainer}`;
		}

		const saved = await saveSceneResidentEconomy(nextEconomy);
		if (!saved) {
			uni.showToast({
				title: '收纳失败，请稍后再试',
				icon: 'none'
			});
			return;
		}

		uni.showToast({
			title: successTitle,
			icon: 'none'
		});
	}

	function handleUseItem(item, containerName = '') {
		if (!item?.id || !containerName) {
			uni.showToast({
				title: '这个物品暂时还拿不出来',
				icon: 'none'
			});
			return;
		}

		const context = findSceneContainerItemContext(item.id, containerName);
		if (!context) {
			uni.showToast({
				title: '没找到这个物品现在放在哪',
				icon: 'none'
			});
			return;
		}

		pendingUseItem.value = {
			item,
			containerName,
			roomName: context.roomName
		};
		useItemAction.value = '';
		showContainerPanel.value = false;
		showUseModal.value = true;
	}

	async function confirmUseItem() {
		const safeAction = String(useItemAction.value || '').trim();
		if (!safeAction) {
			uni.showToast({
				title: '请描述你的动作',
				icon: 'none'
			});
			return;
		}

		const hostResident = sceneHostResident.value;
		if (!hostResident?.id || !hostResident.economy || !pendingUseItem.value?.item) {
			uni.showToast({
				title: '这次动作没有接住，请重新试一下',
				icon: 'none'
			});
			return;
		}

		const { item, containerName, roomName } = pendingUseItem.value;
		const nextEconomy = cloneSceneEconomy(hostResident.economy || {});
		const roomContainers = nextEconomy.containers[roomName] || {};
		const containerItems = Array.isArray(roomContainers[containerName]) ? [...roomContainers[containerName]] : [];
		const itemIndex = containerItems.findIndex(
			(entry) => String(entry.id || '').trim() === String(item.id || '').trim()
		);
		if (itemIndex < 0) {
			uni.showToast({
				title: '这个物品刚刚已经被拿走了',
				icon: 'none'
			});
			return;
		}

		const targetItem = { ...containerItems[itemIndex] };
		const maxUses = Number(targetItem.maxUses) || 1;
		const usesLeft = targetItem.usesLeft === undefined
			? maxUses
			: Math.max(0, Number(targetItem.usesLeft) || 0);

		if (usesLeft <= 1) {
			containerItems.splice(itemIndex, 1);
		} else {
			containerItems[itemIndex] = {
				...targetItem,
				usesLeft: usesLeft - 1
			};
		}

		nextEconomy.containers[roomName] = {
			...roomContainers,
			[containerName]: containerItems
		};

		const saved = await saveSceneResidentEconomy(nextEconomy);
		if (!saved) {
			uni.showToast({
				title: '动作没能落到物品上，请稍后再试',
				icon: 'none'
			});
			return;
		}

		const actionMessage = `我从${containerName}拿出${item.name}，${safeAction}`;
		showUseModal.value = false;
		pendingUseItem.value = null;
		useItemAction.value = '';
		await sendPublicMessage(actionMessage);
	}

	function closeModal() {
		showTimePanel.value = false;
		showTimeSettingPanel.value = false;
		showLocationPanel.value = false;
	}

	function openSceneEditor() {
		const targetWorldId = worldId.value || townStore.activeWorldId || '';
		const targetLocationId = currentSceneLocationId.value || '';
		const targetLocationName = sceneHeaderLocation.value || locationName.value || '';

		if (!targetWorldId || !targetLocationName) {
			uni.showToast({
				title: '当前场景还没准备好',
				icon: 'none'
			});
			return;
		}

		uni.navigateTo({
			url: buildSceneEditorUrl({
				worldId: targetWorldId,
				locationId: targetLocationId,
				locationName: targetLocationName
			})
		});
	}

	async function refreshSceneAfterTimeChange() {
		if (!ensureSceneAccess()) return;
		await loadSceneMessages();
	}

	async function handleSceneTimeSkip(type, nextCustomMinutes = '') {
		if (type === 'custom') {
			customMinutes.value = nextCustomMinutes;
		}
		const result = await handleTimeSkip(type, null, scrollSceneToBottom);
		if (result === false) return;
		await refreshSceneAfterTimeChange();
	}

	async function handleSceneSleepTimeChange(event) {
		const selectedTime = String(event?.detail?.value || '').trim();
		if (!selectedTime) return;
		if (isSendingPublicMessage.value) {
			uni.showToast({
				title: '现场回应还没结束',
				icon: 'none'
			});
			return;
		}

		sceneWakeTime.value = selectedTime;
		const [hour, minute] = selectedTime.split(':').map((value) => Number(value) || 0);
		const targetDate = new Date(currentTime.value);
		targetDate.setHours(hour, minute, 0, 0);
		if (targetDate.getTime() <= currentTime.value) {
			targetDate.setDate(targetDate.getDate() + 1);
		}

		stopTimeFlow();
		await townStore.advanceTimeTo(targetDate.getTime());
		await refreshSceneAfterTimeChange();
		uni.showToast({
			title: `已休息到 ${selectedTime}`,
			icon: 'none'
		});
		void startTimeFlow();
	}

	async function handleConfirmManualTime() {
		const nextTimestamp = await baseConfirmManualTime();
		if (!nextTimestamp) return;
		await refreshSceneAfterTimeChange();
	}

	function showSceneUnavailableActionToast(label = '') {
		uni.showToast({
			title: (label || '这个') + '功能还没接进现场页',
			icon: 'none'
		});
	}

	function handleSceneMoveTo(locObj = {}) {
		if (isSendingPublicMessage.value) {
			uni.showToast({
				title: '现场回应还没结束',
				icon: 'none'
			});
			return;
		}

		const targetName = String(locObj?.name || '').trim();
		if (String(locObj?.type || '').trim() === 'custom' && !targetName) {
			uni.showToast({
				title: '请输入地点',
				icon: 'none'
			});
			return;
		}

		if (String(locObj?.type || '').trim() === 'room') {
			if (!sceneIsResidence.value) {
				uni.showToast({
					title: '这里只能切换场景，不能切换房间',
					icon: 'none'
				});
				return;
			}
			if (!sceneResidenceRooms.value.includes(targetName)) {
				uni.showToast({
					title: '这个房间现在还去不了',
					icon: 'none'
				});
				return;
			}

			scenePlayerRoom.value = targetName;
			showLocationPanel.value = false;
			uni.showToast({
				title: '已移动到 ' + targetName,
				icon: 'none'
			});
			return;
		}

		if (!targetName) {
			uni.showToast({
				title: '无效地点',
				icon: 'none'
			});
			return;
		}

		const worldTemplate = townStore.activeWorld || currentWorld.value || {};
		const targetLocationState = selectLocationState(townStore.activeTownSnapshot, targetName);
		const runtimeLocation = (worldTemplate.locations || []).find(
			(item) => String(item?.name || '').trim() === targetName
		) || null;
		const targetLocationId = String(targetLocationState?.locationId || runtimeLocation?.id || '').trim();
		const targetAccessState = targetLocationId
			? selectPlayerAccessForLocation(townStore.activeTownSnapshot, targetLocationId)
			: null;

		if (targetAccessState?.isPrivateResidence && !targetAccessState.canPlayerEnter) {
			showLocationPanel.value = false;
			uni.showToast({
				title: '还没获得住户同意，不能直接去这里',
				icon: 'none'
			});
			return;
		}

		showLocationPanel.value = false;
		scenePlayerRoom.value = '';
		if (targetName === sceneHeaderLocation.value) {
			scrollSceneToBottom();
			return;
		}

		uni.redirectTo({
			url: buildResidentSceneUrl({
				worldId: worldId.value || townStore.activeWorldId || '',
				locationName: targetName
			})
		});
	}

	async function continueSceneConversation() {
		if (isSendingPublicMessage.value) return;
		if (sceneDraft.value.trim()) {
			await sendPublicMessage();
			return;
		}
		if (sceneRenderableMessages.value.length === 0) {
			uni.showToast({
				title: '先抛个话题，再让现场接话',
				icon: 'none'
			});
			return;
		}
		await sendPublicMessage('你们接着刚才的话继续聊吧。');
	}

	async function sendPublicMessage(contentOverride = '') {
		const userContent = String(contentOverride || sceneDraft.value || '').trim();
		if (!userContent) {
			uni.showToast({
				title: '先说点什么吧',
				icon: 'none'
			});
			return;
		}
		if (presentCharacters.value.length === 0) {
			uni.showToast({
				title: '这里暂时没人能接你的话',
				icon: 'none'
			});
			return;
		}
		if (!sceneChatId.value) {
			uni.showToast({
				title: '这个场景暂时还没准备好',
				icon: 'none'
			});
			return;
		}
		if (isSendingPublicMessage.value) return;

		const previousDraft = sceneDraft.value;
		sceneDraft.value = '';
		isSendingPublicMessage.value = true;

		try {
			const result = await townStore.createScenePublicChatTurn({
				locationId: currentSceneLocationId.value || locationName.value || '',
				locationName: sceneHeaderLocation.value,
				userContent
			});

			if (!result?.created) {
				sceneDraft.value = previousDraft;
				const errorTitleMap = {
					missing_model_config: '先配置模型，再让现场开口',
					no_present_residents: '这里暂时没人回应',
					invalid_input: '这句话还没发出去'
				};
				uni.showToast({
					title: errorTitleMap[result?.errorCode] || '现场聊天发送失败',
					icon: 'none'
				});
				return;
			}

			await loadSceneMessages();
		} catch (error) {
			console.error('[scene] failed to create public chat turn', error);
			sceneDraft.value = previousDraft;
			uni.showToast({
				title: '现场聊天发送失败',
				icon: 'none'
			});
		} finally {
			isSendingPublicMessage.value = false;
		}
	}

	function openResidentChat(char = {}) {
		const residentId = String(char.id || '').trim();
		if (!residentId) return;

		uni.navigateTo({
			url: buildResidentEncounterChatUrl({
				residentId,
				residentName: char.name || '',
				sceneName: sceneHeaderLocation.value
			})
		});
	}

	function joinSceneActivity(action = {}) {
		const residentId = String(action.residentId || '').trim();
		if (!residentId) {
			uni.showToast({
				title: '这次现场还没有明确主角',
				icon: 'none'
			});
			return;
		}

		uni.navigateTo({
			url: buildResidentActivityJoinChatUrl({
				residentId,
				residentName: action.residentName || '',
				locationId: action.locationId || currentSceneLocationId.value || '',
				locationName: action.locationName || sceneHeaderLocation.value,
				currentAction: action.currentAction || ''
			})
		});
	}
</script>

<style lang="scss" scoped>
	.chat-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: var(--bg-color);
		overflow: hidden;
	}

	.chat-scroll {
		flex: 1;
		overflow: hidden;
	}

	.chat-content {
		padding: 20rpx;
		padding-bottom: 240rpx;
		display: flex;
		flex-direction: column;
		gap: 24rpx;
	}

	.scene-presence-strip {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
		padding: 6rpx 0 2rpx;
	}

	.scene-presence-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16rpx;
	}

	.scene-presence-copy {
		display: flex;
		flex-direction: column;
		gap: 8rpx;
		min-width: 0;
	}

	.scene-presence-title {
		font-size: 36rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.scene-presence-meta {
		font-size: 22rpx;
		color: #1865ce;
	}

	.scene-presence-summary {
		max-width: 320rpx;
		font-size: 22rpx;
		line-height: 1.6;
		color: var(--text-sub);
		text-align: right;
	}

	.scene-focus-card {
		display: flex;
		flex-direction: column;
		gap: 8rpx;
		padding: 20rpx 22rpx;
		border-radius: 22rpx;
		background: linear-gradient(135deg, rgba(24, 101, 206, 0.1), rgba(255, 255, 255, 0.9));
		border: 1px solid rgba(24, 101, 206, 0.14);
	}

	.scene-focus-badge {
		font-size: 20rpx;
		font-weight: 700;
		color: #1865ce;
	}

	.scene-focus-summary {
		font-size: 24rpx;
		line-height: 1.7;
		color: var(--text-color);
	}

	.scene-presence-empty {
		display: flex;
		flex-direction: column;
		gap: 10rpx;
		padding: 22rpx;
		border-radius: 22rpx;
		background: rgba(255, 255, 255, 0.72);
	}

	.scene-presence-empty-title {
		font-size: 26rpx;
		font-weight: 600;
		color: var(--text-color);
	}

	.scene-presence-empty-desc {
		font-size: 22rpx;
		line-height: 1.6;
		color: var(--text-sub);
	}

	.scene-presence-avatar-list {
		width: 100%;
		white-space: nowrap;
	}

	.scene-presence-avatar-row {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}

	.scene-presence-card {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 14rpx;
		padding: 16rpx 18rpx;
		border-radius: 28rpx;
		background: var(--card-bg);
		border: 1px solid var(--border-color);
		box-sizing: border-box;
		min-width: 320rpx;
	}

	.scene-presence-card:active {
		transform: translateY(2rpx);
	}

	.scene-presence-card--host {
		border-color: rgba(24, 101, 206, 0.24);
		background: rgba(24, 101, 206, 0.08);
	}

	.scene-presence-avatar {
		width: 92rpx;
		height: 92rpx;
		border-radius: 50%;
		background: var(--border-color);
	}

	.scene-presence-info {
		display: flex;
		flex-direction: column;
		gap: 6rpx;
		min-width: 0;
	}

	.scene-presence-name {
		display: block;
		font-size: 24rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.scene-presence-action {
		display: block;
		font-size: 22rpx;
		line-height: 1.5;
		color: var(--text-sub);
	}

	.scene-presence-action-label {
		font-size: 20rpx;
		font-weight: 600;
		color: #1865ce;
	}

	.scene-join-card {
		display: flex;
		flex-direction: column;
		gap: 10rpx;
		padding: 22rpx;
		border-radius: 22rpx;
		background: linear-gradient(135deg, rgba(255, 232, 200, 0.72), rgba(255, 246, 233, 0.94));
	}

	.scene-join-card:active {
		transform: translateY(2rpx);
	}

	.scene-join-title {
		font-size: 26rpx;
		font-weight: 700;
		color: #5a3a12;
	}

	.scene-join-desc {
		font-size: 22rpx;
		line-height: 1.6;
		color: #805829;
	}

	.system-tip {
		text-align: center;
		color: var(--text-sub);
		font-size: 24rpx;
	}

	.scene-event-feed {
		display: flex;
		flex-direction: column;
		gap: 14rpx;
	}

	.scene-event-item {
		padding: 20rpx 22rpx;
		border-radius: 22rpx;
		background: var(--card-bg);
		border: 1px solid var(--border-color);
	}

	.scene-event-title {
		display: block;
		font-size: 24rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.scene-event-summary {
		display: block;
		margin-top: 8rpx;
		font-size: 22rpx;
		line-height: 1.6;
		color: var(--text-sub);
	}

	.scene-event-reason {
		display: block;
		margin-top: 8rpx;
		font-size: 22rpx;
		line-height: 1.6;
		color: var(--text-color);
	}

	.scene-event-action {
		display: block;
		margin-top: 10rpx;
		font-size: 20rpx;
		font-weight: 700;
		color: #1865ce;
	}

	.scene-empty-card {
		padding: 24rpx;
		border-radius: 24rpx;
		background: var(--card-bg);
		border: 1px dashed var(--border-color);
	}

	.scene-empty-title {
		display: block;
		font-size: 28rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.scene-empty-desc {
		display: block;
		margin-top: 10rpx;
		font-size: 22rpx;
		line-height: 1.6;
		color: var(--text-sub);
	}

	.loading-wrapper {
		display: flex;
		justify-content: center;
		margin-bottom: 20rpx;
	}

	.loading-dots {
		padding: 10rpx 20rpx;
		border-radius: 999rpx;
		background: var(--pill-bg);
		color: var(--text-sub);
		font-weight: 600;
	}

	.custom-modal-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.6);
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.custom-modal {
		width: 80%;
		background: var(--card-bg);
		border-radius: 20rpx;
		padding: 40rpx;
		display: flex;
		flex-direction: column;
	}

	.modal-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #007aff;
		margin-bottom: 10rpx;
	}

	.modal-desc {
		font-size: 24rpx;
		color: var(--text-sub);
		margin-bottom: 20rpx;
	}

	.modal-textarea {
		width: 100%;
		height: 160rpx;
		background: var(--input-bg);
		border: 1px solid var(--border-color);
		border-radius: 12rpx;
		padding: 20rpx;
		font-size: 26rpx;
		box-sizing: border-box;
		margin-bottom: 30rpx;
		color: var(--text-color);
	}

	.modal-btns {
		display: flex;
		justify-content: space-between;
		gap: 20rpx;
	}

	.modal-btns button {
		flex: 1;
		height: 70rpx;
		line-height: 70rpx;
		font-size: 28rpx;
		border-radius: 35rpx;
		margin: 0;
	}

	.btn-cancel {
		background: var(--tool-bg);
		color: var(--text-color);
	}

	.btn-confirm {
		background: #007aff;
		color: #fff;
	}
</style>

