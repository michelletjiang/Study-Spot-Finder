// Shared helper for calling the Express JSON API.
// Usage: const spots = await api('/api/spots')
//        await api('/api/spots', { method: 'POST', body: { name: 'Level 3' } })
// Throws an Error with .status and the server's { message } when the response is not ok.
export async function api(path, { body, headers, ...options } = {}) {
  const res = await fetch(path, {
    credentials: 'include', // send the session cookie
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...options,
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const error = new Error(data?.message || `Request failed (${res.status})`)
    error.status = res.status
    throw error
  }
  return data
}
