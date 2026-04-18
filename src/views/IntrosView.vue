<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import AppHeader from '../components/AppHeader.vue'
import { formatDate } from '../lib/formatters'

const router = useRouter()
const intros = ref([])
const loading = ref(true)

async function fetchIntros() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('intros')
      .select('*, from_contact:from_contact_id(id, name), to_contact:to_contact_id(id, name)')
      .order('introduced_at', { ascending: false })
    if (error) throw error
    intros.value = data || []
  } finally {
    loading.value = false
  }
}

onMounted(fetchIntros)
</script>

<template>
  <div class="page-layout">
    <AppHeader />
    <main class="page-main">
      <span class="eyebrow">Favors I remember</span>
      <h1 class="page-title">Introductions</h1>

      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="intros.length === 0" class="empty-state">
        <p>Nothing on the record yet. Log an intro from a contact's profile.</p>
      </div>
      <div v-else class="intros-list">
        <div v-for="intro in intros" :key="intro.id" class="intro-card">
          <div class="intro-names">
            <span class="intro-name" @click="router.push({ name: 'Contact', params: { id: intro.from_contact?.id } })">{{ intro.from_contact?.name }}</span>
            <span class="intro-arrow">&#8594;</span>
            <span class="intro-name" @click="router.push({ name: 'Contact', params: { id: intro.to_contact?.id } })">{{ intro.to_contact?.name }}</span>
          </div>
          <p v-if="intro.context_notes" class="intro-context">{{ intro.context_notes }}</p>
          <span class="intro-date">{{ formatDate(intro.introduced_at) }}</span>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page-layout { min-height: 100vh; background: var(--color-bg); }
.page-main { max-width: 700px; margin: 0 auto; padding: 24px 20px; }
.eyebrow { display: block; font-family: var(--font-sans); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 4px; }
.page-title { font-family: var(--font-serif); font-size: 2rem; font-weight: 600; font-variation-settings: 'opsz' 48, 'WONK' 1; letter-spacing: -0.03em; line-height: 1.1; color: var(--color-text); margin-bottom: 28px; }
.loading { text-align: center; padding: 48px; color: var(--color-text-muted); font-size: 0.85rem; }
.empty-state { text-align: center; padding: 64px 20px; color: var(--color-text-muted); font-family: var(--font-serif); font-style: italic; font-variation-settings: 'opsz' 24; font-size: 1rem; }

.intros-list { display: flex; flex-direction: column; gap: 10px; }
.intro-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 18px; transition: border-color var(--dur-2) var(--ease-out-expo), box-shadow var(--dur-2) var(--ease-out-expo); }
.intro-card:hover { border-color: var(--color-border-light); box-shadow: var(--shadow-sm); }
.intro-names { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.intro-name { font-size: 0.9rem; font-weight: 600; color: var(--color-accent); cursor: pointer; transition: color var(--dur-2) var(--ease-out-expo); }
.intro-name:hover { color: var(--color-accent-hover); text-decoration: underline; text-underline-offset: 3px; }
.intro-arrow { color: var(--color-text-muted); font-size: 0.85rem; }
.intro-context { font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.5; margin-bottom: 6px; }
.intro-date { font-family: var(--font-mono); font-size: 0.65rem; color: var(--color-text-muted); }
</style>
