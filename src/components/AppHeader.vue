<script setup>
import { useAuth } from '../composables/useAuth'
import { useRouter } from 'vue-router'

const { user, signOut } = useAuth()
const router = useRouter()

const goHome = () => router.push({ name: 'Dashboard' })
</script>

<template>
  <header class="app-header">
    <div class="header-left" @click="goHome">
      <div class="header-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      </div>
      <span class="header-title">Apollonia</span>
    </div>
    <div class="header-right">
      <span class="header-email">{{ user?.email }}</span>
      <button class="sign-out-btn" @click="signOut">Sign Out</button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.header-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-accent-soft);
  border: 1px solid var(--color-accent-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-title {
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-email {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.sign-out-btn {
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.sign-out-btn:hover {
  background: var(--color-border);
}
</style>
