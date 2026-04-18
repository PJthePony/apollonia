import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const contacts = ref([])
const loading = ref(false)
const searchQuery = ref('')
const tierFilter = ref(null)
const typeFilter = ref(null)

export function useContacts() {
  const { user } = useAuth()

  const filteredContacts = computed(() => {
    let result = contacts.value
    if (tierFilter.value) {
      result = result.filter(c => c.relationship_tier === tierFilter.value)
    }
    if (typeFilter.value) {
      result = result.filter(c => c.relationship_type === typeFilter.value)
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.title?.toLowerCase().includes(q) ||
        c.emails?.some(e => e.toLowerCase().includes(q))
      )
    }
    return result
  })

  async function fetchContacts(opts = {}) {
    loading.value = true
    try {
      let query = supabase
        .from('contacts')
        .select('*')
        .order('health_score', { ascending: true })

      if (opts.tier) query = query.eq('relationship_tier', opts.tier)
      if (opts.type) query = query.eq('relationship_type', opts.type)
      if (opts.limit) query = query.limit(opts.limit)

      const { data, error } = await query
      if (error) throw error
      contacts.value = data || []
      return contacts.value
    } finally {
      loading.value = false
    }
  }

  async function fetchContact(id) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }

  async function fetchContactWithRelated(id) {
    const [contactRes, summaryRes, interactionsRes, notesRes, introsRes] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', id).single(),
      supabase.from('relationship_summaries').select('*').eq('contact_id', id).maybeSingle(),
      supabase.from('interactions').select('*').eq('contact_id', id).order('occurred_at', { ascending: false }).limit(50),
      supabase.from('relationship_notes').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
      supabase.from('intros').select('*, from_contact:from_contact_id(name), to_contact:to_contact_id(name)').or(`from_contact_id.eq.${id},to_contact_id.eq.${id}`),
    ])

    if (contactRes.error) throw contactRes.error

    return {
      contact: contactRes.data,
      summary: summaryRes.data,
      interactions: interactionsRes.data || [],
      notes: notesRes.data || [],
      intros: introsRes.data || [],
    }
  }

  async function createContact(contact) {
    const { data, error } = await supabase
      .from('contacts')
      .insert({ ...contact, owner_id: user.value.id })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function updateContact(id, updates) {
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const idx = contacts.value.findIndex(c => c.id === id)
    if (idx >= 0) contacts.value[idx] = data
    return data
  }

  async function deleteContact(id) {
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) throw error
    contacts.value = contacts.value.filter(c => c.id !== id)
  }

  async function addStandoutDetail(id, detail) {
    const contact = await fetchContact(id)
    const details = [...(contact.standout_details || []), { detail, captured_at: new Date().toISOString() }]
    return updateContact(id, { standout_details: details })
  }

  async function removeStandoutDetail(id, index) {
    const contact = await fetchContact(id)
    const details = [...(contact.standout_details || [])]
    details.splice(index, 1)
    return updateContact(id, { standout_details: details })
  }

  return {
    contacts,
    loading,
    searchQuery,
    tierFilter,
    typeFilter,
    filteredContacts,
    fetchContacts,
    fetchContact,
    fetchContactWithRelated,
    createContact,
    updateContact,
    deleteContact,
    addStandoutDetail,
    removeStandoutDetail,
  }
}
