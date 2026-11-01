import { createApp } from 'vue'
import 'bootstrap/dist/css/bootstrap.min.css' // before style.css so our styles win where they overlap
import 'bootstrap' // navbar toggler + dropdown (data-bs-* attributes)
import './style.css'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
