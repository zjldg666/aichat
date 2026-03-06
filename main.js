import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'

import * as Pinia from 'pinia' // 新增：引入 Pinia 管家
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia' // 第一步：明确引入 createPinia

export function createApp() {
  const app = createSSRApp(App)
  
  const pinia = createPinia() // 第二步：创建管家实例
  app.use(pinia) // 第三步：让 app 使用管家

  return {
    app,
    pinia // 第四步：把管家一起返回（uni-app 规定要在返回对象里包含 pinia）
  }
}
// #endif