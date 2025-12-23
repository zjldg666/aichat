<script>
	// 🌟 1. 尝试使用 import。如果还报 module 错误，请将这一行改为：
	// const { DB } = require('@/utils/db.js');
	import { DB } from '@/utils/db.js';
import { useTheme } from '@/composables/useTheme.js';

	export default {
		onLaunch: function() {
		
			const { initTheme } = useTheme();
			initTheme(); // 初始化导航栏颜色
			console.log('App Launch');
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


<style lang="scss">
/* 每个页面公共css */
@import '@/uni.scss';

/* =========================================================
   🌞 默认主题 (Day Mode) 
   ========================================================= */
page {
    /* 定义变量：页面级 */
    --bg-color: #f5f5f5;           /* 整体大背景 */
    --card-bg: #ffffff;            /* 卡片/内容块背景 */
    --text-color: #333333;         /* 主标题文字 */
    --text-sub: #666666;           /* 次要/描述文字 */
    --border-color: #eeeeee;       /* 边框/分割线 */
    --input-bg: #ffffff;           /* 输入框背景 */
    --pill-bg: #ffffff;            /* 胶囊/标签背景 */
    --tool-bg: #f9f9f9;            /* 底部工具栏背景 */
    --shadow: 0 4rpx 12rpx rgba(0,0,0,0.05); /* 阴影 */
    --nav-bg: #ffffff;             /* 自定义导航栏背景 */
}

/* =========================================================
   🌙 夜间模式 (Dark Mode) - 当页面容器有 .dark-mode 类时生效
   ========================================================= */
.dark-mode {
    --bg-color: #121212;           /* 深黑背景 */
    --card-bg: #1e1e1e;            /* 深灰卡片 */
    --text-color: #e0e0e0;         /* 浅灰文字 */
    --text-sub: #aaaaaa;           /* 暗灰文字 */
    --border-color: #333333;       /* 深色边框 */
    --input-bg: #2c2c2c;           /* 输入框深色 */
    --pill-bg: #252525;            /* 胶囊深色 */
    --tool-bg: #1e1e1e;            /* 工具栏深色 */
    --shadow: 0 4rpx 12rpx rgba(0,0,0,0.5); /* 更深的阴影 */
    --nav-bg: #1e1e1e;             /* 导航栏变黑 */
}

/* 全局应用背景色 */
page {
    background-color: var(--bg-color);
    color: var(--text-color);
    transition: background-color 0.3s, color 0.3s;
}

/* 修复 scroll-view 在夜间模式下的默认背景 */
scroll-view {
    background-color: transparent;
}
</style>

