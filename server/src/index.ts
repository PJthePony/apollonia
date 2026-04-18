import 'dotenv/config'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Supabase client with service role key (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// The owner's user ID (single-user app)
const OWNER_ID = process.env.OWNER_USER_ID!

// ─── Helper: fuzzy match contact by name ───
async function findContact(nameOrEmail: string) {
  // Try exact email match first
  const { data: emailMatch } = await supabase
    .from('contacts')
    .select('id, name, company, title, emails')
    .eq('owner_id', OWNER_ID)
    .contains('emails', [nameOrEmail])
    .limit(1)

  if (emailMatch?.length) return { match: emailMatch[0], ambiguous: false }

  // Fuzzy name match
  const { data: nameMatches } = await supabase
    .rpc('search_contacts_fuzzy', {
      p_owner_id: OWNER_ID,
      p_query: nameOrEmail,
      p_limit: 5,
    })

  if (!nameMatches?.length) return { match: null, ambiguous: false }
  if (nameMatches.length === 1 || nameMatches[0].sim > 0.6) {
    return { match: nameMatches[0], ambiguous: false }
  }
  return { match: null, ambiguous: true, candidates: nameMatches }
}

// ─── MCP Server ───
const server = new McpServer({
  name: 'apollonia',
  version: '1.0.0',
})

// ─── WRITE TOOLS ───

server.tool(
  'apollonia_log_interaction',
  'Log a professional interaction with a contact. Use after describing a meeting, email, call, coffee, text, or LinkedIn exchange.',
  {
    contact_name: z.string().describe('Name of the contact (fuzzy matched)'),
    type: z.enum(['email', 'text', 'linkedin_message', 'meeting', 'coffee', 'call', 'event', 'intro_made', 'intro_received', 'social_media_comment']),
    summary: z.string().describe('One-sentence summary of what happened'),
    topics: z.array(z.string()).optional(),
    sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
    standout_details: z.array(z.string()).optional().describe('New personal details to save'),
    commitments: z.array(z.string()).optional(),
    occurred_at: z.string().optional().describe('ISO date (defaults to now)'),
  },
  async ({ contact_name, type, summary, topics, sentiment, standout_details, occurred_at }) => {
    const result = await findContact(contact_name)

    if (!result.match) {
      if (result.ambiguous) {
        const names = result.candidates!.map((c: any) => `${c.name} (${c.company || 'no company'})`).join(', ')
        return { content: [{ type: 'text', text: `Multiple matches for "${contact_name}": ${names}. Please be more specific.` }] }
      }
      return { content: [{ type: 'text', text: `No contact found matching "${contact_name}". Would you like me to create them? Use apollonia_add_contact.` }] }
    }

    const { error } = await supabase.from('interactions').insert({
      contact_id: result.match.id,
      owner_id: OWNER_ID,
      interaction_type: type,
      summary,
      topics: topics || [],
      sentiment: sentiment || 'neutral',
      source: 'mcp_intake',
      occurred_at: occurred_at || new Date().toISOString(),
    })

    if (error) return { content: [{ type: 'text', text: `Error logging interaction: ${error.message}` }] }

    // If standout details provided, append them
    if (standout_details?.length) {
      const { data: contact } = await supabase.from('contacts').select('standout_details').eq('id', result.match.id).single()
      const existing = contact?.standout_details || []
      const newDetails = standout_details.map(d => ({ detail: d, captured_at: new Date().toISOString() }))
      await supabase.from('contacts').update({ standout_details: [...existing, ...newDetails] }).eq('id', result.match.id)
    }

    return { content: [{ type: 'text', text: `Logged ${type} with ${result.match.name}: ${summary}` }] }
  }
)

server.tool(
  'apollonia_update_contact',
  "Update a contact's profile. Use when new information is learned (job change, personal detail, etc.)",
  {
    contact_name: z.string(),
    updates: z.object({
      company: z.string().optional(),
      title: z.string().optional(),
      location: z.string().optional(),
      linkedin_url: z.string().optional(),
      relationship_type: z.string().optional(),
      relationship_tier: z.string().optional(),
      bio_notes: z.string().optional(),
      new_standout_detail: z.string().optional().describe('A new personal detail to add'),
      partner_name: z.string().optional(),
      alma_mater: z.string().optional(),
      hometown: z.string().optional(),
      pets: z.string().optional(),
    }),
  },
  async ({ contact_name, updates }) => {
    const result = await findContact(contact_name)
    if (!result.match) {
      return { content: [{ type: 'text', text: `No contact found matching "${contact_name}".` }] }
    }

    const { new_standout_detail, ...directUpdates } = updates as any
    const cleanUpdates: Record<string, any> = {}
    for (const [k, v] of Object.entries(directUpdates)) {
      if (v !== undefined && v !== null) cleanUpdates[k] = v
    }

    if (Object.keys(cleanUpdates).length > 0) {
      await supabase.from('contacts').update(cleanUpdates).eq('id', result.match.id)
    }

    if (new_standout_detail) {
      const { data: contact } = await supabase.from('contacts').select('standout_details').eq('id', result.match.id).single()
      const existing = contact?.standout_details || []
      existing.push({ detail: new_standout_detail, captured_at: new Date().toISOString() })
      await supabase.from('contacts').update({ standout_details: existing }).eq('id', result.match.id)
    }

    return { content: [{ type: 'text', text: `Updated ${result.match.name}'s profile.` }] }
  }
)

server.tool(
  'apollonia_add_contact',
  'Add a new contact to Apollonia CRM. Always confirm with the owner before creating.',
  {
    name: z.string(),
    how_met: z.string().optional(),
    company: z.string().optional(),
    title: z.string().optional(),
    email: z.string().optional(),
    linkedin_url: z.string().optional(),
    relationship_type: z.string().optional(),
    relationship_tier: z.string().optional(),
    standout_details: z.array(z.string()).optional(),
  },
  async ({ name, how_met, company, title, email, linkedin_url, relationship_type, relationship_tier, standout_details }) => {
    const { data, error } = await supabase.from('contacts').insert({
      owner_id: OWNER_ID,
      name,
      how_met,
      company,
      title,
      emails: email ? [email] : [],
      linkedin_url,
      relationship_type: relationship_type || 'other',
      relationship_tier: relationship_tier || 'active',
      standout_details: (standout_details || []).map(d => ({ detail: d, captured_at: new Date().toISOString() })),
    }).select().single()

    if (error) return { content: [{ type: 'text', text: `Error creating contact: ${error.message}` }] }
    return { content: [{ type: 'text', text: `Created contact: ${data.name} (${data.relationship_tier} tier)` }] }
  }
)

server.tool(
  'apollonia_log_intro',
  'Log an introduction made between two contacts.',
  {
    from_name: z.string().describe('Person A being introduced'),
    to_name: z.string().describe('Person B being introduced'),
    context: z.string().optional().describe('Why the intro was made'),
  },
  async ({ from_name, to_name, context }) => {
    const fromResult = await findContact(from_name)
    const toResult = await findContact(to_name)

    if (!fromResult.match) return { content: [{ type: 'text', text: `No contact found matching "${from_name}".` }] }
    if (!toResult.match) return { content: [{ type: 'text', text: `No contact found matching "${to_name}".` }] }

    // Create intro record
    await supabase.from('intros').insert({
      owner_id: OWNER_ID,
      from_contact_id: fromResult.match.id,
      to_contact_id: toResult.match.id,
      context_notes: context,
    })

    // Log intro_made interactions for both contacts
    const now = new Date().toISOString()
    await supabase.from('interactions').insert([
      { contact_id: fromResult.match.id, owner_id: OWNER_ID, interaction_type: 'intro_made', summary: `Introduced to ${toResult.match.name}`, source: 'mcp_intake', occurred_at: now },
      { contact_id: toResult.match.id, owner_id: OWNER_ID, interaction_type: 'intro_received', summary: `Introduced to ${fromResult.match.name}`, source: 'mcp_intake', occurred_at: now },
    ])

    return { content: [{ type: 'text', text: `Logged intro: ${fromResult.match.name} <-> ${toResult.match.name}` }] }
  }
)

// ─── READ TOOLS ───

server.tool(
  'apollonia_get_contact',
  "Get a contact's full profile including relationship summary.",
  { name_or_email: z.string() },
  async ({ name_or_email }) => {
    const result = await findContact(name_or_email)
    if (!result.match) return { content: [{ type: 'text', text: `No contact found matching "${name_or_email}".` }] }

    const [contactRes, summaryRes] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', result.match.id).single(),
      supabase.from('relationship_summaries').select('content, version, updated_at').eq('contact_id', result.match.id).maybeSingle(),
    ])

    const c = contactRes.data
    const text = [
      `# ${c.name}`,
      c.title ? `**${c.title}** at **${c.company || 'unknown'}**` : c.company ? `at **${c.company}**` : '',
      `Tier: ${c.relationship_tier} | Type: ${c.relationship_type} | Health: ${c.health_score}/100`,
      c.emails?.length ? `Email: ${c.emails.join(', ')}` : '',
      c.linkedin_url ? `LinkedIn: ${c.linkedin_url}` : '',
      c.how_met ? `How met: ${c.how_met}` : '',
      c.last_contacted_at ? `Last contacted: ${new Date(c.last_contacted_at).toLocaleDateString()}` : 'Never contacted',
      c.standout_details?.length ? `\n**Standout Details:**\n${c.standout_details.map((d: any) => `- ${d.detail}`).join('\n')}` : '',
      summaryRes.data ? `\n**Relationship Summary (v${summaryRes.data.version}):**\n${summaryRes.data.content}` : '',
    ].filter(Boolean).join('\n')

    return { content: [{ type: 'text', text }] }
  }
)

server.tool(
  'apollonia_get_summary',
  'Get just the relationship summary for a contact. Fast and lightweight.',
  { contact_name: z.string() },
  async ({ contact_name }) => {
    const result = await findContact(contact_name)
    if (!result.match) return { content: [{ type: 'text', text: `No contact found matching "${contact_name}".` }] }

    const { data } = await supabase.from('relationship_summaries').select('content').eq('contact_id', result.match.id).maybeSingle()
    if (!data) return { content: [{ type: 'text', text: `No summary exists yet for ${result.match.name}.` }] }
    return { content: [{ type: 'text', text: `**${result.match.name} — Summary:**\n${data.content}` }] }
  }
)

server.tool(
  'apollonia_list_contacts',
  'List contacts with optional filters.',
  {
    tier: z.enum(['core', 'active', 'dormant', 'archived']).optional(),
    type: z.string().optional(),
    health_below: z.number().optional().describe('Only contacts with health below this'),
    limit: z.number().optional().default(20),
  },
  async ({ tier, type, health_below, limit }) => {
    let query = supabase.from('contacts').select('name, company, title, relationship_tier, relationship_type, health_score, last_contacted_at').eq('owner_id', OWNER_ID).order('health_score', { ascending: true }).limit(limit || 20)

    if (tier) query = query.eq('relationship_tier', tier)
    if (type) query = query.eq('relationship_type', type)
    if (health_below) query = query.lt('health_score', health_below)

    const { data } = await query
    if (!data?.length) return { content: [{ type: 'text', text: 'No contacts match your filter.' }] }

    const lines = data.map(c => `- **${c.name}** (${c.company || 'no company'}) — ${c.relationship_tier}/${c.relationship_type} — health: ${c.health_score}`)
    return { content: [{ type: 'text', text: `**${data.length} contacts:**\n${lines.join('\n')}` }] }
  }
)

server.tool(
  'apollonia_get_due_outreach',
  'Get contacts that are overdue for outreach.',
  { limit: z.number().optional().default(10) },
  async ({ limit }) => {
    const { data } = await supabase
      .from('contacts')
      .select('name, company, health_score, last_contacted_at, next_contact_due_at, relationship_tier')
      .eq('owner_id', OWNER_ID)
      .in('relationship_tier', ['core', 'active'])
      .lt('next_contact_due_at', new Date().toISOString())
      .order('next_contact_due_at', { ascending: true })
      .limit(limit || 10)

    if (!data?.length) return { content: [{ type: 'text', text: 'No overdue contacts. You are on top of your network!' }] }

    const lines = data.map(c => {
      const daysOverdue = Math.floor((Date.now() - new Date(c.next_contact_due_at!).getTime()) / 86400000)
      return `- **${c.name}** (${c.company || ''}) — ${daysOverdue}d overdue, health: ${c.health_score}`
    })
    return { content: [{ type: 'text', text: `**${data.length} overdue contacts:**\n${lines.join('\n')}` }] }
  }
)

server.tool(
  'apollonia_search_contacts',
  'Search contacts by name, company, or keyword.',
  { query: z.string() },
  async ({ query }) => {
    const { data } = await supabase
      .rpc('search_contacts_fuzzy', { p_owner_id: OWNER_ID, p_query: query, p_limit: 10 })

    if (!data?.length) return { content: [{ type: 'text', text: `No contacts matching "${query}".` }] }

    const lines = data.map((c: any) => `- **${c.name}** (${c.company || 'no company'}) — similarity: ${(c.sim * 100).toFixed(0)}%`)
    return { content: [{ type: 'text', text: `**Search results for "${query}":**\n${lines.join('\n')}` }] }
  }
)

server.tool(
  'apollonia_get_brief',
  'Generate a contact briefing with summary, recent interactions, and talking points.',
  { contact_name: z.string() },
  async ({ contact_name }) => {
    const result = await findContact(contact_name)
    if (!result.match) return { content: [{ type: 'text', text: `No contact found matching "${contact_name}".` }] }

    const [contactRes, summaryRes, interactionsRes] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', result.match.id).single(),
      supabase.from('relationship_summaries').select('content').eq('contact_id', result.match.id).maybeSingle(),
      supabase.from('interactions').select('interaction_type, summary, occurred_at, topics').eq('contact_id', result.match.id).order('occurred_at', { ascending: false }).limit(5),
    ])

    const c = contactRes.data!
    const parts = [
      `# Briefing: ${c.name}`,
      `**${c.title || ''}** ${c.company ? 'at ' + c.company : ''} | ${c.relationship_tier} ${c.relationship_type}`,
      `Health: ${c.health_score}/100 | Last contacted: ${c.last_contacted_at ? new Date(c.last_contacted_at).toLocaleDateString() : 'never'}`,
    ]

    if (summaryRes.data) {
      parts.push(`\n## Relationship Summary\n${summaryRes.data.content}`)
    }

    if (c.standout_details?.length) {
      parts.push(`\n## Key Details\n${c.standout_details.map((d: any) => `- ${d.detail}`).join('\n')}`)
    }

    if (interactionsRes.data?.length) {
      parts.push(`\n## Recent Interactions`)
      for (const i of interactionsRes.data) {
        parts.push(`- **${i.interaction_type}** (${new Date(i.occurred_at).toLocaleDateString()}): ${i.summary || 'no summary'}`)
      }
    }

    return { content: [{ type: 'text', text: parts.join('\n') }] }
  }
)

// ─── Express SSE Transport ───
const app = express()
const PORT = parseInt(process.env.PORT || '3000')

// Store transports for SSE connections
const transports: Record<string, SSEServerTransport> = {}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', name: 'apollonia-mcp', version: '1.0.0' })
})

app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res)
  transports[transport.sessionId] = transport

  res.on('close', () => {
    delete transports[transport.sessionId]
  })

  await server.connect(transport)
})

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string
  const transport = transports[sessionId]
  if (!transport) {
    res.status(400).json({ error: 'No active session' })
    return
  }
  await transport.handlePostMessage(req, res)
})

app.listen(PORT, () => {
  console.log(`Apollonia MCP server running on port ${PORT}`)
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`)
})
