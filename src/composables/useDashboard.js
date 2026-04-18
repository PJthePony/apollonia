import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export function useDashboard() {
  const stats = ref(null)
  const needsAttention = ref([])
  const recentContacts = ref([])
  const loading = ref(false)

  async function fetchDashboard() {
    loading.value = true
    try {
      const [allRes, attentionRes, recentRes] = await Promise.all([
        supabase.from('contacts').select('id, relationship_tier, health_score', { count: 'exact' }),
        supabase.from('contacts')
          .select('*')
          .in('relationship_tier', ['core', 'active'])
          .or('health_score.lt.40,next_contact_due_at.lt.' + new Date().toISOString())
          .order('health_score', { ascending: true })
          .limit(10),
        supabase.from('contacts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const all = allRes.data || []
      const active = all.filter(c => c.relationship_tier === 'active' || c.relationship_tier === 'core')
      const avgHealth = active.length > 0
        ? Math.round(active.reduce((sum, c) => sum + (c.health_score || 0), 0) / active.length)
        : 0

      // Count interactions this month
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const { count: interactionsThisMonth } = await supabase
        .from('interactions')
        .select('id', { count: 'exact', head: true })
        .gte('occurred_at', monthStart.toISOString())

      stats.value = {
        totalContacts: allRes.count || 0,
        activeContacts: active.length,
        needsAttentionCount: (attentionRes.data || []).length,
        avgHealth,
        interactionsThisMonth: interactionsThisMonth || 0,
        tierBreakdown: {
          core: all.filter(c => c.relationship_tier === 'core').length,
          active: all.filter(c => c.relationship_tier === 'active').length,
          dormant: all.filter(c => c.relationship_tier === 'dormant').length,
        },
      }

      needsAttention.value = attentionRes.data || []
      recentContacts.value = recentRes.data || []
    } finally {
      loading.value = false
    }
  }

  return { stats, needsAttention, recentContacts, loading, fetchDashboard }
}
