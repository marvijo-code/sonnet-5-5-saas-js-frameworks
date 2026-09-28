<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import TargetForm from '../components/TargetForm.vue'
import { bestTime, deleteTarget, eventLabel, fmtSigned, fmtTime, gapTo, state, type Target } from '../lib'

const editing = ref<Target | null>(null)
const formEl = ref<HTMLElement | null>(null)

const rows = computed(() =>
  [...state.targets]
    .sort((a, b) => a.distance - b.distance || a.stroke.localeCompare(b.stroke) || a.time - b.time)
    .map((t) => {
      const entries = state.swimmers
        .map((s) => {
          const best = bestTime(s.id, t.distance, t.stroke)
          return best === null ? null : { s, best, gap: gapTo(best, t.time) }
        })
        .filter((e): e is NonNullable<typeof e> => e !== null)
        .sort((a, b) => a.best - b.best)
      return { t, entries }
    }),
)

async function edit(t: Target) {
  editing.value = t
  await nextTick()
  formEl.value?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  ;(formEl.value?.querySelector('input') as HTMLInputElement | null)?.focus({ preventScroll: true })
}
function remove(t: Target) {
  if (editing.value?.id === t.id) editing.value = null
  deleteTarget(t.id)
}
</script>

<template>
  <div class="page-head">
    <div>
      <p class="eyebrow">Standards</p>
      <h1>Qualifying targets</h1>
    </div>
  </div>

  <div class="split-layout">
    <section aria-label="Target list">
      <ul class="cards" data-testid="target-list">
        <li v-for="{ t, entries } in rows" :key="t.id" class="card target-card" data-testid="target-row">
          <div class="target-time" aria-hidden="true">
            <span class="mono big">{{ fmtTime(t.time) }}</span>
            <span class="unit">{{ t.time.toFixed(2) }} s</span>
          </div>
          <div class="grow">
            <h2 class="card-title">{{ t.label }}</h2>
            <p class="meta">{{ eventLabel(t.distance, t.stroke) }} · cut <b class="mono">{{ fmtTime(t.time) }}</b></p>
            <ul class="reach" v-if="entries.length" :aria-label="`Swimmers against ${t.label}`">
              <li v-for="e in entries" :key="e.s.id" :class="{ ok: e.gap.reached, near: !e.gap.reached && e.gap.percent <= 2 }">
                <a :href="`#/swimmers/${e.s.id}`">{{ e.s.name }}</a>
                <span class="mono">{{ fmtTime(e.best) }}</span>
                <span class="mono gapv">{{ e.gap.reached ? 'Qualified' : fmtSigned(e.gap.seconds) + ' s' }} · {{ fmtSigned(e.gap.percent) }}%</span>
              </li>
            </ul>
            <p class="meta" v-else>Nobody has swum this event yet.</p>
          </div>
          <div class="row-actions">
            <button type="button" class="btn small" :aria-label="`Edit target ${t.label}`" @click="edit(t)">Edit</button>
            <button type="button" class="btn small danger" data-testid="target-delete" :aria-label="`Delete target ${t.label}`" @click="remove(t)">Delete</button>
          </div>
        </li>
      </ul>
      <p v-if="!rows.length" class="empty">No targets yet. Add a qualifying time with the form.</p>
    </section>

    <aside ref="formEl" class="side">
      <TargetForm :editing="editing" @saved="editing = null" @cancel="editing = null" />
    </aside>
  </div>
</template>
