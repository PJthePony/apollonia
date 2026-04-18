<script setup>
import { ref } from 'vue'

const emit = defineEmits(['close', 'submit'])

const form = ref({
  interaction_type: 'meeting',
  summary: '',
  occurred_at: new Date().toISOString().split('T')[0],
  topics: '',
  sentiment: 'neutral',
})

const submitting = ref(false)

const types = [
  { value: 'email', label: 'Email' },
  { value: 'text', label: 'Text' },
  { value: 'linkedin_message', label: 'LinkedIn' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'call', label: 'Call' },
  { value: 'event', label: 'Event' },
  { value: 'intro_made', label: 'Intro Made' },
  { value: 'intro_received', label: 'Intro Received' },
]

async function handleSubmit() {
  if (!form.value.summary.trim()) return
  submitting.value = true
  try {
    const topics = form.value.topics ? form.value.topics.split(',').map(t => t.trim()).filter(Boolean) : []
    emit('submit', {
      interaction_type: form.value.interaction_type,
      summary: form.value.summary.trim(),
      occurred_at: new Date(form.value.occurred_at).toISOString(),
      topics,
      sentiment: form.value.sentiment,
      source: 'manual',
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h2>Log Interaction</h2>
          <button class="close-btn" @click="emit('close')">&times;</button>
        </div>
        <form @submit.prevent="handleSubmit" class="modal-body">
          <div class="form-row">
            <label>Type</label>
            <div class="type-grid">
              <button v-for="t in types" :key="t.value" type="button"
                class="type-option" :class="{ active: form.interaction_type === t.value }"
                @click="form.interaction_type = t.value">
                {{ t.label }}
              </button>
            </div>
          </div>
          <div class="form-row">
            <label>Date</label>
            <input v-model="form.occurred_at" type="date" class="form-input" />
          </div>
          <div class="form-row">
            <label>Summary</label>
            <textarea v-model="form.summary" placeholder="What happened?" rows="3" class="form-input" required></textarea>
          </div>
          <div class="form-row">
            <label>Topics (comma-separated)</label>
            <input v-model="form.topics" type="text" placeholder="e.g. hiring, product launch" class="form-input" />
          </div>
          <div class="form-row">
            <label>Sentiment</label>
            <div class="sentiment-row">
              <button v-for="s in ['positive', 'neutral', 'negative']" :key="s" type="button"
                class="sentiment-btn" :class="[s, { active: form.sentiment === s }]"
                @click="form.sentiment = s">{{ s }}</button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="cancel-btn" @click="emit('close')">Cancel</button>
            <button type="submit" class="save-btn" :disabled="submitting || !form.summary.trim()">
              {{ submitting ? 'Saving...' : 'Log Interaction' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(20, 34, 53, 0.4); backdrop-filter: blur(12px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--color-border); }
.modal-header h2 { font-family: var(--font-serif); font-size: 1.15rem; font-weight: 600; font-variation-settings: 'opsz' 36, 'WONK' 0; letter-spacing: -0.02em; color: var(--color-text); }
.close-btn { background: none; border: none; font-size: 1.2rem; color: var(--color-text-muted); padding: 4px; transition: color var(--dur-2) var(--ease-out-expo); }
.close-btn:hover { color: var(--color-text); }
.modal-body { padding: 20px; }
.form-row { margin-bottom: 16px; }
.form-row label { display: block; font-size: 0.72rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 6px; }
.form-input { width: 100%; padding: 8px 12px; font-family: inherit; font-size: 0.82rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-text); transition: border-color var(--dur-2) var(--ease-out-expo); }
.form-input:focus { outline: none; border-color: var(--color-accent); }
textarea.form-input { resize: vertical; }

.type-grid { display: flex; gap: 4px; flex-wrap: wrap; }
.type-option { padding: 4px 10px; font-size: 0.7rem; font-weight: 500; color: var(--color-text-secondary); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-full); transition: all var(--dur-2) var(--ease-out-expo); }
.type-option:hover { border-color: var(--color-border-light); }
.type-option.active { background: var(--color-accent-soft); color: var(--color-accent); border-color: var(--color-accent-border); }

.sentiment-row { display: flex; gap: 6px; }
.sentiment-btn { padding: 4px 12px; font-size: 0.72rem; font-weight: 500; text-transform: capitalize; border: 1px solid var(--color-border); border-radius: var(--radius-full); background: var(--color-bg); color: var(--color-text-secondary); transition: all var(--dur-2) var(--ease-out-expo); }
.sentiment-btn.active.positive { background: var(--color-success-soft); color: var(--color-success); border-color: rgba(43, 138, 110, 0.25); }
.sentiment-btn.active.neutral { background: var(--color-primary-ghost); color: var(--color-text); border-color: var(--color-border-light); }
.sentiment-btn.active.negative { background: var(--color-danger-soft); color: var(--color-danger); border-color: rgba(168, 58, 74, 0.25); }

.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; border-top: 1px solid var(--color-border); margin-top: 8px; }
.cancel-btn { padding: 8px 16px; font-size: 0.78rem; font-weight: 500; background: var(--color-bg); color: var(--color-text-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-md); transition: border-color var(--dur-2) var(--ease-out-expo); }
.cancel-btn:hover { border-color: var(--color-border-light); }
.save-btn { padding: 8px 16px; font-size: 0.78rem; font-weight: 600; background: var(--color-accent); color: white; border: none; border-radius: var(--radius-md); transition: background var(--dur-2) var(--ease-out-expo), box-shadow var(--dur-2) var(--ease-out-expo); }
.save-btn:hover:not(:disabled) { background: var(--color-accent-hover); box-shadow: var(--shadow-suspend); }
.save-btn:disabled { opacity: 0.5; }

@media (max-width: 640px) {
  .modal { max-width: 100%; border-radius: var(--radius-lg) var(--radius-lg) 0 0; position: fixed; bottom: 0; left: 0; right: 0; max-height: 85vh; }
  .form-input { min-height: 44px; font-size: 16px; }
  .type-option, .sentiment-btn { min-height: 44px; padding: 10px 12px; }
  .save-btn, .cancel-btn { min-height: 44px; }
}
</style>
