<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useContacts } from '../composables/useContacts'
import AppHeader from '../components/AppHeader.vue'
import { initials, avatarColor, healthLabel, daysAgoText } from '../lib/formatters'

const router = useRouter()
const { contacts, loading, searchQuery, tierFilter, typeFilter, filteredContacts, fetchContacts } = useContacts()

const tiers = ['core', 'active', 'dormant', 'archived']
const types = ['mentor', 'mentee', 'peer', 'vc', 'founder', 'advisor', 'operator', 'other']

function setTierFilter(tier) {
  tierFilter.value = tierFilter.value === tier ? null : tier
}

function setTypeFilter(type) {
  typeFilter.value = typeFilter.value === type ? null : type
}

onMounted(() => fetchContacts())
</script>

<template>
  <div class="page-layout">
    <AppHeader />
    <main class="page-main">
      <div class="page-header">
        <div class="page-header-text">
          <span class="eyebrow">The family</span>
          <h1 class="page-title">Contacts</h1>
        </div>
        <router-link to="/contacts/new" class="add-btn">+ Add contact</router-link>
      </div>

      <div class="filters-row">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search contacts..."
          class="search-input"
        />
        <div class="filter-group">
          <button
            v-for="tier in tiers" :key="tier"
            class="filter-btn"
            :class="[tier, { active: tierFilter === tier }]"
            @click="setTierFilter(tier)"
          >{{ tier }}</button>
        </div>
      </div>

      <div class="type-filters">
        <button
          v-for="t in types" :key="t"
          class="type-filter-btn"
          :class="{ active: typeFilter === t }"
          @click="setTypeFilter(t)"
        >{{ t }}</button>
      </div>

      <div v-if="loading" class="empty-state">Loading contacts...</div>
      <div v-else-if="filteredContacts.length === 0" class="empty-state">
        {{ searchQuery || tierFilter || typeFilter ? 'No contacts match your filter.' : 'No contacts yet. Add your first contact or import from LinkedIn.' }}
      </div>

      <div v-else class="contacts-list">
        <div
          v-for="contact in filteredContacts"
          :key="contact.id"
          class="contact-row"
          @click="router.push({ name: 'Contact', params: { id: contact.id } })"
        >
          <div class="contact-avatar" :class="avatarColor(contact.name)">{{ initials(contact.name) }}</div>
          <div class="contact-info">
            <div class="contact-name">{{ contact.name }}</div>
            <div class="contact-meta">
              <span v-if="contact.title">{{ contact.title }}</span>
              <span v-if="contact.title && contact.company"> at </span>
              <span v-if="contact.company">{{ contact.company }}</span>
            </div>
          </div>
          <div class="contact-badges">
            <span class="tier-badge" :class="contact.relationship_tier">{{ contact.relationship_tier }}</span>
            <span v-if="contact.relationship_type !== 'other'" class="type-badge" :class="contact.relationship_type">{{ contact.relationship_type }}</span>
          </div>
          <div class="contact-health">
            <span class="health-dot" :class="healthLabel(contact.health_score)"></span>
            <span class="health-num">{{ contact.health_score }}</span>
          </div>
          <div class="contact-last">
            {{ daysAgoText(contact.last_contacted_at) }}
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page-layout { min-height: 100vh; background: var(--color-bg); }
.page-main { max-width: 900px; margin: 0 auto; padding: 24px 20px; }

.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.page-header-text { display: flex; flex-direction: column; gap: 4px; }
.eyebrow { font-family: var(--font-sans); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-text-muted); }
.page-title { font-family: var(--font-serif); font-size: 2rem; font-weight: 600; font-variation-settings: 'opsz' 48, 'WONK' 1; letter-spacing: -0.03em; line-height: 1.1; color: var(--color-text); }

.add-btn {
  padding: 8px 16px;
  font-size: 0.78rem;
  font-weight: 600;
  color: white;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-md);
  text-decoration: none;
  white-space: nowrap;
  transition: background var(--dur-2) var(--ease-out-expo), box-shadow var(--dur-2) var(--ease-out-expo), transform var(--dur-2) var(--ease-out-expo);
}
.add-btn:hover { background: var(--color-accent-hover); box-shadow: var(--shadow-suspend); transform: translateY(-1px); }
.add-btn:active { transform: translateY(0); }

.filters-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  font-family: inherit;
  font-size: 0.82rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  transition: border-color var(--dur-2) var(--ease-out-expo);
}
.search-input:focus { outline: none; border-color: var(--color-accent); }

.filter-group { display: flex; gap: 4px; }

.filter-btn {
  padding: 4px 10px;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: capitalize;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  transition: all var(--dur-2) var(--ease-out-expo);
}
.filter-btn:hover { border-color: var(--color-border-light); }
.filter-btn.active.core { background: var(--color-accent-soft); color: var(--color-accent); border-color: var(--color-accent-border); }
.filter-btn.active.active { background: var(--color-success-soft); color: var(--color-success); border-color: rgba(43, 138, 110, 0.25); }
.filter-btn.active.dormant, .filter-btn.active.archived { background: var(--color-primary-ghost); color: var(--color-text); border-color: var(--color-border-light); }

.type-filters { display: flex; gap: 4px; margin-bottom: 20px; flex-wrap: wrap; }
.type-filter-btn {
  padding: 3px 8px;
  font-size: 0.65rem;
  font-weight: 500;
  text-transform: capitalize;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  transition: all var(--dur-2) var(--ease-out-expo);
}
.type-filter-btn:hover { color: var(--color-text-secondary); }
.type-filter-btn.active { background: var(--color-primary-ghost); color: var(--color-text); border-color: var(--color-border); }

.contacts-list { display: flex; flex-direction: column; gap: 4px; }

.contact-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--dur-2) var(--ease-out-expo), box-shadow var(--dur-2) var(--ease-out-expo), transform var(--dur-2) var(--ease-out-expo);
}
.contact-row:hover { border-color: var(--color-border-light); box-shadow: var(--shadow-md); transform: translateY(-1px); }

.contact-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.contact-info { flex: 1; min-width: 0; }
.contact-name { font-size: 0.85rem; font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--color-text); }
.contact-meta { font-size: 0.72rem; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.contact-badges { display: flex; gap: 4px; flex-shrink: 0; }

.contact-health { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.health-num { font-family: var(--font-mono); font-size: 0.72rem; font-weight: 500; color: var(--color-text-secondary); min-width: 20px; text-align: right; }

.contact-last { font-size: 0.7rem; color: var(--color-text-muted); flex-shrink: 0; min-width: 60px; text-align: right; }

.empty-state { text-align: center; padding: 64px 20px; color: var(--color-text-muted); font-size: 0.95rem; font-family: var(--font-serif); font-style: italic; font-variation-settings: 'opsz' 24; }

@media (max-width: 640px) {
  .contact-badges { display: none; }
  .contact-row { padding: 10px 12px; }
  .search-input { min-width: 0; width: 100%; min-height: 44px; font-size: 16px; }
  .filter-btn { min-height: 44px; padding: 10px 12px; }
  .add-btn { min-height: 44px; padding: 10px 16px; }
}
</style>
