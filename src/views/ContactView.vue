<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContacts } from '../composables/useContacts'
import { useInteractions } from '../composables/useInteractions'
import { useNotes } from '../composables/useNotes'
import AppHeader from '../components/AppHeader.vue'
import LogInteractionModal from '../components/LogInteractionModal.vue'
import { initials, avatarColor, healthLabel, healthColor, daysAgoText, formatDate, interactionIcon, interactionLabel } from '../lib/formatters'

const route = useRoute()
const router = useRouter()
const { fetchContactWithRelated, updateContact, addStandoutDetail, removeStandoutDetail } = useContacts()
const { logInteraction } = useInteractions()
const { createNote, deleteNote } = useNotes()

const data = ref(null)
const loading = ref(true)
const activeTab = ref('timeline')
const showLogModal = ref(false)

// Inline editing state
const editingField = ref(null)
const editValue = ref('')

// New standout detail
const newDetail = ref('')
const addingDetail = ref(false)

// New note
const newNoteContent = ref('')
const newNoteType = ref('general')
const addingNote = ref(false)

// Interaction type filter
const interactionTypeFilter = ref(null)

const contact = computed(() => data.value?.contact)
const summary = computed(() => data.value?.summary)
const interactions = computed(() => {
  const all = data.value?.interactions || []
  if (!interactionTypeFilter.value) return all
  return all.filter(i => i.interaction_type === interactionTypeFilter.value)
})
const notes = computed(() => data.value?.notes || [])
const intros = computed(() => data.value?.intros || [])

async function load() {
  loading.value = true
  try {
    data.value = await fetchContactWithRelated(route.params.id)
  } finally {
    loading.value = false
  }
}

async function startEdit(field, currentValue) {
  editingField.value = field
  editValue.value = currentValue || ''
}

async function saveEdit(field) {
  if (editingField.value !== field) return
  await updateContact(contact.value.id, { [field]: editValue.value || null })
  editingField.value = null
  await load()
}

async function cancelEdit() {
  editingField.value = null
}

async function handleAddDetail() {
  if (!newDetail.value.trim()) return
  await addStandoutDetail(contact.value.id, newDetail.value.trim())
  newDetail.value = ''
  addingDetail.value = false
  await load()
}

async function handleRemoveDetail(index) {
  await removeStandoutDetail(contact.value.id, index)
  await load()
}

async function handleAddNote() {
  if (!newNoteContent.value.trim()) return
  await createNote(contact.value.id, newNoteContent.value.trim(), newNoteType.value)
  newNoteContent.value = ''
  addingNote.value = false
  await load()
}

async function handleDeleteNote(id) {
  await deleteNote(id)
  await load()
}

async function handleLogInteraction(interaction) {
  await logInteraction({ ...interaction, contact_id: contact.value.id })
  showLogModal.value = false
  await load()
}

onMounted(load)
</script>

<template>
  <div class="page-layout">
    <AppHeader />
    <main class="page-main">
      <button class="back-btn" @click="router.push({ name: 'Contacts' })">&#8592; Contacts</button>

      <div v-if="loading" class="loading">Loading...</div>

      <template v-else-if="contact">
        <!-- Profile Header -->
        <div class="profile-header">
          <div class="profile-avatar" :class="avatarColor(contact.name)">{{ initials(contact.name) }}</div>
          <div class="profile-info">
            <h1 class="profile-name">{{ contact.name }}</h1>
            <div class="profile-meta">
              <span v-if="contact.title">{{ contact.title }}</span>
              <span v-if="contact.title && contact.company"> at </span>
              <span v-if="contact.company">{{ contact.company }}</span>
              <span v-if="contact.location"> &middot; {{ contact.location }}</span>
            </div>
            <div class="profile-badges">
              <span class="tier-badge" :class="contact.relationship_tier">{{ contact.relationship_tier }}</span>
              <span v-if="contact.relationship_type !== 'other'" class="type-badge" :class="contact.relationship_type">{{ contact.relationship_type }}</span>
              <span class="health-badge" :style="{ color: healthColor(contact.health_score) }">
                <span class="health-dot" :class="healthLabel(contact.health_score)"></span>
                {{ contact.health_score }}/100
              </span>
              <span class="last-contact-text">{{ daysAgoText(contact.last_contacted_at) }}</span>
            </div>
            <div class="profile-links">
              <a v-if="contact.linkedin_url" :href="contact.linkedin_url" target="_blank" class="profile-link">LinkedIn</a>
              <a v-if="contact.emails?.length" :href="'mailto:' + contact.emails[0]" class="profile-link">{{ contact.emails[0] }}</a>
              <span v-if="contact.phones?.length" class="profile-link">{{ contact.phones[0] }}</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="actions-row">
          <button class="action-btn primary" @click="showLogModal = true">Log interaction</button>
          <router-link :to="{ name: 'MeetingPrep', params: { id: contact.id } }" class="action-btn">Meeting prep</router-link>
          <button class="action-btn">Draft outreach</button>
          <button class="action-btn" @click="router.push({ name: 'Contacts', query: { edit: contact.id } })">Edit</button>
        </div>

        <!-- Relationship Summary -->
        <section v-if="summary" class="section card">
          <h2 class="section-title">Relationship summary</h2>
          <p class="summary-text">{{ summary.content }}</p>
          <div class="summary-meta">v{{ summary.version }} &middot; Updated {{ formatDate(summary.updated_at) }}</div>
        </section>

        <!-- About / How Met -->
        <section class="section card">
          <h2 class="section-title">About</h2>
          <div class="about-grid">
            <div class="about-row" @click="startEdit('how_met', contact.how_met)">
              <span class="about-label">How Met</span>
              <template v-if="editingField === 'how_met'">
                <input v-model="editValue" class="inline-input" @keydown.enter="saveEdit('how_met')" @keydown.escape="cancelEdit" @blur="saveEdit('how_met')" autofocus />
              </template>
              <span v-else class="about-value">{{ contact.how_met || 'Click to add...' }}</span>
            </div>
            <div class="about-row">
              <span class="about-label">Met On</span>
              <span class="about-value">{{ contact.date_met ? formatDate(contact.date_met) : 'Unknown' }}</span>
            </div>
            <div class="about-row" @click="startEdit('bio_notes', contact.bio_notes)">
              <span class="about-label">Bio</span>
              <template v-if="editingField === 'bio_notes'">
                <textarea v-model="editValue" class="inline-input" rows="3" @keydown.escape="cancelEdit" @blur="saveEdit('bio_notes')" autofocus></textarea>
              </template>
              <span v-else class="about-value">{{ contact.bio_notes || 'Click to add...' }}</span>
            </div>
          </div>
        </section>

        <!-- Standout Details -->
        <section class="section card">
          <div class="section-header">
            <h2 class="section-title">Standout details</h2>
            <button class="edit-btn" @click="addingDetail = !addingDetail">{{ addingDetail ? 'Cancel' : '+ Add' }}</button>
          </div>
          <div v-if="addingDetail" class="add-form">
            <input v-model="newDetail" type="text" placeholder='e.g. "Daughter starting college fall 2025"' class="form-input" @keydown.enter="handleAddDetail" />
            <button class="save-btn" @click="handleAddDetail" :disabled="!newDetail.trim()">Add</button>
          </div>
          <div v-if="!contact.standout_details?.length && !addingDetail" class="empty-text">No standout details yet.</div>
          <ul v-else class="details-list">
            <li v-for="(detail, idx) in (contact.standout_details || [])" :key="idx" class="detail-item">
              <span class="detail-text">{{ detail.detail }}</span>
              <span class="detail-date">{{ formatDate(detail.captured_at) }}</span>
              <button class="remove-btn" @click="handleRemoveDetail(idx)">&times;</button>
            </li>
          </ul>
        </section>

        <!-- Personal Details Panel -->
        <section class="section card">
          <h2 class="section-title">Personal</h2>
          <div class="personal-grid">
            <div class="personal-item" @click="startEdit('partner_name', contact.partner_name)">
              <span class="personal-label">Partner</span>
              <template v-if="editingField === 'partner_name'">
                <input v-model="editValue" class="inline-input" @keydown.enter="saveEdit('partner_name')" @keydown.escape="cancelEdit" @blur="saveEdit('partner_name')" autofocus />
              </template>
              <span v-else class="personal-value">{{ contact.partner_name || '...' }}</span>
            </div>
            <div class="personal-item" @click="startEdit('alma_mater', contact.alma_mater)">
              <span class="personal-label">School</span>
              <template v-if="editingField === 'alma_mater'">
                <input v-model="editValue" class="inline-input" @keydown.enter="saveEdit('alma_mater')" @keydown.escape="cancelEdit" @blur="saveEdit('alma_mater')" autofocus />
              </template>
              <span v-else class="personal-value">{{ contact.alma_mater || '...' }}</span>
            </div>
            <div class="personal-item" @click="startEdit('hometown', contact.hometown)">
              <span class="personal-label">Hometown</span>
              <template v-if="editingField === 'hometown'">
                <input v-model="editValue" class="inline-input" @keydown.enter="saveEdit('hometown')" @keydown.escape="cancelEdit" @blur="saveEdit('hometown')" autofocus />
              </template>
              <span v-else class="personal-value">{{ contact.hometown || '...' }}</span>
            </div>
            <div class="personal-item" @click="startEdit('pets', contact.pets)">
              <span class="personal-label">Pets</span>
              <template v-if="editingField === 'pets'">
                <input v-model="editValue" class="inline-input" @keydown.enter="saveEdit('pets')" @keydown.escape="cancelEdit" @blur="saveEdit('pets')" autofocus />
              </template>
              <span v-else class="personal-value">{{ contact.pets || '...' }}</span>
            </div>
            <div class="personal-item" @click="startEdit('personal_notes', contact.personal_notes)">
              <span class="personal-label">Notes</span>
              <template v-if="editingField === 'personal_notes'">
                <textarea v-model="editValue" class="inline-input" rows="2" @keydown.escape="cancelEdit" @blur="saveEdit('personal_notes')" autofocus></textarea>
              </template>
              <span v-else class="personal-value">{{ contact.personal_notes || '...' }}</span>
            </div>
          </div>
        </section>

        <!-- Tabs: Timeline / Notes / Intros -->
        <div class="tabs">
          <button class="tab" :class="{ active: activeTab === 'timeline' }" @click="activeTab = 'timeline'">Timeline ({{ data.interactions.length }})</button>
          <button class="tab" :class="{ active: activeTab === 'notes' }" @click="activeTab = 'notes'">Notes ({{ notes.length }})</button>
          <button class="tab" :class="{ active: activeTab === 'intros' }" @click="activeTab = 'intros'">Intros ({{ intros.length }})</button>
        </div>

        <!-- Timeline Tab -->
        <section v-if="activeTab === 'timeline'" class="section">
          <div class="timeline-filters">
            <button class="type-btn" :class="{ active: !interactionTypeFilter }" @click="interactionTypeFilter = null">All</button>
            <button v-for="t in ['email','meeting','call','coffee','text','linkedin_message']" :key="t"
              class="type-btn" :class="{ active: interactionTypeFilter === t }" @click="interactionTypeFilter = interactionTypeFilter === t ? null : t">
              {{ interactionLabel(t) }}
            </button>
          </div>
          <div v-if="interactions.length === 0" class="empty-text">No interactions logged yet.</div>
          <div v-else class="timeline">
            <div v-for="i in interactions" :key="i.id" class="timeline-item">
              <div class="interaction-icon" :class="i.interaction_type">{{ interactionIcon(i.interaction_type) }}</div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <span class="timeline-type">{{ interactionLabel(i.interaction_type) }}</span>
                  <span class="timeline-date">{{ formatDate(i.occurred_at) }}</span>
                </div>
                <p v-if="i.summary" class="timeline-summary">{{ i.summary }}</p>
                <div v-if="i.topics?.length" class="timeline-topics">
                  <span v-for="topic in i.topics" :key="topic" class="topic-tag">{{ topic }}</span>
                </div>
                <span class="source-badge">{{ i.source }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Notes Tab -->
        <section v-if="activeTab === 'notes'" class="section">
          <div class="notes-add">
            <div v-if="addingNote" class="add-note-form">
              <select v-model="newNoteType" class="note-type-select">
                <option value="general">General</option>
                <option value="prep">Prep</option>
                <option value="follow_up">Follow-up</option>
                <option value="meeting_summary">Meeting Summary</option>
              </select>
              <textarea v-model="newNoteContent" placeholder="Write a note..." class="note-textarea" rows="3"></textarea>
              <div class="note-actions">
                <button class="save-btn" @click="handleAddNote" :disabled="!newNoteContent.trim()">Save Note</button>
                <button class="cancel-btn" @click="addingNote = false">Cancel</button>
              </div>
            </div>
            <button v-else class="edit-btn" @click="addingNote = true">+ Add Note</button>
          </div>
          <div v-if="notes.length === 0 && !addingNote" class="empty-text">No notes yet.</div>
          <div v-else class="notes-list">
            <div v-for="note in notes" :key="note.id" class="note-card">
              <div class="note-header">
                <span class="note-type-badge">{{ note.note_type }}</span>
                <span class="note-date">{{ formatDate(note.created_at) }}</span>
                <button class="remove-btn" @click="handleDeleteNote(note.id)">&times;</button>
              </div>
              <p class="note-content">{{ note.content }}</p>
            </div>
          </div>
        </section>

        <!-- Intros Tab -->
        <section v-if="activeTab === 'intros'" class="section">
          <div v-if="intros.length === 0" class="empty-text">No intros recorded.</div>
          <div v-else class="intros-list">
            <div v-for="intro in intros" :key="intro.id" class="intro-item">
              <span class="intro-text">
                {{ intro.from_contact?.name }} &#8594; {{ intro.to_contact?.name }}
              </span>
              <span v-if="intro.context_notes" class="intro-context">{{ intro.context_notes }}</span>
              <span class="intro-date">{{ formatDate(intro.introduced_at) }}</span>
            </div>
          </div>
        </section>
      </template>
    </main>

    <LogInteractionModal
      v-if="showLogModal"
      @close="showLogModal = false"
      @submit="handleLogInteraction"
    />
  </div>
</template>

<style scoped>
.page-layout { min-height: 100vh; background: var(--color-bg); }
.page-main { max-width: 800px; margin: 0 auto; padding: 24px 20px; }

.back-btn { background: none; border: none; color: var(--color-text-secondary); font-size: 0.82rem; font-weight: 500; padding: 4px 0; margin-bottom: 20px; transition: color var(--dur-2) var(--ease-out-expo); }
.back-btn:hover { color: var(--color-text); }

.loading { text-align: center; padding: 48px; color: var(--color-text-muted); }

/* Profile Header */
.profile-header { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 24px; }
.profile-avatar { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; color: white; flex-shrink: 0; letter-spacing: 0.02em; }
.profile-name { font-family: var(--font-serif); font-size: 2rem; font-weight: 600; font-variation-settings: 'opsz' 48, 'WONK' 1; letter-spacing: -0.03em; line-height: 1.05; margin-bottom: 4px; color: var(--color-text); text-wrap: balance; }
.profile-meta { font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 8px; }
.profile-badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.health-badge { font-family: var(--font-mono); font-size: 0.72rem; font-weight: 500; display: flex; align-items: center; gap: 4px; }
.last-contact-text { font-size: 0.7rem; color: var(--color-text-muted); }
.profile-links { display: flex; gap: 12px; flex-wrap: wrap; }
.profile-link { font-size: 0.75rem; color: var(--color-accent); text-decoration: none; transition: color var(--dur-2) var(--ease-out-expo); }
.profile-link:hover { color: var(--color-accent-hover); text-decoration: underline; text-underline-offset: 3px; }

/* Actions */
.actions-row { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
.action-btn { padding: 8px 16px; font-size: 0.78rem; font-weight: 600; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); cursor: pointer; transition: border-color var(--dur-2) var(--ease-out-expo), box-shadow var(--dur-2) var(--ease-out-expo), transform var(--dur-2) var(--ease-out-expo); text-decoration: none; }
.action-btn:hover { border-color: var(--color-border-light); box-shadow: var(--shadow-sm); transform: translateY(-1px); }
.action-btn:active { transform: translateY(0); }
.action-btn.primary { background: var(--color-accent); color: white; border-color: var(--color-accent); }
.action-btn.primary:hover { background: var(--color-accent-hover); border-color: var(--color-accent-hover); box-shadow: var(--shadow-suspend); }

/* Sections */
.section { margin-bottom: 16px; }
.card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 20px; }
.section-title { font-family: var(--font-serif); font-size: 1rem; font-weight: 600; font-variation-settings: 'opsz' 24, 'WONK' 0; letter-spacing: -0.02em; margin-bottom: 14px; color: var(--color-text); }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.section-header .section-title { margin-bottom: 0; }
.edit-btn { font-size: 0.72rem; font-weight: 500; color: var(--color-accent); background: none; border: none; padding: 4px 8px; transition: color var(--dur-2) var(--ease-out-expo); }
.edit-btn:hover { color: var(--color-accent-hover); text-decoration: underline; text-underline-offset: 3px; }

/* Summary */
.summary-text { font-family: var(--font-serif); font-size: 0.95rem; font-weight: 400; font-variation-settings: 'opsz' 14; color: var(--color-text); line-height: 1.7; max-width: 58ch; }
.summary-meta { font-family: var(--font-mono); font-size: 0.65rem; color: var(--color-text-muted); margin-top: 12px; }

/* About */
.about-grid { display: flex; flex-direction: column; gap: 8px; }
.about-row { display: flex; gap: 12px; cursor: pointer; padding: 4px 6px; margin: 0 -6px; border-radius: var(--radius-sm); transition: background var(--dur-2) var(--ease-out-expo); }
.about-row:hover { background: var(--color-primary-ghost); }
.about-label { font-size: 0.68rem; font-weight: 700; color: var(--color-text-muted); letter-spacing: 0.15em; text-transform: uppercase; min-width: 80px; flex-shrink: 0; padding-top: 2px; }
.about-value { font-size: 0.88rem; color: var(--color-text); line-height: 1.5; }
.inline-input { font-family: inherit; font-size: 0.88rem; padding: 4px 8px; border: 1px solid var(--color-accent-border); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-text); flex: 1; min-width: 0; transition: border-color var(--dur-2) var(--ease-out-expo); }
.inline-input:focus { outline: none; border-color: var(--color-accent); }

/* Standout Details */
.add-form { display: flex; gap: 8px; margin-bottom: 12px; }
.form-input { flex: 1; padding: 8px 12px; font-family: inherit; font-size: 0.82rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-text); transition: border-color var(--dur-2) var(--ease-out-expo); }
.form-input:focus { outline: none; border-color: var(--color-accent); }
.save-btn { padding: 6px 14px; font-size: 0.72rem; font-weight: 600; background: var(--color-accent); color: white; border: none; border-radius: var(--radius-sm); transition: background var(--dur-2) var(--ease-out-expo); }
.save-btn:hover:not(:disabled) { background: var(--color-accent-hover); }
.save-btn:disabled { opacity: 0.5; }
.cancel-btn { padding: 6px 14px; font-size: 0.72rem; font-weight: 500; background: var(--color-bg); color: var(--color-text-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-sm); transition: border-color var(--dur-2) var(--ease-out-expo); }
.cancel-btn:hover { border-color: var(--color-border-light); }
.details-list { list-style: none; }
.detail-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--color-border); }
.detail-item:last-child { border-bottom: none; }
.detail-text { flex: 1; font-size: 0.88rem; color: var(--color-text); line-height: 1.55; }
.detail-date { font-family: var(--font-mono); font-size: 0.65rem; color: var(--color-text-muted); }
.remove-btn { background: none; border: none; color: var(--color-text-muted); font-size: 0.9rem; padding: 2px 6px; cursor: pointer; transition: color var(--dur-2) var(--ease-out-expo); }
.remove-btn:hover { color: var(--color-danger); }
.empty-text { font-size: 0.85rem; color: var(--color-text-muted); font-style: italic; font-family: var(--font-serif); font-variation-settings: 'opsz' 18; }

/* Personal */
.personal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.personal-item { padding: 8px 10px; margin: 0 -10px; cursor: pointer; border-radius: var(--radius-sm); transition: background var(--dur-2) var(--ease-out-expo); }
.personal-item:hover { background: var(--color-primary-ghost); }
.personal-label { display: block; font-size: 0.65rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 4px; }
.personal-value { font-size: 0.88rem; color: var(--color-text); line-height: 1.5; }

/* Tabs */
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--color-border); margin-bottom: 20px; }
.tab { padding: 10px 16px; font-size: 0.82rem; font-weight: 500; color: var(--color-text-secondary); background: none; border: none; border-bottom: 2px solid transparent; transition: color var(--dur-2) var(--ease-out-expo), border-color var(--dur-2) var(--ease-out-expo); }
.tab:hover { color: var(--color-text); }
.tab.active { color: var(--color-text); border-bottom-color: var(--color-accent); font-weight: 600; }

/* Timeline */
.timeline-filters { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
.type-btn { padding: 3px 8px; font-size: 0.65rem; font-weight: 500; text-transform: capitalize; color: var(--color-text-muted); background: transparent; border: 1px solid transparent; border-radius: var(--radius-full); transition: all var(--dur-2) var(--ease-out-expo); }
.type-btn:hover { color: var(--color-text-secondary); }
.type-btn.active { background: var(--color-primary-ghost); color: var(--color-text); border-color: var(--color-border); }

.timeline { display: flex; flex-direction: column; }
.timeline-item { display: flex; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--color-border); }
.timeline-item:last-child { border-bottom: none; }
.timeline-content { flex: 1; min-width: 0; }
.timeline-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.timeline-type { font-size: 0.78rem; font-weight: 600; text-transform: capitalize; color: var(--color-text); }
.timeline-date { font-family: var(--font-mono); font-size: 0.65rem; color: var(--color-text-muted); }
.timeline-summary { font-size: 0.88rem; color: var(--color-text); line-height: 1.55; margin-bottom: 6px; max-width: 58ch; }
.timeline-topics { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px; }
.topic-tag { padding: 1px 8px; font-size: 0.6rem; font-weight: 600; background: var(--color-primary-ghost); color: var(--color-text-secondary); border-radius: var(--radius-full); letter-spacing: 0.02em; }

/* Notes */
.notes-add { margin-bottom: 16px; }
.add-note-form { display: flex; flex-direction: column; gap: 8px; }
.note-type-select { padding: 6px 10px; font-family: inherit; font-size: 0.78rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-text); width: fit-content; transition: border-color var(--dur-2) var(--ease-out-expo); }
.note-type-select:focus { outline: none; border-color: var(--color-accent); }
.note-textarea { width: 100%; padding: 10px 12px; font-family: inherit; font-size: 0.88rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-text); resize: vertical; line-height: 1.5; transition: border-color var(--dur-2) var(--ease-out-expo); }
.note-textarea:focus { outline: none; border-color: var(--color-accent); }
.note-actions { display: flex; gap: 8px; }
.notes-list { display: flex; flex-direction: column; gap: 8px; }
.note-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 14px 16px; transition: box-shadow var(--dur-2) var(--ease-out-expo); }
.note-card:hover { box-shadow: var(--shadow-sm); }
.note-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.note-type-badge { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; padding: 2px 8px; background: var(--color-primary-ghost); border-radius: var(--radius-full); color: var(--color-text-secondary); }
.note-date { font-family: var(--font-mono); font-size: 0.65rem; color: var(--color-text-muted); flex: 1; }
.note-content { font-family: var(--font-serif); font-size: 0.95rem; font-weight: 400; font-variation-settings: 'opsz' 14; color: var(--color-text); line-height: 1.7; white-space: pre-wrap; max-width: 58ch; }

/* Intros */
.intros-list { display: flex; flex-direction: column; }
.intro-item { display: flex; align-items: center; gap: 8px; padding: 10px 0; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; }
.intro-item:last-child { border-bottom: none; }
.intro-text { font-size: 0.88rem; font-weight: 500; color: var(--color-text); }
.intro-context { font-size: 0.78rem; color: var(--color-text-secondary); }
.intro-date { font-family: var(--font-mono); font-size: 0.65rem; color: var(--color-text-muted); margin-left: auto; }

@media (max-width: 640px) {
  .profile-header { flex-direction: column; align-items: center; text-align: center; }
  .profile-badges { justify-content: center; }
  .profile-links { justify-content: center; }
  .actions-row { flex-direction: column; }
  .action-btn { min-height: 44px; width: 100%; text-align: center; }
  .back-btn { min-height: 44px; padding: 10px 0; }
  .personal-grid { grid-template-columns: 1fr 1fr; }
  .form-input, .note-textarea, .note-type-select { font-size: 16px; min-height: 44px; }
  .add-form { flex-direction: column; }
}
</style>
