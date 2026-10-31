import test from 'node:test'
import assert from 'node:assert/strict'
import { api } from '../src/api.js'
import { auth } from '../src/stores/auth.js'

// Build a small Response-like object so the helper is tested without a server or database.
function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, async json() { return body } }
}

test('api sends the session cookie and returns JSON payloads', async () => {
  let request
  globalThis.fetch = async (path, options) => {
    request = { path, options }
    return response({ user: { role: 'Student' } })
  }
  const result = await api('/api/me')
  assert.deepEqual(result, { user: { role: 'Student' } })
  assert.equal(request.options.credentials, 'include')
})

test('api exposes safe HTTP validation data and handles empty success responses', async () => {
  globalThis.fetch = async () => response({ message: 'Invalid email or password' }, 401)
  await assert.rejects(api('/api/login'), (error) => {
    assert.equal(error.status, 401)
    assert.equal(error.message, 'Invalid email or password')
    return true
  })
  globalThis.fetch = async () => response(null, 204)
  assert.equal(await api('/api/logout'), null)
})

test('api turns network failures into a safe user-facing error', async () => {
  globalThis.fetch = async () => { throw new Error('private transport detail') }
  await assert.rejects(api('/api/me'), (error) => {
    assert.equal(error.status, 0)
    assert.equal(error.message, 'Unable to reach Study Spot Finder. Please try again.')
    return true
  })
})

test('auth bootstrap keeps the server role and logout clears local state', async () => {
  const calls = []
  globalThis.fetch = async (path) => {
    calls.push(path)
    if (path === '/api/me') return response({ user: { username: 'admin', role: 'Admin' } })
    return response({ user: null })
  }
  await auth.fetchMe()
  assert.equal(auth.user.role, 'Admin')
  assert.equal(auth.isAdmin, true)
  assert.equal(auth.ready, true)
  await auth.logout()
  assert.equal(auth.user, null)
  assert.deepEqual(calls, ['/api/me', '/api/logout'])
})
