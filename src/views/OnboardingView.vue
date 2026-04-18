<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useContacts } from '../composables/useContacts'
import AppHeader from '../components/AppHeader.vue'
import { initials, avatarColor } from '../lib/formatters'

const router = useRouter()
const { fetchContacts, updateContact } = useContacts()

const allDormant = ref([])
const currentIndex = ref(0)
const loading = ref(true)
const tieredCount = ref(0)

const current = computed(() => allDormant.value[currentIndex.value])
const remaining = computed(() => allDormant.value.length - currentIndex.value)

async function load() {
  loading.value = true
  try {
    const contacts = await fetchContacts({ tier: 'dormant' })
    allDormant.value = contacts
  } finally {
    loading.value = false
  }
}

async function tierAs(tier) {
  if (!current.value) return
  await updateContact(current.value.id, { relationship_tier: tier })
  tieredCount.value++
  currentIndex.value++
}

function skip() {
  currentIndex.value++
}

onMounted(load)
</script>

<template>
  <div class="page-layout">
    <AppHeader />
    <main class="page-main">
      <button class="back-btn" @click="router.push({ name: 'Import' })">&#8592; Import hub</button>
      <span class="eyebrow">Who's family, who's not</span>
      <h1 class="page-title">Tiering wizard</h1>
      <p class="page-desc">Classify your imported contacts. Core = top relationships. Active = regularly in touch. Skip to leave as dormant.</p>

      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: allDormant.length ? (currentIndex / allDormant.length * 100) + '%' : '0%' }"></div>
      </div>
      <div class="progress-text">{{ tieredCount }} tiered &middot; {{ remaining }} remaining</div>

      <div v-if="loading" class="loading">Loading contacts...</div>

      <div v-else-if="!current" class="done-state">
        <h2>All done.</h2>
        <p>You've reviewed all {{ allDormant.length }} dormant contacts.</p>
        <router-link to="/contacts" class="done-btn">View your contacts</router-link>
      </div>

      <div v-else class="tier-card">
        <div class="tier-avatar" :class="avatarColor(current.name)">{{ initials(current.name) }}</div>
        <h2 class="tier-name">{{ current.name }}</h2>
        <p class="tier-meta">
          <span v-if="current.title">{{ current.title }}</span>
          <span v-if="current.title && current.company"> at </span>
          <span v-if="current.company">{{ current.company }}</span>
        </p>
        <p v-if="current.how_met" class="tier-how-met">Met: {{ current.how_met }}</p>

        <div class="tier-actions">
          <button class="tier-btn core" @click="tierAs('core')">Core</button>
          <button class="tier-btn active" @click="tierAs('active')">Active</button>
          <button class="tier-btn skip" @click="skip">Skip</button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page-layout { min-height: 100vh; background: var(--color-bg); }
.page-main { max-width: 500px; margin: 0 auto; padding: 24px 20px; text-align: center; }
.back-btn { background: none; border: none; color: var(--color-text-secondary); font-size: 0.82rem; font-weight: 500; padding: 4px 0; margin-bottom: 20px; display: block; text-align: left; transition: color var(--dur-2) var(--ease-out-expo); }
.back-btn:hover { color: var(--color-text); }
.eyebrow { display: block; font-family: var(--font-sans); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 4px; text-align: left; }
.page-title { font-family: var(--font-serif); font-size: 1.9rem; font-weight: 600; font-variation-settings: 'opsz' 48, 'WONK' 1; letter-spacing: -0.03em; line-height: 1.1; color: var(--color-text); text-align: left; margin-bottom: 8px; }
.page-desc { font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 24px; text-align: left; line-height: 1.55; }

.progress-bar { height: 4px; background: var(--color-border); border-radius: 2px; margin-bottom: 6px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--color-accent); border-radius: 2px; transition: width var(--dur-3) var(--ease-out-expo); }
.progress-text { font-family: var(--font-mono); font-size: 0.68rem; color: var(--color-text-muted); margin-bottom: 28px; text-align: left; }

.loading { padding: 40px; color: var(--color-text-muted); }
.done-state { padding: 40px 0; }
.done-state h2 { font-family: var(--font-serif); font-style: italic; font-size: 1.8rem; font-weight: 600; font-variation-settings: 'opsz' 48, 'WONK' 1; letter-spacing: -0.03em; margin-bottom: 12px; color: var(--color-text); }
.done-state p { font-size: 0.95rem; color: var(--color-text-secondary); margin-bottom: 24px; }
.done-btn { padding: 10px 24px; font-size: 0.85rem; font-weight: 600; color: white; background: var(--color-accent); border-radius: var(--radius-md); text-decoration: none; display: inline-block; transition: background var(--dur-2) var(--ease-out-expo), box-shadow var(--dur-2) var(--ease-out-expo), transform var(--dur-2) var(--ease-out-expo); }
.done-btn:hover { background: var(--color-accent-hover); box-shadow: var(--shadow-suspend); transform: translateY(-1px); }

.tier-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 36px 28px; box-shadow: var(--shadow-md); }
.tier-avatar { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: 700; color: white; margin: 0 auto 18px; letter-spacing: 0.02em; }
.tier-name { font-family: var(--font-serif); font-size: 1.4rem; font-weight: 600; font-variation-settings: 'opsz' 36, 'WONK' 0; letter-spacing: -0.02em; color: var(--color-text); margin-bottom: 6px; }
.tier-meta { font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 6px; }
.tier-how-met { font-size: 0.82rem; color: var(--color-text-muted); margin-bottom: 24px; font-style: italic; font-family: var(--font-serif); font-variation-settings: 'opsz' 14; }

.tier-actions { display: flex; gap: 8px; justify-content: center; }
.tier-btn { padding: 10px 24px; font-size: 0.85rem; font-weight: 600; border: none; border-radius: var(--radius-md); cursor: pointer; min-height: 44px; transition: background var(--dur-2) var(--ease-out-expo), border-color var(--dur-2) var(--ease-out-expo), box-shadow var(--dur-2) var(--ease-out-expo), transform var(--dur-2) var(--ease-out-expo); }
.tier-btn:hover { transform: translateY(-1px); }
.tier-btn:active { transform: translateY(0); }
.tier-btn.core { background: var(--color-accent); color: white; }
.tier-btn.core:hover { background: var(--color-accent-hover); box-shadow: var(--shadow-suspend); }
.tier-btn.active { background: var(--color-success); color: white; }
.tier-btn.active:hover { background: #1F6B54; box-shadow: var(--shadow-suspend); }
.tier-btn.skip { background: var(--color-bg); color: var(--color-text-secondary); border: 1px solid var(--color-border); }
.tier-btn.skip:hover { border-color: var(--color-border-light); }
</style>
