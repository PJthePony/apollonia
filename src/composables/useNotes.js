import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useNotes() {
  const { user } = useAuth()
  const loading = ref(false)

  async function fetchNotes(contactId) {
    const { data, error } = await supabase
      .from('relationship_notes')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  async function createNote(contactId, content, noteType = 'general') {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('relationship_notes')
        .insert({
          contact_id: contactId,
          owner_id: user.value.id,
          content,
          note_type: noteType,
        })
        .select()
        .single()
      if (error) throw error
      return data
    } finally {
      loading.value = false
    }
  }

  async function updateNote(id, content) {
    const { data, error } = await supabase
      .from('relationship_notes')
      .update({ content })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function deleteNote(id) {
    const { error } = await supabase.from('relationship_notes').delete().eq('id', id)
    if (error) throw error
  }

  return { loading, fetchNotes, createNote, updateNote, deleteNote }
}
