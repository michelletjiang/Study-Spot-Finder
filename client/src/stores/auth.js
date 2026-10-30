// ACTIVE: shared login state for every component.
// reactive makes the object update the screen when its fields change.
import { reactive } from 'vue'
// api is the shared JSON fetch helper.
import { api } from '../api'

// Who is logged in, shared by every component. The session itself lives on the server;
// this is just a copy of GET /api/me so the UI can show/hide things.
// One shared object: components import it and see the same data.
export const auth = reactive({
  // The logged-in user, or null.
  user: null,

  // A computed property: true when the user's role is Admin.
  get isAdmin() {
    return this.user?.role === 'Admin'
  },

  // Ask the server who is logged in (GET /api/me). The router guard calls this before each navigation.
  async fetchMe() {
    try {
      // The server returns { user } where user is null if nobody is logged in.
      const { user } = await api('/api/me')
      this.user = user
    // An error also means nobody is logged in.
    } catch {
      this.user = null
    }
    // Return the user so callers can use it straight away.
    return this.user
  },
})
