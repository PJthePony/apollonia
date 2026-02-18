import { ref, computed } from 'vue'
import { api } from './useApi'

// Module-scope state (singleton)
const contacts = ref([])
const loading = ref(false)
const searchQuery = ref('')
const categoryFilter = ref(null) // null = all

export function useContacts() {
  const filteredContacts = computed(() => {
    let result = contacts.value

    if (categoryFilter.value) {
      result = result.filter(c => c.category?.category === categoryFilter.value)
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(c =>
        c.displayName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q))
      )
    }

    return result
  })

  async function fetchContacts() {
    loading.value = true
    try {
      const data = await api('/contacts')
      contacts.value = data.contacts
    } finally {
      loading.value = false
    }
  }

  async function fetchContact(id) {
    return api(`/contacts/${id}`)
  }

  async function updateCategory(contactId, category, subcategory) {
    await api(`/contacts/${contactId}/category`, {
      method: 'PUT',
      body: JSON.stringify({ category, subcategory }),
    })
    // Update local state
    const contact = contacts.value.find(c => c.id === contactId)
    if (contact) {
      contact.category = { category, subcategory, manuallySet: true }
    }
  }

  async function updatePreferences(contactId, prefs) {
    await api(`/contacts/${contactId}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(prefs),
    })
  }

  async function addFact(contactId, fact, dateRelevant) {
    const data = await api(`/contacts/${contactId}/facts`, {
      method: 'POST',
      body: JSON.stringify({ fact, dateRelevant }),
    })
    return data.fact
  }

  async function removeFact(contactId, factId) {
    await api(`/contacts/${contactId}/facts/${factId}`, {
      method: 'DELETE',
    })
  }

  async function importGoogleContacts() {
    const data = await api('/import/google-contacts', { method: 'POST' })
    // Refresh contacts list after import
    if (data.imported > 0) {
      await fetchContacts()
    }
    return data
  }

  return {
    contacts,
    loading,
    searchQuery,
    categoryFilter,
    filteredContacts,
    fetchContacts,
    fetchContact,
    updateCategory,
    updatePreferences,
    addFact,
    removeFact,
    importGoogleContacts,
  }
}
