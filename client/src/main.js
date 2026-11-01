// ACTIVE: the browser entry point. client/index.html loads this file.
// createApp builds the Vue application.
import { createApp } from 'vue'
// Bootstrap styles load first so the app theme can override them where needed.
import 'bootstrap/dist/css/bootstrap.min.css'
// Bootstrap JavaScript powers the responsive navbar and admin dropdown.
import 'bootstrap'
// Load the global stylesheet, including the light and dark theme tokens.
import './style.css'
// The root component that holds the nav bar, router outlet, compare tray and minimap.
import App from './App.vue'
// The router decides which view shows for each URL.
import router from './router'

// Create the app, give it the router and mount it on the element with id app in index.html.
createApp(App).use(router).mount('#app')
