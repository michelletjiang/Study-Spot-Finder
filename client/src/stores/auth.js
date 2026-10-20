import { reactive } from 'vue'
import { api } from '../api'

// Who is logged in, shared by every component. The session itself lives on the server;
// this is just a copy of GET /api/me so the UI can show/hide things.
export const auth = reactive({
  user: null,

  get isAdmin() {
    return this.user?.role === 'Admin'
  },

  async fetchMe() {
    try {
      const { user } = await api('/api/me')
      this.user = user
    } catch {
      this.user = null
    }
    return this.user
  },
})
