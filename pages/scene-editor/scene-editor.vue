<template>
	<scroll-view class="scene-editor-page" scroll-y>
		<view class="scene-editor-shell">
			<view class="scene-editor-hero">
				<text class="scene-editor-eyebrow">场景编辑</text>
				<text class="scene-editor-title">{{ resolvedLocationTitle }}</text>
				<text class="scene-editor-meta">{{ resolvedLocationMeta }}</text>
				<text class="scene-editor-desc">
					先定义这个场景里有哪些区域，再进入区域补充居民可以做的事项。
				</text>
			</view>

			<view v-if="!editorReady" class="scene-editor-empty">
				<text class="scene-editor-empty-title">当前场景暂时还不能编辑</text>
				<text class="scene-editor-empty-desc">
					请先从已有场景进入，或者等世界数据加载完成后再试一次。
				</text>
			</view>

			<template v-else>
				<view v-if="activeZoneIndex === -1" class="scene-editor-section">
					<view class="scene-editor-toolbar">
						<view>
							<text class="scene-editor-section-title">区域列表</text>
							<text class="scene-editor-section-subtitle">同一个地点里，可以拆成多个不会自动相遇的区域。</text>
						</view>
						<button class="scene-editor-mini-btn" size="mini" @click="handleAddZone">添加区域</button>
					</view>

					<view v-if="zoneDrafts.length === 0" class="scene-editor-empty">
						<text class="scene-editor-empty-title">还没有区域</text>
						<text class="scene-editor-empty-desc">比如书店可以拆成阅读区、收银台、窗边座位。</text>
					</view>

					<view
						v-for="(zone, zoneIndex) in zoneDrafts"
						:key="zone.id || zoneIndex"
						class="scene-editor-card"
						@click="openZoneEditor(zoneIndex)"
					>
						<view class="scene-editor-card-header">
							<view class="scene-editor-card-copy">
								<text class="scene-editor-card-title">{{ zone.name || `未命名区域 ${zoneIndex + 1}` }}</text>
								<text class="scene-editor-card-subtitle">{{ zone.activities?.length || 0 }} 个事项</text>
							</view>
							<button class="scene-editor-mini-btn scene-editor-danger-btn" size="mini" @click.stop="removeZone(zoneIndex)">
								删除
							</button>
						</view>
						<text class="scene-editor-card-desc">
							{{ zone.description || '点击进入，补充这个区域里的事项。' }}
						</text>
					</view>
				</view>

				<view v-else class="scene-editor-section">
					<view class="scene-editor-toolbar">
						<button class="scene-editor-mini-btn" size="mini" plain @click="closeZoneEditor">返回区域</button>
						<button class="scene-editor-mini-btn" size="mini" @click="handleAddActivity">添加事项</button>
					</view>

					<view class="scene-editor-form-card">
						<text class="scene-editor-field-label">区域名称</text>
						<input
							v-model="activeZone.name"
							class="scene-editor-input"
							placeholder="例如：阅读区、窗边座位、吧台"
							placeholder-class="scene-editor-placeholder"
							adjust-position="true"
							cursor-spacing="420"
						/>

						<text class="scene-editor-field-label">区域描述</text>
						<textarea
							v-model="activeZone.description"
							class="scene-editor-textarea"
							auto-height
							placeholder="描述这个区域的气氛、摆设、适合停留的人。"
							placeholder-class="scene-editor-placeholder"
							adjust-position="true"
							cursor-spacing="420"
						></textarea>
					</view>

					<view class="scene-editor-activity-list">
						<view class="scene-editor-toolbar scene-editor-toolbar--tight">
							<view>
								<text class="scene-editor-section-title">事项列表</text>
								<text class="scene-editor-section-subtitle">事项会作为以后居民“在这里能做什么”的基础数据。</text>
							</view>
						</view>

						<view v-if="activeZone.activities.length === 0" class="scene-editor-empty">
							<text class="scene-editor-empty-title">这个区域还没有事项</text>
							<text class="scene-editor-empty-desc">比如阅读区可以放“挑书”“安静阅读”“和店员问书”。</text>
						</view>

						<view
							v-for="(activity, activityIndex) in activeZone.activities"
							:key="activity.id || activityIndex"
							class="scene-editor-card scene-editor-card--activity"
						>
							<view class="scene-editor-card-header">
								<text class="scene-editor-card-title">事项 {{ activityIndex + 1 }}</text>
								<button
									class="scene-editor-mini-btn scene-editor-danger-btn"
									size="mini"
									@click.stop="removeActivity(activityIndex)"
								>
									删除
								</button>
							</view>

							<text class="scene-editor-field-label">事项名称</text>
							<input
								v-model="activity.name"
								class="scene-editor-input"
								placeholder="例如：挑书、点单、靠窗发呆"
								placeholder-class="scene-editor-placeholder"
								adjust-position="true"
								cursor-spacing="420"
							/>

							<text class="scene-editor-field-label">事项描述</text>
							<textarea
								v-model="activity.description"
								class="scene-editor-textarea"
								auto-height
								placeholder="描述居民在这里具体会做什么。"
								placeholder-class="scene-editor-placeholder"
								adjust-position="true"
								cursor-spacing="420"
							></textarea>

							<text class="scene-editor-field-label">标签</text>
							<input
								:value="formatActivityTags(activity)"
								class="scene-editor-input"
								placeholder="用逗号分隔，例如：安静,阅读,独处"
								placeholder-class="scene-editor-placeholder"
								adjust-position="true"
								cursor-spacing="420"
								@input="updateActivityTags(activityIndex, $event)"
							/>

							<view class="scene-editor-switch-row">
								<view class="scene-editor-switch-copy">
									<text class="scene-editor-field-label scene-editor-field-label--inline">偏社交事项</text>
									<text class="scene-editor-switch-hint">打开后，表示这个事项更容易引发互动。</text>
								</view>
								<switch :checked="Boolean(activity.isSocial)" color="#d26b2b" @change="updateActivitySocial(activityIndex, $event)" />
							</view>
						</view>
					</view>
				</view>

				<view class="scene-editor-save-bar">
					<button class="scene-editor-save-btn" :loading="isSaving" @click="saveSceneContent">保存场景内容</button>
				</view>
			</template>
		</view>
	</scroll-view>
</template>

<script setup>
	import { computed, ref } from 'vue';
	import { onLoad, onShow } from '@dcloudio/uni-app';
	import { worldTemplateService } from '@/services/worldTemplateService.js';
	import { useTownStore } from '@/stores/useTownStore.js';
	import {
		normalizeSceneContent,
		patchWorldSceneContent,
		resolveSceneContentTarget
	} from '@/utils/town/town-scene-content.js';

	const townStore = useTownStore();

	const worldId = ref('');
	const locationId = ref('');
	const locationName = ref('');
	const zoneDrafts = ref([]);
	const activeZoneIndex = ref(-1);
	const isSaving = ref(false);
	const targetType = ref('');
	const targetName = ref('');
	const targetId = ref('');
	const sourceLocationId = ref('');

	const currentWorld = computed(() => (
		townStore.worldTemplates.find((item) => String(item.id || '').trim() === String(worldId.value || '').trim()) || null
	));
	const editorReady = computed(() => Boolean(currentWorld.value && targetType.value && targetId.value));
	const activeZone = computed(() => zoneDrafts.value[activeZoneIndex.value] || null);
	const resolvedLocationTitle = computed(() => targetName.value || locationName.value || '当前场景');
	const resolvedLocationMeta = computed(() => {
		if (targetType.value === 'residentialZone' && sourceLocationId.value.startsWith('residence:')) {
			return '当前门牌内容会挂到所属住宅区上';
		}

		if (targetType.value === 'residentialZone') {
			return '住宅区场景';
		}

		if (targetType.value === 'publicLocation') {
			return '公共场景';
		}

		return '等待定位场景';
	});

	onLoad((options = {}) => {
		worldId.value = decodeURIComponent(options.worldId || '');
		locationId.value = decodeURIComponent(options.locationId || '');
		locationName.value = decodeURIComponent(options.locationName || '');
		sourceLocationId.value = locationId.value;
	});

	onShow(async () => {
		await townStore.initialize();
		if (!worldId.value) {
			worldId.value = townStore.activeWorldId || '';
		}

		if (worldId.value && String(townStore.activeWorldId || '').trim() !== String(worldId.value || '').trim()) {
			await townStore.setActiveWorld(worldId.value);
		}

		loadEditorState();
	});

	function buildEditorItemId(prefix = 'scene-item') {
		return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	}

	function buildNewZone() {
		return {
			id: buildEditorItemId('scene-zone'),
			name: '',
			description: '',
			activities: []
		};
	}

	function buildNewActivity() {
		return {
			id: buildEditorItemId('scene-activity'),
			name: '',
			description: '',
			tags: [],
			isSocial: false
		};
	}

	function loadEditorState() {
		const world = currentWorld.value;
		if (!world) {
			targetType.value = '';
			targetId.value = '';
			targetName.value = '';
			zoneDrafts.value = [];
			activeZoneIndex.value = -1;
			return;
		}

		const target = resolveSceneContentTarget(world, {
			locationId: locationId.value,
			locationName: locationName.value
		});

		targetType.value = target.targetType || '';
		targetId.value = target.targetId || '';
		targetName.value = target.targetName || locationName.value || '';
		zoneDrafts.value = normalizeSceneContent(target.sceneContent).zones;
		activeZoneIndex.value = zoneDrafts.value.length > 0 && activeZoneIndex.value > -1
			? Math.min(activeZoneIndex.value, zoneDrafts.value.length - 1)
			: -1;
	}

	function openZoneEditor(zoneIndex) {
		activeZoneIndex.value = zoneIndex;
	}

	function closeZoneEditor() {
		activeZoneIndex.value = -1;
	}

	function handleAddZone() {
		zoneDrafts.value.push(buildNewZone());
		activeZoneIndex.value = zoneDrafts.value.length - 1;
	}

	function removeZone(zoneIndex) {
		zoneDrafts.value.splice(zoneIndex, 1);

		if (activeZoneIndex.value === zoneIndex) {
			activeZoneIndex.value = -1;
			return;
		}

		if (activeZoneIndex.value > zoneIndex) {
			activeZoneIndex.value -= 1;
		}
	}

	function handleAddActivity() {
		if (!activeZone.value) {
			return;
		}

		activeZone.value.activities.push(buildNewActivity());
	}

	function removeActivity(activityIndex) {
		if (!activeZone.value) {
			return;
		}

		activeZone.value.activities.splice(activityIndex, 1);
	}

	function readSceneEditorInputValue(event) {
		return String(event?.detail?.value ?? event?.target?.value ?? event?.currentTarget?.value ?? '');
	}

	function formatActivityTags(activity = {}) {
		return Array.isArray(activity.tags) ? activity.tags.join(', ') : '';
	}

	function updateActivityTags(activityIndex, event) {
		if (!activeZone.value) {
			return;
		}

		const nextValue = readSceneEditorInputValue(event);
		const targetActivity = activeZone.value.activities[activityIndex];
		if (!targetActivity) {
			return;
		}

		targetActivity.tags = nextValue
			.split(/[\n,，、]/)
			.map((item) => item.trim())
			.filter(Boolean);
	}

	function updateActivitySocial(activityIndex, event) {
		if (!activeZone.value) {
			return;
		}

		const targetActivity = activeZone.value.activities[activityIndex];
		if (!targetActivity) {
			return;
		}

		targetActivity.isSocial = Boolean(event?.detail?.value);
	}

	async function saveSceneContent() {
		if (!editorReady.value || isSaving.value) {
			return;
		}

		isSaving.value = true;

		try {
			const world = currentWorld.value;
			const nextWorld = patchWorldSceneContent(world, {
				locationId: locationId.value || targetId.value,
				locationName: locationName.value || targetName.value,
				sceneContent: {
					zones: zoneDrafts.value
				}
			});
			const savedWorlds = worldTemplateService.saveWorldTemplates(
				townStore.worldTemplates.map((item) => (
					String(item.id || '').trim() === String(world.id || '').trim()
						? nextWorld
						: item
				))
			);

			townStore.worldTemplates = savedWorlds;
			if (String(townStore.activeWorldId || '').trim() === String(world.id || '').trim()) {
				await townStore.refreshActiveWorldSnapshot();
			}

			loadEditorState();
			uni.showToast({
				title: '场景内容已保存',
				icon: 'success'
			});
		} catch (error) {
			uni.showToast({
				title: error?.message || '保存失败',
				icon: 'none'
			});
		} finally {
			isSaving.value = false;
		}
	}
</script>

<style lang="scss" scoped>
	.scene-editor-page {
		height: 100vh;
		background: linear-gradient(180deg, #f6f1ea 0%, #fdfaf6 100%);
	}

	.scene-editor-shell {
		padding: 28rpx 24rpx 360rpx;
	}

	.scene-editor-hero,
	.scene-editor-card,
	.scene-editor-form-card,
	.scene-editor-empty {
		background: rgba(255, 252, 247, 0.96);
		border: 1rpx solid rgba(178, 126, 83, 0.16);
		border-radius: 28rpx;
		box-shadow: 0 16rpx 40rpx rgba(88, 54, 30, 0.08);
	}

	.scene-editor-hero {
		padding: 32rpx 28rpx;
		margin-bottom: 24rpx;
	}

	.scene-editor-eyebrow {
		display: block;
		font-size: 22rpx;
		letter-spacing: 4rpx;
		color: #b07a49;
		margin-bottom: 12rpx;
	}

	.scene-editor-title {
		display: block;
		font-size: 42rpx;
		font-weight: 700;
		color: #3d2a1f;
	}

	.scene-editor-meta,
	.scene-editor-desc,
	.scene-editor-section-subtitle,
	.scene-editor-card-subtitle,
	.scene-editor-card-desc,
	.scene-editor-empty-desc,
	.scene-editor-switch-hint {
		display: block;
		color: #826757;
		line-height: 1.6;
	}

	.scene-editor-meta {
		margin-top: 10rpx;
		font-size: 24rpx;
	}

	.scene-editor-desc {
		margin-top: 14rpx;
		font-size: 26rpx;
	}

	.scene-editor-section {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.scene-editor-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16rpx;
	}

	.scene-editor-toolbar--tight {
		margin-bottom: 4rpx;
	}

	.scene-editor-section-title,
	.scene-editor-card-title,
	.scene-editor-empty-title {
		display: block;
		font-size: 30rpx;
		font-weight: 600;
		color: #3d2a1f;
	}

	.scene-editor-section-subtitle,
	.scene-editor-card-subtitle,
	.scene-editor-empty-desc,
	.scene-editor-switch-hint {
		font-size: 24rpx;
	}

	.scene-editor-card,
	.scene-editor-form-card,
	.scene-editor-empty {
		padding: 24rpx;
	}

	.scene-editor-card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 18rpx;
	}

	.scene-editor-card-copy {
		flex: 1;
		min-width: 0;
	}

	.scene-editor-card-desc {
		margin-top: 16rpx;
		font-size: 25rpx;
	}

	.scene-editor-card--activity {
		gap: 14rpx;
	}

	.scene-editor-mini-btn {
		margin: 0;
		padding: 0 22rpx;
		height: 60rpx;
		line-height: 60rpx;
		border-radius: 999rpx;
		font-size: 24rpx;
		background: #f0dfd0;
		color: #7c4b29;
		border: none;
	}

	.scene-editor-danger-btn {
		background: #f7e2de;
		color: #ad4d41;
	}

	.scene-editor-field-label {
		display: block;
		margin: 18rpx 0 12rpx;
		font-size: 24rpx;
		font-weight: 600;
		color: #5f4331;
	}

	.scene-editor-field-label--inline {
		margin: 0;
	}

	.scene-editor-input,
	.scene-editor-textarea {
		width: 100%;
		box-sizing: border-box;
		background: #fff;
		border: 1rpx solid rgba(178, 126, 83, 0.22);
		border-radius: 20rpx;
		font-size: 26rpx;
		color: #3d2a1f;
	}

	.scene-editor-input {
		display: block;
		height: 84rpx;
		min-height: 84rpx;
		line-height: 84rpx;
		padding: 0 20rpx;
	}

	.scene-editor-textarea {
		min-height: 150rpx;
		padding: 20rpx;
	}

	.scene-editor-placeholder {
		color: #b6a28f;
	}

	.scene-editor-activity-list {
		display: flex;
		flex-direction: column;
		gap: 18rpx;
	}

	.scene-editor-switch-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20rpx;
		margin-top: 18rpx;
	}

	.scene-editor-switch-copy {
		flex: 1;
		min-width: 0;
	}

	.scene-editor-save-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(env(safe-area-inset-bottom) + 18rpx);
		padding: 18rpx 24rpx 0;
		background: linear-gradient(180deg, rgba(253, 250, 246, 0) 0%, rgba(253, 250, 246, 0.96) 28%, #fdfaf6 100%);
		pointer-events: none;
	}

	.scene-editor-save-btn {
		width: 100%;
		height: 84rpx;
		line-height: 84rpx;
		border-radius: 24rpx;
		font-size: 28rpx;
		font-weight: 600;
		background: linear-gradient(135deg, #cc7a3b 0%, #b95e26 100%);
		color: #fff8f1;
		border: none;
		box-shadow: 0 16rpx 30rpx rgba(185, 94, 38, 0.18);
		pointer-events: auto;
	}
</style>
