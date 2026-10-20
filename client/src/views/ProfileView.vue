<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import { auth } from '../stores/auth'

// One page for both students and admins (replaces profile.ejs and admin-profile.ejs)
const router = useRouter()

const user = ref(null)
const adminRequest = ref(null)
const pendingRequests = ref([])
const error = ref('')

async function load() {
  try {
    const data = await api('/api/profile')
    user.value = data.user
    adminRequest.value = data.adminRequest
    auth.user = data.user // the role may have changed since login (an admin approved the request)
    if (auth.isAdmin) pendingRequests.value = await api('/api/admin-requests')
  } catch (e) {
    error.value = e.message
  }
}

onMounted(load)

async function requestAdmin() {
  try {
    adminRequest.value = await api('/api/admin-requests', { method: 'POST' })
  } catch (e) {
    error.value = e.message
  }
}

async function processRequest(req, action) {
  try {
    await api(`/api/admin-requests/${req._id}/${action}`, { method: 'POST' })
    pendingRequests.value = pendingRequests.value.filter(r => r._id !== req._id)
  } catch (e) {
    error.value = e.message
  }
}

async function deleteAccount() {
  if (!confirm('Delete your account? This cannot be undone.')) return
  try {
    await api('/api/profile', { method: 'DELETE' })
    auth.user = null
    router.push('/login')
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <p v-if="error" style="color: red">{{ error }}</p>
  <template v-if="user">
    <h1 v-if="auth.isAdmin">Welcome, Admin {{ user.username }}!🤩</h1>
    <h1 v-else>Welcome to your Student Profile, {{ user.username }}!🤓</h1>
    <p><strong>Username:</strong> {{ user.username }}</p>
    <p><strong>Email:</strong> {{ user.email }}</p>
    <p><strong>Your school(s):</strong></p>
    <ul>
      <li v-for="sch in user.school" :key="sch">{{ sch }}</li>
    </ul>
    <p><strong>Type of account:</strong> {{ user.role }}</p>
    <p><strong>Member since:</strong> {{ new Date(user.createdAt).toDateString() }}</p>

    <button @click="router.push('/profile/edit')">Edit Profile</button>
    <button @click="deleteAccount">Delete Account</button>
    <br>
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
        <tr><th>Username</th><th>Requested At</th><th>Action</th></tr>
        <tr v-for="req in pendingRequests" :key="req._id">
          <td>{{ req.username }}</td>
          <td>{{ new Date(req.createdAt).toDateString() }}</td>
          <td>
            <button @click="processRequest(req, 'approve')">Approve</button>
            <button @click="processRequest(req, 'deny')">Deny</button>
          </td>
        </tr>
      </table>
    </template>
  </template>
  <p v-else-if="!error">Loading...</p>
</template>
