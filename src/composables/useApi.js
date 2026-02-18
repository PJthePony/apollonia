import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function api(path, options = {}) {
  const maxRetries = options.method === 'GET' || !options.method ? 2 : 0
  let lastError = null

  const token = await getAccessToken()

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500))
      }

      const res = await fetch(`${API_URL}${path}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...options.headers,
        },
        ...options,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const err = new Error(body.error || `API error ${res.status}`)
        err.status = res.status

        if (res.status >= 500 || res.status === 429) {
          lastError = err
          if (attempt < maxRetries) continue
        }
        throw err
      }

      return res.json()
    } catch (err) {
      if (!err.status && attempt < maxRetries) {
        lastError = err
        continue
      }
      throw err
    }
  }

  throw lastError
}
