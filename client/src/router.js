// ACTIVE: maps each URL in the browser to a Vue view. Navigation is handled in the browser, without a page reload.
// createWebHistory gives normal URLs (no # in them).
import { createRouter, createWebHistory } from 'vue-router'
// auth is the shared login state used by the guard at the bottom.
import { auth } from './stores/auth'
// The imports below are the page views; each one lives in client/src/views.
import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'
import ProfileView from './views/ProfileView.vue'
import EditProfileView from './views/EditProfileView.vue'
import BuildingSpotsView from './views/BuildingSpotsView.vue'
import BuildingView from './views/BuildingView.vue'
import FloorView from './views/FloorView.vue'
import SpotDetailView from './views/SpotDetailView.vue'
// CompareView is the side-by-side comparison page (/compare).
import CompareView from './views/CompareView.vue'
import ReviewFormView from './views/ReviewFormView.vue'
import MyReviewsView from './views/MyReviewsView.vue'
import ReportFormView from './views/ReportFormView.vue'
import FavouritesView from './views/FavouritesView.vue'
import AdminBuildingsView from './views/AdminBuildingsView.vue'
import BuildingFormView from './views/BuildingFormView.vue'
import AdminSpotsView from './views/AdminSpotsView.vue'
import SpotFormView from './views/SpotFormView.vue'
import AdminReportsView from './views/AdminReportsView.vue'

// Existing note: the meta flags are read by the guard below.
// meta.requiresAuth / meta.requiresAdmin are checked in the guard below.
// meta.showMap shows the floating minimap (components/MiniMap.vue) on that page.
// One entry per URL. path is the URL, component is the view to show.
const routes = [
  // public
  // Public pages.
  { path: '/login', name: 'login', component: LoginView },
  { path: '/register', name: 'register', component: RegisterView },

  // any logged-in user
  // Home lists the buildings. showMap turns on the floating minimap.
  { path: '/', name: 'home', component: HomeView, meta: { requiresAuth: true, showMap: true } },
  { path: '/profile', component: ProfileView, meta: { requiresAuth: true } },
  { path: '/profile/edit', component: EditProfileView, meta: { requiresAuth: true } },
  // (.*) lets a building name contain a slash, e.g. "School of Social Sciences / College of Integrative Studies"
  { path: '/building/:name(.*)/floor/:floor', component: FloorView, meta: { requiresAuth: true, showMap: true } },
  { path: '/building/:name(.*)', component: BuildingView, meta: { requiresAuth: true, showMap: true } },
  // A building's spots, with the Compare buttons. :name is the building name.
  { path: '/building/:name', component: BuildingView, meta: { requiresAuth: true, showMap: true } },
  // The legacy comparison list remains available as an explicit compatibility route.
  { path: '/building/:name/spots', component: BuildingSpotsView, meta: { requiresAuth: true, showMap: true } },
  // Floor mapping keeps the latest main route while comparison remains a tray action.
  { path: '/building/:name/floor/:floor', component: FloorView, meta: { requiresAuth: true, showMap: true } },
  // One spot's detail page, which also has a Compare button. :id is the spot id.
  { path: '/spots/:id', component: SpotDetailView, meta: { requiresAuth: true } },
  // The comparison page. It reads ?ids=a,b[,c] from the URL and requires login.
  { path: '/compare', component: CompareView, meta: { requiresAuth: true } },
  // Pages for writing and editing reviews and reports.
  { path: '/spots/:spotId/reviews/new', component: ReviewFormView, meta: { requiresAuth: true } },
  { path: '/reviews/:id/edit', component: ReviewFormView, meta: { requiresAuth: true } },
  { path: '/reviews/:reviewId/report', component: ReportFormView, meta: { requiresAuth: true } },
  { path: '/reports/:id/edit', component: ReportFormView, meta: { requiresAuth: true } },
  { path: '/my-reviews', component: MyReviewsView, meta: { requiresAuth: true } },
  { path: '/favourites', component: FavouritesView, meta: { requiresAuth: true } },

  // admin only
  // Admin-only pages.
  { path: '/admin/buildings', component: AdminBuildingsView, meta: { requiresAdmin: true } },
  { path: '/admin/buildings/new', component: BuildingFormView, meta: { requiresAdmin: true } },
  { path: '/admin/buildings/:postal/edit', component: BuildingFormView, meta: { requiresAdmin: true } },
  { path: '/admin/spots', component: AdminSpotsView, meta: { requiresAdmin: true } },
  { path: '/admin/spots/new', component: SpotFormView, meta: { requiresAdmin: true } },
  { path: '/admin/spots/:id/edit', component: SpotFormView, meta: { requiresAdmin: true } },
  { path: '/admin/reports', component: AdminReportsView, meta: { requiresAdmin: true } },

  // Existing note: any unknown URL goes to the home page.
  // unknown URL -> home
  // A catch-all pattern that matches every other path.
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

// Build the router object.
const router = createRouter({
  // History mode uses real paths.
  history: createWebHistory(),
  // The route table from above.
  routes,
})

// Existing note: the guard improves usability only, because the server still checks every request.
// The guard only improves UX (no flash of pages you can't use).
// The real protection is the Express middleware on each /api route.
// Runs before every navigation. It asks the server who is logged in (GET /api/me).
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

// Export for main.js.
export default router
