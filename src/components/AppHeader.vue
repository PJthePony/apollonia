<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const { signOut } = useAuth()
const showSearch = ref(false)
const searchInput = ref(null)

function handleKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    showSearch.value = !showSearch.value
    if (showSearch.value) {
      setTimeout(() => searchInput.value?.focus(), 50)
    }
  }
  if (e.key === 'Escape') showSearch.value = false
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <header class="app-header">
    <router-link to="/dashboard" class="app-header-brand" aria-label="Apollonia">
      <span class="header-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      </span>
      <span class="app-name">Apollonia</span>
    </router-link>

    <nav class="header-nav">
      <router-link to="/dashboard" class="nav-link" active-class="active">Dashboard</router-link>
      <router-link to="/contacts" class="nav-link" active-class="active">Contacts</router-link>
      <router-link to="/intros" class="nav-link" active-class="active">Intros</router-link>
      <router-link to="/import" class="nav-link" active-class="active">Import</router-link>
    </nav>

    <div class="header-right">
      <button class="search-trigger" @click="showSearch = true" title="Search (Cmd+K)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span class="search-hint">Cmd+K</span>
      </button>
      <router-link to="/settings" class="header-btn" title="Settings" aria-label="Settings">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
      </router-link>
      <button class="header-btn" @click="signOut" title="Sign out" aria-label="Sign out">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </div>
  </header>

  <!-- Global Search Overlay -->
  <Teleport to="body">
    <div v-if="showSearch" class="search-overlay" @click.self="showSearch = false">
      <div class="search-modal">
        <div class="search-modal-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            ref="searchInput"
            type="text"
            placeholder="Search contacts by name, company, or detail..."
            class="search-modal-input"
            @keydown.escape="showSearch = false"
          />
        </div>
        <div class="search-modal-hint">Type to search across your entire network</div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.app-header {
  background: var(--color-sage-100);
  border-bottom: 1px solid var(--color-border);
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 50;
  gap: 16px;
}

.app-header::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 39px,
    rgba(20, 34, 53, 0.02) 39px,
    rgba(20, 34, 53, 0.02) 40px
  );
}

.app-header > * { position: relative; z-index: 1; }

.app-header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--color-text);
  flex-shrink: 0;
  transition: color var(--dur-2) var(--ease-out-expo);
}

.app-header-brand:hover { color: var(--color-fuchsia-800); }

.header-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(212, 36, 111, 0.08);
  border: 1px solid rgba(212, 36, 111, 0.15);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-name {
  font-family: var(--font-serif);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variation-settings: 'opsz' 24, 'WONK' 1;
  color: inherit;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link {
  padding: 6px 12px;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: color var(--dur-2) var(--ease-out-expo), background var(--dur-2) var(--ease-out-expo);
}

.nav-link:hover { color: var(--color-text); background: var(--color-primary-ghost); }
.nav-link.active { color: var(--color-text); background: var(--color-primary-ghost); font-weight: 600; }

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.search-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  background: var(--color-sage-50);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: color var(--dur-2) var(--ease-out-expo),
              border-color var(--dur-2) var(--ease-out-expo);
}

.search-trigger:hover {
  color: var(--color-accent);
  border-color: rgba(212, 36, 111, 0.25);
}

.search-hint {
  font-size: 0.65rem;
  padding: 1px 4px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xs);
  font-family: var(--font-mono);
}

.header-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-sage-50);
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--dur-2) var(--ease-out-expo),
              border-color var(--dur-2) var(--ease-out-expo);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.header-btn:hover,
.header-btn:active {
  color: var(--color-accent);
  border-color: rgba(212, 36, 111, 0.25);
}

/* Search Overlay */
.search-overlay {
  position: fixed;
  inset: 0;
  background: rgba(20, 34, 53, 0.4);
  backdrop-filter: blur(12px);
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 120px;
}

.search-modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 560px;
  overflow: hidden;
}

.search-modal-input-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.search-modal-input {
  flex: 1;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--color-text);
  background: transparent;
}

.search-modal-input::placeholder {
  color: var(--color-text-muted);
}

.search-modal-hint {
  padding: 12px 20px;
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .app-header { padding: 14px 16px; }
  .header-nav { display: none; }
  .header-right { gap: 8px; }
  .search-trigger .search-hint { display: none; }
  .header-btn { width: 44px; height: 44px; }
  .search-overlay { padding-top: 20px; padding-left: 16px; padding-right: 16px; }
}
</style>
