<script>
import { setActivePinia } from 'pinia';
import { pinia } from '@/stores/pinia.js';
import { DB } from '@/utils/db.js';
import { useTheme } from '@/composables/useTheme.js';
import { bootstrapTown } from '@/services/townBootstrapService.js';
import { useTownStore } from '@/stores/useTownStore.js';

export default {
  onLaunch() {
    const { initTheme } = useTheme();
    initTheme();
    console.log('App Launch');

    setActivePinia(pinia);
    const townStore = useTownStore();

    const handleInitializationError = (err) => {
      townStore.initializationError = err;
      townStore.isReady = false;
      townStore.isInitializing = false;
      console.error('[System] Initialization failed:', err);
    };

    const initializeTown = async () => {
      await bootstrapTown();
      console.log('[System] Database initialized, town bootstrap 初始化完成。');
    };

    // #ifdef APP-PLUS
    DB.init()
      .then(initializeTown)
      .catch(handleInitializationError);
    // #endif

    // #ifndef APP-PLUS
    initializeTown().catch(handleInitializationError);
    // #endif
  },
  onShow() {
    console.log('App Show');
  },
  onHide() {
    console.log('App Hide');
  }
};
</script>

<style lang="scss">
@import '@/uni.scss';

page {
  --bg-color: #f5f5f5;
  --card-bg: #ffffff;
  --text-color: #333333;
  --text-sub: #666666;
  --border-color: #eeeeee;
  --input-bg: #ffffff;
  --pill-bg: #ffffff;
  --tool-bg: #f9f9f9;
  --shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  --nav-bg: #ffffff;
}

.dark-mode {
  --bg-color: #121212;
  --card-bg: #1e1e1e;
  --text-color: #e0e0e0;
  --text-sub: #aaaaaa;
  --border-color: #333333;
  --input-bg: #2c2c2c;
  --pill-bg: #252525;
  --tool-bg: #1e1e1e;
  --shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.5);
  --nav-bg: #1e1e1e;
}

page {
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: background-color 0.3s, color 0.3s;
}

scroll-view {
  background-color: transparent;
}
</style>
