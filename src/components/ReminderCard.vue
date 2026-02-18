<script setup>
import { ref, computed } from 'vue'
import { initials, avatarColor, daysAgoText } from '../lib/formatters'

const props = defineProps({
  reminder: { type: Object, required: true },
})

const emit = defineEmits(['send-to-tessio', 'dismiss', 'snooze'])

const ini = computed(() => initials(props.reminder.contact?.displayName))
const color = computed(() => avatarColor(props.reminder.contact?.email))
const showSnooze = ref(false)

const typeLabels = {
  birthday: 'Birthday',
  anniversary: 'Anniversary',
  favor: 'Favor',
  milestone: 'Milestone',
  check_in: 'Check In',
  dinner: 'Dinner',
}
</script>

<template>
  <div class="reminder-card">
    <div class="reminder-header">
      <div class="reminder-avatar" :class="color">{{ ini }}</div>
      <div class="reminder-info">
        <div class="reminder-name-row">
          <span class="reminder-contact-name">{{ reminder.contact?.displayName }}</span>
          <span class="reminder-badge" :class="reminder.type">{{ typeLabels[reminder.type] || reminder.type }}</span>
        </div>
        <div class="reminder-title">{{ reminder.title }}</div>
        <div v-if="reminder.context" class="reminder-context">{{ reminder.context }}</div>
        <div v-if="reminder.dueDate" class="reminder-due">Due: {{ reminder.dueDate }}</div>
      </div>
    </div>

    <div class="reminder-actions">
      <button class="action-btn primary" @click="emit('send-to-tessio', reminder.id)">
        Send to Tessio
      </button>
      <div class="snooze-group">
        <button class="action-btn ghost" @click="showSnooze = !showSnooze">Snooze</button>
        <div v-if="showSnooze" class="snooze-options">
          <button @click="emit('snooze', reminder.id, '3d')">3 days</button>
          <button @click="emit('snooze', reminder.id, '1w')">1 week</button>
          <button @click="emit('snooze', reminder.id, '2w')">2 weeks</button>
          <button @click="emit('snooze', reminder.id, '1mo')">1 month</button>
        </div>
      </div>
      <button class="action-btn ghost danger" @click="emit('dismiss', reminder.id)">Dismiss</button>
    </div>
  </div>
</template>

<style scoped>
.reminder-card {
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.reminder-header {
  display: flex;
  gap: 12px;
}

.reminder-avatar {
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

.reminder-info { flex: 1; }

.reminder-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.reminder-contact-name {
  font-size: 0.85rem;
  font-weight: 600;
}

.reminder-title {
  font-size: 0.82rem;
  color: var(--color-text);
  margin-bottom: 2px;
}

.reminder-context {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.reminder-due {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.reminder-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.action-btn {
  padding: 5px 12px;
  font-size: 0.72rem;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.action-btn.primary {
  background: var(--color-accent);
  color: white;
}

.action-btn.primary:hover {
  background: var(--color-accent-hover);
}

.action-btn.ghost {
  background: var(--color-bg);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.action-btn.ghost:hover {
  background: var(--color-border);
}

.action-btn.ghost.danger:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.snooze-group {
  position: relative;
}

.snooze-options {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  z-index: 10;
  overflow: hidden;
}

.snooze-options button {
  display: block;
  width: 100%;
  padding: 6px 16px;
  font-size: 0.72rem;
  text-align: left;
  background: none;
  border: none;
  color: var(--color-text);
  transition: background var(--transition-fast);
}

.snooze-options button:hover {
  background: var(--color-bg);
}
</style>
