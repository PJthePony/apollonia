<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContacts } from '../composables/useContacts'
import { useNotes } from '../composables/useNotes'
import AppHeader from '../components/AppHeader.vue'
import { formatDate } from '../lib/formatters'

const route = useRoute()
const router = useRouter()
const { fetchContactWithRelated } = useContacts()
const { createNote } = useNotes()

const data = ref(null)
const loading = ref(true)
const prepNotes = ref('')
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    data.value = await fetchContactWithRelated(route.params.id)
  } finally {
    loading.value = false
  }
}

async function savePrepNotes() {
  if (!prepNotes.value.trim()) return
  saving.value = true
  try {
    await createNote(route.params.id, prepNotes.value.trim(), 'prep')
    prepNotes.value = ''
    await load()
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page-layout">
    <AppHeader />
    <main class="page-main">
      <button class="back-btn" @click="router.push({ name: 'Contact', params: { id: route.params.id } })">&#8592; Back to Profile</button>

      <div v-if="loading" class="loading">Loading...</div>

      <template v-else-if="data">
        <span class="eyebrow">Before the meeting</span>
        <h1 class="prep-title">Prep: {{ data.contact.name }}</h1>
        <p class="prep-subtitle">{{ data.contact.title }} {{ data.contact.company ? 'at ' + data.contact.company : '' }}</p>

        <!-- AI Briefing Placeholder -->
        <section class="briefing-card">
          <h2>AI briefing</h2>
          <p class="briefing-placeholder">AI briefing will be generated here when the endpoints are connected. For now, review the relationship summary and recent interactions below.</p>
        </section>

        <!-- Relationship Summary -->
        <section v-if="data.summary" class="prep-section">
          <h2>Relationship summary</h2>
          <p class="summary-text">{{ data.summary.content }}</p>
        </section>

        <!-- Standout Details -->
        <section v-if="data.contact.standout_details?.length" class="prep-section">
          <h2>Key details to remember</h2>
          <ul class="details-list">
            <li v-for="(d, idx) in data.contact.standout_details" :key="idx">{{ d.detail }}</li>
          </ul>
        </section>

        <!-- Recent Interactions -->
        <section v-if="data.interactions.length" class="prep-section">
          <h2>Recent interactions</h2>
          <div v-for="i in data.interactions.slice(0, 5)" :key="i.id" class="recent-interaction">
            <span class="ri-date">{{ formatDate(i.occurred_at) }}</span>
            <span class="ri-type">{{ i.interaction_type }}</span>
            <span class="ri-summary">{{ i.summary }}</span>
          </div>
        </section>

        <!-- Prep Notes -->
        <section class="prep-section">
          <h2>Your prep notes</h2>
          <textarea v-model="prepNotes" placeholder="Jot down talking points, questions, things to follow up on..." class="prep-textarea" rows="5"></textarea>
          <button class="save-btn" @click="savePrepNotes" :disabled="saving || !prepNotes.trim()">
            {{ saving ? 'Saving...' : 'Save as prep note' }}
          </button>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.page-layout { min-height: 100vh; background: var(--color-bg); }
.page-main { max-width: 700px; margin: 0 auto; padding: 24px 20px; }
.back-btn { background: none; border: none; color: var(--color-text-secondary); font-size: 0.82rem; font-weight: 500; padding: 4px 0; margin-bottom: 20px; transition: color var(--dur-2) var(--ease-out-expo); }
.back-btn:hover { color: var(--color-text); }
.eyebrow { display: block; font-family: var(--font-sans); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 4px; }
.prep-title { font-family: var(--font-serif); font-size: 2rem; font-weight: 600; font-variation-settings: 'opsz' 48, 'WONK' 1; letter-spacing: -0.03em; line-height: 1.1; color: var(--color-text); margin-bottom: 6px; text-wrap: balance; }
.prep-subtitle { font-size: 0.95rem; color: var(--color-text-secondary); margin-bottom: 28px; }
.loading { text-align: center; padding: 48px; color: var(--color-text-muted); }

.briefing-card { background: var(--color-accent-soft); border: 1px solid var(--color-accent-border); border-radius: var(--radius-md); padding: 20px; margin-bottom: 20px; }
.briefing-card h2 { font-family: var(--font-serif); font-size: 1rem; font-weight: 600; font-variation-settings: 'opsz' 24; letter-spacing: -0.02em; color: var(--color-accent); margin-bottom: 10px; }
.briefing-placeholder { font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.55; }

.prep-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 20px; margin-bottom: 16px; }
.prep-section h2 { font-family: var(--font-serif); font-size: 1rem; font-weight: 600; font-variation-settings: 'opsz' 24, 'WONK' 0; letter-spacing: -0.02em; color: var(--color-text); margin-bottom: 14px; }
.summary-text { font-family: var(--font-serif); font-size: 0.95rem; font-weight: 400; font-variation-settings: 'opsz' 14; color: var(--color-text); line-height: 1.7; max-width: 58ch; }
.details-list { list-style: disc; padding-left: 22px; }
.details-list li { font-size: 0.88rem; color: var(--color-text); margin-bottom: 6px; line-height: 1.5; }

.recent-interaction { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--color-border); font-size: 0.82rem; }
.recent-interaction:last-child { border-bottom: none; }
.ri-date { font-family: var(--font-mono); color: var(--color-text-muted); min-width: 80px; font-size: 0.72rem; }
.ri-type { color: var(--color-accent); font-weight: 600; text-transform: capitalize; min-width: 80px; font-size: 0.78rem; }
.ri-summary { color: var(--color-text); flex: 1; }

.prep-textarea { width: 100%; padding: 12px; font-family: inherit; font-size: 0.9rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-text); resize: vertical; margin-bottom: 12px; line-height: 1.55; transition: border-color var(--dur-2) var(--ease-out-expo); }
.prep-textarea:focus { outline: none; border-color: var(--color-accent); }
.save-btn { padding: 8px 16px; font-size: 0.78rem; font-weight: 600; background: var(--color-accent); color: white; border: none; border-radius: var(--radius-md); transition: background var(--dur-2) var(--ease-out-expo), box-shadow var(--dur-2) var(--ease-out-expo); }
.save-btn:hover:not(:disabled) { background: var(--color-accent-hover); box-shadow: var(--shadow-suspend); }
.save-btn:disabled { opacity: 0.5; }

@media (max-width: 640px) {
  .prep-textarea { font-size: 16px; min-height: 120px; }
  .save-btn { min-height: 44px; width: 100%; }
}
</style>
