<template>
	<view class="container" :class="{ 'dark-mode': isDarkMode }">
		<view class="custom-navbar">
			<view class="status-bar"></view>
			<view class="nav-content">
				<text class="page-title">我的空间</text>
				<view class="add-btn" @click="createNewContact">
					<text class="add-icon">+</text>
				</view>
			</view>
		</view>
		<view class="nav-placeholder"></view>

		<view class="chat-list">
			<view v-if="contactList.length === 0" class="empty-tip">
				点击右上角 + 创建你的第一个虚拟空间
			</view>

			<view class="world-group" v-for="(chars, worldName) in groupedContacts" :key="worldName">
				<view class="world-header" @click="toggleWorld(worldName)">
					<view class="world-title-box">
						<text class="world-icon">🌍</text>
						<text class="world-title">{{ worldName }}</text>
					</view>
					<view style="display: flex; align-items: center;">
						<text class="world-count" style="margin-right: 12rpx;">{{ chars.length }} 名角色</text>
						<text
							style="font-size: 24rpx; color: var(--text-sub);">{{ collapsedWorlds[worldName] ? '▶' : '▼' }}</text>
					</view>
				</view>

				<view v-show="!collapsedWorlds[worldName]">
					<view class="chat-item" v-for="item in chars" :key="item.id" @click="goToChat(item)"
						@longpress="showAction(item)">
						<view class="avatar-box">
							<image :src="item.avatar || '/static/ai-avatar.png'" mode="aspectFill" class="avatar">
							</image>
							<view v-if="item.unread > 0" class="badge">{{ item.unread }}</view>
						</view>
						<view class="content-box">
							<view class="row-top">
								<text class="name">🏠 {{ item.location || item.name + '的家' }}</text>
								<text class="time">{{ item.lastTime }}</text>
							</view>

							<view class="row-bottom">
								<view class="status-tag">
									<text class="status-dot"></text>
									<text class="status-text">{{ item.name }} ·
										{{ item.currentLocation || '卧室' }}</text>
								</view>
								<text class="last-msg">{{ item.lastMsg }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>

		<CustomTabBar :current="0" />
	</view>
</template>

<script setup>
	import {
		computed,
		ref
	} from 'vue';
	import {
		onShow,
		onReady
	} from '@dcloudio/uni-app';
	import CustomTabBar from '@/components/CustomTabBar.vue';
	import checkUpdate from '@/uni_modules/uni-upgrade-center-app/utils/check-update'
	import {
		useTheme
	} from '@/composables/useTheme.js';

	// 1. 引入管家和同步工具
	import {
		useCharacterStore
	} from '@/stores/useCharacterStore';
	import {
		storeToRefs
	} from 'pinia';
	const worlds = ref([]);
	// ✨ 新增：控制世界分组折叠状态的对象
	const collapsedWorlds = ref({});
	
	// 切换某个世界观的折叠状态
	const toggleWorld = (worldName) => {
	  collapsedWorlds.value[worldName] = !collapsedWorlds.value[worldName];
	};
	const {
		isDarkMode
	} = useTheme();

	// 2. 呼叫管家
	const characterStore = useCharacterStore();
	// 3. 用 storeToRefs 提取列表，这样管家拿到数据后，页面会立刻自动渲染！
	const {
		contactList
	} = storeToRefs(characterStore);

	// 每次显示页面时，让管家去刷新列表数据
	onShow(() => {
		characterStore.initContacts();
		worlds.value = uni.getStorageSync('app_world_settings') || [];
	});
	// ✨✨✨ 核心分组逻辑 ✨✨✨
	const groupedContacts = computed(() => {
		const groups = {};
		contactList.value.forEach(item => {
			// 根据角色的 worldId 查找对应的世界名称
			let worldName = '未归属世界';
			if (item.worldId) {
				const w = worlds.value.find(x => String(x.id) === String(item.worldId));
				if (w && w.name) worldName = w.name;
			}

			if (!groups[worldName]) {
				groups[worldName] = [];
			}
			groups[worldName].push(item);
		});
		return groups;
	});
	onReady(() => {
		checkUpdate();
	});

	const createNewContact = () => {
		uni.navigateTo({
			url: '/pages/create/create'
		});
	};

	const goToChat = (item) => {
		item.unread = 0;
		// 目前先保留原有的直写缓存，保证功能正常
		uni.setStorageSync('contact_list', contactList.value);
		uni.navigateTo({
			url: `/pages/chat/chat?id=${item.id}&name=${item.name}`
		});
	};

	// 去掉 index 参数
	const showAction = (item) => {
		uni.showActionSheet({
			itemList: ['编辑空间/角色', '删除此空间'],
			success: (res) => {
				if (res.tapIndex === 0) {
					uni.navigateTo({
						url: `/pages/create/create?id=${item.id}`
					});
				} else if (res.tapIndex === 1) {
					uni.showModal({
						title: '确认删除',
						content: '删除后无法恢复，确定吗？',
						success: (modalRes) => {
							if (modalRes.confirm) {
								// ✨ 改为通过 ID 查找真实索引
								const realIndex = contactList.value.findIndex(c => c.id ===
									item.id);
								if (realIndex !== -1) {
									contactList.value.splice(realIndex, 1);
									uni.setStorageSync('contact_list', contactList.value);
								}
							}
						}
					});
				}
			}
		});
	};
</script>

<style lang="scss">
	/* --- 1. 基础容器 --- */
	.container {
		background-color: var(--bg-color);
		min-height: 100vh;
	}

	/* --- 2. 自定义导航栏 --- */
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

	/* --- 3. 聊天列表 --- */
	.chat-list {
		background-color: var(--bg-color);
		padding-bottom: 120rpx;
	}

	.chat-item {
		display: flex;
		padding: 24rpx 30rpx;
		border-bottom: 1px solid var(--border-color);
		background: var(--card-bg);
		transition: background-color 0.2s;
	}

	.chat-item:active {
		background-color: var(--tool-bg);
	}

	.avatar-box {
		position: relative;
		margin-right: 24rpx;
	}

	.avatar {
		width: 100rpx;
		height: 100rpx;
		border-radius: 20rpx;
		background: var(--border-color);
	}

	.badge {
		position: absolute;
		top: -6rpx;
		right: -6rpx;
		background: #fa5151;
		color: #fff;
		font-size: 22rpx;
		padding: 0 10rpx;
		border-radius: 16rpx;
	}

	.content-box {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.row-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12rpx;
	}

	.name {
		font-size: 32rpx;
		font-weight: bold;
		color: var(--text-color);
	}

	.time {
		font-size: 24rpx;
		color: var(--text-sub);
	}

	.row-bottom {
		display: flex;
		align-items: center;
	}

	/* ✨ 新增的状态标签样式 */
	.status-tag {
		display: flex;
		align-items: center;
		background-color: rgba(0, 122, 255, 0.1);
		padding: 4rpx 12rpx;
		border-radius: 8rpx;
		margin-right: 16rpx;
		flex-shrink: 0;
	}

	.status-dot {
		width: 12rpx;
		height: 12rpx;
		background-color: #007aff;
		border-radius: 50%;
		margin-right: 8rpx;
		box-shadow: 0 0 6rpx rgba(0, 122, 255, 0.5);
	}

	.status-text {
		font-size: 22rpx;
		color: #007aff;
		font-weight: bold;
		max-width: 160rpx;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.last-msg {
		flex: 1;
		font-size: 26rpx;
		color: var(--text-sub);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	/* ✨✨✨ 新增世界分组样式 ✨✨✨ */
	.world-group {
		margin-bottom: 20rpx;
	}

	.world-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20rpx 30rpx;
		background-color: var(--tool-bg);
		border-bottom: 1px solid var(--border-color);
		border-top: 1px solid var(--border-color);
	}

	.world-title-box {
		display: flex;
		align-items: center;
	}

	.world-icon {
		font-size: 32rpx;
		margin-right: 12rpx;
	}

	.world-title {
		font-size: 28rpx;
		font-weight: bold;
		color: var(--text-color);
	}

	.world-count {
		font-size: 24rpx;
		color: var(--text-sub);
		background-color: var(--card-bg);
		padding: 4rpx 16rpx;
		border-radius: 20rpx;
		border: 1px solid var(--border-color);
	}
</style>