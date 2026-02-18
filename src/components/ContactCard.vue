<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { initials, avatarColor, daysAgoText } from '../lib/formatters'
import CategoryBadge from './CategoryBadge.vue'
import RelationshipHealth from './RelationshipHealth.vue'

const props = defineProps({
  contact: { type: Object, required: true },
})

const router = useRouter()
const ini = computed(() => initials(props.contact.displayName))
const color = computed(() => avatarColor(props.contact.email))

const goToContact = () => {
  router.push({ name: 'Contact', params: { id: props.contact.id } })
}
</script>

<template>
  <div class="contact-card" @click="goToContact">
    <div class="contact-avatar" :class="color">{{ ini }}</div>
    <div class="contact-info">
      <div class="contact-name-row">
        <span class="contact-name">{{ contact.displayName }}</span>
        <CategoryBadge :category="contact.category?.category" />
        <RelationshipHealth :score="contact.health?.score" :trend="contact.health?.trend" />
      </div>
      <div class="contact-meta">
        <span class="contact-email">{{ contact.email }}</span>
        <span v-if="contact.company" class="contact-company">&middot; {{ contact.company }}</span>
        <span v-if="contact.lastContactAt" class="contact-last">&middot; {{ daysAgoText(contact.lastContactAt) }}</span>
      </div>
    </div>
    <svg class="contact-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
</template>

<style scoped>
.contact-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.contact-card:hover {
  border-color: var(--color-border-light);
  box-shadow: var(--shadow-sm);
}

.contact-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.avatar-blue { background: #3b82f6; }
.avatar-orange { background: #f97316; }
.avatar-green { background: #059669; }
.avatar-purple { background: #8b5cf6; }
.avatar-red { background: #ef4444; }
.avatar-gray { background: #94a3b8; }

.contact-info {
  flex: 1;
  min-width: 0;
}

.contact-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.contact-name {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.contact-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.contact-chevron {
  color: var(--color-text-muted);
  flex-shrink: 0;
}
</style>
