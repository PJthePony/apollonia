import { ref } from 'vue'
import { api } from './useApi'
import { snoozeDate } from '../lib/formatters'

const reminders = ref([])
const loading = ref(false)

export function useReminders() {
  async function fetchReminders() {
    loading.value = true
    try {
      const data = await api('/reminders')
      reminders.value = data.reminders
    } finally {
      loading.value = false
    }
  }

  async function sendToTessio(reminderId) {
    const data = await api(`/reminders/${reminderId}/send-to-tessio`, {
      method: 'POST',
    })
    // Remove from local list
    reminders.value = reminders.value.filter(r => r.id !== reminderId)
    return data
  }

  async function dismiss(reminderId) {
    await api(`/reminders/${reminderId}/dismiss`, { method: 'POST' })
    reminders.value = reminders.value.filter(r => r.id !== reminderId)
  }

  async function snooze(reminderId, preset) {
    const until = snoozeDate(preset)
    await api(`/reminders/${reminderId}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ until }),
    })
    reminders.value = reminders.value.filter(r => r.id !== reminderId)
  }

  return {
    reminders,
    loading,
    fetchReminders,
    sendToTessio,
    dismiss,
    snooze,
  }
}
