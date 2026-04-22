<template>
	<view v-if="visible" class="modal-mask" @click="$emit('close')">
		<view class="shop-container" @click.stop>
			<view class="shop-header">
				<view class="header-left">
					<text class="title">🛒 手机网购超市</text>
					<text class="add-btn" @click="showAddForm = true">➕ 添加</text>
					<text class="add-btn" style="background:#e8f5e9; color:#2e7d32;" @click="showWardrobe = true">👗
						制衣</text>
				</view>
				<view class="wallet-box">
					<text class="wallet-icon">💰</text>
					<text class="wallet-amount">¥{{ wallet }}</text>
				</view>
			</view>

			<scroll-view scroll-y class="goods-scroll">
				<view v-for="(cat, idx) in shopCatalog" :key="idx" class="category-block">
					<view class="cat-title">
						<text class="cat-line"></text>
						<text>【{{ cat.mainType }}】{{ cat.categoryName }}</text>
						<text class="cat-line"></text>
					</view>

					<view class="goods-grid">
						<view v-for="(item, itemIdx) in cat.items" :key="item.name" class="goods-card">
							<view class="card-actions">
								<view class="action-btn" @click.stop="openEditPrice(item, idx, itemIdx)">✏️</view>
								<view class="action-btn" @click.stop="deleteItem(idx, itemIdx)">🗑️</view>
							</view>

							<view class="goods-icon">{{ item.icon }}</view>
							<text class="goods-name">{{ item.name }}</text>
							<text class="goods-desc">{{ item.desc }}</text>

							<text class="goods-desc" style="color: #4caf50;" v-if="item.maxUses > 1">(可用
								{{ item.maxUses }} 次)</text>
							<text class="goods-desc" style="color: #9e9e9e;" v-else>(一次性)</text>

							<button class="buy-btn" :class="{ 'disabled': wallet < item.price }"
								@click="handleBuy(item)">
								¥{{ item.price }} 购买
							</button>
						</view>
					</view>
				</view>
				<view style="height: 40rpx;"></view>
			</scroll-view>
		</view>

		<view v-if="showAddForm" class="add-form-mask" @click.stop="showAddForm = false">
			<view class="add-form" @click.stop style="max-height: 80vh; overflow-y: auto;">
				<text class="form-title">✨ 添加商品/容器</text>

				<view class="form-item">
					<text>主类型:</text>
					<radio-group @change="e => newItem.mainType = e.detail.value"
						style="display: flex; gap: 20rpx; align-items: center; flex: 1;">
						<label style="display: flex; align-items: center;">
							<radio value="物品" :checked="newItem.mainType === '物品'" style="transform:scale(0.8)" />物品
						</label>
						<label style="display: flex; align-items: center;">
							<radio value="容器" :checked="newItem.mainType === '容器'" style="transform:scale(0.8)" />容器
						</label>
					</radio-group>
				</view>

				<view class="form-item">
					<text>分类名:</text>
					<input class="input-box" v-model="newItem.categoryName" placeholder="例: 服装 / 洗漱" />
				</view>

				<view class="form-item">
					<text>名称:</text>
					<input class="input-box" v-model="newItem.name" placeholder="例: 钻戒 / 储物柜" />
				</view>
				<view class="form-item">
					<text>图标:</text>
					<input class="input-box" v-model="newItem.icon" placeholder="例: 💍 (输入Emoji)" />
				</view>
				<view class="form-item">
					<text>价格:</text>
					<input class="input-box" type="number" v-model="newItem.price" placeholder="例: 999" />
				</view>
				<view class="form-item">
					<text>耐久度:</text>
					<input class="input-box" type="number" v-model="newItem.maxUses" placeholder="可用次数，1代表一次性" />
				</view>
				<view class="form-item">
					<text>描述:</text>
					<input class="input-box" v-model="newItem.desc" placeholder="简短描述" />
				</view>
				<view class="form-btns">
					<button class="btn-cancel" @click="showAddForm = false">取消</button>
					<button class="btn-confirm" @click="saveNewItem">保存上架</button>
				</view>
			</view>
		</view>

		<view v-if="showEditForm" class="add-form-mask" @click.stop="showEditForm = false">
			<view class="add-form" @click.stop>
				<text class="form-title">📝 修改商品</text>
				<view class="form-item">
					<text>商品:</text>
					<text style="flex: 1; font-weight: bold;">{{ editingItem.name }}</text>
				</view>
				<view class="form-item">
					<text>价格:</text>
					<input class="input-box" type="number" v-model="editingItem.price" placeholder="请输入新价格" />
				</view>
				<view class="form-item">
					<text>耐久度:</text>
					<input class="input-box" type="number" v-model="editingItem.maxUses" placeholder="可用次数，1代表一次性" />
				</view>
				<view class="form-btns">
					<button class="btn-cancel" @click="showEditForm = false">取消</button>
					<button class="btn-confirm" @click="saveEditPrice">保存</button>
				</view>
			</view>
		</view>

		<view v-if="showWardrobe" class="add-form-mask" @click.stop="showWardrobe = false">
			<ChatWardrobe :list="designList" :currentRole="currentRole"
				@update:list="handleDesignUpdate" @apply="publishOutfit" @close="showWardrobe = false" />
		</view>

	</view>
</template>

<script setup>
	import {
		ref
	} from 'vue';
	import {
		DEFAULT_SHOP_CATALOG
	} from '@/utils/shop-data.js';
	import ChatWardrobe from './ChatWardrobe.vue';
	const props = defineProps({
		visible: {
			type: Boolean,
			default: false
		},
		wallet: {
			type: Number,
			default: 0
		},
		currentRole: {
			type: Object,
			default: () => ({})
		} // ✨ 接收角色数据用于AI生成
	});

	const emit = defineEmits(['close', 'buy']);
	const shopCatalog = ref([]);

	// 表单状态和数据绑定
	const showAddForm = ref(false);
	const newItem = ref({
		mainType: '物品', // ✨ 默认类型
		categoryName: '自定义分类', // ✨ 默认分类名
		name: '',
		icon: '🎁',
		price: 10,
		desc: '',
		maxUses: 1
	});

	const showEditForm = ref(false);
	const editingItem = ref({});
	const editIndex = ref({
		catIdx: -1,
		itemIdx: -1
	});
	// ✨ 新增：制衣间状态与数据
	const showWardrobe = ref(false);
	const designList = ref(uni.getStorageSync('wardrobe_design_list') || []); // 独立存储设计图纸

	const handleDesignUpdate = (newList) => {
		designList.value = newList;
		uni.setStorageSync('wardrobe_design_list', newList);
	};

	// ✨ 核心逻辑：将制衣间设计好的衣服，打包成商品上架到超市
	const publishOutfit = (outfit) => {
		// 寻找服装分类，没有则新建
		let targetCat = shopCatalog.value.find(c => c.mainType === '物品' && c.categoryName === '精美服饰 (存入衣柜)');
		if (!targetCat) {
			targetCat = {
				mainType: '物品',
				categoryName: '精美服饰 (存入衣柜)',
				items: []
			};
			shopCatalog.value.push(targetCat);
		}

		targetCat.items.push({
			name: outfit.name || '定制服装',
			icon: '👗',
			price: 150, // 默认标价150元，玩家可以随后用修改按钮改价
			type: 'outfit', // ✨ 专属的服装物品类型
			desc: outfit.stylePrompt || '量身定制的高级服装',
			maxUses: 999, // 衣服耐久很高
			outfitData: outfit // ✨ 将服装的各个部位数据隐藏在商品属性里
		});

		uni.setStorageSync('shop_catalog', shopCatalog.value);
		uni.showToast({
			title: '已作为商品上架超市！',
			icon: 'success'
		});
		showWardrobe.value = false;
	};
	// 统一加载逻辑
	const loadCatalog = () => {
		let stored = uni.getStorageSync('shop_catalog');
		// ✨ 兼容防崩：如果缓存里是老结构（包含 category 字段），则重置为新的 DEFAULT_SHOP_CATALOG
		if (!stored || stored.length === 0 || stored[0].category !== undefined) {
			stored = JSON.parse(JSON.stringify(DEFAULT_SHOP_CATALOG));
			uni.setStorageSync('shop_catalog', stored);
		}
		shopCatalog.value = stored;
	};
	loadCatalog();

	// ✨ 添加商品 (支持动态分组与类型绑定)
	const saveNewItem = () => {
		if (!newItem.value.name) return uni.showToast({
			title: '请输入名称',
			icon: 'none'
		});
		if (!newItem.value.categoryName) return uni.showToast({
			title: '请输入分类名',
			icon: 'none'
		});

		// 查找大类型与分类名完全一致的分组，没有则新建
		let targetCat = shopCatalog.value.find(c => c.mainType === newItem.value.mainType && c.categoryName === newItem
			.value.categoryName);

		if (!targetCat) {
			targetCat = {
				mainType: newItem.value.mainType,
				categoryName: newItem.value.categoryName,
				items: []
			};
			shopCatalog.value.push(targetCat);
		}

		// 核心判定：如果主类型选了【容器】，则赋予底层的 furniture 类型，以便在包裹里被识别为家具
		const itemType = newItem.value.mainType === '容器' ? 'furniture' : 'custom';

		targetCat.items.push({
			name: newItem.value.name,
			icon: newItem.value.icon || '🎁',
			price: Number(newItem.value.price) || 0,
			type: itemType,
			desc: newItem.value.desc || '',
			maxUses: Number(newItem.value.maxUses) || 1
		});

		uni.setStorageSync('shop_catalog', shopCatalog.value);
		uni.showToast({
			title: '上架成功',
			icon: 'success'
		});
		showAddForm.value = false;

		// 重置表单，但保留刚才选择的分类方便连续添加
		newItem.value = {
			mainType: newItem.value.mainType,
			categoryName: newItem.value.categoryName,
			name: '',
			icon: '🎁',
			price: 10,
			desc: '',
			maxUses: 1
		};
	};

	// 打开修改弹窗
	const openEditPrice = (item, catIdx, itemIdx) => {
		editingItem.value = {
			...item
		};
		editIndex.value = {
			catIdx,
			itemIdx
		};
		showEditForm.value = true;
	};

	// 保存修改结果
	const saveEditPrice = () => {
		const newPrice = Number(editingItem.value.price);
		if (isNaN(newPrice) || newPrice < 0) {
			return uni.showToast({
				title: '请输入有效价格',
				icon: 'none'
			});
		}

		const {
			catIdx,
			itemIdx
		} = editIndex.value;
		shopCatalog.value[catIdx].items[itemIdx].price = newPrice;
		shopCatalog.value[catIdx].items[itemIdx].maxUses = Number(editingItem.value.maxUses) || 1;

		uni.setStorageSync('shop_catalog', shopCatalog.value);
		uni.showToast({
			title: '修改成功',
			icon: 'success'
		});
		showEditForm.value = false;
	};

	// 删除商品
	const deleteItem = (catIdx, itemIdx) => {
		uni.showModal({
			title: '确认下架',
			content: '确定要从超市下架这个商品吗？',
			success: (res) => {
				if (res.confirm) {
					shopCatalog.value[catIdx].items.splice(itemIdx, 1);
					// 如果该分类下没有商品了，直接删除整个分类分组
					if (shopCatalog.value[catIdx].items.length === 0) {
						shopCatalog.value.splice(catIdx, 1);
					}
					uni.setStorageSync('shop_catalog', shopCatalog.value);
					uni.showToast({
						title: '已下架',
						icon: 'success'
					});
				}
			}
		});
	};

	const handleBuy = (item) => {
		if (props.wallet < item.price) return;
		emit('buy', item);
	};
</script>

<style lang="scss" scoped>
	/* 此处保留你原有的样式代码即可，没有改动需求 */
	.modal-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 9999;
		display: flex;
		align-items: flex-end;
	}

	.shop-container {
		width: 100%;
		height: 75vh;
		background-color: var(--bg-color);
		border-radius: 30rpx 30rpx 0 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.shop-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 30rpx 40rpx;
		background-color: var(--card-bg);
		border-bottom: 1px solid var(--border-color);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 20rpx;
	}

	.title {
		font-size: 32rpx;
		font-weight: bold;
		color: var(--text-color);
	}

	.add-btn {
		font-size: 24rpx;
		background-color: #f0f0f0;
		color: #333;
		padding: 6rpx 16rpx;
		border-radius: 20rpx;
	}

	.wallet-box {
		background: rgba(255, 153, 0, 0.1);
		padding: 10rpx 20rpx;
		border-radius: 20rpx;
		display: flex;
		align-items: center;
	}

	.wallet-amount {
		color: #e67e22;
		font-weight: bold;
		font-size: 28rpx;
		margin-left: 8rpx;
	}

	.goods-scroll {
		flex: 1;
		height: 0;
		padding: 20rpx;
		box-sizing: border-box;
	}

	.category-block {
		margin-bottom: 40rpx;
	}

	.cat-title {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 26rpx;
		color: var(--text-sub);
		margin-bottom: 20rpx;
		gap: 20rpx;

		.cat-line {
			height: 1px;
			width: 60rpx;
			background-color: var(--border-color);
		}
	}

	.goods-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 20rpx;
	}

	.goods-card {
		position: relative;
		background-color: var(--card-bg);
		border: 1px solid var(--border-color);
		border-radius: 16rpx;
		padding: 20rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.card-actions {
		position: absolute;
		top: 10rpx;
		right: 10rpx;
		display: flex;
		gap: 10rpx;
	}

	.action-btn {
		font-size: 24rpx;
		padding: 5rpx;
		opacity: 0.5;
	}

	.action-btn:active {
		opacity: 1;
		transform: scale(1.1);
	}

	.goods-icon {
		font-size: 60rpx;
		margin-bottom: 10rpx;
	}

	.goods-name {
		font-size: 28rpx;
		font-weight: bold;
		color: var(--text-color);
		margin-bottom: 8rpx;
	}

	.goods-desc {
		font-size: 22rpx;
		color: var(--text-sub);
		margin-bottom: 10rpx;
	}

	.buy-btn {
		width: 100%;
		height: 60rpx;
		line-height: 60rpx;
		font-size: 24rpx;
		background-color: #007aff;
		color: white;
		border-radius: 30rpx;
		margin-top: 10rpx;

		&.disabled {
			background-color: #ccc;
			color: #fff;
		}
	}

	.add-form-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.6);
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.add-form {
		width: 80%;
		background: var(--card-bg, #fff);
		border-radius: 20rpx;
		padding: 40rpx;
		display: flex;
		flex-direction: column;
	}

	.form-title {
		font-size: 32rpx;
		font-weight: bold;
		text-align: center;
		color: var(--text-color);
		margin-bottom: 30rpx;
	}

	.form-item {
		display: flex;
		align-items: center;
		margin-bottom: 24rpx;

		text {
			width: 90rpx;
			font-size: 28rpx;
			color: var(--text-color);
		}
	}

	.input-box {
		flex: 1;
		height: 70rpx;
		background: var(--input-bg, #f5f5f5);
		border-radius: 12rpx;
		padding: 0 20rpx;
		font-size: 26rpx;
		color: var(--text-color);
	}

	.form-btns {
		display: flex;
		justify-content: space-between;
		margin-top: 30rpx;
		gap: 20rpx;

		button {
			flex: 1;
			height: 70rpx;
			line-height: 70rpx;
			font-size: 28rpx;
			border-radius: 35rpx;
			margin: 0;
		}
	}

	.btn-cancel {
		background: var(--tool-bg, #f0f0f0);
		color: var(--text-color);
	}

	.btn-confirm {
		background: #007aff;
		color: #fff;
	}
</style>