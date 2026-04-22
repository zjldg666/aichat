// AiChat/utils/shop-data.js

export const DEFAULT_SHOP_CATALOG = [
	{
		mainType: '物品',
		categoryName: '生鲜食材 (存入冰箱)',
		items: [{
				name: '顶级和牛',
				icon: '🥩',
				price: 200,
				type: 'food',
				desc: '做饭用，香气四溢',
				maxUses: 1
			},
			{
				name: '新鲜鸡蛋',
				icon: '🥚',
				price: 15,
				type: 'food',
				desc: '居家必备食材',
				maxUses: 1
			},
			{
				name: '西红柿',
				icon: '🍅',
				price: 10,
				type: 'food',
				desc: '健康蔬菜',
				maxUses: 1
			},
			{
				name: '纯牛奶',
				icon: '🥛',
				price: 12,
				type: 'drink',
				desc: '营养早餐必备',
				maxUses: 1
			},
			{
				name: '速冻水饺',
				icon: '🥟',
				price: 20,
				type: 'food',
				desc: '懒人充饥神器',
				maxUses: 1
			},
			{
				name: '冰镇啤酒',
				icon: '🍺',
				price: 25,
				type: 'drink',
				desc: '微醺专属',
				maxUses: 1
			},
			{
				name: '新鲜草莓',
				icon: '🍓',
				price: 35,
				type: 'food',
				desc: '酸甜可口的水果',
				maxUses: 1
			}
		]
	},
	{
		mainType: '物品',
		categoryName: '日用洗浴 (存入浴室柜)',
		items: [{
				name: '柔软浴球',
				icon: '🧽',
				price: 30,
				type: 'bath',
				desc: '洗澡互动道具',
				maxUses: 20
			},
			{
				name: '玫瑰沐浴露',
				icon: '🧴',
				price: 68,
				type: 'bath',
				desc: '洗完香喷喷的',
				maxUses: 30
			},
			{
				name: '高级搓澡巾',
				icon: '🧤',
				price: 18,
				type: 'bath',
				desc: '搓背专用神器',
				maxUses: 15
			},
			{
				name: '薄荷牙膏',
				icon: '🪥',
				price: 25,
				type: 'bath',
				desc: '清新口气',
				maxUses: 40
			},
			{
				name: '柔顺护发素',
				icon: '🧴',
				price: 55,
				type: 'bath',
				desc: '头发柔顺光泽',
				maxUses: 30
			}
		]
	},
	{
		mainType: '物品',
		categoryName: '精美礼物 (存入床头柜)',
		items: [{
				name: '红玫瑰花束',
				icon: '🌹',
				price: 99,
				type: 'gift',
				desc: '送给她增加好感',
				maxUses: 1
			},
			{
				name: '心形巧克力',
				icon: '🍫',
				price: 50,
				type: 'gift',
				desc: '甜蜜的惊喜',
				maxUses: 1
			},
			{
				name: '香薰蜡烛',
				icon: '🕯️',
				price: 88,
				type: 'gift',
				desc: '制造浪漫氛围',
				maxUses: 5
			},
			{
				name: '毛绒小熊',
				icon: '🧸',
				price: 120,
				type: 'gift',
				desc: '睡觉抱着很安心',
				maxUses: 100
			}
		]
	},
	{
		mainType: '容器',
		categoryName: '家具与收纳 (布置到房间)',
		items: [{
				name: '大衣柜',
				icon: '🚪',
				price: 500,
				type: 'furniture',
				desc: '用于收纳各种衣物',
				maxUses: 1
			},
			{
				name: '零食储物柜',
				icon: '🗄️',
				price: 150,
				type: 'furniture',
				desc: '专门用来放各种零食',
				maxUses: 1
			},
			{
				name: '精美首饰盒',
				icon: '🧰',
				price: 80,
				type: 'furniture',
				desc: '可以放在床头柜上',
				maxUses: 1
			}
		]
	}
];