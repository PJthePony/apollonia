<script setup>
defineProps({
  category: { type: String, default: null },
})
</script>

<template>
  <span v-if="category" class="category-badge" :class="category">
    {{ category }}
  </span>
  <span v-else class="category-badge acquaintance">uncategorized</span>
</template>
