/**
 * Format a date as "X days ago" or "today" or "yesterday"
 */
export function daysAgoText(dateStr) {
  if (!dateStr) return 'never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

/**
 * Get initials from a display name
 */
export function initials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

/**
 * Get a consistent avatar color class from a string
 */
export function avatarColor(str) {
  if (!str) return 'avatar-gray'
  const colors = ['avatar-blue', 'avatar-orange', 'avatar-green', 'avatar-purple', 'avatar-red']
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Get health level from score
 */
export function healthLevel(score) {
  if (score == null) return null
  if (score >= 0.7) return 'good'
  if (score >= 0.4) return 'fair'
  return 'poor'
}

/**
 * Format a trend into a display string
 */
export function trendLabel(trend) {
  if (trend === 'warming') return 'warming up'
  if (trend === 'cooling') return 'going cold'
  return 'stable'
}

/**
 * Compute snooze date from a preset
 */
export function snoozeDate(preset) {
  const d = new Date()
  switch (preset) {
    case '3d': d.setDate(d.getDate() + 3); break
    case '1w': d.setDate(d.getDate() + 7); break
    case '2w': d.setDate(d.getDate() + 14); break
    case '1mo': d.setMonth(d.getMonth() + 1); break
    default: d.setDate(d.getDate() + 7)
  }
  return d.toISOString().split('T')[0]
}
