<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()
const linkedinFile = ref(null)
const uploading = ref(false)
const result = ref(null)

const sources = [
  { id: 'linkedin', name: 'LinkedIn', description: 'Import connections and messages from your LinkedIn data export', status: 'ready' },
  { id: 'gmail', name: 'Gmail', description: 'Connect Gmail to import email history (read-only)', status: 'coming_soon' },
  { id: 'imessage', name: 'iMessage', description: 'Export messages from your Mac and upload the JSON', status: 'coming_soon' },
  { id: 'granola', name: 'Granola', description: 'Import meeting notes from Granola', status: 'coming_soon' },
]

async function handleLinkedInUpload() {
  if (!linkedinFile.value) return
  uploading.value = true
  result.value = null
  // TODO: implement LinkedIn CSV upload via Edge Function
  setTimeout(() => {
    result.value = { message: 'LinkedIn import will be connected when Edge Functions are deployed.' }
    uploading.value = false
  }, 1000)
}
</script>

<template>
  <div class="page-layout">
    <AppHeader />
    <main class="page-main">
      <div class="page-header">
        <div class="page-header-text">
          <span class="eyebrow">Open the door</span>
          <h1 class="page-title">Import hub</h1>
        </div>
        <router-link to="/import/onboarding" class="onboard-btn">Tiering wizard</router-link>
      </div>

      <div class="sources-grid">
        <div v-for="source in sources" :key="source.id" class="source-card" :class="{ disabled: source.status === 'coming_soon' }">
          <div class="source-icon">
            <svg v-if="source.id === 'linkedin'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="3"/><line x1="8" y1="11" x2="8" y2="17"/><circle cx="8" cy="7" r="1"/><path d="M12 17v-6"/><path d="M16 17v-3a3 3 0 00-4-2.83"/></svg>
            <svg v-else-if="source.id === 'gmail'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <svg v-else-if="source.id === 'imessage'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div class="source-info">
            <h3>{{ source.name }}</h3>
            <p>{{ source.description }}</p>
          </div>
          <span v-if="source.status === 'coming_soon'" class="coming-badge">Coming soon</span>
          <template v-else>
            <template v-if="source.id === 'linkedin'">
              <div class="upload-area">
                <input type="file" accept=".csv" @change="linkedinFile = $event.target.files[0]" />
                <button class="upload-btn" @click="handleLinkedInUpload" :disabled="!linkedinFile || uploading">
                  {{ uploading ? 'Uploading...' : 'Upload CSV' }}
                </button>
              </div>
            </template>
          </template>
        </div>
      </div>

      <div v-if="result" class="result-banner">{{ result.message }}</div>
    </main>
  </div>
</template>

<style scoped>
.page-layout { min-height: 100vh; background: var(--color-bg); }
.page-main { max-width: 700px; margin: 0 auto; padding: 24px 20px; }
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 28px; }
.page-header-text { display: flex; flex-direction: column; gap: 4px; }
.eyebrow { font-family: var(--font-sans); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-text-muted); }
.page-title { font-family: var(--font-serif); font-size: 2rem; font-weight: 600; font-variation-settings: 'opsz' 48, 'WONK' 1; letter-spacing: -0.03em; line-height: 1.1; color: var(--color-text); }
.onboard-btn { padding: 8px 16px; font-size: 0.78rem; font-weight: 600; color: var(--color-accent); background: var(--color-accent-soft); border: 1px solid var(--color-accent-border); border-radius: var(--radius-md); text-decoration: none; white-space: nowrap; transition: background var(--dur-2) var(--ease-out-expo); }
.onboard-btn:hover { background: rgba(212, 36, 111, 0.14); }

.sources-grid { display: flex; flex-direction: column; gap: 12px; }
.source-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 20px; display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; transition: box-shadow var(--dur-2) var(--ease-out-expo); }
.source-card:hover { box-shadow: var(--shadow-sm); }
.source-card.disabled { opacity: 0.6; }
.source-icon { width: 40px; height: 40px; flex-shrink: 0; border-radius: var(--radius-lg); background: var(--color-accent-soft); border: 1px solid var(--color-accent-border); color: var(--color-accent); display: flex; align-items: center; justify-content: center; }
.source-info { flex: 1; min-width: 200px; }
.source-info h3 { font-family: var(--font-serif); font-size: 1.05rem; font-weight: 600; font-variation-settings: 'opsz' 24, 'WONK' 0; letter-spacing: -0.02em; color: var(--color-text); margin-bottom: 4px; }
.source-info p { font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.5; }
.coming-badge { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; padding: 3px 10px; background: var(--color-primary-ghost); color: var(--color-text-muted); border-radius: var(--radius-full); }

.upload-area { display: flex; gap: 8px; align-items: center; width: 100%; }
.upload-area input[type="file"] { font-size: 0.75rem; font-family: inherit; }
.upload-btn { padding: 6px 14px; font-size: 0.72rem; font-weight: 600; background: var(--color-accent); color: white; border: none; border-radius: var(--radius-sm); transition: background var(--dur-2) var(--ease-out-expo); }
.upload-btn:hover:not(:disabled) { background: var(--color-accent-hover); }
.upload-btn:disabled { opacity: 0.5; }

.result-banner { margin-top: 16px; padding: 12px 16px; background: var(--color-success-soft); color: var(--color-success); border: 1px solid rgba(43, 138, 110, 0.2); border-radius: var(--radius-md); font-size: 0.82rem; }
</style>
