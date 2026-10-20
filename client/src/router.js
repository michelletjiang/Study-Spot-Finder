import { createRouter, createWebHistory } from 'vue-router'
import { auth } from './stores/auth'
import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'

// meta.requiresAuth / meta.requiresAdmin are checked in the guard below.
// TODO(M1): add LoginView and RegisterView; add admin pages with meta: { requiresAdmin: true }
const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/', name: 'home', component: HomeView, meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: LoginView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// The guard only improves UX (no flash of pages you can't use).
// The real protection is the Express middleware on each /api route.
router.beforeEach(async (to) => {
  const user = await auth.fetchMe()
  // TODO(M1): redirect to { name: 'login' } once LoginView exists
  if (to.meta.requiresAuth && !user) return { name: 'home' }
  if (to.meta.requiresAdmin && !auth.isAdmin) return { name: 'home' }
})

export default router
