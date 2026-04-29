<template>
	<view class="relationship-page" :class="{ 'dark-mode': isDarkMode }">
		<view class="custom-navbar">
			<view class="status-bar"></view>
			<view class="nav-content">
				<view class="back-btn" @click="goBack">
					<text class="back-icon">&lt;</text>
				</view>
				<view class="nav-title-box">
					<text class="page-title">{{ relationshipView.hero.residentName || '关系入口' }}</text>
					<text class="page-subtitle">{{ formattedTownTime }}</text>
				</view>
				<view class="right-placeholder"></view>
			</view>
		</view>

		<scroll-view scroll-y class="relationship-scroll">
			<view class="nav-placeholder"></view>

			<view v-if="hasResident">
				<view class="relationship-hero">
					<image
						:src="relationshipView.hero.avatar || '/static/ai-avatar.png'"
						mode="aspectFill"
						class="resident-avatar"
					></image>
					<view class="hero-copy">
						<text class="hero-name">{{ relationshipView.hero.residentName || '未知居民' }}</text>
						<text class="hero-stage">{{ relationshipView.summary.relationshipStage }}</text>
						<text class="hero-bio">{{ residentBio }}</text>
					</view>
				</view>

				<view class="action-row">
					<view class="action-pill primary-pill" @click="goToFocusChat">
						<text class="action-label">把关系带进聊天</text>
					</view>
					<view class="action-pill secondary-pill" @click="goToChat">
						<text class="action-label">直接聊天</text>
					</view>
					<view class="action-pill tertiary-pill" @click="goToScene">
						<text class="action-label">{{ relationshipView.actions[2]?.label || '去她所在地点' }}</text>
					</view>
				</view>

				<view class="info-section">
					<view class="section-header">
						<text class="section-title">当前关系态势</text>
						<text class="section-subtitle">先看现在是什么阶段，再决定往哪里推</text>
					</view>
					<view class="status-panel">
						<text class="status-stage">{{ relationshipView.summary.relationshipStage }}</text>
						<text class="status-summary">{{ relationshipView.summary.relationshipSummary }}</text>
						<text class="status-momentum">{{ relationshipView.summary.momentumLabel }}</text>
						<text class="status-reason">{{ relationshipView.summary.momentumReason }}</text>
					</view>
				</view>

				<view class="info-section">
					<view class="section-header">
						<text class="section-title">你在这段关系里的位置</text>
						<text class="section-subtitle">玩家身份会决定别人怎么理解你的靠近</text>
					</view>
					<view class="player-panel">
						<text class="player-identity">{{ relationshipView.playerContext.identity }}</text>
						<text class="player-address">你住在 {{ relationshipView.playerContext.address }}</text>
						<text class="player-summary">{{ relationshipView.playerContext.summary }}</text>
					</view>
				</view>

				<view class="info-section">
					<view class="section-header">
						<text class="section-title">把关系目标带进聊天</text>
						<text class="section-subtitle">这次不是随便寒暄，而是带着明确的推进意图开口</text>
					</view>
					<view class="invite-list">
						<view class="invite-card" @click="goToFocusChat">
							<view class="invite-copy">
								<text class="invite-label">{{ relationshipView.focusChatAction.label }}</text>
								<text class="invite-reason">{{ relationshipView.focusChatAction.description }}</text>
							</view>
							<text class="invite-arrow">></text>
						</view>
					</view>
				</view>

				<view class="info-section" v-if="relationshipView.playerEventFeed.length > 0">
					<view class="section-header">
						<text class="section-title">你刚刚留下的关系线索</text>
						<text class="section-subtitle">这些是你和她之间最近已经发生过的事</text>
					</view>
					<view class="event-list">
						<view class="event-item" v-for="event in relationshipView.playerEventFeed" :key="event.id">
							<text class="event-title">{{ event.title }}</text>
							<text class="event-summary">{{ event.summary }}</text>
						</view>
					</view>
				</view>

				<view class="info-section">
					<view class="section-header">
						<text class="section-title">她现在所在的现场</text>
						<text class="section-subtitle">关系推进仍然要顺着当前场景去做</text>
					</view>
					<view class="scene-panel">
						<text class="scene-name">{{ relationshipView.scene.locationName }}</text>
						<text class="scene-atmosphere">{{ relationshipView.scene.atmosphere }}</text>
						<text v-if="relationshipView.scene.accessNote" class="scene-access-note">{{ relationshipView.scene.accessNote }}</text>
					</view>
				</view>

				<view class="info-section" v-if="relationshipView.activityJoinOption">
					<view class="section-header">
						<text class="section-title">先从同一件事里靠近她</text>
						<text class="section-subtitle">如果她正在做的事合适，就先从现场切进去</text>
					</view>
					<view class="invite-list">
						<view class="invite-card" @click="joinCurrentActivity(relationshipView.activityJoinOption)">
							<view class="invite-copy">
								<text class="invite-label">{{ relationshipView.activityJoinOption.label }}</text>
								<text class="invite-reason">{{ relationshipView.activityJoinOption.reason }}</text>
							</view>
							<text class="invite-arrow">></text>
						</view>
					</view>
				</view>

				<view class="info-section" v-if="relationshipView.companions.length > 0">
					<view class="section-header">
						<text class="section-title">她现在身边的人</text>
						<text class="section-subtitle">别人是否在场，会影响你能把话说到多深</text>
					</view>
					<view class="chip-row">
						<view class="companion-chip" v-for="name in relationshipView.companions" :key="name">
							<text>{{ name }}</text>
						</view>
					</view>
				</view>

				<view class="info-section" v-if="relationshipView.invitationOptions.length > 0">
					<view class="section-header">
						<text class="section-title">如果你想换一个关系场景</text>
						<text class="section-subtitle">也可以主动把她约去别的公共地点</text>
					</view>
					<view class="invite-list">
						<view
							class="invite-card"
							v-for="option in relationshipView.invitationOptions"
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

				<view class="info-section" v-if="relationshipView.eventFeed.length > 0">
					<view class="section-header">
						<text class="section-title">她最近相关的小镇动静</text>
						<text class="section-subtitle">如果你想顺着最新事件开口，可以先从这里切入</text>
					</view>
					<view class="event-list">
						<view class="event-item" v-for="event in relationshipView.eventFeed" :key="event.id">
							<text class="event-title">{{ event.title }}</text>
							<text class="event-summary">{{ event.summary }}</text>
						</view>
					</view>
				</view>
			</view>

			<view v-else class="empty-panel">
				<text class="empty-title">这个关系入口暂时没有加载出来</text>
				<text class="empty-copy">先返回上一页刷新一下，或者等小镇快照重新同步。</text>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { useTheme } from '@/composables/useTheme.js';
import { useTownStore } from '@/stores/useTownStore.js';
import { characterService } from '@/services/characterService.js';
import { buildTownRelationshipViewModel } from '@/utils/town/town-shell-view-models.js';
import {
	buildResidentActivityJoinChatUrl,
	buildResidentEncounterChatUrl,
	buildResidentInvitationChatUrl,
	buildResidentRelationshipChatUrl,
	buildResidentSceneUrl
} from '@/utils/town/town-entry-links.js';

const { isDarkMode } = useTheme();
const townStore = useTownStore();

const residentId = ref('');
const worldId = ref('');
const residentOverride = ref(null);

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

const relationshipView = computed(() => buildTownRelationshipViewModel({
	townSnapshot: townStore.activeTownSnapshot,
	resident: resident.value
}));

const hasResident = computed(() => Boolean(relationshipView.value.hero.residentId));
const residentBio = computed(() => (
	resident.value.bio
	|| resident.value.settings?.bio
	|| '她也在这座小镇里过着自己的日子。'
));

async function refreshRelationshipPage() {
	await townStore.initialize();

	if (activeWorldId.value && String(townStore.activeWorldId) !== String(activeWorldId.value)) {
		await townStore.setActiveWorld(activeWorldId.value);
	}

	if (!residentId.value) {
		residentOverride.value = null;
		return;
	}

	const activeResident = townStore.activeResidents.find((item) => String(item.id) === String(residentId.value));
	if (activeResident) {
		residentOverride.value = null;
		return;
	}

	residentOverride.value = await characterService.getCharacterById(residentId.value);
}

function goBack() {
	uni.navigateBack();
}

function goToChat() {
	if (!residentId.value) return;

	uni.navigateTo({
		url: buildResidentEncounterChatUrl({
			residentId: residentId.value,
			residentName: relationshipView.value.hero.residentName || '',
			sceneName: relationshipView.value.scene.locationName || ''
		})
	});
}

function navigateToResidentScene() {
	if (!relationshipView.value.scene.locationName) return;

	uni.navigateTo({
		url: buildResidentSceneUrl({
			worldId: activeWorldId.value,
			locationName: relationshipView.value.scene.locationName
		})
	});
}

async function goToScene() {
	if (!relationshipView.value.scene.locationName) return;

	if (!relationshipView.value.scene.isPrivateResidence || relationshipView.value.scene.canEnter) {
		navigateToResidentScene();
		return;
	}

	if (!relationshipView.value.scene.canRequestVisit) {
		uni.showToast({
			title: '现在还不是适合上门的时候',
			icon: 'none'
		});
		return;
	}

	try {
		const result = await townStore.grantPlayerResidenceAccess({
			residenceLocationId: relationshipView.value.scene.locationId,
			hostResidentId: resident.value?.id || '',
			hostResidentName: relationshipView.value.hero.residentName || '',
			hostResident: resident.value || null
		});

		if (!result?.approved) {
			uni.showToast({
				title: '暂时还不能进去',
				icon: 'none'
			});
			return;
		}

		uni.showToast({
			title: result.alreadyAllowed ? '已经可以拜访她家了' : '她同意你去家里拜访',
			icon: 'none'
		});

		navigateToResidentScene();
	} catch (error) {
		console.error('[town-relationship] failed to request residence access', error);
		uni.showToast({
			title: '拜访请求失败，请稍后再试',
			icon: 'none'
		});
	}
}

async function goToFocusChat() {
	if (!residentId.value) return;

	const option = relationshipView.value.focusChatAction;
	try {
		const result = await townStore.createPlayerRelationshipFocus({
			residentId: residentId.value,
			residentName: option.residentName || '',
			relationshipStage: option.relationshipStage || '',
			relationshipSummary: option.relationshipSummary || '',
			focusSummary: option.focusSummary || '',
			currentLocationId: option.currentLocationId || '',
			currentLocationName: option.currentLocationName || '',
			currentAction: option.currentAction || ''
		});

		if (!result?.created) {
			uni.showToast({
				title: '暂时还不能把关系目标带进聊天',
				icon: 'none'
			});
			return;
		}

		uni.showToast({
			title: `已把关系目标带进聊天：${option.relationshipStage || '当前关系'}`,
			icon: 'none'
		});

		uni.navigateTo({
			url: buildResidentRelationshipChatUrl({
				residentId: residentId.value,
				residentName: option.residentName || '',
				relationshipStage: option.relationshipStage || '',
				relationshipSummary: option.relationshipSummary || '',
				focusSummary: option.focusSummary || '',
				currentLocationName: option.currentLocationName || '',
				currentAction: option.currentAction || ''
			})
		});
	} catch (error) {
		console.error('[town-relationship] failed to create relationship focus', error);
		uni.showToast({
			title: '关系目标没有带进聊天，请稍后再试',
			icon: 'none'
		});
	}
}

async function joinCurrentActivity(option) {
	if (!residentId.value || !option?.locationName) return;

	try {
		const result = await townStore.createPlayerResidentActivityJoin({
			residentId: residentId.value,
			residentName: relationshipView.value.hero.residentName || '',
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
			title: `已把现场加入带进聊天：${option.locationName}`,
			icon: 'none'
		});

		uni.navigateTo({
			url: buildResidentActivityJoinChatUrl({
				residentId: residentId.value,
				residentName: relationshipView.value.hero.residentName || '',
				locationId: option.locationId || '',
				locationName: option.locationName || '',
				currentAction: option.currentAction || ''
			})
		});
	} catch (error) {
		console.error('[town-relationship] failed to join current activity', error);
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
			residentName: relationshipView.value.hero.residentName || '',
			currentLocationName: relationshipView.value.scene.locationName || '',
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
				residentName: relationshipView.value.hero.residentName || '',
				currentLocationName: relationshipView.value.scene.locationName || '',
				targetLocationId: option.locationId || '',
				targetLocationName: option.locationName || ''
			})
		});
	} catch (error) {
		console.error('[town-relationship] failed to create invitation', error);
		uni.showToast({
			title: '邀约没有发出去，请稍后再试',
			icon: 'none'
		});
	}
}

onLoad((options = {}) => {
	residentId.value = decodeURIComponent(options.id || '');
	worldId.value = decodeURIComponent(options.worldId || '');
});

onShow(async () => {
	await refreshRelationshipPage();
});
</script>

<style lang="scss" scoped>
	.relationship-page {
		min-height: 100vh;
		background: linear-gradient(180deg, #f3ecdf 0%, var(--bg-color) 34%);
	}

	.custom-navbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 20;
		backdrop-filter: blur(18rpx);
		background: rgba(255, 249, 239, 0.92);
		border-bottom: 1px solid rgba(73, 57, 44, 0.08);
	}

	.status-bar {
		height: var(--status-bar-height);
	}

	.nav-content {
		height: 88rpx;
		display: flex;
		align-items: center;
		padding: 0 28rpx;
	}

	.back-btn,
	.right-placeholder {
		width: 72rpx;
		display: flex;
		align-items: center;
	}

	.back-icon {
		font-size: 42rpx;
		color: var(--text-color);
	}

	.nav-title-box {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6rpx;
	}

	.page-title {
		font-size: 32rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.page-subtitle {
		font-size: 22rpx;
		color: var(--text-secondary);
	}

	.relationship-scroll {
		height: 100vh;
	}

	.nav-placeholder {
		height: calc(var(--status-bar-height) + 88rpx);
	}

	.relationship-hero,
	.info-section {
		margin: 24rpx;
		padding: 28rpx;
		border-radius: 32rpx;
		background: rgba(255, 252, 247, 0.94);
		box-shadow: 0 18rpx 44rpx rgba(117, 94, 66, 0.08);
	}

	.relationship-hero {
		display: flex;
		gap: 22rpx;
		align-items: center;
	}

	.resident-avatar {
		width: 144rpx;
		height: 144rpx;
		border-radius: 28rpx;
		background: #eadfce;
	}

	.hero-copy {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 10rpx;
	}

	.hero-name {
		font-size: 40rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.hero-stage {
		align-self: flex-start;
		padding: 8rpx 18rpx;
		border-radius: 999rpx;
		font-size: 22rpx;
		font-weight: 600;
		color: #7e4f2a;
		background: #f7e6d1;
	}

	.hero-bio {
		font-size: 24rpx;
		line-height: 1.7;
		color: var(--text-secondary);
	}

	.action-row {
		display: flex;
		gap: 18rpx;
		margin: 0 24rpx 24rpx;
	}

	.action-pill {
		flex: 1;
		min-height: 88rpx;
		border-radius: 999rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 18rpx;
	}

	.primary-pill {
		background: linear-gradient(135deg, #c97a38 0%, #dd9a5f 100%);
		box-shadow: 0 14rpx 26rpx rgba(201, 122, 56, 0.18);
	}

	.secondary-pill {
		background: rgba(93, 67, 49, 0.1);
	}

	.tertiary-pill {
		background: rgba(66, 102, 79, 0.12);
	}

	.action-label {
		font-size: 24rpx;
		font-weight: 600;
		color: var(--text-color);
		text-align: center;
	}

	.primary-pill .action-label {
		color: #fffaf2;
	}

	.section-header {
		display: flex;
		flex-direction: column;
		gap: 8rpx;
		margin-bottom: 18rpx;
	}

	.section-title {
		font-size: 30rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.section-subtitle {
		font-size: 22rpx;
		line-height: 1.6;
		color: var(--text-secondary);
	}

	.status-panel,
	.player-panel,
	.scene-panel,
	.empty-panel {
		padding-top: 24rpx;
		border-top: 1px solid var(--border-color);
		display: flex;
		flex-direction: column;
		gap: 14rpx;
	}

	.status-stage {
		align-self: flex-start;
		padding: 10rpx 18rpx;
		border-radius: 999rpx;
		font-size: 22rpx;
		font-weight: 700;
		color: #7e4f2a;
		background: #f7e6d1;
	}

	.status-summary,
	.status-reason,
	.player-summary,
	.scene-atmosphere,
	.scene-access-note,
	.event-summary,
	.invite-reason,
	.player-address {
		font-size: 24rpx;
		line-height: 1.7;
		color: var(--text-secondary);
	}

	.status-momentum,
	.player-identity,
	.scene-name,
	.event-title,
	.invite-label {
		font-size: 26rpx;
		font-weight: 600;
		color: var(--text-color);
	}

	.invite-list,
	.event-list {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}

	.invite-card,
	.event-item {
		display: flex;
		gap: 18rpx;
		align-items: center;
		padding: 22rpx 24rpx;
		border-radius: 24rpx;
		background: rgba(91, 69, 51, 0.05);
	}

	.invite-copy {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8rpx;
	}

	.invite-arrow {
		font-size: 30rpx;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
	}

	.companion-chip {
		padding: 12rpx 20rpx;
		border-radius: 999rpx;
		background: rgba(64, 103, 84, 0.12);
		color: var(--text-color);
		font-size: 22rpx;
	}

	.empty-panel {
		margin: 32rpx 24rpx;
		padding: 40rpx 32rpx;
		border-radius: 32rpx;
		background: rgba(255, 252, 247, 0.94);
		box-shadow: 0 18rpx 44rpx rgba(117, 94, 66, 0.08);
	}

	.empty-title {
		font-size: 30rpx;
		font-weight: 700;
		color: var(--text-color);
	}

	.empty-copy {
		font-size: 24rpx;
		line-height: 1.7;
		color: var(--text-secondary);
	}

	.dark-mode .custom-navbar,
	.dark-mode .relationship-hero,
	.dark-mode .info-section,
	.dark-mode .empty-panel {
		background: rgba(30, 31, 33, 0.94);
		box-shadow: none;
	}

	.dark-mode .secondary-pill {
		background: rgba(255, 255, 255, 0.08);
	}

	.dark-mode .tertiary-pill {
		background: rgba(129, 177, 147, 0.16);
	}

	.dark-mode .invite-card,
	.dark-mode .event-item {
		background: rgba(255, 255, 255, 0.06);
	}

	.dark-mode .hero-stage,
	.dark-mode .status-stage {
		color: #f4cda6;
		background: rgba(201, 122, 56, 0.18);
	}
</style>
