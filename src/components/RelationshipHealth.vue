<script setup>
import { computed } from 'vue'
import { healthLevel, trendLabel } from '../lib/formatters'

const props = defineProps({
  score: { type: Number, default: null },
  trend: { type: String, default: null },
  showLabel: { type: Boolean, default: false },
})

const level = computed(() => healthLevel(props.score))
const label = computed(() => {
  if (props.score == null) return 'unknown'
  return `${Math.round(props.score * 100)}%`
})
</script>

<template>
  <span class="health-indicator" v-if="score != null">
    <span class="health-dot" :class="level"></span>
    <span v-if="showLabel" class="health-label" :class="'health-' + level">{{ label }}</span>
    <span v-if="trend && trend !== 'stable'" class="health-trend" :class="trend">
      {{ trend === 'warming' ? '&#8593;' : '&#8595;' }}
    </span>
  </span>
</template>

<style scoped>
.health-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.health-label {
  font-size: 0.7rem;
  font-weight: 600;
}

.health-trend {
  font-size: 0.7rem;
  font-weight: 700;
}

.health-trend.warming { color: var(--color-success); }
.health-trend.cooling { color: var(--color-danger); }
</style>
