<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { signIn } = useAuth()

const email = ref('')
const error = ref('')
const linkSent = ref(false)
const submitting = ref(false)

const handleSubmit = async () => {
  error.value = ''
  submitting.value = true
  try {
    await signIn(email.value.trim())
    linkSent.value = true
  } catch (err) {
    error.value = err.message || 'Failed to send magic link. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-logo">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      </div>
      <h1 class="login-title">Apollonia</h1>
      <p class="login-subtitle">Your personal CRM</p>

      <div v-if="linkSent" class="link-sent">
        <div class="link-sent-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </div>
        <h2>Check your email</h2>
        <p>A magic link is on its way to <strong>{{ email }}</strong>.</p>
        <p class="link-sent-hint">Click the link to sign in.</p>
        <button class="login-btn secondary" @click="linkSent = false; email = ''">
          Use a different email
        </button>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="email">Email address</label>
          <input id="email" v-model="email" type="email" placeholder="you@example.com" required autofocus :disabled="submitting" />
        </div>
        <div v-if="error" class="login-error">{{ error }}</div>
        <button type="submit" class="login-btn primary" :disabled="submitting || !email.trim()">
          {{ submitting ? 'Sending...' : 'Send magic link' }}
        </button>
        <p class="login-hint">No password. A link in your inbox is all it takes.</p>
      </form>
    </div>
    <div class="login-legal">
      <a href="https://tanzillo.ai/privacy.html" target="_blank">Privacy</a>
      <a href="https://tanzillo.ai/terms.html" target="_blank">Terms</a>
    </div>
  </div>
</template>

<style scoped>
.login-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; background-color: var(--color-bg); }
.login-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); padding: 52px 44px; width: 100%; max-width: 440px; text-align: center; }
.login-logo { display: flex; justify-content: center; margin-bottom: 16px; }
.login-title { font-family: var(--font-serif); font-style: italic; font-size: 2.2rem; font-weight: 600; font-variation-settings: 'opsz' 48, 'WONK' 1; letter-spacing: -0.03em; line-height: 1.05; color: var(--color-accent); margin-bottom: 6px; }
.login-subtitle { color: var(--color-text-muted); font-size: 0.88rem; margin-bottom: 40px; font-family: var(--font-sans); }
.login-form { text-align: left; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 0.72rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 6px; letter-spacing: 0.02em; }
.form-group input { width: 100%; padding: 10px 12px; font-family: inherit; font-size: 0.9rem; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); color: var(--color-text); transition: border-color var(--dur-2) var(--ease-out-expo), box-shadow var(--dur-2) var(--ease-out-expo); }
.form-group input:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(212, 36, 111, 0.08); }
.form-group input:disabled { opacity: 0.6; cursor: not-allowed; }
.login-btn { width: 100%; padding: 11px 16px; font-family: inherit; font-size: 0.9rem; font-weight: 600; border: none; border-radius: var(--radius-md); cursor: pointer; transition: background var(--dur-2) var(--ease-out-expo), box-shadow var(--dur-2) var(--ease-out-expo), border-color var(--dur-2) var(--ease-out-expo), transform var(--dur-2) var(--ease-out-expo); }
.login-btn.primary { background: var(--color-accent); color: white; }
.login-btn.primary:hover:not(:disabled) { background: var(--color-accent-hover); box-shadow: var(--shadow-suspend); transform: translateY(-1px); }
.login-btn.primary:active { transform: translateY(0); }
.login-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.login-btn.secondary { background: var(--color-bg); color: var(--color-text-secondary); border: 1px solid var(--color-border); margin-top: 16px; }
.login-btn.secondary:hover { border-color: var(--color-border-light); color: var(--color-text); }
.login-error { background: var(--color-danger-soft); color: var(--color-danger); padding: 10px 12px; border-radius: var(--radius-md); font-size: 0.82rem; margin-bottom: 16px; border: 1px solid rgba(168, 58, 74, 0.2); }
.login-hint { text-align: center; color: var(--color-text-muted); font-size: 0.75rem; margin-top: 16px; }
.link-sent { padding: 12px 0; }
.link-sent-icon { display: flex; justify-content: center; margin-bottom: 20px; width: 56px; height: 56px; margin-left: auto; margin-right: auto; border-radius: var(--radius-xl); background: var(--color-accent-soft); border: 1px solid var(--color-accent-border); align-items: center; }
.link-sent h2 { font-family: var(--font-serif); font-size: 1.5rem; font-weight: 600; font-variation-settings: 'opsz' 36, 'WONK' 0; letter-spacing: -0.02em; margin-bottom: 10px; color: var(--color-text); }
.link-sent p { color: var(--color-text-secondary); font-size: 0.9rem; margin-bottom: 6px; line-height: 1.5; }
.link-sent strong { color: var(--color-text); font-weight: 600; }
.link-sent-hint { color: var(--color-text-muted); font-size: 0.78rem; margin-top: 12px; margin-bottom: 8px; }
.login-legal { display: flex; justify-content: center; gap: 16px; margin-top: 24px; }
.login-legal a { font-size: 0.7rem; color: var(--color-text-muted); text-decoration: none; transition: color var(--dur-2) var(--ease-out-expo); }
.login-legal a:hover { color: var(--color-accent); }

@media (max-width: 640px) {
  .login-card {
    padding: 24px 20px;
  }

  .form-group input {
    min-height: 44px;
    font-size: 16px;
  }

  .login-btn {
    min-height: 44px;
  }
}
</style>
