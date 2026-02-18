import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

const LUCA_API = 'https://luca.tanzillo.ai'

// Module-scope state (singleton)
const user = ref(null)
const session = ref(null)
const loading = ref(true)
let initialized = false

function syncSessionCookie(newSession, redirect = false) {
  if (!newSession) return

  const params = new URLSearchParams({
    token: newSession.access_token,
    refresh: newSession.refresh_token,
    returnTo: window.location.origin + '/dashboard',
  })

  if (redirect) {
    window.location.href = `${LUCA_API}/auth/session?${params}`
  } else {
    fetch(`${LUCA_API}/auth/session/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: newSession.access_token,
        refresh: newSession.refresh_token,
      }),
    }).catch(() => {})
  }
}

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)

  const initialize = () => {
    if (initialized) {
      return Promise.resolve()
    }
    initialized = true

    return new Promise((resolve) => {
      supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        session.value = currentSession
        user.value = currentSession?.user ?? null
        loading.value = false
        resolve()
      })

      supabase.auth.onAuthStateChange((event, newSession) => {
        session.value = newSession
        user.value = newSession?.user ?? null
        loading.value = false

        if (event === 'SIGNED_IN' && newSession && !sessionStorage.getItem('luca_synced')) {
          sessionStorage.setItem('luca_synced', '1')
          if (!import.meta.env.DEV) {
            syncSessionCookie(newSession, true)
          }
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          if (!import.meta.env.DEV) {
            syncSessionCookie(newSession, false)
          }
        }
      })
    })
  }

  const signIn = async (email) => {
    const redirectTo = import.meta.env.DEV
      ? 'http://localhost:5174/dashboard'
      : 'https://apollonia.tanzillo.ai/dashboard'

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo
      }
    })
    if (error) throw error
  }

  const signOut = async () => {
    sessionStorage.removeItem('luca_synced')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    window.location.href = `${LUCA_API}/auth/logout?returnTo=${encodeURIComponent(window.location.origin + '/login')}`
  }

  return {
    user,
    session,
    loading,
    isAuthenticated,
    initialize,
    signIn,
    signOut
  }
}
