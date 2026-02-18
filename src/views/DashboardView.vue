<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../composables/useApi'
import { useContacts } from '../composables/useContacts'
import { useReminders } from '../composables/useReminders'
import AppHeader from '../components/AppHeader.vue'
import ContactCard from '../components/ContactCard.vue'
import ReminderCard from '../components/ReminderCard.vue'

const { contacts, loading: contactsLoading, searchQuery, categoryFilter, filteredContacts, fetchContacts, importGoogleContacts } = useContacts()
const { reminders, loading: remindersLoading, fetchReminders, sendToTessio, dismiss, snooze } = useReminders()

const stats = ref(null)
const statsLoading = ref(true)
const importing = ref(false)
const importResult = ref(null)

async function loadDashboard() {
  await Promise.all([
    fetchContacts(),
    fetchReminders(),
    api('/dashboard').then(data => { stats.value = data }).finally(() => { statsLoading.value = false }),
  ])
}

const categories = ['personal', 'professional', 'family', 'acquaintance']

function setFilter(cat) {
  categoryFilter.value = categoryFilter.value === cat ? null : cat
}

async function handleSendToTessio(id) {
  try {
    await sendToTessio(id)
  } catch (err) {
    console.error('Failed to send to Tessio:', err)
  }
}

async function handleDismiss(id) {
  try {
    await dismiss(id)
  } catch (err) {
    console.error('Failed to dismiss:', err)
  }
}

async function handleSnooze(id, preset) {
  try {
    await snooze(id, preset)
  } catch (err) {
    console.error('Failed to snooze:', err)
  }
}

async function handleImport() {
  importing.value = true
  importResult.value = null
  try {
    const data = await importGoogleContacts()
    importResult.value = data
    // Refresh stats after import
    api('/dashboard').then(data => { stats.value = data })
  } catch (err) {
    importResult.value = { error: err.message || 'Import failed' }
  } finally {
    importing.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <div class="dashboard-layout">
    <AppHeader />

    <main class="dashboard-main">
      <!-- Stats Row -->
      <div class="stats-row" v-if="stats">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalContacts }}</div>
          <div class="stat-label">Contacts</div>
        </div>
        <div class="stat-card">
          <div class="stat-value warning">{{ stats.needsAttention }}</div>
          <div class="stat-label">Need Attention</div>
        </div>
        <div class="stat-card">
          <div class="stat-value accent">{{ stats.pendingReminders }}</div>
          <div class="stat-label">Reminders</div>
        </div>
        <div class="stat-card" v-if="stats.averageHealth != null">
          <div class="stat-value">{{ Math.round(stats.averageHealth * 100) }}%</div>
          <div class="stat-label">Avg Health</div>
        </div>
      </div>

      <!-- Reminders Section -->
      <section v-if="reminders.length > 0" class="section">
        <h2 class="section-title">
          Thoughtful Reminders
          <span class="section-count">{{ reminders.length }}</span>
        </h2>
        <div class="reminders-grid">
          <ReminderCard
            v-for="reminder in reminders"
            :key="reminder.id"
            :reminder="reminder"
            @send-to-tessio="handleSendToTessio"
            @dismiss="handleDismiss"
            @snooze="handleSnooze"
          />
        </div>
      </section>

      <!-- Contacts Section -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Your Network</h2>
          <button class="import-btn" @click="handleImport" :disabled="importing">
            {{ importing ? 'Importing...' : 'Import Google Contacts' }}
          </button>
        </div>
        <div v-if="importResult" class="import-result" :class="{ error: importResult.error }">
          <template v-if="importResult.error">{{ importResult.error }}</template>
          <template v-else>Imported {{ importResult.imported }} new contacts ({{ importResult.skipped }} already existed)</template>
          <button class="dismiss-result" @click="importResult = null">&times;</button>
        </div>

        <div class="filters-row">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search contacts..."
            class="search-input"
          />
          <div class="category-filters">
            <button
              v-for="cat in categories"
              :key="cat"
              class="filter-btn"
              :class="{ active: categoryFilter === cat }"
              @click="setFilter(cat)"
            >
              {{ cat }}
              <span v-if="stats?.categoryBreakdown" class="filter-count">
                {{ stats.categoryBreakdown[cat] || 0 }}
              </span>
            </button>
          </div>
        </div>

        <div v-if="contactsLoading" class="loading">Loading contacts...</div>
        <div v-else-if="filteredContacts.length === 0" class="empty-state">
          {{ searchQuery || categoryFilter ? 'No contacts match your filter.' : 'No contacts yet. Apollonia will discover them from your email.' }}
        </div>
        <div v-else class="contacts-list">
          <ContactCard
            v-for="contact in filteredContacts"
            :key="contact.id"
            :contact="contact"
          />
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  background: var(--color-bg);
}

.dashboard-main {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 20px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.stat-value.warning { color: var(--color-warm); }
.stat-value.accent { color: var(--color-accent); }

.stat-label {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 2px;
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-count {
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: var(--radius-full);
}

.reminders-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filters-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 180px;
  padding: 8px 12px;
  font-family: inherit;
  font-size: 0.82rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  transition: border-color var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.category-filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 4px 10px;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: capitalize;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  transition: all var(--transition-fast);
}

.filter-btn:hover {
  border-color: var(--color-border-light);
}

.filter-btn.active {
  background: var(--color-accent-soft);
  color: var(--color-accent);
  border-color: var(--color-accent-border);
}

.filter-count {
  margin-left: 3px;
  opacity: 0.7;
}

.contacts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.loading, .empty-state {
  text-align: center;
  padding: 48px 20px;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header .section-title {
  margin-bottom: 0;
}

.import-btn {
  padding: 6px 14px;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-accent-soft);
  border: 1px solid var(--color-accent-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.import-btn:hover:not(:disabled) {
  background: var(--color-accent);
  color: white;
}

.import-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.import-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  margin-bottom: 12px;
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  background: #edf7ed;
  color: #2e6e2e;
  border: 1px solid #c3e6c3;
}

.import-result.error {
  background: #f5e8e8;
  color: var(--color-danger);
  border-color: #e8c3c3;
}

.dismiss-result {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  padding: 0 4px;
}

.dismiss-result:hover {
  opacity: 1;
}
</style>
