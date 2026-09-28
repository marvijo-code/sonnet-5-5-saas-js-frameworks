<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import RaceForm from '../components/RaceForm.vue'
import SplitBars from '../components/SplitBars.vue'
import {
  deleteRace, eventKey, eventLabel, fmtDate, fmtSigned, fmtTime, halves, isNegativeSplit, r2, raceSort, state, swimmerById, total,
  type Race,
} from '../lib'

const editing = ref<Race | null>(null)
const formEl = ref<HTMLElement | null>(null)
const swimmerFilter = ref('')
const eventFilter = ref('')

const sorted = computed(() => [...state.races].sort((a, b) => raceSort(b, a)))
const events = computed(() => {
  const m = new Map<string, string>()
  for (const r of state.races) m.set(eventKey(r.distance, r.stroke), eventLabel(r.distance, r.stroke))
  return [...m.entries()].sort((a, b) => parseInt(a[1]) - parseInt(b[1]) || a[1].localeCompare(b[1]))
})
const visible = computed(() =>
  sorted.value.filter(
    (r) => (!swimmerFilter.value || r.swimmerId === swimmerFilter.value) && (!eventFilter.value || eventKey(r.distance, r.stroke) === eventFilter.value),
  ),
)
const name = (r: Race) => swimmerById(r.swimmerId)?.name ?? 'Unknown swimmer'
const raceText = (r: Race) => `${name(r)} · ${fmtDate(r.date)} · ${fmtTime(total(r))}`
const sortedSwimmers = computed(() => [...state.swimmers].sort((a, b) => a.name.localeCompare(b.name)))

/* ---- comparison ---- */
const aId = ref('')
const bId = ref('')
const A = computed(() => state.races.find((r) => r.id === aId.value) ?? null)
const B = computed(() => state.races.find((r) => r.id === bId.value) ?? null)
const aOptions = computed(() => sorted.value)
const bOptions = computed(() =>
  A.value ? sorted.value.filter((r) => r.id !== A.value!.id && eventKey(r.distance, r.stroke) === eventKey(A.value!.distance, A.value!.stroke)) : [],
)

function defaultPair() {
  const groups = new Map<string, Race[]>()
  for (const r of sorted.value) {
    const k = eventKey(r.distance, r.stroke)
    groups.set(k, [...(groups.get(k) ?? []), r])
  }
  const best = [...groups.values()].filter((g) => g.length > 1).sort((a, b) => b[0].date.localeCompare(a[0].date))[0]
  if (best) {
    aId.value = best[1].id
    bId.value = best[0].id
  }
}
defaultPair()

watch(aId, () => {
  if (bId.value && !bOptions.value.some((r) => r.id === bId.value)) bId.value = ''
})
// drop selections for deleted races
watch(
  () => state.races.length,
  () => {
    if (aId.value && !A.value) aId.value = ''
    if (bId.value && !B.value) bId.value = ''
  },
)

function pick(r: Race) {
  if (!aId.value || (A.value && eventKey(A.value.distance, A.value.stroke) !== eventKey(r.distance, r.stroke)) || (aId.value && bId.value)) {
    aId.value = r.id
    bId.value = ''
  } else if (r.id !== aId.value) bId.value = r.id
  document.getElementById('compare')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

const rowsCmp = computed(() => {
  if (!A.value || !B.value) return []
  return A.value.splits.map((a, i) => {
    const b = B.value!.splits[i]
    return { n: i + 1, at: (i + 1) * 50, a, b, diff: r2(b - a) }
  })
})
const maxAbs = computed(() => Math.max(0.01, ...rowsCmp.value.map((r) => Math.abs(r.diff))))
const totalDiff = computed(() => (A.value && B.value ? r2(total(B.value) - total(A.value)) : 0))

async function edit(r: Race) {
  editing.value = r
  await nextTick()
  formEl.value?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  ;(formEl.value?.querySelector('select') as HTMLSelectElement | null)?.focus({ preventScroll: true })
}
function remove(r: Race) {
  if (editing.value?.id === r.id) editing.value = null
  deleteRace(r.id)
}
</script>

<template>
  <div class="page-head">
    <div>
      <p class="eyebrow">Race log</p>
      <h1>Races &amp; splits</h1>
    </div>
    <div class="filters">
      <div class="field inline">
        <label for="fs">Swimmer</label>
        <select id="fs" v-model="swimmerFilter">
          <option value="">Everyone</option>
          <option v-for="s in sortedSwimmers" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
      <div class="field inline">
        <label for="fe">Event</label>
        <select id="fe" v-model="eventFilter">
          <option value="">All events</option>
          <option v-for="[k, l] in events" :key="k" :value="k">{{ l }}</option>
        </select>
      </div>
    </div>
  </div>

  <div class="split-layout">
    <div class="stack">
      <section id="compare" class="panel compare" data-testid="split-compare" aria-labelledby="cmp-title">
        <h2 id="cmp-title" class="panel-title">Split comparison</h2>
        <div class="row2">
          <div class="field">
            <label for="cmp-a">Race A (baseline)</label>
            <select id="cmp-a" v-model="aId" data-testid="compare-a">
              <option value="">Choose a race…</option>
              <option v-for="r in aOptions" :key="r.id" :value="r.id">{{ eventLabel(r.distance, r.stroke) }} — {{ raceText(r) }}</option>
            </select>
          </div>
          <div class="field">
            <label for="cmp-b">Race B (same event)</label>
            <select id="cmp-b" v-model="bId" :disabled="!A" data-testid="compare-b">
              <option value="">{{ A ? (bOptions.length ? 'Choose a race…' : 'No other race in this event') : 'Pick race A first' }}</option>
              <option v-for="r in bOptions" :key="r.id" :value="r.id">{{ raceText(r) }}</option>
            </select>
          </div>
        </div>

        <p v-if="!A || !B" class="empty small">Pick two races of the same event to see the per-split difference. Or press “Compare” on a race below.</p>

        <div v-else class="cmp-body" data-testid="split-compare-result">
          <p class="cmp-event">{{ eventLabel(A.distance, A.stroke) }}</p>
          <table class="cmp-table">
            <caption class="sr-only">Split by split comparison, difference is race B minus race A; negative means B was faster</caption>
            <thead>
              <tr>
                <th scope="col">Split</th>
                <th scope="col">A</th>
                <th scope="col">B</th>
                <th scope="col">B − A</th>
                <th scope="col" class="gauge-col"><span class="sr-only">Difference gauge</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rowsCmp" :key="r.n" data-testid="split-row">
                <th scope="row">{{ r.at }} m</th>
                <td class="mono">{{ fmtTime(r.a) }}</td>
                <td class="mono">{{ fmtTime(r.b) }}</td>
                <td class="mono diff" :class="r.diff < 0 ? 'faster' : r.diff > 0 ? 'slower' : ''" data-testid="split-diff">{{ fmtSigned(r.diff) }}</td>
                <td class="gauge-col" aria-hidden="true">
                  <span class="gauge"><i :class="r.diff < 0 ? 'faster' : 'slower'" :style="{ width: (Math.abs(r.diff) / maxAbs) * 50 + '%', [r.diff < 0 ? 'right' : 'left']: '50%' }" /></span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Final</th>
                <td class="mono">{{ fmtTime(total(A)) }}</td>
                <td class="mono">{{ fmtTime(total(B)) }}</td>
                <td class="mono diff" :class="totalDiff < 0 ? 'faster' : totalDiff > 0 ? 'slower' : ''" data-testid="total-diff">{{ fmtSigned(totalDiff) }}</td>
                <td class="gauge-col" aria-hidden="true" />
              </tr>
            </tfoot>
          </table>
          <div class="cmp-tags">
            <p v-for="(r, k) in [A, B]" :key="k" class="tag-line">
              <b>Race {{ k ? 'B' : 'A' }}</b> {{ name(r) }}, {{ fmtDate(r.date) }}:
              first half <span class="mono">{{ fmtTime(halves(r)[0]) }}</span>, second half <span class="mono">{{ fmtTime(halves(r)[1]) }}</span>
              <span v-if="isNegativeSplit(r)" class="chip neg" data-testid="negative-split">Negative split</span>
              <span v-else class="chip">Positive split</span>
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Race list">
        <ul class="cards" data-testid="race-list">
          <li v-for="r in visible" :key="r.id" class="card race-card" data-testid="race-row">
            <div class="grow">
              <h2 class="card-title">
                <a :href="`#/swimmers/${r.swimmerId}`">{{ name(r) }}</a>
                <span class="chip neg" v-if="isNegativeSplit(r)" data-testid="negative-split">Negative split</span>
              </h2>
              <p class="meta">{{ eventLabel(r.distance, r.stroke) }} · {{ fmtDate(r.date) }}</p>
              <p class="meta mono splits">{{ r.splits.map(fmtTime).join(' · ') }}</p>
            </div>
            <div class="race-time">
              <span class="mono big" data-testid="race-final">{{ fmtTime(total(r)) }}</span>
              <SplitBars :splits="r.splits" />
            </div>
            <div class="row-actions">
              <button type="button" class="btn small" :aria-label="`Compare ${raceText(r)}`" @click="pick(r)">Compare</button>
              <button type="button" class="btn small" :aria-label="`Edit race ${raceText(r)}`" @click="edit(r)">Edit</button>
              <button type="button" class="btn small danger" data-testid="race-delete" :aria-label="`Delete race ${raceText(r)}`" @click="remove(r)">Delete</button>
            </div>
          </li>
        </ul>
        <p v-if="!visible.length" class="empty">No races match. Log one with the form.</p>
      </section>
    </div>

    <aside ref="formEl" class="side">
      <RaceForm :editing="editing" @saved="editing = null" @cancel="editing = null" />
    </aside>
  </div>
</template>
