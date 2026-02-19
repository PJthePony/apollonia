<script setup>
import { useAuth } from '../composables/useAuth'
import { useRouter } from 'vue-router'

const { signOut } = useAuth()
const router = useRouter()

const goHome = () => router.push({ name: 'Dashboard' })
</script>

<template>
  <header class="app-header">
    <div class="header-left" @click="goHome">
      <div class="header-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      </div>
      <span class="app-name">Apollonia</span>
    </div>
    <div class="header-right">
      <button class="header-btn" @click="signOut" title="Sign out" aria-label="Sign out">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 50;
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
  background: var(--color-accent-soft, rgba(249, 115, 22, 0.08));
  border: 1px solid var(--color-accent-border, rgba(249, 115, 22, 0.15));
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-name {
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
}

.header-btn:hover,
.header-btn:active {
  background: var(--color-bg);
  color: var(--color-text);
}

@media (max-width: 640px) {
  .header-btn {
    width: 44px;
    height: 44px;
  }

  .header-icon {
    width: 44px;
    height: 44px;
  }
}
</style>
