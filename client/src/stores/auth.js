import { reactive } from 'vue'
import { api } from '../api.js'

// A module-level promise lets multiple guards share one bootstrap request.
let pendingFetch = null

// Who is logged in, shared by every component. The session itself lives on the server;
// this is just a copy of GET /api/me so the UI can show/hide things.
export const auth = reactive({
  // null means logged out, while this flag distinguishes bootstrap from a finished lookup.
  user: null,
  ready: false,
  loading: false,

  // The server remains the authority for the role used by the client guard.
  get isAdmin() {
    return this.user?.role === 'Admin'
  },

  async fetchMe() {
    // Reuse an in-flight lookup so concurrent route guards do not race each other.
    if (pendingFetch) return pendingFetch
    this.loading = true
    pendingFetch = (async () => {
      try {
        // The session cookie is read by the shared API helper and never copied to storage.
        const { user } = await api('/api/me')
        this.user = user
      } catch {
        // A missing or expired session is a normal logged-out state, not a raw error.
        this.user = null
      } finally {
        // Guards may navigate only after the initial session decision is known.
        this.ready = true
        this.loading = false
        pendingFetch = null
      }
      return this.user
    })()
    return pendingFetch
  },

  async logout() {
    // Ask Express to destroy the session before clearing the local display state.
    try {
      await api('/api/logout', { method: 'POST' })
    } finally {
      // Clearing this copy also handles an already-expired network session safely.
      this.user = null
    }
  }
})
