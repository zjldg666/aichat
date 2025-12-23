// composables/useTheme.js
import { ref } from 'vue';

// 1. 全局状态 (单例模式，保证所有页面状态同步)
const isDarkMode = ref(uni.getStorageSync('app_theme') === 'dark');

export function useTheme() {
    
    // 2. 应用主题到原生 UI (顶部栏 & 底部栏)
    const applyNativeTheme = () => {
            const dark = isDarkMode.value;
            
            // A. 设置顶部导航栏颜色 (通常都支持，但也建议加个 try-catch)
            try {
                uni.setNavigationBarColor({
                    frontColor: dark ? '#ffffff' : '#000000',
                    backgroundColor: dark ? '#121212' : '#ffffff',
                    animation: { duration: 300 }
                });
            } catch (e) { console.warn('setNavigationBarColor not supported'); }
    
            // B. 设置底部 TabBar 样式
            try {
                uni.setTabBarStyle({
                    backgroundColor: dark ? '#191919' : '#ffffff',
                    color: dark ? '#666666' : '#999999',
                    selectedColor: '#007aff',
                    borderStyle: dark ? 'black' : 'white'
                });
            } catch (e) { console.warn('setTabBarStyle not supported'); }
            
            // 🔥🔥🔥【重点修复这里】🔥🔥🔥
            // C. 设置页面背景色 (兜底)
            // 先判断 uni.setBackgroundColor 是否存在，只有存在时才调用
            if (typeof uni.setBackgroundColor === 'function') {
                uni.setBackgroundColor({
                    backgroundColor: dark ? '#121212' : '#f5f5f5',
                    backgroundColorTop: dark ? '#121212' : '#f5f5f5',
                    backgroundColorBottom: dark ? '#121212' : '#f5f5f5',
                });
            }
        };

    // 3. 切换开关
    const toggleTheme = () => {
        isDarkMode.value = !isDarkMode.value;
        uni.setStorageSync('app_theme', isDarkMode.value ? 'dark' : 'light');
        applyNativeTheme(); // 立即生效原生部分
    };

    // 4. 初始化 (在 App 启动时调用)
    const initTheme = () => {
        applyNativeTheme();
    };

    return {
        isDarkMode,
        toggleTheme,
        initTheme,
		applyNativeTheme
    };
}