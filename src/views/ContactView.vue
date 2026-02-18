<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContacts } from '../composables/useContacts'
import AppHeader from '../components/AppHeader.vue'
import CategoryBadge from '../components/CategoryBadge.vue'
import RelationshipHealth from '../components/RelationshipHealth.vue'
import { initials, avatarColor, daysAgoText } from '../lib/formatters'

const route = useRoute()
const router = useRouter()
const { fetchContact, updateCategory, updatePreferences, addFact, removeFact } = useContacts()

const profile = ref(null)
const loading = ref(true)

const ini = computed(() => initials(profile.value?.contact?.displayName))
const color = computed(() => avatarColor(profile.value?.contact?.email))

// Category editing
const editingCategory = ref(false)
const categoryInput = ref('')
const categoryOptions = ['personal', 'professional', 'family', 'acquaintance']

// Preferences editing
const editingPrefs = ref(false)
const freqInput = ref('')
const channelInput = ref('')

// Fact adding
const addingFact = ref(false)
const newFact = ref('')
const newFactDate = ref('')

async function load() {
  loading.value = true
  try {
    profile.value = await fetchContact(route.params.id)
    categoryInput.value = profile.value.category?.category || ''
    freqInput.value = profile.value.preferences?.desiredFrequencyDays || ''
    channelInput.value = profile.value.preferences?.preferredChannel || ''
  } finally {
    loading.value = false
  }
}

async function saveCategory() {
  await updateCategory(route.params.id, categoryInput.value)
  editingCategory.value = false
  await load()
}

async function savePreferences() {
  await updatePreferences(route.params.id, {
    desiredFrequencyDays: freqInput.value ? parseInt(freqInput.value) : null,
    preferredChannel: channelInput.value || null,
  })
  editingPrefs.value = false
  await load()
}

async function handleAddFact() {
  if (!newFact.value.trim()) return
  await addFact(route.params.id, newFact.value.trim(), newFactDate.value || undefined)
  newFact.value = ''
  newFactDate.value = ''
  addingFact.value = false
  await load()
}

async function handleRemoveFact(factId) {
  await removeFact(route.params.id, factId)
  await load()
}

onMounted(load)
</script>

<template>
  <div class="contact-layout">
    <AppHeader />

    <main class="contact-main">
      <button class="back-btn" @click="router.push({ name: 'Dashboard' })">
        &#8592; Back
      </button>

      <div v-if="loading" class="loading">Loading...</div>

      <template v-else-if="profile">
        <!-- Contact Header -->
        <div class="profile-header">
          <div class="profile-avatar" :class="color">{{ ini }}</div>
          <div class="profile-info">
            <h1 class="profile-name">{{ profile.contact.displayName }}</h1>
            <div class="profile-meta">
              <span>{{ profile.contact.email }}</span>
              <span v-if="profile.contact.company">&middot; {{ profile.contact.company }}</span>
              <span v-if="profile.contact.title">&middot; {{ profile.contact.title }}</span>
            </div>
            <div class="profile-badges">
              <CategoryBadge :category="profile.category?.category" />
              <RelationshipHealth :score="profile.health?.score" :trend="profile.health?.trend" :show-label="true" />
              <span v-if="profile.contact.lastContactAt" class="last-contact">
                Last contact: {{ daysAgoText(profile.contact.lastContactAt) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Category Section -->
        <section class="profile-section">
          <div class="section-header">
            <h2>Category</h2>
            <button class="edit-btn" @click="editingCategory = !editingCategory">
              {{ editingCategory ? 'Cancel' : 'Edit' }}
            </button>
          </div>
          <div v-if="editingCategory" class="edit-form">
            <select v-model="categoryInput" class="form-select">
              <option value="">Uncategorized</option>
              <option v-for="cat in categoryOptions" :key="cat" :value="cat">{{ cat }}</option>
            </select>
            <button class="save-btn" @click="saveCategory">Save</button>
          </div>
          <p v-else class="section-value">
            <CategoryBadge :category="profile.category?.category" />
            <span v-if="profile.category?.subcategory" class="subcategory">{{ profile.category.subcategory }}</span>
            <span v-if="profile.category?.manuallySet" class="manual-tag">manually set</span>
          </p>
        </section>

        <!-- Preferences Section -->
        <section class="profile-section">
          <div class="section-header">
            <h2>Preferences</h2>
            <button class="edit-btn" @click="editingPrefs = !editingPrefs">
              {{ editingPrefs ? 'Cancel' : 'Edit' }}
            </button>
          </div>
          <div v-if="editingPrefs" class="edit-form">
            <div class="form-row">
              <label>Contact every (days)</label>
              <input v-model="freqInput" type="number" min="1" placeholder="30" class="form-input" />
            </div>
            <div class="form-row">
              <label>Preferred channel</label>
              <select v-model="channelInput" class="form-select">
                <option value="">No preference</option>
                <option value="email">Email</option>
                <option value="text">Text</option>
                <option value="in_person">In person</option>
              </select>
            </div>
            <button class="save-btn" @click="savePreferences">Save</button>
          </div>
          <div v-else class="prefs-display">
            <p v-if="profile.preferences?.desiredFrequencyDays">Every {{ profile.preferences.desiredFrequencyDays }} days</p>
            <p v-if="profile.preferences?.preferredChannel">Via {{ profile.preferences.preferredChannel.replace('_', ' ') }}</p>
            <p v-if="!profile.preferences?.desiredFrequencyDays && !profile.preferences?.preferredChannel" class="text-muted">No preferences set</p>
          </div>
        </section>

        <!-- Sender Summary -->
        <section v-if="profile.senderSummary" class="profile-section">
          <h2>About this relationship</h2>
          <p class="summary-text">{{ profile.senderSummary }}</p>
        </section>

        <!-- Facts Section -->
        <section class="profile-section">
          <div class="section-header">
            <h2>Known Facts</h2>
            <button class="edit-btn" @click="addingFact = !addingFact">
              {{ addingFact ? 'Cancel' : 'Add Fact' }}
            </button>
          </div>

          <div v-if="addingFact" class="edit-form">
            <input v-model="newFact" type="text" placeholder="e.g. Birthday is March 15" class="form-input" maxlength="500" />
            <input v-model="newFactDate" type="date" class="form-input" />
            <button class="save-btn" @click="handleAddFact" :disabled="!newFact.trim()">Add</button>
          </div>

          <div v-if="profile.facts.length === 0 && !addingFact" class="text-muted">
            No facts yet. Add something you want to remember about this person.
          </div>
          <ul v-else class="facts-list">
            <li v-for="fact in profile.facts" :key="fact.id" class="fact-item">
              <span class="fact-text">{{ fact.fact }}</span>
              <span v-if="fact.dateRelevant" class="fact-date">{{ new Date(fact.dateRelevant).toLocaleDateString() }}</span>
              <span class="fact-source">{{ fact.sourceSubject }}</span>
              <button class="remove-btn" @click="handleRemoveFact(fact.id)">&#10005;</button>
            </li>
          </ul>
        </section>

        <!-- Reminders Section -->
        <section v-if="profile.reminders.length > 0" class="profile-section">
          <h2>Pending Reminders</h2>
          <ul class="reminders-list">
            <li v-for="r in profile.reminders" :key="r.id" class="reminder-item">
              <span class="reminder-badge" :class="r.type">{{ r.type }}</span>
              <span>{{ r.title }}</span>
              <span v-if="r.dueDate" class="fact-date">{{ r.dueDate }}</span>
            </li>
          </ul>
        </section>

        <!-- Health Details -->
        <section v-if="profile.health" class="profile-section">
          <h2>Relationship Health</h2>
          <div class="health-details">
            <div class="health-bar">
              <span class="health-label-sm">Recency</span>
              <div class="bar"><div class="bar-fill" :style="{ width: (profile.health.recencyScore * 100) + '%' }"></div></div>
            </div>
            <div class="health-bar">
              <span class="health-label-sm">Frequency</span>
              <div class="bar"><div class="bar-fill" :style="{ width: (profile.health.frequencyScore * 100) + '%' }"></div></div>
            </div>
            <div class="health-bar">
              <span class="health-label-sm">Balance</span>
              <div class="bar"><div class="bar-fill" :style="{ width: (profile.health.balanceScore * 100) + '%' }"></div></div>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.contact-layout { min-height: 100vh; background: var(--color-bg); }
.contact-main { max-width: 700px; margin: 0 auto; padding: 24px 20px; }

.back-btn { background: none; border: none; color: var(--color-text-secondary); font-size: 0.82rem; font-weight: 500; padding: 4px 0; margin-bottom: 20px; transition: color var(--transition-fast); }
.back-btn:hover { color: var(--color-text); }

.profile-header { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 32px; }
.profile-avatar { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 700; color: white; flex-shrink: 0; }
.avatar-blue { background: #3b82f6; }
.avatar-orange { background: #f97316; }
.avatar-green { background: #059669; }
.avatar-purple { background: #8b5cf6; }
.avatar-red { background: #ef4444; }
.avatar-gray { background: #94a3b8; }
.profile-name { font-size: 1.3rem; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 4px; }
.profile-meta { font-size: 0.8rem; color: var(--color-text-secondary); display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
.profile-badges { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.last-contact { font-size: 0.72rem; color: var(--color-text-muted); }

.profile-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 20px; margin-bottom: 16px; }
.profile-section h2 { font-size: 0.8rem; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 12px; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.section-header h2 { margin-bottom: 0; }
.edit-btn { font-size: 0.72rem; font-weight: 500; color: var(--color-accent); background: none; border: none; }
.edit-btn:hover { text-decoration: underline; }

.edit-form { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.form-row label { font-size: 0.7rem; font-weight: 600; color: var(--color-text-secondary); }
.form-input, .form-select { padding: 6px 10px; font-family: inherit; font-size: 0.8rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-text); }
.form-input:focus, .form-select:focus { outline: none; border-color: var(--color-primary); }
.save-btn { padding: 6px 14px; font-size: 0.72rem; font-weight: 600; background: var(--color-accent); color: white; border: none; border-radius: var(--radius-sm); }
.save-btn:hover { background: var(--color-accent-hover); }
.save-btn:disabled { opacity: 0.5; }

.section-value { display: flex; align-items: center; gap: 8px; }
.subcategory { font-size: 0.75rem; color: var(--color-text-secondary); }
.manual-tag { font-size: 0.65rem; color: var(--color-text-muted); font-style: italic; }

.prefs-display p { font-size: 0.82rem; color: var(--color-text-secondary); margin-bottom: 4px; }

.summary-text { font-size: 0.82rem; color: var(--color-text-secondary); line-height: 1.6; }

.text-muted { font-size: 0.8rem; color: var(--color-text-muted); }

.facts-list { list-style: none; }
.fact-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--color-border); }
.fact-item:last-child { border-bottom: none; }
.fact-text { flex: 1; font-size: 0.82rem; }
.fact-date { font-size: 0.7rem; color: var(--color-text-muted); }
.fact-source { font-size: 0.65rem; color: var(--color-text-muted); font-style: italic; }
.remove-btn { background: none; border: none; color: var(--color-text-muted); font-size: 0.7rem; padding: 2px 4px; }
.remove-btn:hover { color: var(--color-danger); }

.reminders-list { list-style: none; }
.reminder-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; font-size: 0.82rem; border-bottom: 1px solid var(--color-border); }
.reminder-item:last-child { border-bottom: none; }

.health-details { display: flex; flex-direction: column; gap: 10px; }
.health-bar { display: flex; align-items: center; gap: 8px; }
.health-label-sm { font-size: 0.7rem; color: var(--color-text-muted); width: 70px; flex-shrink: 0; }
.bar { flex: 1; height: 6px; background: var(--color-bg); border-radius: 3px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--color-accent); border-radius: 3px; transition: width 0.3s ease; }

.loading { text-align: center; padding: 48px; color: var(--color-text-muted); }
</style>
