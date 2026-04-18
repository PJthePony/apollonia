<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDashboard } from '../composables/useDashboard'
import AppHeader from '../components/AppHeader.vue'
import { initials, avatarColor, healthLabel, daysAgoText } from '../lib/formatters'

const router = useRouter()
const { stats, needsAttention, recentContacts, loading, fetchDashboard } = useDashboard()

onMounted(fetchDashboard)
</script>

<template>
  <div class="page-layout">
    <AppHeader />
    <main class="page-main">
      <div class="page-header">
        <div class="page-header-text">
          <span class="eyebrow">The people who matter</span>
          <h1 class="page-title">Dashboard</h1>
        </div>
        <router-link to="/contacts/new" class="add-btn">+ Add contact</router-link>
      </div>

      <div v-if="loading" class="loading">Loading...</div>

      <template v-else>
        <!-- Stats Row -->
        <div v-if="stats" class="stats-row">
          <div class="stat-card">
            <div class="stat-value">{{ stats.totalContacts }}</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.activeContacts }}</div>
            <div class="stat-label">Active</div>
          </div>
          <div class="stat-card">
            <div class="stat-value warning">{{ stats.needsAttentionCount }}</div>
            <div class="stat-label">Need Attention</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.avgHealth }}</div>
            <div class="stat-label">Avg Health</div>
          </div>
          <div class="stat-card">
            <div class="stat-value accent">{{ stats.interactionsThisMonth }}</div>
            <div class="stat-label">This Month</div>
          </div>
        </div>

        <!-- Needs Attention -->
        <section v-if="needsAttention.length > 0" class="section">
          <h2 class="section-title">
            Needs attention
            <span class="section-count">{{ needsAttention.length }}</span>
          </h2>
          <div class="attention-list">
            <div
              v-for="contact in needsAttention"
              :key="contact.id"
              class="attention-row"
              @click="router.push({ name: 'Contact', params: { id: contact.id } })"
            >
              <div class="att-avatar" :class="avatarColor(contact.name)">{{ initials(contact.name) }}</div>
              <div class="att-info">
                <span class="att-name">{{ contact.name }}</span>
                <span class="att-detail">{{ contact.company || contact.title || '' }}</span>
              </div>
              <span class="health-dot" :class="healthLabel(contact.health_score)"></span>
              <span class="att-health">{{ contact.health_score }}</span>
              <span class="att-last">{{ daysAgoText(contact.last_contacted_at) }}</span>
            </div>
          </div>
        </section>

        <!-- Recently Added -->
        <section v-if="recentContacts.length > 0" class="section">
          <h2 class="section-title">Recently added</h2>
          <div class="recent-list">
            <div
              v-for="contact in recentContacts"
              :key="contact.id"
              class="recent-row"
              @click="router.push({ name: 'Contact', params: { id: contact.id } })"
            >
              <div class="att-avatar" :class="avatarColor(contact.name)">{{ initials(contact.name) }}</div>
              <div class="att-info">
                <span class="att-name">{{ contact.name }}</span>
                <span class="att-detail">{{ contact.company || '' }}</span>
              </div>
              <span class="tier-badge" :class="contact.relationship_tier">{{ contact.relationship_tier }}</span>
            </div>
          </div>
        </section>

        <!-- Empty State -->
        <div v-if="!stats?.totalContacts" class="empty-state">
          <h2>The family is quiet.</h2>
          <p>Start by adding the people who matter, or pull in your LinkedIn network.</p>
          <div class="empty-actions">
            <router-link to="/contacts/new" class="add-btn">Add first contact</router-link>
            <router-link to="/import" class="import-link">Import from LinkedIn</router-link>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.page-layout { min-height: 100vh; background: var(--color-bg); }
.page-main { max-width: 800px; margin: 0 auto; padding: 24px 20px; }
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 28px; }
.page-header-text { display: flex; flex-direction: column; gap: 4px; }
.eyebrow { font-family: var(--font-sans); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-text-muted); }
.page-title { font-family: var(--font-serif); font-size: 2rem; font-weight: 600; font-variation-settings: 'opsz' 48, 'WONK' 1; letter-spacing: -0.03em; line-height: 1.1; color: var(--color-text); text-wrap: balance; }
.add-btn { padding: 8px 16px; font-size: 0.78rem; font-weight: 600; color: white; background: var(--color-accent); border: none; border-radius: var(--radius-md); text-decoration: none; transition: background var(--dur-2) var(--ease-out-expo), box-shadow var(--dur-2) var(--ease-out-expo), transform var(--dur-2) var(--ease-out-expo); white-space: nowrap; }
.add-btn:hover { background: var(--color-accent-hover); box-shadow: var(--shadow-suspend); transform: translateY(-1px); }
.add-btn:active { transform: translateY(0); }
.loading { text-align: center; padding: 48px; color: var(--color-text-muted); }

.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; margin-bottom: 32px; }
.stat-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; text-align: center; transition: box-shadow var(--dur-2) var(--ease-out-expo); }
.stat-card:hover { box-shadow: var(--shadow-sm); }
.stat-value { font-family: var(--font-serif); font-size: 1.75rem; font-weight: 600; font-variation-settings: 'opsz' 36, 'WONK' 0; letter-spacing: -0.03em; color: var(--color-text); }
.stat-value.warning { color: var(--color-warm); }
.stat-value.accent { color: var(--color-accent); }
.stat-label { font-size: 0.65rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.15em; font-weight: 600; margin-top: 4px; }

.section { margin-bottom: 32px; }
.section-title { font-family: var(--font-serif); font-size: 1.1rem; font-weight: 600; font-variation-settings: 'opsz' 24, 'WONK' 0; letter-spacing: -0.02em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; color: var(--color-text); }
.section-count { font-family: var(--font-sans); background: var(--color-danger-soft); color: var(--color-danger); font-size: 0.65rem; font-weight: 700; padding: 1px 7px; border-radius: var(--radius-full); }

.attention-list, .recent-list { display: flex; flex-direction: column; gap: 6px; }
.attention-row, .recent-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; transition: border-color var(--dur-2) var(--ease-out-expo), box-shadow var(--dur-2) var(--ease-out-expo), transform var(--dur-2) var(--ease-out-expo); }
.attention-row:hover, .recent-row:hover { border-color: var(--color-border-light); box-shadow: var(--shadow-md); transform: translateY(-1px); }

.att-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; color: white; flex-shrink: 0; letter-spacing: 0.02em; }

.att-info { flex: 1; min-width: 0; }
.att-name { display: block; font-size: 0.82rem; font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--color-text); }
.att-detail { font-size: 0.7rem; color: var(--color-text-secondary); }
.att-health { font-size: 0.72rem; font-weight: 600; color: var(--color-text-secondary); font-family: var(--font-mono); }
.att-last { font-size: 0.68rem; color: var(--color-text-muted); min-width: 50px; text-align: right; }

.empty-state { text-align: center; padding: 80px 20px; }
.empty-state h2 { font-family: var(--font-serif); font-style: italic; font-size: 1.8rem; font-weight: 600; font-variation-settings: 'opsz' 48, 'WONK' 1; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 12px; color: var(--color-text); text-wrap: balance; }
.empty-state p { font-size: 0.95rem; color: var(--color-text-secondary); margin-bottom: 28px; max-width: 42ch; margin-left: auto; margin-right: auto; line-height: 1.55; }
.empty-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.import-link { padding: 8px 16px; font-size: 0.78rem; font-weight: 500; color: var(--color-text-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-md); text-decoration: none; transition: border-color var(--dur-2) var(--ease-out-expo); }
.import-link:hover { border-color: var(--color-border-light); color: var(--color-text); }

@media (max-width: 640px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .add-btn { min-height: 44px; padding: 10px 16px; }
}
</style>
