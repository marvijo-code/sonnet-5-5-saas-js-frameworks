<script setup lang="ts">
import { computed } from 'vue'
import { fmtTime } from '../lib'

const props = defineProps<{ splits: number[] }>()
const max = computed(() => Math.max(...props.splits))
const min = computed(() => Math.min(...props.splits))
const label = computed(() => `Splits: ${props.splits.map(fmtTime).join(', ')}`)
</script>

<template>
  <span class="bars" role="img" :aria-label="label">
    <i v-for="(s, i) in splits" :key="i" :class="{ fast: s === min && splits.length > 1 }"
      :style="{ height: 30 + (max ? (s / max) * 70 : 0) + '%' }" />
  </span>
</template>
