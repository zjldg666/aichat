<template>
	<view class="container" :class="{ 'dark-mode': isDarkMode }">
		<view class="custom-navbar">
			<view class="status-bar"></view>
			<view class="nav-content">
				<text class="page-title">小镇</text>
				<view class="add-btn" @click="createNewContact">
					<text class="add-icon">+</text>
				</view>
			</view>
		</view>
		<view class="nav-placeholder"></view>

		<view class="rpg-dashboard">
			<view v-if="townStore.isInitializing && !townStore.isReady" class="empty-tip">
				小镇正在准备中……
			</view>

			<view v-else-if="townStore.initializationError" class="empty-tip">
				小镇初始化失败，请稍后重试
			</view>

			<view v-else-if="worlds.length === 0" class="empty-tip">
				请先去“我的 -> 世界观设定”创建一个世界
			</view>

			<template v-else>
				<scroll-view scroll-x class="world-selector" :show-scrollbar="false">
					<view class="world-tabs-container">
						<view
							v-for="(w, idx) in worlds"
							:key="w.id"
							class="world-tab"
							:class="{ 'active-tab': activeWorldIndex === idx }"
							@click="selectWorld(idx)"
						>
							<text class="world-icon">世界</text>
							<text class="world-name">{{ w.name || '未命名世界' }}</text>
						</view>
					</view>
				</scroll-view>

				<view class="town-hero">
					<view class="hero-copy">
						<text class="hero-eyebrow">欢迎回来，{{ townOverview.player.name }}</text>
						<text class="hero-title">{{ townOverview.hero.worldName }}</text>
						<text class="hero-summary">{{ townOverview.player.identity }} 路 {{ townOverview.player.address }}</text>
					</view>
					<view class="hero-metrics">
						<view class="hero-metric">
							<text class="hero-metric-label">当前时间</text>
							<text class="hero-metric-value">{{ formattedTownTime }}</text>
						</view>
						<view class="hero-metric">
							<text class="hero-metric-label">镇上居民</text>
							<text class="hero-metric-value">{{ townOverview.hero.residentCount }}</text>
						</view>
						<view class="hero-metric">
							<text class="hero-metric-label">可去地点</text>
							<text class="hero-metric-value">{{ townOverview.hero.locationCount }}</text>
						</view>
						<view class="hero-metric">
							<text class="hero-metric-label">新鲜动静</text>
							<text class="hero-metric-value">{{ townOverview.hero.activeEventCount }}</text>
						</view>
					</view>
					<view class="hero-rail">
						<view class="hero-rail-item" v-for="item in townOverview.quickActions" :key="item.id">
							<text class="hero-rail-text">{{ item.label }}</text>
						</view>
					</view>
				</view>

				<view
					v-if="townOverview.observationFocus"
					class="town-focus-card"
					@click="followObservationFocus"
				>
					<view class="focus-card-header">
						<text class="focus-card-kicker">现在最值得先去</text>
						<text class="focus-card-badge">{{ townOverview.observationFocus.badgeLabel }}</text>
					</view>
					<text class="focus-card-title">{{ townOverview.observationFocus.title }}</text>
					<text class="focus-card-summary">{{ townOverview.observationFocus.summary }}</text>
					<text class="focus-card-action">{{ townOverview.observationFocus.actionLabel }}</text>
				</view>

				<view v-if="townOverview.eventFeed.length > 0" class="town-event-board">
					<view class="event-board-header">
						<text class="event-board-title">小镇刚刚发生</text>
						<text class="event-board-subtitle">顺着这些动静去找人</text>
					</view>
					<view
						class="event-item"
						:class="{ 'event-item--actionable': event.isActionable }"
						v-for="event in townOverview.eventFeed"
						:key="event.id"
						@click="followTownEvent(event)"
					>
						<text class="event-title">{{ event.title }}</text>
						<text class="event-summary">{{ event.summary }}</text>
						<text v-if="event.actionLabel" class="event-action">{{ event.actionLabel }}</text>
					</view>
				</view>

				<view v-if="townOverview.playerResidence" class="town-section">
					<view class="section-header">
						<text class="section-title">{{ townOverview.playerResidence.title }}</text>
					</view>
					<view
						class="overview-card player-residence-card"
						@click="goToScene(townOverview.playerResidence.locationName)"
					>
						<view class="overview-card-header">
							<text class="overview-card-title">{{ townOverview.playerResidence.locationName }}</text>
							<text class="overview-card-badge">{{ townOverview.playerResidence.badgeLabel }}</text>
						</view>
						<text class="overview-card-body">{{ townOverview.playerResidence.description }}</text>
						<text class="overview-card-foot">{{ townOverview.playerResidence.actionLabel }}</text>
					</view>
				</view>

				<view v-if="townOverview.publicLocationCards.length > 0" class="town-section">
					<view class="section-header">
						<text class="section-title">{{ publicLocationSectionLabel }}</text>
					</view>
					<view class="overview-grid">
						<view
							v-for="spot in townOverview.publicLocationCards"
							:key="spot.id"
							class="overview-card"
							@click="goToScene(spot.name)"
						>
							<view class="overview-card-header">
								<text class="overview-card-title">{{ spot.name }}</text>
								<text class="overview-card-badge">{{ spot.residentCount }} 人</text>
							</view>
							<text class="overview-card-body">
								{{ spot.reason || spot.atmosphere || '可以先过去看看今天的动静。' }}
							</text>
							<text class="overview-card-foot">{{ spot.actionLabel || '点击进入场景' }}</text>
						</view>
					</view>
				</view>

				<view v-if="townOverview.residentialZoneCards.length > 0" class="town-section">
					<view class="section-header">
						<text class="section-title">{{ residentialZoneSectionLabel }}</text>
					</view>
					<view class="overview-grid">
						<view
							v-for="zone in townOverview.residentialZoneCards"
							:key="zone.id"
							class="overview-card residence-card"
							:class="{
								'residence-card--expandable': zone.occupiedCount > 0,
								'residence-card--expanded': expandedResidenceZoneId === zone.id
							}"
							@click="toggleResidentialZone(zone)"
						>
							<view class="overview-card-header">
								<text class="overview-card-title">{{ zone.name }}</text>
								<text class="overview-card-badge">{{ zone.occupiedCount }} / {{ zone.unitCount }} 户</text>
							</view>
							<text class="overview-card-body">
								{{ zone.description || (zone.occupiedCount > 0 ? '点开后可以看到这里的住户。' : '暂时还没有人住在这里。') }}
							</text>
							<text class="overview-card-foot" v-if="zone.occupiedUnitLabels.length > 0">
								{{ zone.occupiedUnitLabels.join('、') }}
							</text>
							<text class="overview-card-foot" v-else>暂无住户</text>

							<view
								v-if="expandedResidenceZoneId === zone.id && zone.residents.length > 0"
								class="zone-resident-list"
								@click.stop
							>
								<view
									v-for="residentEntry in zone.residents"
									:key="residentEntry.residentId"
									class="zone-resident-item"
									@click.stop="visitResidenceResident(residentEntry)"
								>
									<view class="zone-resident-copy">
										<text class="zone-resident-name">{{ residentEntry.residentName }}</text>
										<text class="zone-resident-meta">
											{{ residentEntry.unitLabel }} · {{ residentEntry.isHomeNow ? '在家' : '不在家' }}
										</text>
									</view>
									<text class="zone-resident-action">
										{{ residentEntry.isHomeNow ? visitResidentActionLabel : '看看她在哪' }}
									</text>
								</view>
							</view>
						</view>
					</view>
				</view>
			</template>
		</view>

		<view class="phone-fab" @click="openPhoneSheet" v-if="remoteChatEnabled && townOverview.phoneContacts.length > 0">
			<text class="phone-fab-label">{{ remoteChatLabel }}</text>
			<view v-if="phoneUnreadReplyCount > 0" class="phone-fab-badge">
				<text class="phone-fab-badge-text">{{ phoneUnreadReplyCount }}</text>
			</view>
		</view>

		<view v-if="remoteChatEnabled && showPhoneSheet" class="overlay-mask" @click="closePhoneSheet">
			<view class="overlay-panel phone-sheet" @click.stop>
				<view class="overlay-header">
					<view>
						<text class="overlay-title">{{ phoneSheetTitle }}</text>
						<text class="overlay-subtitle">{{ phoneSheetSubtitle }}</text>
					</view>
					<text class="overlay-close" @click="closePhoneSheet">关闭</text>
				</view>
				<scroll-view scroll-y class="phone-contact-list">
					<view
						v-for="contact in townOverview.phoneContacts"
						:key="contact.residentId"
						class="phone-contact-item"
						@click="openPhoneChat(contact)"
					>
						<image
							:src="contact.avatar || '/static/ai-avatar.png'"
							mode="aspectFill"
							class="phone-contact-avatar"
						></image>
						<view class="phone-contact-copy">
							<view class="phone-contact-name-row">
								<text class="phone-contact-name">{{ contact.residentName }}</text>
								<text v-if="contact.hasUnreadReply" class="phone-contact-unread">未读 {{ contact.unreadCount }}</text>
							</view>
							<text v-if="contact.latestReplyPreview" class="phone-contact-preview">{{ contact.latestReplyPreview }}</text>
							<text class="phone-contact-meta">{{ contact.currentLocationName }}</text>
							<text class="phone-contact-meta">{{ contact.currentAction }}</text>
						</view>
						<view class="phone-contact-side">
							<text class="phone-contact-action">{{ contact.phoneChatLabel }}</text>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>

		<TownPhoneChatSheet
			:visible="showPhoneChatSheet"
			:resident="selectedPhoneResident"
			:player-name="townOverview.player.name || '玩家'"
			:town-time-text="formattedTownTime"
			:channel-label="remoteChatLabel"
			:entry-label="remoteChatEntryLabel"
			:thread-prefix="remoteChatThreadPrefix"
			@close="closePhoneChatSheet"
		/>

		<view v-if="showResidenceResidentSheet && selectedResidenceResident" class="overlay-mask" @click="closeResidenceResidentSheet">
			<view class="overlay-panel resident-sheet" @click.stop>
				<view class="resident-sheet-hero">
					<image
						:src="selectedResidenceResident.avatar || '/static/ai-avatar.png'"
						mode="aspectFill"
						class="resident-sheet-avatar"
					></image>
					<view class="resident-sheet-copy">
						<text class="overlay-title">{{ selectedResidenceResident.residentName }}</text>
						<text class="overlay-subtitle">{{ selectedResidenceResident.unitLabel }} 路 {{ selectedResidenceResident.residenceLocationName }}</text>
						<text class="resident-sheet-status">
							{{ selectedResidenceResident.isHomeNow ? '她现在在家，你可以先敲门看看她愿不愿意见你。' : '她现在不在家。' }}
						</text>
					</view>
				</view>
				<view class="resident-sheet-actions">
					<button class="sheet-secondary-btn" @click="closeResidenceResidentSheet">取消</button>
					<button class="sheet-primary-btn" :disabled="isKnocking" @click="knockResidenceDoor">
						{{ isKnocking ? '敲门中...' : (selectedResidenceResident.isHomeNow ? '敲门' : '上去看看') }}
					</button>
				</view>
			</view>
		</view>

		<TownDoorstepChatSheet
			:visible="showDoorstepChatSheet"
			:resident-name="doorstepResidentName"
			:residence-location-name="doorstepResidenceLocationName"
			:decision-label="doorstepDecisionLabel"
			:messages="doorstepMessages"
			:actions="doorstepActions"
			:panel-mode="doorstepPanelMode"
			:chat-draft="doorstepChatDraft"
			:leave-message-draft="doorstepLeaveMessageDraft"
			:schedule-options="doorstepScheduleOptions"
			:is-busy="isDoorstepBusy"
			:can-send="canSendDoorstepMessage"
			:can-submit-leave-message="canSubmitDoorstepLeaveMessage"
			:show-chat-input="showDoorstepChatInput"
			:can-enter-residence="canEnterDoorstepResidence"
			@close="closeDoorstepChatSheet"
			@send="handleDoorstepSend"
			@action="handleDoorstepSheetAction"
			@enter-scene="handleDoorstepEnterScene"
			@select-schedule="handleDoorstepScheduleSelect"
			@submit-leave-message="handleDoorstepLeaveMessageSubmit"
			@cancel-subpanel="cancelDoorstepSubpanel"
			@update:chatDraft="updateDoorstepChatDraft"
			@update:leaveMessageDraft="updateDoorstepLeaveMessageDraft"
		/>

		<CustomTabBar :current="0" />
	</view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onHide, onReady, onShow, onUnload } from '@dcloudio/uni-app';
import CustomTabBar from '@/components/CustomTabBar.vue';
import TownDoorstepChatSheet from '@/components/TownDoorstepChatSheet.vue';
import TownPhoneChatSheet from '@/components/TownPhoneChatSheet.vue';
import { useResidentDoorstepConversation } from '@/composables/useResidentDoorstepConversation.js';
import { useTownStore } from '@/stores/useTownStore.js';
import { useTheme } from '@/composables/useTheme.js';
import { buildTownOverviewViewModel } from '@/utils/town/town-shell-view-models.js';
import {
	buildResidentEncounterChatUrl,
	buildResidentSceneUrl
} from '@/utils/town/town-entry-links.js';
import { findTownSnapshotResident } from '@/utils/town/town-view-models.js';
import checkUpdate from '@/uni_modules/uni-upgrade-center-app/utils/check-update';

const townStore = useTownStore();
const activeWorldIndex = ref(0);
const expandedResidenceZoneId = ref('');
const showPhoneSheet = ref(false);
const showPhoneChatSheet = ref(false);
const selectedPhoneResident = ref(null);
const selectedResidenceResident = ref(null);
const showResidenceResidentSheet = ref(false);
const isKnocking = ref(false);
const { isDarkMode } = useTheme();
const worlds = computed(() => townStore.worldTemplates);

const currentWorld = computed(() => worlds.value[activeWorldIndex.value] || null);

const formattedTownTime = computed(() => {
	const date = new Date(townStore.currentTime);
	const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
	const day = weekDays[date.getDay()] || '';
	const hour = String(date.getHours()).padStart(2, '0');
	const minute = String(date.getMinutes()).padStart(2, '0');
	return `${day} ${hour}:${minute}`;
});

const townOverview = computed(() => buildTownOverviewViewModel({
	townSnapshot: townStore.activeTownSnapshot
}));
const overviewSemantics = computed(() => townOverview.value.semantics || {});
const publicLocationSectionLabel = computed(() => overviewSemantics.value.publicLocationLabel || '公共地点');
const residentialZoneSectionLabel = computed(() => overviewSemantics.value.residentialZoneLabel || '住宅区');
const residentLabel = computed(() => overviewSemantics.value.residentLabel || '居民');
const remoteChatEnabled = computed(() => overviewSemantics.value.remoteChatEnabled !== false);
const remoteChatLabel = computed(() => overviewSemantics.value.remoteChatLabel || '手机');
const remoteChatEntryLabel = computed(() => overviewSemantics.value.remoteChatEntryLabel || '手机聊天');
const remoteChatThreadPrefix = computed(() => overviewSemantics.value.remoteChatThreadPrefix || 'phone');
const phoneSheetTitle = computed(() => remoteChatEntryLabel.value || '通讯录');
const phoneSheetSubtitle = computed(() => `全部小镇${residentLabel.value}，点开后进入${remoteChatEntryLabel.value}`);
const visitActionLabel = computed(() => overviewSemantics.value.visitActionLabel || '拜访');
const visitResidentActionLabel = computed(() => (
	visitActionLabel.value === '拜访' ? '去拜访' : visitActionLabel.value
));
const phoneUnreadReplyCount = computed(() => (
	townOverview.value.phoneContacts.reduce((total, contact) => total + (contact.unreadCount || 0), 0)
));
const {
	sheetVisible: showDoorstepChatSheet,
	messageList: doorstepMessages,
	decisionLabel: doorstepDecisionLabel,
	actionList: doorstepActions,
	residentName: doorstepResidentName,
	residenceLocationName: doorstepResidenceLocationName,
	panelMode: doorstepPanelMode,
	chatDraft: doorstepChatDraft,
	leaveMessageDraft: doorstepLeaveMessageDraft,
	scheduleOptions: doorstepScheduleOptions,
	isBusy: isDoorstepBusy,
	canSend: canSendDoorstepMessage,
	canSubmitLeaveMessage: canSubmitDoorstepLeaveMessage,
	canEnterResidence: canEnterDoorstepResidence,
	showChatInput: showDoorstepChatInput,
	startConversation: startDoorstepConversation,
	sendMessage: sendDoorstepMessage,
	submitLeaveMessage: submitDoorstepLeaveMessage,
	submitScheduleOption: submitDoorstepScheduleOption,
	handleAction: handleDoorstepConversationAction,
	closeSheet: closeDoorstepChatSheet,
	cancelSubpanel: cancelDoorstepSubpanel,
	enterResidence: enterDoorstepResidence,
	resetConversation: resetDoorstepConversation
} = useResidentDoorstepConversation({
	townStore,
	resolvePlayerName: () => townOverview.value.player.name || '玩家'
});

function syncActiveWorldIndex() {
	const index = worlds.value.findIndex((item) => item.id === townStore.activeWorldId);
	activeWorldIndex.value = index >= 0 ? index : 0;
}

function resetDoorstepFollowUpState() {
	resetDoorstepConversation();
}

async function refreshPageState() {
	await townStore.initialize();
	if (!townStore.isReady) {
		return;
	}

	syncActiveWorldIndex();
	expandedResidenceZoneId.value = '';
	closeResidenceResidentSheet();
	resetDoorstepFollowUpState();
	closePhoneSheet();
	closePhoneChatSheet();
}

async function selectWorld(index) {
	await townStore.setActiveWorld(worlds.value[index]?.id || null);
	syncActiveWorldIndex();
	expandedResidenceZoneId.value = '';
}

function followObservationFocus() {
	followTownLead(townOverview.value.observationFocus);
}

function goToScene(locationName) {
	if (!currentWorld.value) return;

	uni.navigateTo({
		url: `/pages/scene/scene?worldId=${encodeURIComponent(currentWorld.value.id)}&location=${encodeURIComponent(locationName)}`
	});
}

function followTownLead(lead = {}) {
	const locationName = String(lead?.locationName || '').trim();
	if (locationName) {
		goToScene(locationName);
		return;
	}

	const residentId = String(lead?.residentId || lead?.residents?.[0] || '').trim();
	if (!residentId) {
		return;
	}

	const residentName = String(lead?.residentName || lead?.residentNames?.[0] || '').trim();
	openResidentPage(residentId, residentName, locationName);
}

function followTownEvent(event = {}) {
	if (!event?.isActionable) {
		return;
	}

	followTownLead(event);
}

function openPhoneSheet() {
	if (!remoteChatEnabled.value) {
		return;
	}

	showPhoneSheet.value = true;
}

function closePhoneSheet() {
	showPhoneSheet.value = false;
}

function closePhoneChatSheet() {
	showPhoneChatSheet.value = false;
	selectedPhoneResident.value = null;
}

function closeResidenceResidentSheet() {
	showResidenceResidentSheet.value = false;
	selectedResidenceResident.value = null;
	isKnocking.value = false;
}

function updateDoorstepChatDraft(nextDraft = '') {
	doorstepChatDraft.value = String(nextDraft || '');
}

function updateDoorstepLeaveMessageDraft(nextDraft = '') {
	doorstepLeaveMessageDraft.value = String(nextDraft || '');
}

async function handleDoorstepSend() {
	try {
		await sendDoorstepMessage();
	} catch (error) {
		console.error('[index] failed to send doorstep message', error);
		uni.showToast({
			title: '门口对话发送失败',
			icon: 'none'
		});
	}
}

async function handleDoorstepSheetAction(action = {}) {
	try {
		const result = await handleDoorstepConversationAction(action?.id || action);
		if (result?.type === 'enter_scene' && result?.payload) {
			navigateToResidenceScene(
				result.payload.locationName || '',
				result.payload.visitSessionId || ''
			);
		}
	} catch (error) {
		console.error('[index] failed to handle doorstep action', error);
		uni.showToast({
			title: '门口操作失败',
			icon: 'none'
		});
	}
}

function handleDoorstepEnterScene() {
	const payload = enterDoorstepResidence();
	if (!payload?.locationName) return;

	navigateToResidenceScene(payload.locationName, payload.visitSessionId || '');
}

async function handleDoorstepLeaveMessageSubmit() {
	const created = await submitDoorstepLeaveMessage();
	if (created) return;

	uni.showToast({
		title: '留消息失败',
		icon: 'none'
	});
}

async function handleDoorstepScheduleSelect(option = null) {
	const created = await submitDoorstepScheduleOption(option);
	if (created) return;

	uni.showToast({
		title: '预约时间失败',
		icon: 'none'
	});
}

function navigateToResidenceScene(locationName, visitSessionId = '') {
	if (!locationName) return;

	uni.navigateTo({
		url: buildResidentSceneUrl({
			worldId: currentWorld.value?.id || townStore.activeWorldId || '',
			locationName,
			visitSessionId
		})
	});
}

function openResidentPage(residentId = '', residentName = '', sceneName = '') {
	if (!residentId) return;

	uni.navigateTo({
		url: buildResidentEncounterChatUrl({
			residentId,
			residentName,
			sceneName
		})
	});
}

function toggleResidentialZone(zone) {
	if (!zone?.id) return;

	if ((zone.occupiedCount || 0) <= 0) {
		uni.showToast({
			title: `这个${residentialZoneSectionLabel.value}暂时没有${residentLabel.value}`,
			icon: 'none'
		});
		return;
	}

	expandedResidenceZoneId.value = expandedResidenceZoneId.value === zone.id ? '' : zone.id;
}

async function visitResidenceResident(residentEntry) {
	if (!residentEntry?.residentId) return;

	selectedResidenceResident.value = residentEntry;
	showResidenceResidentSheet.value = true;
}

async function knockResidenceDoor() {
	if (!selectedResidenceResident.value?.residentId || isKnocking.value) return;

	const residentEntry = selectedResidenceResident.value;
	const hostResident = findTownSnapshotResident(
		townStore.activeTownSnapshot,
		residentEntry.residentId
	) || null;
	const happenedAt = townStore.currentSliceTimestamp || townStore.currentTime || Date.now();
	isKnocking.value = true;

	try {
		const startResult = await startDoorstepConversation({
			residentId: residentEntry.residentId || '',
			residentName: residentEntry.residentName || '',
			residenceLocationId: residentEntry.residenceLocationId || '',
			residenceLocationName: residentEntry.residenceLocationName || '',
			currentAction: residentEntry.currentAction || '',
			hostResident,
			isResidentHomeNow: Boolean(residentEntry.isHomeNow),
			happenedAt
		});
		closeResidenceResidentSheet();

		if (startResult?.status === 'already_allowed') {
			navigateToResidenceScene(
				residentEntry.residenceLocationName || '',
				startResult.visitSessionId || ''
			);
			return;
		}

		if (startResult?.status === 'blocked') {
			uni.showToast({
				title: '暂时还不能去拜访',
				icon: 'none'
			});
		}
	} catch (error) {
		console.error('[index] failed to knock residence door from residential zone', error);
		uni.showToast({
			title: '拜访失败，请稍后再试',
			icon: 'none'
		});
		closeResidenceResidentSheet();
	} finally {
		isKnocking.value = false;
	}
}
function openPhoneChat(contact) {
	if (!contact?.residentId) {
		uni.showToast({
			title: '这个联系人暂时无法聊天',
			icon: 'none'
		});
		return;
	}

	const resident = findTownSnapshotResident(
		townStore.activeTownSnapshot,
		contact.residentId
	) || null;

	selectedPhoneResident.value = resident
		? {
			...resident,
			residentId: resident.id || contact.residentId,
			residentName: resident.name || contact.residentName || ''
		}
		: {
			...contact
		};
	showPhoneSheet.value = false;
	showPhoneChatSheet.value = true;
}

function createNewContact() {
	uni.navigateTo({
		url: '/pages/create/create'
	});
}

onShow(async () => {
	await refreshPageState();
	if (townStore.isReady) {
		townStore.ensureClockRunning();
	}
});

onHide(() => {
	townStore.stopClock();
});

onUnload(() => {
	townStore.stopClock();
});

onReady(() => {
	checkUpdate();
});
</script>

<style lang="scss">
	.container {
		background-color: var(--bg-color);
		min-height: 100vh;
	}

	.custom-navbar {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		background-color: var(--bg-color);
		z-index: 999;
		padding-bottom: 10rpx;
		box-shadow: 0 1px 0 var(--border-color);
	}

	.status-bar {
		height: var(--status-bar-height);
		width: 100%;
		background-color: var(--bg-color);
	}

	.nav-content {
		height: 88rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 30rpx;
	}

	.page-title {
		font-size: 36rpx;
		font-weight: bold;
		color: var(--text-color);
	}

	.add-btn {
		width: 60rpx;
		height: 60rpx;
		background-color: var(--card-bg);
		border-radius: 10rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--border-color);
	}

	.add-icon {
		font-size: 40rpx;
		color: var(--text-color);
		margin-top: -4rpx;
	}

	.nav-placeholder {
		width: 100%;
		height: calc(var(--status-bar-height) + 88rpx);
	}

	.empty-tip {
		text-align: center;
		color: var(--text-sub);
		padding-top: 100rpx;
		font-size: 28rpx;
	}

	.rpg-dashboard {
		padding: 20rpx 0 140rpx 0;
	}

	.world-selector {
		width: 100%;
		white-space: nowrap;
		background: var(--card-bg);
		border-bottom: 1px solid var(--border-color);
		padding: 16rpx 0;
	}

	.world-tabs-container {
		display: inline-flex;
		padding: 0 30rpx;
		gap: 20rpx;
	}

	.world-tab {
		display: inline-flex;
		align-items: center;
		padding: 12rpx 30rpx;
		background-color: var(--tool-bg);
		border-radius: 40rpx;
		border: 1px solid var(--border-color);
		transition: all 0.2s;
	}

	.world-tab.active-tab {
		background-color: rgba(0, 122, 255, 0.1);
		border-color: #007aff;
	}

	.world-tab .world-icon {
		margin-right: 10rpx;
		font-size: 24rpx;
	}

	.world-tab.active-tab .world-name {
		color: #007aff;
		font-weight: bold;
	}

	.world-name {
		font-size: 26rpx;
		color: var(--text-color);
	}

	.town-hero {
		margin: 24rpx 30rpx 0;
		padding: 30rpx;
		border-radius: 36rpx;
		background:
			radial-gradient(circle at top right, rgba(226, 171, 94, 0.28), transparent 30%),
			linear-gradient(145deg, #14323f 0%, #214f63 52%, #f0e0c6 180%);
		overflow: hidden;
		box-shadow: 0 20rpx 50rpx rgba(20, 50, 63, 0.16);
	}

	.hero-copy {
		display: flex;
		flex-direction: column;
		gap: 10rpx;
	}

	.hero-eyebrow {
		font-size: 22rpx;
		letter-spacing: 4rpx;
		text-transform: uppercase;
		color: rgba(255, 244, 229, 0.72);
	}

	.hero-title {
		font-size: 56rpx;
		font-weight: 700;
		line-height: 1.1;
		color: #fff7ea;
	}

	.hero-summary {
		font-size: 26rpx;
		line-height: 1.6;
		color: rgba(255, 247, 234, 0.78);
		max-width: 520rpx;
	}

	.hero-metrics {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18rpx;
		margin-top: 30rpx;
	}

	.hero-metric {
		padding: 20rpx 22rpx;
		border-radius: 22rpx;
		background: rgba(255, 250, 240, 0.1);
		backdrop-filter: blur(8rpx);
	}

	.hero-metric-label {
		display: block;
		font-size: 22rpx;
		color: rgba(255, 247, 234, 0.66);
	}

	.hero-metric-value {
		display: block;
		margin-top: 8rpx;
		font-size: 30rpx;
		font-weight: 700;
		color: #fff7ea;
	}

	.hero-rail {
		display: flex;
		flex-wrap: wrap;
		gap: 14rpx;
		margin-top: 24rpx;
	}

	.hero-rail-item {
		padding: 12rpx 22rpx;
		border-radius: 999rpx;
		background: rgba(255, 247, 234, 0.12);
	}

	.hero-rail-text {
		font-size: 22rpx;
		color: #fff7ea;
	}

	.town-focus-card {
		margin: 24rpx 30rpx 0;
		padding: 28rpx;
		border-radius: 28rpx;
		background:
			radial-gradient(circle at top right, rgba(255, 228, 163, 0.26), transparent 34%),
			linear-gradient(145deg, #19374f 0%, #245c67 54%, #f2efe8 180%);
		box-shadow: 0 18rpx 34rpx rgba(14, 48, 63, 0.12);
	}

	.town-focus-card:active {
		transform: scale(0.99);
	}

	.focus-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20rpx;
	}

	.focus-card-kicker {
		font-size: 22rpx;
		letter-spacing: 4rpx;
		color: rgba(244, 239, 232, 0.74);
		text-transform: uppercase;
	}

	.focus-card-badge {
		padding: 6rpx 16rpx;
		border-radius: 999rpx;
		background: rgba(255, 244, 229, 0.16);
		font-size: 22rpx;
		color: #fff7ea;
	}

	.focus-card-title {
		display: block;
		margin-top: 18rpx;
		font-size: 38rpx;
		font-weight: 700;
		line-height: 1.2;
		color: #fff7ea;
	}

	.focus-card-summary {
		display: block;
		margin-top: 14rpx;
		font-size: 24rpx;
		line-height: 1.6;
		color: rgba(255, 247, 234, 0.82);
	}

	.focus-card-action {
		display: block;
		margin-top: 18rpx;
		font-size: 24rpx;
		font-weight: 700;
		color: #ffe4a3;
	}

	.town-section {
		margin: 28rpx 30rpx 0;
	}

	.section-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 20rpx;
		margin-bottom: 16rpx;
	}

	.section-title {
		font-size: 34rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.town-event-board {
		margin: 24rpx 30rpx 0;
		padding: 24rpx;
		background: linear-gradient(135deg, rgba(0, 122, 255, 0.08) 0%, rgba(255, 255, 255, 0.88) 100%);
		border: 1px solid rgba(0, 122, 255, 0.12);
		border-radius: 24rpx;
		box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.04);
	}

	.event-board-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 20rpx;
		margin-bottom: 16rpx;
	}

	.event-board-title {
		font-size: 30rpx;
		font-weight: bold;
		color: var(--text-color);
	}

	.event-board-subtitle {
		font-size: 22rpx;
		color: var(--text-sub);
	}

	.event-item + .event-item {
		margin-top: 16rpx;
		padding-top: 16rpx;
		border-top: 1px dashed rgba(0, 122, 255, 0.12);
	}

	.event-item--actionable:active {
		transform: scale(0.99);
	}

	.event-title {
		display: block;
		font-size: 26rpx;
		font-weight: bold;
		color: var(--text-color);
	}

	.event-summary {
		display: block;
		margin-top: 8rpx;
		font-size: 23rpx;
		line-height: 1.5;
		color: var(--text-sub);
	}

	.event-action {
		display: block;
		margin-top: 12rpx;
		font-size: 23rpx;
		font-weight: 700;
		color: #0f6a82;
	}

	.overview-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 20rpx;
	}

	.overview-card {
		background: var(--card-bg);
		border-radius: 26rpx;
		border: 1px solid var(--border-color);
		box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.04);
		padding: 24rpx;
		transition: transform 0.1s, box-shadow 0.1s, border-color 0.1s;
	}

	.player-residence-card {
		background:
			radial-gradient(circle at top right, rgba(36, 116, 88, 0.14), transparent 30%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 249, 246, 0.98));
		border-color: rgba(36, 116, 88, 0.18);
	}

	.overview-card:active {
		transform: scale(0.98);
		background-color: var(--tool-bg);
	}

	.overview-card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12rpx;
	}

	.overview-card-title {
		flex: 1;
		min-width: 0;
		font-size: 30rpx;
		font-weight: bold;
		color: var(--text-color);
	}

	.overview-card-badge {
		font-size: 22rpx;
		background-color: rgba(0, 122, 255, 0.1);
		color: #007aff;
		padding: 4rpx 16rpx;
		border-radius: 20rpx;
		font-weight: bold;
	}

	.overview-card-body {
		display: block;
		margin-top: 18rpx;
		font-size: 24rpx;
		color: var(--text-sub);
		line-height: 1.5;
		min-height: 108rpx;
	}

	.overview-card-foot {
		display: block;
		margin-top: 18rpx;
		font-size: 24rpx;
		color: #0f6a82;
		font-weight: bold;
	}

	.residence-card--expandable {
		border-color: rgba(15, 106, 130, 0.18);
	}

	.residence-card--expanded {
		box-shadow: 0 12rpx 28rpx rgba(15, 106, 130, 0.12);
		border-color: rgba(15, 106, 130, 0.3);
	}

	.zone-resident-list {
		margin-top: 18rpx;
		padding-top: 18rpx;
		border-top: 1px dashed var(--border-color);
		display: flex;
		flex-direction: column;
		gap: 14rpx;
	}

	.zone-resident-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16rpx;
		padding: 16rpx 18rpx;
		border-radius: 18rpx;
		background: var(--tool-bg);
	}

	.zone-resident-copy {
		flex: 1;
		min-width: 0;
	}

	.zone-resident-name {
		display: block;
		font-size: 26rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.zone-resident-meta {
		display: block;
		margin-top: 6rpx;
		font-size: 22rpx;
		color: var(--text-sub);
	}

	.zone-resident-action {
		font-size: 22rpx;
		font-weight: 700;
		color: #0f6a82;
		flex-shrink: 0;
	}

	.phone-fab {
		position: fixed;
		right: 32rpx;
		bottom: 180rpx;
		width: 116rpx;
		height: 116rpx;
		border-radius: 34rpx;
		background: linear-gradient(160deg, #184454 0%, #2b6b83 100%);
		box-shadow: 0 18rpx 36rpx rgba(20, 50, 63, 0.22);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1200;
	}

	.phone-fab-badge {
		position: absolute;
		top: -10rpx;
		right: -10rpx;
		min-width: 40rpx;
		height: 40rpx;
		padding: 0 10rpx;
		border-radius: 999rpx;
		background: #c03c23;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 10rpx 20rpx rgba(192, 60, 35, 0.22);
	}

	.phone-fab-badge-text {
		font-size: 20rpx;
		font-weight: 700;
		color: #fff7ea;
	}

	.phone-fab-label {
		font-size: 28rpx;
		font-weight: 700;
		color: #fff7ea;
		letter-spacing: 2rpx;
	}

	.overlay-mask {
		position: fixed;
		inset: 0;
		background: rgba(10, 18, 26, 0.48);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding: 30rpx;
		z-index: 1400;
	}

	.overlay-panel {
		width: 100%;
		max-width: 690rpx;
		background: var(--card-bg);
		border-radius: 34rpx;
		border: 1px solid rgba(15, 106, 130, 0.12);
		box-shadow: 0 24rpx 60rpx rgba(9, 24, 34, 0.18);
		padding: 30rpx;
	}

	.overlay-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20rpx;
	}

	.overlay-title {
		display: block;
		font-size: 34rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.overlay-subtitle {
		display: block;
		margin-top: 8rpx;
		font-size: 23rpx;
		line-height: 1.6;
		color: var(--text-sub);
	}

	.overlay-close {
		font-size: 24rpx;
		font-weight: 700;
		color: #0f6a82;
		flex-shrink: 0;
		padding-top: 8rpx;
	}

	.phone-sheet {
		max-height: 68vh;
	}

	.phone-contact-list {
		max-height: 52vh;
		margin-top: 24rpx;
	}

	.phone-contact-item {
		display: flex;
		align-items: center;
		gap: 18rpx;
		padding: 22rpx 0;
		border-top: 1px solid var(--border-color);
	}

	.phone-contact-avatar,
	.resident-sheet-avatar {
		width: 88rpx;
		height: 88rpx;
		border-radius: 24rpx;
		background: var(--tool-bg);
		flex-shrink: 0;
	}

	.phone-contact-copy,
	.resident-sheet-copy {
		flex: 1;
		min-width: 0;
	}

	.phone-contact-name-row {
		display: flex;
		align-items: center;
		gap: 12rpx;
	}

	.phone-contact-name {
		display: block;
		font-size: 28rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.phone-contact-unread {
		font-size: 20rpx;
		font-weight: 700;
		color: #c03c23;
		background: rgba(192, 60, 35, 0.12);
		padding: 4rpx 14rpx;
		border-radius: 999rpx;
	}

	.phone-contact-preview {
		display: block;
		margin-top: 8rpx;
		font-size: 24rpx;
		line-height: 1.5;
		color: #184454;
	}

	.phone-contact-meta,
	.resident-sheet-status,
	.sheet-meta {
		display: block;
		margin-top: 6rpx;
		font-size: 23rpx;
		line-height: 1.5;
		color: var(--text-sub);
	}

	.phone-contact-side {
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	.phone-contact-action {
		font-size: 22rpx;
		font-weight: 700;
		color: #0f6a82;
		flex-shrink: 0;
	}

	.resident-sheet-hero {
		display: flex;
		align-items: center;
		gap: 18rpx;
	}

	.resident-sheet-actions {
		display: flex;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 16rpx;
		margin-top: 28rpx;
	}

	.sheet-primary-btn,
	.sheet-secondary-btn {
		height: 84rpx;
		line-height: 84rpx;
		margin: 0;
		padding: 0 34rpx;
		border-radius: 999rpx;
		font-size: 26rpx;
		font-weight: 700;
	}

	.sheet-primary-btn {
		background: #184454;
		color: #fff7ea;
	}

	.sheet-primary-btn[disabled] {
		opacity: 0.6;
	}

	.sheet-secondary-btn {
		background: rgba(24, 68, 84, 0.08);
		color: #184454;
	}

	.door-reply-sheet {
		align-self: center;
	}

	.door-reply-badge {
		padding: 10rpx 18rpx;
		border-radius: 999rpx;
		font-size: 22rpx;
		font-weight: 700;
		flex-shrink: 0;
	}

	.door-reply-badge--accepted {
		background: rgba(21, 118, 70, 0.12);
		color: #157646;
	}

	.door-reply-badge--rejected {
		background: rgba(166, 56, 29, 0.12);
		color: #a6381d;
	}

	.door-reply-badge--postponed {
		background: rgba(180, 111, 27, 0.14);
		color: #b46f1b;
	}

	.door-reply-text {
		display: block;
		margin-top: 26rpx;
		font-size: 26rpx;
		line-height: 1.8;
		color: var(--text-color);
	}

	.follow-up-sheet {
		align-self: center;
	}

	.follow-up-textarea {
		width: 100%;
		min-height: 220rpx;
		margin-top: 24rpx;
		padding: 22rpx;
		border-radius: 24rpx;
		background: var(--tool-bg);
		border: 1px solid var(--border-color);
		font-size: 26rpx;
		line-height: 1.7;
		color: var(--text-color);
		box-sizing: border-box;
	}

	.schedule-option-list {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
		margin-top: 24rpx;
	}

	.schedule-option-btn {
		width: 100%;
		min-height: 116rpx;
		margin: 0;
		padding: 22rpx 24rpx;
		border-radius: 24rpx;
		background: var(--tool-bg);
		border: 1px solid var(--border-color);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		gap: 8rpx;
	}

	.schedule-option-label {
		font-size: 28rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.schedule-option-desc {
		font-size: 22rpx;
		line-height: 1.5;
		color: var(--text-sub);
		text-align: left;
	}
</style>
