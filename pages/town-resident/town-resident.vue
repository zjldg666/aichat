<template>
	<view class="resident-page" :class="{ 'dark-mode': isDarkMode }">
		<view class="custom-navbar">
			<view class="status-bar"></view>
			<view class="nav-content">
				<view class="back-btn" @click="goBack">
					<text class="back-icon">&lt;</text>
				</view>
				<view class="nav-title-box">
					<text class="page-title">{{ residentView.hero.name || '居民状态' }}</text>
					<text class="page-subtitle">{{ formattedTownTime }}</text>
				</view>
				<view class="right-placeholder"></view>
			</view>
		</view>

		<scroll-view scroll-y class="resident-scroll">
			<view class="nav-placeholder"></view>

			<view v-if="hasResident">
				<view class="resident-hero">
					<image
						:src="residentView.hero.avatar || '/static/ai-avatar.png'"
						mode="aspectFill"
						class="resident-avatar"
					></image>
					<view class="resident-copy">
						<text class="resident-name">{{ residentView.hero.name || '未知居民' }}</text>
						<text class="resident-action">
							现在在 {{ residentView.hero.locationName || '未知地点' }} · {{ residentView.hero.currentAction || '待在原地' }}
						</text>
						<text class="resident-bio">{{ residentView.hero.bio }}</text>
					</view>
				</view>

				<view class="action-row">
					<view class="action-pill primary-pill" @click="toggleObservation">
						<text class="action-label">{{ observeActionLabel }}</text>
					</view>
					<view class="action-pill secondary-pill" @click="goToChat">
						<text class="action-label">{{ residentView.actions[1]?.label || '去和她说说话' }}</text>
					</view>
					<view class="action-pill tertiary-pill" @click="goToScene">
						<text class="action-label">{{ residentView.actions[2]?.label || '去她所在地点' }}</text>
					</view>
				</view>

				<view class="info-section">
					<view class="section-header">
						<text class="section-title">你在镇上的身份</text>
						<text class="section-subtitle">先带着你自己的位置感去靠近她</text>
					</view>
					<view class="player-panel">
						<text class="player-identity">{{ residentView.playerContext.identity }}</text>
						<text class="player-address">你住在 {{ residentView.playerContext.address }}</text>
						<text class="player-summary">{{ residentView.playerContext.summary }}</text>
					</view>
				</view>

				<view class="info-section" v-if="residentView.relationshipEntry">
					<view class="section-header">
						<text class="section-title">关系入口</text>
						<text class="section-subtitle">先看你们现在到哪一步了，再决定怎么往前推</text>
					</view>
					<view class="invite-list">
						<view class="invite-card" @click="openRelationshipPage">
							<view class="invite-copy">
								<text class="invite-label">{{ residentView.relationshipEntry.label }}</text>
								<text class="invite-reason">{{ residentView.relationshipEntry.summary }}</text>
								<text class="invite-reason">{{ residentView.relationshipEntry.momentumReason }}</text>
							</view>
							<text class="invite-arrow">></text>
						</view>
					</view>
				</view>

				<view class="info-section" v-if="residentView.observationHints.length > 0">
					<view class="section-header">
						<text class="section-title">先观察她一会</text>
						<text class="section-subtitle">别急着开口，先抓住眼前这几条线索</text>
					</view>
					<view class="observation-panel">
						<text class="observation-lead">
							{{ showObservation ? '你正在观察她此刻的状态、周围的人和刚刚发生的事。' : '先从地点、同行和刚刚发生的事里判断怎么接近她。' }}
						</text>
						<view class="observation-list" v-if="showObservation">
							<view class="observation-item" v-for="hint in residentView.observationHints" :key="hint">
								<text class="observation-dot">•</text>
								<text class="observation-text">{{ hint }}</text>
							</view>
						</view>
					</view>
				</view>

				<view class="info-section">
					<view class="section-header">
						<text class="section-title">她现在所在的现场</text>
						<text class="section-subtitle">先看环境，再决定怎么接近</text>
					</view>
					<view class="scene-panel">
						<text class="scene-name">{{ residentView.scene.locationName }}</text>
						<text class="scene-atmosphere">{{ residentView.scene.atmosphere }}</text>
						<text v-if="residentView.scene.accessNote" class="scene-access-note">{{ residentView.scene.accessNote }}</text>
					</view>
				</view>

				<view class="info-section" v-if="residentView.activityJoinOption">
					<view class="section-header">
						<text class="section-title">直接加入她现在这件事</text>
						<text class="section-subtitle">先走进她眼前这件事里，再决定接下来怎么聊</text>
					</view>
					<view class="invite-list">
						<view class="invite-card" @click="joinCurrentActivity(residentView.activityJoinOption)">
							<view class="invite-copy">
								<text class="invite-label">{{ residentView.activityJoinOption.label }}</text>
								<text class="invite-reason">{{ residentView.activityJoinOption.reason }}</text>
							</view>
							<text class="invite-arrow">></text>
						</view>
					</view>
				</view>

				<view class="info-section" v-if="residentView.companions.length > 0">
					<view class="section-header">
						<text class="section-title">她现在身边的人</text>
						<text class="section-subtitle">这会影响你开口时的语气和方式</text>
					</view>
					<view class="chip-row">
						<view class="companion-chip" v-for="name in residentView.companions" :key="name">
							<text>{{ name }}</text>
						</view>
					</view>
				</view>

				<view class="info-section" v-if="residentView.invitationOptions.length > 0">
					<view class="section-header">
						<text class="section-title">约她一起去哪里</text>
						<text class="section-subtitle">用你主动发起的邀约把小镇故事往前推</text>
					</view>
					<view class="invite-list">
						<view
							class="invite-card"
							v-for="option in residentView.invitationOptions"
							:key="option.id"
							@click="inviteToLocation(option)"
						>
							<view class="invite-copy">
								<text class="invite-label">{{ option.label }}</text>
								<text class="invite-reason">{{ option.reason }}</text>
							</view>
							<text class="invite-arrow">></text>
						</view>
					</view>
				</view>

				<view class="info-section" v-if="residentView.eventFeed.length > 0">
					<view class="section-header">
						<text class="section-title">她刚刚经历的事</text>
						<text class="section-subtitle">顺着最新线索切入会更自然</text>
					</view>
					<view class="event-list">
						<view class="event-item" v-for="event in residentView.eventFeed" :key="event.id">
							<text class="event-title">{{ event.title }}</text>
							<text class="event-summary">{{ event.summary }}</text>
						</view>
					</view>
				</view>
			</view>

			<view v-else class="empty-panel">
				<text class="empty-title">这个居民暂时没有加载出来</text>
				<text class="empty-copy">先返回上一页刷新一下，或者等小镇快照重新同步。</text>
			</view>
		</scroll-view>

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

	</view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import TownDoorstepChatSheet from '@/components/TownDoorstepChatSheet.vue';
import { useResidentDoorstepConversation } from '@/composables/useResidentDoorstepConversation.js';
import { useTheme } from '@/composables/useTheme.js';
import { useTownStore } from '@/stores/useTownStore.js';
import { characterService } from '@/services/characterService.js';
import { buildTownResidentViewModel } from '@/utils/town/town-shell-view-models.js';
import {
	buildResidentActivityJoinChatUrl,
	buildResidentEncounterChatUrl,
	buildResidentInvitationChatUrl,
	buildResidentRelationshipPageUrl,
	buildResidentSceneUrl
} from '@/utils/town/town-entry-links.js';

const { isDarkMode } = useTheme();
const townStore = useTownStore();

const residentId = ref('');
const worldId = ref('');
const residentOverride = ref(null);
const showObservation = ref(false);
const isKnocking = ref(false);

const activeWorldId = computed(() => worldId.value || townStore.activeWorldId || '');

const formattedTownTime = computed(() => {
	const townTime = Number(townStore.currentTime) || Date.now();
	const date = new Date(townTime);
	const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
	const day = weekDays[date.getDay()] || '';
	const hour = String(date.getHours()).padStart(2, '0');
	const minute = String(date.getMinutes()).padStart(2, '0');
	return `${day} ${hour}:${minute}`;
});

const resident = computed(() => {
	const activeResident = townStore.activeResidents.find((item) => String(item.id) === String(residentId.value));
	return activeResident || residentOverride.value || {};
});

const residentView = computed(() => buildTownResidentViewModel({
	townSnapshot: townStore.activeTownSnapshot,
	resident: resident.value
}));

const hasResident = computed(() => Boolean(residentView.value.hero.id));
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
	resolvePlayerName: () => residentView.value.playerContext.name || '玩家'
});
const observeActionLabel = computed(() => (
	showObservation.value
		? '\u6536\u8d77\u89c2\u5bdf\u7ed3\u679c'
		: (residentView.value.actions[0]?.label || '\u5148\u89c2\u5bdf\u5979\u4e00\u4f1a')
));

function resetDoorstepFollowUpState() {
	resetDoorstepConversation();
}

async function refreshResidentPage() {
	await townStore.initialize();

	if (activeWorldId.value && String(townStore.activeWorldId) !== String(activeWorldId.value)) {
		await townStore.setActiveWorld(activeWorldId.value);
	}

	showObservation.value = false;
	isKnocking.value = false;
	resetDoorstepFollowUpState();

	if (!residentId.value) {
		residentOverride.value = null;
		return;
	}

	const activeResident = townStore.activeResidents.find((item) => String(item.id) === String(residentId.value));
	if (activeResident) {
		residentOverride.value = null;
	} else {
		residentOverride.value = await characterService.getCharacterById(residentId.value);
	}
}

function goBack() {
	uni.navigateBack();
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
		console.error('[town-resident] failed to send doorstep message', error);
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
			navigateToResidentScene(result.payload.visitSessionId || '');
		}
	} catch (error) {
		console.error('[town-resident] failed to handle doorstep action', error);
		uni.showToast({
			title: '门口操作失败',
			icon: 'none'
		});
	}
}

function handleDoorstepEnterScene() {
	const payload = enterDoorstepResidence();
	if (!payload) return;

	navigateToResidentScene(payload.visitSessionId || '');
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

function navigateToResidentScene(visitSessionId = '') {
	if (!residentView.value.scene.locationName) return;

	uni.navigateTo({
		url: buildResidentSceneUrl({
			worldId: activeWorldId.value,
			locationName: residentView.value.scene.locationName,
			visitSessionId
		})
	});
}
async function goToScene() {
	if (!residentView.value.scene.locationName || isKnocking.value) return;

	if (!residentView.value.scene.isPrivateResidence || residentView.value.scene.canEnter) {
		navigateToResidentScene();
		return;
	}

	if (!residentView.value.scene.canRequestVisit) {
		uni.showToast({
			title: '现在还不适合上门拜访',
			icon: 'none'
		});
		return;
	}

	isKnocking.value = true;

	try {
		const startResult = await startDoorstepConversation({
			residentId: resident.value?.id || '',
			residentName: residentView.value.hero.name || '',
			residenceLocationId: residentView.value.scene.locationId || '',
			residenceLocationName: residentView.value.scene.locationName || '',
			currentAction: residentView.value.hero.currentAction || '',
			hostResident: resident.value || null,
			isResidentHomeNow: true,
			happenedAt: townStore.currentSliceTimestamp || townStore.currentTime || Date.now()
		});

		if (startResult?.status === 'already_allowed') {
			navigateToResidentScene(startResult.visitSessionId || '');
			return;
		}

			if (startResult?.status === 'blocked') {
				uni.showToast({
					title: '\u6682\u65f6\u8fd8\u4e0d\u80fd\u53d1\u8d77\u8fd9\u6b21\u62dc\u8bbf',
					icon: 'none'
				});
			}
			return;
		} catch (error) {
		console.error('[town-resident] failed to knock residence door', error);
		uni.showToast({
			title: '\u62dc\u8bbf\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5',
			icon: 'none'
		});
	} finally {
		isKnocking.value = false;
	}
}

function goToChat() {
	if (!residentId.value) return;

	uni.navigateTo({
		url: buildResidentEncounterChatUrl({
			residentId: residentId.value,
			residentName: residentView.value.hero.name || '',
			sceneName: residentView.value.scene.locationName || ''
		})
	});
}

function openRelationshipPage() {
	if (!residentId.value) return;

	uni.navigateTo({
		url: buildResidentRelationshipPageUrl({
			worldId: activeWorldId.value,
			residentId: residentId.value,
			residentName: residentView.value.hero.name || ''
		})
	});
}

async function joinCurrentActivity(option) {
	if (!residentId.value || !option?.locationName) return;

	try {
		const result = await townStore.createPlayerResidentActivityJoin({
			residentId: residentId.value,
			residentName: residentView.value.hero.name || '',
			locationId: option.locationId || '',
			locationName: option.locationName || '',
			currentAction: option.currentAction || ''
		});

		if (!result?.created) {
			uni.showToast({
				title: '暂时还不能加入她现在这件事',
				icon: 'none'
			});
			return;
		}

		uni.showToast({
			title: `已把现场带进聊天：${option.locationName}`,
			icon: 'none'
		});

		uni.navigateTo({
			url: buildResidentActivityJoinChatUrl({
				residentId: residentId.value,
				residentName: residentView.value.hero.name || '',
				locationId: option.locationId || '',
				locationName: option.locationName || '',
				currentAction: option.currentAction || ''
			})
		});
	} catch (error) {
		console.error('[town-resident] failed to join current activity', error);
		uni.showToast({
			title: '加入现场失败，请稍后再试',
			icon: 'none'
		});
	}
}

async function inviteToLocation(option) {
	if (!residentId.value || !option?.locationName) return;

	try {
		const result = await townStore.createPlayerResidentInvitation({
			residentId: residentId.value,
			residentName: residentView.value.hero.name || '',
			currentLocationName: residentView.value.scene.locationName || '',
			targetLocationId: option.locationId || '',
			targetLocationName: option.locationName || ''
		});

		if (!result?.created) {
			uni.showToast({
				title: '暂时还不能发起这个邀约',
				icon: 'none'
			});
			return;
		}

		uni.showToast({
			title: `已把邀约带进聊天：${option.locationName}`,
			icon: 'none'
		});

		uni.navigateTo({
			url: buildResidentInvitationChatUrl({
				residentId: residentId.value,
				residentName: residentView.value.hero.name || '',
				currentLocationName: residentView.value.scene.locationName || '',
				targetLocationId: option.locationId || '',
				targetLocationName: option.locationName || ''
			})
		});
	} catch (error) {
		console.error('[town-resident] failed to create invitation', error);
		uni.showToast({
			title: '邀约没有发出去，请稍后再试',
			icon: 'none'
		});
	}
}

function toggleObservation() {
	showObservation.value = !showObservation.value;
}

onLoad((options = {}) => {
	residentId.value = decodeURIComponent(options.id || '');
	worldId.value = decodeURIComponent(options.worldId || '');
});

onShow(async () => {
	await refreshResidentPage();
});
</script>

<style lang="scss" scoped>
	.resident-page {
		min-height: 100vh;
		background: linear-gradient(180deg, #f4efe4 0%, var(--bg-color) 32%);
	}

	.custom-navbar {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		z-index: 999;
		background: transparent;
	}

	.status-bar {
		height: var(--status-bar-height);
		width: 100%;
	}

	.nav-content {
		height: 88rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 30rpx;
	}

	.back-btn,
	.right-placeholder {
		width: 60rpx;
		height: 60rpx;
		display: flex;
		align-items: center;
	}

	.back-icon {
		font-size: 40rpx;
		color: var(--text-color);
	}

	.nav-title-box {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.page-title {
		font-size: 30rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.page-subtitle {
		font-size: 20rpx;
		color: var(--text-sub);
	}

	.resident-scroll {
		height: 100vh;
	}

	.nav-placeholder {
		height: calc(var(--status-bar-height) + 88rpx);
	}

	.resident-hero {
		margin: 20rpx 30rpx 0;
		display: flex;
		gap: 24rpx;
		align-items: center;
	}

	.resident-avatar {
		width: 180rpx;
		height: 180rpx;
		border-radius: 32rpx;
		background: var(--tool-bg);
		box-shadow: 0 14rpx 32rpx rgba(20, 50, 63, 0.12);
	}

	.resident-copy {
		flex: 1;
		min-width: 0;
	}

	.resident-name {
		display: block;
		font-size: 48rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.resident-action,
	.resident-bio {
		display: block;
		margin-top: 10rpx;
		font-size: 24rpx;
		line-height: 1.6;
		color: var(--text-sub);
	}

	.action-row {
		display: flex;
		gap: 14rpx;
		padding: 26rpx 30rpx 0;
	}

	.action-pill {
		flex: 1;
		min-width: 0;
		height: 88rpx;
		padding: 0 18rpx;
		border-radius: 999rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.action-label {
		font-size: 24rpx;
		font-weight: 700;
		line-height: 1.4;
		text-align: center;
	}

	.primary-pill {
		background: #184454;
		color: #fff7ea;
	}

	.secondary-pill {
		background: #d9863d;
		color: #fff7ea;
	}

	.tertiary-pill {
		background: rgba(24, 68, 84, 0.08);
		color: #184454;
	}

	.info-section {
		margin: 34rpx 30rpx 0;
	}

	.section-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 16rpx;
		margin-bottom: 16rpx;
	}

	.section-title {
		font-size: 30rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.section-subtitle {
		font-size: 22rpx;
		color: var(--text-sub);
		text-align: right;
	}

	.player-panel,
	.observation-panel,
	.scene-panel,
	.empty-panel {
		padding: 26rpx 0;
		border-top: 1px solid var(--border-color);
	}

	.player-identity,
	.player-address,
	.player-summary,
	.observation-lead,
	.scene-name,
	.scene-atmosphere,
	.empty-title,
	.empty-copy {
		display: block;
	}

	.player-identity,
	.scene-name,
	.empty-title {
		font-size: 28rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.player-address,
	.player-summary,
	.observation-lead,
	.scene-atmosphere,
	.scene-access-note,
	.empty-copy {
		margin-top: 10rpx;
		font-size: 24rpx;
		line-height: 1.7;
		color: var(--text-sub);
	}

	.scene-access-note {
		color: #9a5a2d;
	}

	.observation-list {
		display: flex;
		flex-direction: column;
		gap: 18rpx;
		margin-top: 18rpx;
	}

	.observation-item {
		display: flex;
		align-items: flex-start;
		gap: 12rpx;
	}

	.observation-dot {
		font-size: 24rpx;
		line-height: 1.6;
		color: #184454;
	}

	.observation-text {
		flex: 1;
		font-size: 23rpx;
		line-height: 1.7;
		color: var(--text-color);
	}

	.chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: 14rpx;
		padding-top: 8rpx;
	}

	.companion-chip {
		padding: 12rpx 22rpx;
		border-radius: 999rpx;
		background: rgba(24, 68, 84, 0.08);
		font-size: 22rpx;
		color: #184454;
	}

	.invite-list {
		display: flex;
		flex-direction: column;
		gap: 18rpx;
	}

	.invite-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20rpx;
		padding: 24rpx 0;
		border-top: 1px solid var(--border-color);
	}

	.invite-copy {
		flex: 1;
		min-width: 0;
	}

	.invite-label,
	.invite-reason {
		display: block;
	}

	.invite-label {
		font-size: 26rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.invite-reason {
		margin-top: 8rpx;
		font-size: 23rpx;
		line-height: 1.6;
		color: var(--text-sub);
	}

	.invite-arrow {
		font-size: 24rpx;
		font-weight: 700;
		color: #184454;
	}

	.event-list {
		display: flex;
		flex-direction: column;
	}

	.event-item {
		padding: 24rpx 0;
		border-top: 1px solid var(--border-color);
	}

	.event-title {
		display: block;
		font-size: 26rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.event-summary {
		display: block;
		margin-top: 8rpx;
		font-size: 23rpx;
		line-height: 1.6;
		color: var(--text-sub);
	}
	
	.empty-panel {
		margin: 34rpx 30rpx 0;
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

	.door-reply-actions {
		display: flex;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 16rpx;
		margin-top: 28rpx;
	}

	.door-reply-primary-btn,
	.door-reply-secondary-btn {
		height: 84rpx;
		line-height: 84rpx;
		margin: 0;
		padding: 0 34rpx;
		border-radius: 999rpx;
		font-size: 26rpx;
		font-weight: 700;
	}

	.door-reply-primary-btn {
		background: #184454;
		color: #fff7ea;
	}

	.door-reply-secondary-btn {
		background: rgba(24, 68, 84, 0.08);
		color: #184454;
	}

	.overlay-close {
		font-size: 24rpx;
		font-weight: 700;
		color: #0f6a82;
		flex-shrink: 0;
		padding-top: 8rpx;
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

	.follow-up-meta {
		display: block;
		margin-top: 14rpx;
		font-size: 23rpx;
		line-height: 1.6;
		color: var(--text-sub);
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
