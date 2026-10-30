<script setup>
// ACTIVE: the profile page for students and admins. Admins also see the pending admin requests here.
// ref makes a changing value, onMounted runs code when the page appears.
import { ref, onMounted } from 'vue'
// useRouter navigates.
import { useRouter } from 'vue-router'
// The shared JSON helper.
import { api } from '../api'
// The shared login state.
import { auth } from '../stores/auth'

// Existing note: one page for both roles.
// One page for both students and admins (replaces profile.ejs and admin-profile.ejs)
// The router.
const router = useRouter()

// The profile from the server.
const user = ref(null)
// The user's latest admin request, if any.
const adminRequest = ref(null)
// For admins: the requests waiting for a decision.
const pendingRequests = ref([])
// A message to show on failure.
const error = ref('')

// Load the profile.
async function load() {
  try {
    // GET /api/profile returns the user and their latest admin request.
    const data = await api('/api/profile')
    user.value = data.user
    adminRequest.value = data.adminRequest
    // Refresh the shared user, since an admin may have changed the role.
    auth.user = data.user // the role may have changed since login (an admin approved the request)
    // Admins also load the pending requests (GET /api/admin-requests).
    if (auth.isAdmin) pendingRequests.value = await api('/api/admin-requests')
  } catch (e) {
    error.value = e.message
  }
}

// Load when the page appears.
onMounted(load)

// A student asks to become an admin.
async function requestAdmin() {
  try {
    // POST /api/admin-requests.
    adminRequest.value = await api('/api/admin-requests', { method: 'POST' })
  } catch (e) {
    error.value = e.message
  }
}

// An admin approves or denies a request.
async function processRequest(req, action) {
  try {
    // POST /api/admin-requests/:id/approve or /deny.
    await api(`/api/admin-requests/${req._id}/${action}`, { method: 'POST' })
    // Remove it from the list.
    pendingRequests.value = pendingRequests.value.filter(r => r._id !== req._id)
  } catch (e) {
    error.value = e.message
  }
}

// Delete the logged-in account.
async function deleteAccount() {
  // Ask first.
  if (!confirm('Delete your account? This cannot be undone.')) return
  try {
    // DELETE /api/profile.
    await api('/api/profile', { method: 'DELETE' })
    // Forget the user.
    auth.user = null
    // Go to the login page.
    router.push('/login')
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <!-- Error message. -->
  <p v-if="error" style="color: red">{{ error }}</p>
  <!-- Everything below shows once the profile has loaded. -->
  <template v-if="user">
    <!-- Different heading for admins and students. -->
    <h1 v-if="auth.isAdmin">Welcome, Admin {{ user.username }}!🤩</h1>
    <h1 v-else>Welcome to your Student Profile, {{ user.username }}!🤓</h1>
    <!-- The account details from the server. -->
    <p><strong>Username:</strong> {{ user.username }}</p>
    <p><strong>Email:</strong> {{ user.email }}</p>
    <p><strong>Your school(s):</strong></p>
    <ul>
      <li v-for="sch in user.school" :key="sch">{{ sch }}</li>
    </ul>
    <p><strong>Type of account:</strong> {{ user.role }}</p>
    <p><strong>Member since:</strong> {{ new Date(user.createdAt).toDateString() }}</p>

    <!-- Edit and delete buttons. -->
    <button @click="router.push('/profile/edit')">Edit Profile</button>
    <button @click="deleteAccount">Delete Account</button>
    <br>
    <!-- Shortcuts to favourites and reviews. -->
    <RouterLink to="/favourites">Your Favourite Study Spots</RouterLink><br>
    <RouterLink to="/my-reviews">Your Reviews</RouterLink>
    <br><br>

    <!-- students: ask to become admin -->
    <template v-if="!auth.isAdmin">
      <p v-if="adminRequest?.status === 'Pending'">Your admin request is <strong>pending</strong> approval.</p>
      <template v-else>
        <p v-if="adminRequest?.status === 'Denied'">Your admin request was <strong>denied</strong>.</p>
        <button @click="requestAdmin">Request Admin Access</button>
      </template>
    </template>

    <!-- admins: approve/deny other users -->
    <template v-else>
      <h3>Pending Admin Requests</h3>
      <p v-if="pendingRequests.length === 0">No pending requests.</p>
      <table v-else border="1" cellpadding="5">
        <thead>
          <tr><th>Username</th><th>Requested At</th><th>Action</th></tr>
        </thead>
        <tbody>
          <tr v-for="req in pendingRequests" :key="req._id">
          <td>{{ req.username }}</td>
          <td>{{ new Date(req.createdAt).toDateString() }}</td>
          <td>
            <button @click="processRequest(req, 'approve')">Approve</button>
            <button @click="processRequest(req, 'deny')">Deny</button>
          </td>
          </tr>
        </tbody>
      </table>
    </template>
  </template>
  <p v-else-if="!error">Loading...</p>
</template>
