// Shared helper for calling the Express JSON API.
// Usage: const spots = await api('/api/spots')
//        await api('/api/spots', { method: 'POST', body: { name: 'Level 3' } })
// Throws an Error with .status, the server's { message }, and the whole body as .data
// (e.g. .data.errors for register's list of messages) when the response is not ok.
export async function api(path, { body, headers, ...options } = {}) {
  // Always include the session cookie because Express stores the authenticated user in it.
  const request = {
    credentials: 'include',
    // JSON is the shared wire format used by every Vue API route.
    headers: { 'Content-Type': 'application/json', ...headers },
    // Serialise request data once so callers can pass normal JavaScript objects.
    body: body === undefined ? undefined : JSON.stringify(body),
    // Preserve the caller's method, signal and other fetch options.
    ...options,
  }

  let res
  try {
    // Network failures become the same safe Error shape as HTTP failures.
    res = await fetch(path, request)
  } catch {
    // Do not expose browser or provider details in the UI.
    const error = new Error('Unable to reach Study Spot Finder. Please try again.')
    error.status = 0
    error.data = null
    throw error
  }

  // Some successful endpoints return no body, so parsing is deliberately optional.
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    // Prefer the server's safe message and fall back to a status-only message.
    const error = new Error(data?.message || `Request failed (${res.status})`)
    // Keep status and structured validation errors available to form components.
    error.status = res.status
    error.data = data
    throw error
  }
  // Return the decoded JSON payload to the feature that requested it.
  return data
}
