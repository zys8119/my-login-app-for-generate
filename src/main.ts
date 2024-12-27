import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createDiscreteApi } from 'naive-ui'
import 'es-drager/lib/style.css'

const { message, notification, dialog, loadingBar } = createDiscreteApi(
  ['message', 'dialog', 'notification', 'loadingBar']
)

const app = createApp(App)
app.use(router)

// 全局挂载
app.config.globalProperties.$message = message
app.config.globalProperties.$notification = notification
app.config.globalProperties.$dialog = dialog
app.config.globalProperties.$loadingBar = loadingBar

app.mount('#app') 