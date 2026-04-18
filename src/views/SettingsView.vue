<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'
import AppHeader from '../components/AppHeader.vue'

const { user } = useAuth()

const voiceSamples = ref([])
const newSample = ref('')
const newLabel = ref('')
const loading = ref(true)
const saving = ref(false)

async function fetchSamples() {
  loading.value = true
  try {
    const { data } = await supabase.from('voice_samples').select('*').order('created_at', { ascending: false })
    voiceSamples.value = data || []
  } finally {
    loading.value = false
  }
}

async function addSample() {
  if (!newSample.value.trim()) return
  saving.value = true
  try {
    await supabase.from('voice_samples').insert({
      owner_id: user.value.id,
      content: newSample.value.trim(),
      label: newLabel.value.trim() || null,
    })
    newSample.value = ''
    newLabel.value = ''
    await fetchSamples()
  } finally {
    saving.value = false
  }
}

async function removeSample(id) {
  await supabase.from('voice_samples').delete().eq('id', id)
  await fetchSamples()
}

onMounted(fetchSamples)
</script>

<template>
  <div class="page-layout">
    <AppHeader />
    <main class="page-main">
      <span class="eyebrow">The house rules</span>
      <h1 class="page-title">Settings</h1>

      <!-- Voice Samples -->
      <section class="settings-section">
        <h2>Voice samples</h2>
        <p class="section-desc">Paste 5-10 example emails or messages you've sent that represent your voice. These are used to generate outreach drafts that sound like you.</p>

        <div class="add-sample-form">
          <input v-model="newLabel" type="text" placeholder="Label (e.g. 'warm intro email')" class="form-input label-input" />
          <textarea v-model="newSample" placeholder="Paste an example message you're proud of..." class="form-input sample-textarea" rows="4"></textarea>
          <button class="save-btn" @click="addSample" :disabled="saving || !newSample.trim()">
            {{ saving ? 'Saving...' : 'Add sample' }}
          </button>
        </div>

        <div v-if="loading" class="loading">Loading...</div>
        <div v-else-if="voiceSamples.length === 0" class="empty-text">No voice samples yet.</div>
        <div v-else class="samples-list">
          <div v-for="sample in voiceSamples" :key="sample.id" class="sample-card">
            <div class="sample-header">
              <span v-if="sample.label" class="sample-label">{{ sample.label }}</span>
              <button class="remove-btn" @click="removeSample(sample.id)">&times;</button>
            </div>
            <p class="sample-content">{{ sample.content }}</p>
          </div>
        </div>
      </section>

      <!-- Cadence Defaults (placeholder) -->
      <section class="settings-section">
        <h2>Contact cadence defaults</h2>
        <p class="section-desc">Default contact intervals by relationship type. Individual contacts can override these.</p>
        <div class="cadence-grid">
          <div class="cadence-row" v-for="t in ['core', 'active', 'dormant']" :key="t">
            <span class="cadence-label">{{ t }}</span>
            <span class="cadence-value">{{ t === 'core' ? '14 days' : t === 'active' ? '30 days' : '90 days' }}</span>
          </div>
        </div>
      </section>

      <!-- Integrations Status -->
      <section class="settings-section">
        <h2>Integrations</h2>
        <div class="integration-row">
          <span>Gmail</span>
          <span class="status-badge disconnected">Not connected</span>
        </div>
        <div class="integration-row">
          <span>Granola</span>
          <span class="status-badge disconnected">Not connected</span>
        </div>
        <div class="integration-row">
          <span>Tessio</span>
          <span class="status-badge connected">Connected</span>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page-layout { min-height: 100vh; background: var(--color-bg); }
.page-main { max-width: 700px; margin: 0 auto; padding: 24px 20px; }
.eyebrow { display: block; font-family: var(--font-sans); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 4px; }
.page-title { font-family: var(--font-serif); font-size: 2rem; font-weight: 600; font-variation-settings: 'opsz' 48, 'WONK' 1; letter-spacing: -0.03em; line-height: 1.1; color: var(--color-text); margin-bottom: 28px; }

.settings-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 22px; margin-bottom: 16px; }
.settings-section h2 { font-family: var(--font-serif); font-size: 1.05rem; font-weight: 600; font-variation-settings: 'opsz' 24, 'WONK' 0; letter-spacing: -0.02em; color: var(--color-text); margin-bottom: 8px; }
.section-desc { font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 18px; line-height: 1.55; max-width: 58ch; }

.add-sample-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
.form-input { width: 100%; padding: 8px 12px; font-family: inherit; font-size: 0.85rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-text); transition: border-color var(--dur-2) var(--ease-out-expo); }
.form-input:focus { outline: none; border-color: var(--color-accent); }
.label-input { max-width: 300px; }
.sample-textarea { resize: vertical; line-height: 1.55; }
.save-btn { padding: 8px 16px; font-size: 0.78rem; font-weight: 600; background: var(--color-accent); color: white; border: none; border-radius: var(--radius-md); width: fit-content; transition: background var(--dur-2) var(--ease-out-expo), box-shadow var(--dur-2) var(--ease-out-expo); }
.save-btn:hover:not(:disabled) { background: var(--color-accent-hover); box-shadow: var(--shadow-suspend); }
.save-btn:disabled { opacity: 0.5; }

.loading { padding: 20px; color: var(--color-text-muted); font-size: 0.82rem; }
.empty-text { color: var(--color-text-muted); font-size: 0.9rem; font-style: italic; font-family: var(--font-serif); font-variation-settings: 'opsz' 18; }

.samples-list { display: flex; flex-direction: column; gap: 10px; }
.sample-card { border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 14px; background: var(--color-bg); }
.sample-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.sample-label { font-size: 0.6rem; font-weight: 700; color: var(--color-accent); text-transform: uppercase; letter-spacing: 0.15em; }
.remove-btn { background: none; border: none; color: var(--color-text-muted); font-size: 0.9rem; cursor: pointer; transition: color var(--dur-2) var(--ease-out-expo); }
.remove-btn:hover { color: var(--color-danger); }
.sample-content { font-family: var(--font-serif); font-size: 0.9rem; font-variation-settings: 'opsz' 14; color: var(--color-text); line-height: 1.65; white-space: pre-wrap; }

.cadence-grid { display: flex; flex-direction: column; }
.cadence-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--color-border); }
.cadence-row:last-child { border-bottom: none; }
.cadence-label { font-size: 0.85rem; font-weight: 500; text-transform: capitalize; color: var(--color-text); }
.cadence-value { font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-text-secondary); }

.integration-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--color-border); font-size: 0.85rem; color: var(--color-text); }
.integration-row:last-child { border-bottom: none; }
.status-badge { font-size: 0.6rem; font-weight: 700; padding: 3px 10px; border-radius: var(--radius-full); text-transform: uppercase; letter-spacing: 0.12em; }
.status-badge.connected { background: var(--color-success-soft); color: var(--color-success); }
.status-badge.disconnected { background: var(--color-primary-ghost); color: var(--color-text-muted); }

@media (max-width: 640px) {
  .form-input { font-size: 16px; min-height: 44px; }
  .save-btn { min-height: 44px; width: 100%; }
}
</style>
