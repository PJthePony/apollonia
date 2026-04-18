export function initials(name) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

const AVATAR_COLORS = ['avatar-blue', 'avatar-orange', 'avatar-green', 'avatar-purple', 'avatar-red', 'avatar-teal']

export function avatarColor(str) {
  if (!str) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function healthLabel(score) {
  if (score == null) return null
  if (score >= 70) return 'good'
  if (score >= 40) return 'fair'
  return 'poor'
}

export function healthColor(score) {
  if (score >= 70) return 'var(--color-success)'
  if (score >= 40) return 'var(--color-warm)'
  return 'var(--color-danger)'
}

export function daysAgo(date) {
  if (!date) return null
  const diff = Date.now() - new Date(date).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function daysAgoText(date) {
  const d = daysAgo(date)
  if (d === null) return 'Never'
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  if (d < 365) return `${Math.floor(d / 30)}mo ago`
  return `${Math.floor(d / 365)}y ago`
}

export function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateShort(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const INTERACTION_ICONS = {
  email: '\u2709\uFE0F',
  text: '\uD83D\uDCAC',
  linkedin_message: '\uD83C\uDF10',
  meeting: '\uD83D\uDCC5',
  coffee: '\u2615',
  call: '\uD83D\uDCDE',
  event: '\uD83C\uDF89',
  intro_made: '\uD83E\uDD1D',
  intro_received: '\uD83E\uDD1D',
  social_media_comment: '\uD83D\uDCF1',
}

export function interactionIcon(type) {
  return INTERACTION_ICONS[type] || '\uD83D\uDCDD'
}

export function interactionLabel(type) {
  if (!type) return ''
  return type.replace(/_/g, ' ')
}

export function truncate(str, len = 100) {
  if (!str || str.length <= len) return str
  return str.slice(0, len) + '...'
}
