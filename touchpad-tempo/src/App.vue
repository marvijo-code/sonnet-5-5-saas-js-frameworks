<script setup lang="ts">
import { computed, nextTick, watch } from 'vue'
import RacesView from './views/RacesView.vue'
import SwimmerDetail from './views/SwimmerDetail.vue'
import SwimmersView from './views/SwimmersView.vue'
import TargetsView from './views/TargetsView.vue'
import { go, nearMisses, nearSwimmerCount, resetData, route, toast } from './lib'

if (!location.hash || route.value.length === 0) go('/swimmers')

const section = computed(() => route.value[0] ?? 'swimmers')
const nav = [
  { to: '/swimmers', key: 'swimmers', label: 'Swimmers' },
  { to: '/races', key: 'races', label: 'Races' },
  { to: '/targets', key: 'targets', label: 'Targets' },
]
const nearNames = computed(() => [...new Set(nearMisses.value.map((n) => n.swimmer.name))].join(', '))

watch(route, async () => {
  await nextTick()
  window.scrollTo(0, 0)
})

function undo() {
  toast.value?.undo?.()
  toast.value = null
}
</script>

<template>
  <a class="skip" href="#main" @click.prevent="($event.target as HTMLElement).ownerDocument.getElementById('main')?.focus()">Skip to content</a>
  <header class="top">
    <div class="top-inner">
      <a class="brand" href="#/swimmers" aria-label="Touchpad Tempo home">
        <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
          <rect x="2" y="3" width="28" height="26" rx="5" fill="#ffc531" />
          <path d="M6 20c3.5-3.5 6 3.5 10 0s6.5 3.5 10 0" fill="none" stroke="#06202b" stroke-width="2.6" stroke-linecap="round" />
          <path d="M8 11.5h16" stroke="#06202b" stroke-width="2.2" stroke-linecap="round" />
        </svg>
        <span class="brand-text"><b>Touchpad</b> Tempo</span>
      </a>

      <div class="qualify" data-testid="qualify-summary" :title="nearNames || 'Nobody is within 2% right now'">
        <span class="qnum mono">{{ nearSwimmerCount }}</span>
        <span class="qtext">
          {{ nearSwimmerCount === 1 ? 'swimmer' : 'swimmers' }} within 2% of a qualifying time they haven’t reached
        </span>
      </div>

      <nav aria-label="Main">
        <a v-for="n in nav" :key="n.key" :href="`#${n.to}`" :aria-current="section === n.key ? 'page' : undefined">{{ n.label }}</a>
      </nav>
    </div>
    <div class="rope" aria-hidden="true" />
  </header>

  <main id="main" tabindex="-1">
    <SwimmerDetail v-if="section === 'swimmers' && route[1]" :id="route[1]" :key="route[1]" />
    <SwimmersView v-else-if="section === 'swimmers'" />
    <RacesView v-else-if="section === 'races'" />
    <TargetsView v-else-if="section === 'targets'" />
    <div v-else class="panel empty">Nothing here. <a href="#/swimmers">Go to swimmers</a>.</div>
  </main>

  <footer class="foot">
    <p>All data stays in this browser. Times are sums of 50 m splits.</p>
    <button type="button" class="btn small ghost" data-testid="reset-data" @click="resetData">Reset data</button>
  </footer>

  <div v-if="toast" class="toast" role="status">
    <span>{{ toast.message }}</span>
    <button v-if="toast.undo" type="button" class="btn small" @click="undo">Undo</button>
    <button type="button" class="btn small ghost" aria-label="Dismiss message" @click="toast = null">×</button>
  </div>
</template>
