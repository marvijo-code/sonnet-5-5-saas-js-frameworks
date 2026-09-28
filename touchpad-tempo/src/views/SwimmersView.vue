<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import SwimmerForm from '../components/SwimmerForm.vue'
import { bestTime, currentYear, deleteSwimmer, eventLabel, fmtTime, go, nearMisses, state, total, type Swimmer } from '../lib'

const editing = ref<Swimmer | null>(null)
const query = ref('')
const squadFilter = ref('')
const formEl = ref<HTMLElement | null>(null)

const squads = computed(() => [...new Set(state.swimmers.map((s) => s.squad))].sort())
const rows = computed(() =>
  state.swimmers
    .filter((s) => (!squadFilter.value || s.squad === squadFilter.value) && s.name.toLowerCase().includes(query.value.trim().toLowerCase()))
    .sort((a, b) => a.squad.localeCompare(b.squad) || a.name.localeCompare(b.name))
    .map((s) => {
      const mine = state.races.filter((r) => r.swimmerId === s.id)
      const latest = [...mine].sort((a, b) => (a.date < b.date ? 1 : -1))[0]
      const near = nearMisses.value.filter((n) => n.swimmer.id === s.id)
      return {
        s,
        count: mine.length,
        latest,
        best: latest ? bestTime(s.id, latest.distance, latest.stroke) : null,
        near,
      }
    }),
)

async function edit(s: Swimmer) {
  editing.value = s
  await nextTick()
  formEl.value?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  ;(formEl.value?.querySelector('input') as HTMLInputElement | null)?.focus({ preventScroll: true })
}
function remove(s: Swimmer) {
  if (editing.value?.id === s.id) editing.value = null
  deleteSwimmer(s.id)
}
</script>

<template>
  <div class="page-head">
    <div>
      <p class="eyebrow">Roster</p>
      <h1>Swimmers</h1>
    </div>
    <div class="filters">
      <div class="field inline">
        <label for="q">Search</label>
        <input id="q" v-model="query" type="search" placeholder="Name" autocomplete="off" />
      </div>
      <div class="field inline">
        <label for="sq">Squad</label>
        <select id="sq" v-model="squadFilter">
          <option value="">All squads</option>
          <option v-for="s in squads" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>
  </div>

  <div class="split-layout">
    <section aria-label="Swimmer list">
      <ul class="cards" data-testid="swimmer-list">
        <li v-for="r in rows" :key="r.s.id" class="card swimmer-card" data-testid="swimmer-row" @click="go(`/swimmers/${r.s.id}`)">
          <div class="lane-no" aria-hidden="true">{{ r.s.name.split(' ').map((p) => p[0]).join('').slice(0, 2) }}</div>
          <div class="grow">
            <h2 class="card-title"><a :href="`#/swimmers/${r.s.id}`" @click.stop>{{ r.s.name }}</a></h2>
            <p class="meta">{{ r.s.squad }} · b. {{ r.s.birthYear }} · age {{ currentYear() - r.s.birthYear }}</p>
            <p class="meta" v-if="r.latest">
              Latest event <b>{{ eventLabel(r.latest.distance, r.latest.stroke) }}</b> · PB <b class="mono">{{ fmtTime(r.best ?? total(r.latest)) }}</b>
              · {{ r.count }} race{{ r.count === 1 ? '' : 's' }}
            </p>
            <p class="meta" v-else>No races logged yet</p>
            <p v-if="r.near.length" class="chips">
              <span v-for="n in r.near" :key="n.target.id" class="chip warn">{{ n.gap.seconds.toFixed(2) }} s off {{ n.target.label }}</span>
            </p>
          </div>
          <div class="row-actions">
            <button type="button" class="btn small" :aria-label="`Edit ${r.s.name}`" @click.stop="edit(r.s)">Edit</button>
            <button type="button" class="btn small danger" data-testid="swimmer-delete" :aria-label="`Delete ${r.s.name}`" @click.stop="remove(r.s)">Delete</button>
          </div>
        </li>
      </ul>
      <p v-if="!rows.length" class="empty">No swimmers match. Add one with the form, or reset the data.</p>
    </section>

    <aside ref="formEl" class="side">
      <SwimmerForm :editing="editing" @saved="editing = null" @cancel="editing = null" />
    </aside>
  </div>
</template>
