import { ref } from 'vue'
import { api } from './useApi'

const needsAttention = ref([])
const loading = ref(false)

export function useRelationships() {
  async function fetchNeedsAttention() {
    loading.value = true
    try {
      const data = await api('/relationships/needs-attention')
      needsAttention.value = data.contacts
    } finally {
      loading.value = false
    }
  }

  async function fetchHealth(category) {
    const params = category ? `?category=${category}` : ''
    const data = await api(`/relationships/health${params}`)
    return data.contacts
  }

  async function recompute() {
    const data = await api('/relationships/recompute', { method: 'POST' })
    return data.updated
  }

  return {
    needsAttention,
    loading,
    fetchNeedsAttention,
    fetchHealth,
    recompute,
  }
}
