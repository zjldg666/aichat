<template>
	<view v-if="visible" class="modal-mask" @click="$emit('close')">
		<view class="panel-container" @click.stop>
			<view class="panel-header">
				<text class="title">{{ containerName === '快递箱' ? '📦 拆快递 / 收纳' : '📂 打开了 ' + containerName }}</text>
				<text class="close-btn" @click="$emit('close')">✕</text>
			</view>

			<view v-if="containerName === '快递箱'" class="split-view">

				<view class="left-box">
					<text class="sub-title">待收纳 ({{ sourceItems.length }})</text>
					<scroll-view scroll-y class="scroll-area">
						<view class="item-card" v-for="item in sourceItems" :key="item.id"
							:class="{'selected': selectedItem?.id === item.id}" @click="selectedItem = item">
							<text class="item-icon">{{ item.icon }}</text>
							<view class="item-info">
								<text class="item-name">{{ item.name }}</text>
								<text class="item-desc">{{ item.desc }}</text>
							</view>
						</view>
						<view v-if="sourceItems.length===0" class="empty">纸箱空空如也</view>
					</scroll-view>
				</view>

				<view class="right-box">
					<text class="sub-title">放入目标容器</text>
					<scroll-view scroll-y class="scroll-area">
						<view v-for="(rooms, rName) in allContainers" :key="rName" class="room-group">
							<text class="room-name">📍 {{ rName }}</text>
							<view class="target-btn" v-for="(items, cName) in rooms" :key="cName"
								@click="transferItem(cName, rName)">
								放入 {{ cName }} ({{ items.length }})
							</view>
						</view>
					</scroll-view>
				</view>
			</view>

			<view v-else class="single-view">
				<scroll-view scroll-y class="scroll-area-full">
					<view class="item-grid">
						<view class="goods-card" v-for="(item, idx) in targetContainerItems" :key="item.id">
							<view class="goods-icon">{{ item.icon }}</view>
							<text class="goods-name">{{ item.name }}</text>
							<button class="use-btn" @click="$emit('use', item, containerName, idx)">拿出 / 使用</button>
						</view>
					</view>
					<view v-if="targetContainerItems.length===0" class="empty">里面空空如也</view>
				</scroll-view>
			</view>

		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		computed
	} from 'vue';

	const props = defineProps({
		visible: {
			type: Boolean,
			default: false
		},
		containerName: {
			type: String,
			default: ''
		},
		economy: {
			type: Object,
			default: () => ({})
		}
	});

	const emit = defineEmits(['close', 'transfer', 'use']);
	const selectedItem = ref(null);

	// 提取数据
	const sourceItems = computed(() => props.economy?.courierBox || []);
	const allContainers = computed(() => props.economy?.containers || {});

	// 查找特定容器的物品 (遍历全屋找这个名字的容器)
	const targetContainerItems = computed(() => {
		if (!props.economy?.containers) return [];
		for (const rName in props.economy.containers) {
			if (props.economy.containers[rName][props.containerName]) {
				return props.economy.containers[rName][props.containerName];
			}
		}
		return [];
	});

	// 执行转移（点击右侧的放入按钮）
	const transferItem = (targetContainerName, roomName) => {
		if (!selectedItem.value) return uni.showToast({
			title: '请先在左侧点选要收纳的物品',
			icon: 'none'
		});
		emit('transfer', {
			item: selectedItem.value,
			targetContainer: targetContainerName,
			roomName
		});
		selectedItem.value = null; // 重置选中状态
	};
</script>

<style lang="scss" scoped>
	.modal-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.panel-container {
		width: 90%;
		height: 75vh;
		background-color: var(--bg-color);
		border-radius: 24rpx;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		padding: 30rpx;
		background-color: var(--card-bg);
		border-bottom: 1px solid var(--border-color);

		.title {
			font-size: 32rpx;
			font-weight: bold;
			color: var(--text-color);
		}

		.close-btn {
			font-size: 36rpx;
			color: var(--text-sub);
		}
	}

	/* 分栏模式 (快递箱) */
	.split-view {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.left-box {
		flex: 1;
		border-right: 1px solid var(--border-color);
		display: flex;
		flex-direction: column;
	}

	.right-box {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: var(--tool-bg);
	}

	.sub-title {
		padding: 20rpx;
		font-size: 26rpx;
		font-weight: bold;
		color: var(--text-sub);
		background: var(--card-bg);
		text-align: center;
		border-bottom: 1px solid var(--border-color);
	}

	.scroll-area {
		flex: 1;
		padding: 20rpx;
	}

	/* 物品卡片 */
	.item-card {
		display: flex;
		align-items: center;
		padding: 16rpx;
		background: var(--card-bg);
		border: 2px solid var(--border-color);
		border-radius: 12rpx;
		margin-bottom: 16rpx;
		transition: all 0.2s;

		&.selected {
			border-color: #007aff;
			background: rgba(0, 122, 255, 0.1);
		}

		.item-icon {
			font-size: 48rpx;
			margin-right: 16rpx;
		}

		.item-name {
			font-size: 26rpx;
			font-weight: bold;
			color: var(--text-color);
			display: block;
		}

		.item-desc {
			font-size: 20rpx;
			color: var(--text-sub);
		}
	}

	/* 右侧容器按钮 */
	.room-group {
		margin-bottom: 30rpx;
	}

	.room-name {
		font-size: 24rpx;
		color: var(--text-color);
		font-weight: bold;
		margin-bottom: 12rpx;
		display: block;
	}

	.target-btn {
		background: #fff3e0;
		color: #ef6c00;
		padding: 16rpx;
		border-radius: 12rpx;
		font-size: 24rpx;
		text-align: center;
		margin-bottom: 12rpx;
		border: 1px solid #ffe0b2;
	}

	.target-btn:active {
		background: #ffe0b2;
	}

	/* 网格模式 (普通家具) */
	.single-view {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.scroll-area-full {
		flex: 1;
		padding: 30rpx;
	}

	.item-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20rpx;
	}

	.goods-card {
		background: var(--card-bg);
		border: 1px solid var(--border-color);
		border-radius: 16rpx;
		padding: 20rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;

		.goods-icon {
			font-size: 60rpx;
			margin-bottom: 10rpx;
		}

		.goods-name {
			font-size: 26rpx;
			font-weight: bold;
			color: var(--text-color);
			margin-bottom: 16rpx;
		}
	}

	.use-btn {
		width: 100%;
		height: 50rpx;
		line-height: 50rpx;
		font-size: 22rpx;
		background: #007aff;
		color: white;
		border-radius: 25rpx;
		margin: 0;
	}

	.empty {
		text-align: center;
		color: var(--text-sub);
		font-size: 26rpx;
		margin-top: 100rpx;
	}
</style>