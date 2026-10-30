// ACTIVE: the one function every Vue page and store uses to call the Express JSON API (see routes/api/index.js).
// Shared helper for calling the Express JSON API.
// Usage: const spots = await api('/api/spots')
//        await api('/api/spots', { method: 'POST', body: { name: 'Level 3' } })
// Throws an Error with .status, the server's { message }, and the whole body as .data
// (e.g. .data.errors for register's list of messages) when the response is not ok.
export async function api(path, { body, headers, ...options } = {}) {
  // Send the request. fetch is the browser's built-in HTTP call.
  const res = await fetch(path, {
    // credentials include sends the session cookie, which is how the server knows who is logged in (and why the compare route accepts the call).
    credentials: 'include', // send the session cookie
    // Send JSON by default; callers can add or override headers.
    headers: { 'Content-Type': 'application/json', ...headers },
    // Turn the body object into JSON text, or send nothing when there is no body.
    body: body === undefined ? undefined : JSON.stringify(body),
    // Any other fetch option, such as method, is passed straight through.
    ...options,
  })

  // Read the JSON reply. If the body is not JSON, use null instead of crashing.
  const data = await res.json().catch(() => null)
  // A status outside 200 to 299 is an error.
  if (!res.ok) {
    // Prefer the server's own message (for example the 400 compare message), otherwise use a generic one.
    const error = new Error(data?.message || `Request failed (${res.status})`)
    // Keep the status so callers can tell a 401 from a 404.
    error.status = res.status
    // Keep the whole body for extra detail, such as a list of errors.
    error.data = data
    // Throw, so callers use try and catch.
    throw error
  }
  // Success: hand back the parsed JSON.
  return data
}
