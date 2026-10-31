import { createRouter, createWebHistory } from 'vue-router'
import { auth } from './stores/auth'
import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'
import ProfileView from './views/ProfileView.vue'
import EditProfileView from './views/EditProfileView.vue'
import BuildingSpotsView from './views/BuildingSpotsView.vue'
import SpotDetailView from './views/SpotDetailView.vue'
import ReviewFormView from './views/ReviewFormView.vue'
import MyReviewsView from './views/MyReviewsView.vue'
import ReportFormView from './views/ReportFormView.vue'
import FavouritesView from './views/FavouritesView.vue'
import AdminBuildingsView from './views/AdminBuildingsView.vue'
import BuildingFormView from './views/BuildingFormView.vue'
import AdminSpotsView from './views/AdminSpotsView.vue'
import SpotFormView from './views/SpotFormView.vue'
import AdminReportsView from './views/AdminReportsView.vue'

// meta.requiresAuth / meta.requiresAdmin are checked in the guard below.
// meta.showMap shows the floating minimap (components/MiniMap.vue) on that page.
const routes = [
  // public
  { path: '/login', name: 'login', component: LoginView },
  { path: '/register', name: 'register', component: RegisterView },

  // any logged-in user
  { path: '/', name: 'home', component: HomeView, meta: { requiresAuth: true, showMap: true } },
  { path: '/profile', component: ProfileView, meta: { requiresAuth: true } },
  { path: '/profile/edit', component: EditProfileView, meta: { requiresAuth: true } },
  { path: '/building/:name', component: BuildingSpotsView, meta: { requiresAuth: true, showMap: true } },
  { path: '/spots/:id', component: SpotDetailView, meta: { requiresAuth: true } },
  { path: '/spots/:spotId/reviews/new', component: ReviewFormView, meta: { requiresAuth: true } },
  { path: '/reviews/:id/edit', component: ReviewFormView, meta: { requiresAuth: true } },
  { path: '/reviews/:reviewId/report', component: ReportFormView, meta: { requiresAuth: true } },
  { path: '/reports/:id/edit', component: ReportFormView, meta: { requiresAuth: true } },
  { path: '/my-reviews', component: MyReviewsView, meta: { requiresAuth: true } },
  { path: '/favourites', component: FavouritesView, meta: { requiresAuth: true } },

  // admin only
  { path: '/admin/buildings', component: AdminBuildingsView, meta: { requiresAdmin: true } },
  { path: '/admin/buildings/new', component: BuildingFormView, meta: { requiresAdmin: true } },
  { path: '/admin/buildings/:postal/edit', component: BuildingFormView, meta: { requiresAdmin: true } },
  { path: '/admin/spots', component: AdminSpotsView, meta: { requiresAdmin: true } },
  { path: '/admin/spots/new', component: SpotFormView, meta: { requiresAdmin: true } },
  { path: '/admin/spots/:id/edit', component: SpotFormView, meta: { requiresAdmin: true } },
  { path: '/admin/reports', component: AdminReportsView, meta: { requiresAdmin: true } },

  // unknown URL -> home
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// The guard only improves UX (no flash of pages you can't use).
// The real protection is the Express middleware on each /api route.
router.beforeEach(async (to) => {
  // Resolve the server session before every navigation, including a hard refresh.
  const user = await auth.fetchMe()
  // Client guards provide navigation UX only; every API route still checks the session server-side.
  if ((to.meta.requiresAuth || to.meta.requiresAdmin) && !user) {
    // Preserve the requested deep link so a successful login can return the student there.
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  // A student must not enter an admin screen even if they type its URL directly.
  if (to.meta.requiresAdmin && !auth.isAdmin) return { name: 'home' }
  // Authenticated users do not need to see public sign-in screens again.
  if ((to.name === 'login' || to.name === 'register') && user) return { name: 'home' }
})

export default router
