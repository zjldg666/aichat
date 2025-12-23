<script>
	// 🌟 1. 尝试使用 import。如果还报 module 错误，请将这一行改为：
	// const { DB } = require('@/utils/db.js');
	import { DB } from '@/utils/db.js';

	export default {
		onLaunch: function() {
			console.log('App Launch')
			
			// 🌟 2. 初始化 SQLite 数据库
			// #ifdef APP-PLUS
			DB.init().then(() => {
				console.log('✅ [System] Database initialized successfully.');
			}).catch(err => {
				console.error('❌ [System] Database initialization failed:', err);
			});
			// #endif
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
			// 推送功能已移除，这里不再调用任务排班
		}
	}
</script>

<style>
	/* 每个页面公共css */
	page {
		font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Segoe UI, Arial, Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei', sans-serif;
	}
</style>