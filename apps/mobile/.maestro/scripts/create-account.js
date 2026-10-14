/* global http, json, output, API_URL, MAILPIT_URL -- provided by the Maestro JavaScript runtime */

// Creates a confirmed, onboarded account through the API, the same way the web browser tests
// do, so each flow starts signed out with a fresh person. API_URL and MAILPIT_URL come from
// the flow's env.
const suffix = Math.random().toString(16).slice(2, 10)
const email = `maestro_${suffix}@example.com`
const password = "correct horse battery staple"
const jsonHeaders = { "Content-Type": "application/json" }

const registered = http.post(`${API_URL}/api/v1/auth/register`, {
  headers: jsonHeaders,
  body: JSON.stringify({
    email,
    password,
    handle: `maestro_${suffix}`,
    displayName: `Maestro ${suffix}`,
    birthDate: "1990-05-17",
    acceptedTerms: true,
  }),
})

if (registered.status !== 201) throw new Error(`Sign-up failed with ${registered.status}`)

const session = json(registered.body).session.token
const query = encodeURIComponent(`to:"${email}"`)
let token = null

for (let attempt = 0; attempt < 50 && !token; attempt++) {
  const search = json(http.get(`${MAILPIT_URL}/api/v1/search?query=${query}&limit=1`).body)
  const latest = search.messages[0]

  if (latest) {
    const message = json(http.get(`${MAILPIT_URL}/api/v1/message/${latest.ID}`).body)
    const match = message.Text.match(/verify-email\?token=([\w-]+)/)

    token = match ? match[1] : null
  }
}

if (!token) throw new Error(`No confirmation email reached ${email}`)

http.post(`${API_URL}/api/v1/auth/email-verification/confirm`, {
  headers: jsonHeaders,
  body: JSON.stringify({ token }),
})

http.post(`${API_URL}/api/v1/users/me/onboarding`, {
  headers: { ...jsonHeaders, Authorization: `Bearer ${session}` },
})

output.email = email

output.password = password
