<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useContacts } from '../composables/useContacts'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()
const { createContact } = useContacts()

const form = ref({
  name: '',
  email: '',
  phone: '',
  company: '',
  title: '',
  location: '',
  linkedin_url: '',
  how_met: '',
  relationship_type: 'peer',
  relationship_tier: 'active',
  standout_detail: '',
})

const submitting = ref(false)
const error = ref('')

const tiers = ['core', 'active', 'dormant']
const types = ['mentor', 'mentee', 'peer', 'vc', 'founder', 'advisor', 'operator', 'other']

async function handleSubmit() {
  if (!form.value.name.trim()) return
  submitting.value = true
  error.value = ''
  try {
    const contact = {
      name: form.value.name.trim(),
      emails: form.value.email ? [form.value.email.trim()] : [],
      phones: form.value.phone ? [form.value.phone.trim()] : [],
      company: form.value.company || null,
      title: form.value.title || null,
      location: form.value.location || null,
      linkedin_url: form.value.linkedin_url || null,
      how_met: form.value.how_met || null,
      relationship_type: form.value.relationship_type,
      relationship_tier: form.value.relationship_tier,
      standout_details: form.value.standout_detail
        ? [{ detail: form.value.standout_detail, captured_at: new Date().toISOString() }]
        : [],
    }
    const created = await createContact(contact)
    router.push({ name: 'Contact', params: { id: created.id } })
  } catch (e) {
    error.value = e.message || 'Failed to create contact'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page-layout">
    <AppHeader />
    <main class="page-main">
      <button class="back-btn" @click="router.back()">&#8592; Back</button>
      <span class="eyebrow">A new name on the list</span>
      <h1 class="page-title">Add contact</h1>

      <form @submit.prevent="handleSubmit" class="contact-form">
        <div class="form-group required">
          <label>Name</label>
          <input v-model="form.name" type="text" placeholder="Full name" required autofocus />
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label>Email</label>
            <input v-model="form.email" type="email" placeholder="email@example.com" />
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input v-model="form.phone" type="tel" placeholder="+1 555..." />
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label>Company</label>
            <input v-model="form.company" type="text" placeholder="Company name" />
          </div>
          <div class="form-group">
            <label>Title</label>
            <input v-model="form.title" type="text" placeholder="Job title" />
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label>Location</label>
            <input v-model="form.location" type="text" placeholder="City, State" />
          </div>
          <div class="form-group">
            <label>LinkedIn</label>
            <input v-model="form.linkedin_url" type="url" placeholder="linkedin.com/in/..." />
          </div>
        </div>

        <div class="form-group">
          <label>How did you meet?</label>
          <input v-model="form.how_met" type="text" placeholder="Conference, intro from X, worked together at..." />
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label>Relationship tier</label>
            <div class="option-row">
              <button v-for="t in tiers" :key="t" type="button"
                class="option-btn" :class="[t, { active: form.relationship_tier === t }]"
                @click="form.relationship_tier = t">{{ t }}</button>
            </div>
          </div>
          <div class="form-group">
            <label>Relationship type</label>
            <select v-model="form.relationship_type" class="form-select">
              <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>One standout detail</label>
          <input v-model="form.standout_detail" type="text" placeholder='e.g. "Avid fly fisherman" or "Just moved to Austin"' />
        </div>

        <div v-if="error" class="form-error">{{ error }}</div>

        <div class="form-actions">
          <button type="button" class="cancel-btn" @click="router.back()">Cancel</button>
          <button type="submit" class="submit-btn" :disabled="submitting || !form.name.trim()">
            {{ submitting ? 'Creating...' : 'Add contact' }}
          </button>
        </div>
      </form>
    </main>
  </div>
</template>

<style scoped>
.page-layout { min-height: 100vh; background: var(--color-bg); }
.page-main { max-width: 600px; margin: 0 auto; padding: 24px 20px; }
.back-btn { background: none; border: none; color: var(--color-text-secondary); font-size: 0.82rem; font-weight: 500; padding: 4px 0; margin-bottom: 20px; transition: color var(--dur-2) var(--ease-out-expo); }
.back-btn:hover { color: var(--color-text); }
.eyebrow { display: block; font-family: var(--font-sans); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 4px; }
.page-title { font-family: var(--font-serif); font-size: 2rem; font-weight: 600; font-variation-settings: 'opsz' 48, 'WONK' 1; letter-spacing: -0.03em; line-height: 1.1; color: var(--color-text); margin-bottom: 28px; }

.contact-form { display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 0.72rem; font-weight: 600; color: var(--color-text-secondary); letter-spacing: 0.02em; }
.form-group.required label::after { content: ' *'; color: var(--color-danger); }
.form-group input, .form-select { padding: 9px 12px; font-family: inherit; font-size: 0.82rem; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); transition: border-color var(--dur-2) var(--ease-out-expo), box-shadow var(--dur-2) var(--ease-out-expo); }
.form-group input:focus, .form-select:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(212, 36, 111, 0.08); }

.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.option-row { display: flex; gap: 4px; }
.option-btn { padding: 4px 12px; font-size: 0.72rem; font-weight: 500; text-transform: capitalize; color: var(--color-text-secondary); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-full); transition: all var(--dur-2) var(--ease-out-expo); }
.option-btn:hover { border-color: var(--color-border-light); }
.option-btn.active.core { background: var(--color-accent-soft); color: var(--color-accent); border-color: var(--color-accent-border); }
.option-btn.active.active { background: var(--color-success-soft); color: var(--color-success); border-color: rgba(43, 138, 110, 0.25); }
.option-btn.active.dormant { background: var(--color-primary-ghost); color: var(--color-text); border-color: var(--color-border-light); }

.form-error { background: var(--color-danger-soft); color: var(--color-danger); padding: 10px 12px; border-radius: var(--radius-md); font-size: 0.8rem; border: 1px solid rgba(168, 58, 74, 0.2); }

.form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; }
.cancel-btn { padding: 8px 16px; font-size: 0.78rem; font-weight: 500; background: var(--color-bg); color: var(--color-text-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-md); transition: border-color var(--dur-2) var(--ease-out-expo); }
.cancel-btn:hover { border-color: var(--color-border-light); }
.submit-btn { padding: 8px 20px; font-size: 0.78rem; font-weight: 600; background: var(--color-accent); color: white; border: none; border-radius: var(--radius-md); transition: background var(--dur-2) var(--ease-out-expo), box-shadow var(--dur-2) var(--ease-out-expo), transform var(--dur-2) var(--ease-out-expo); }
.submit-btn:hover:not(:disabled) { background: var(--color-accent-hover); box-shadow: var(--shadow-suspend); transform: translateY(-1px); }
.submit-btn:active { transform: translateY(0); }
.submit-btn:disabled { opacity: 0.5; }

@media (max-width: 640px) {
  .form-row-2 { grid-template-columns: 1fr; }
  .form-group input, .form-select { min-height: 44px; font-size: 16px; }
  .option-btn { min-height: 44px; padding: 10px 12px; }
  .cancel-btn, .submit-btn { min-height: 44px; }
}
</style>
