import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useInteractions() {
  const { user } = useAuth()
  const loading = ref(false)

  async function fetchInteractions(contactId, opts = {}) {
    let query = supabase
      .from('interactions')
      .select('*')
      .eq('contact_id', contactId)
      .order('occurred_at', { ascending: false })

    if (opts.type) query = query.eq('interaction_type', opts.type)
    if (opts.limit) query = query.limit(opts.limit)

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  async function logInteraction(interaction) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('interactions')
        .insert({
          ...interaction,
          owner_id: user.value.id,
          occurred_at: interaction.occurred_at || new Date().toISOString(),
        })
        .select()
        .single()
      if (error) throw error
      return data
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    fetchInteractions,
    logInteraction,
  }
}
