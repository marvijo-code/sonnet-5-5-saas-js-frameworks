<script setup lang="ts">
import { computed } from 'vue'
import SplitBars from '../components/SplitBars.vue'
import SwimmerForm from '../components/SwimmerForm.vue'
import {
  currentYear, deleteSwimmer, eventKey, eventLabel, fmtDate, fmtSigned, fmtTime, gapTo, go, isNegativeSplit, raceSort, state, swimmerById, total,
} from '../lib'

const props = defineProps<{ id: string }>()
const swimmer = computed(() => swimmerById(props.id))

const events = computed(() => {
  const mine = state.races.filter((r) => r.swimmerId === props.id)
  const groups = new Map<string, typeof mine>()
  for (const r of mine) groups.set(eventKey(r.distance, r.stroke), [...(groups.get(eventKey(r.distance, r.stroke)) ?? []), r])
  return [...groups.values()]
    .map((rs) => {
      const list = [...rs].sort(raceSort)
      const times = list.map(total)
      const pb = Math.min(...times)
      const first = list[0]
      const targets = state.targets
        .filter((t) => t.distance === first.distance && t.stroke === first.stroke)
        .map((t) => ({ t, gap: gapTo(pb, t.time) }))
      // progression polyline
      const W = 300, H = 64, pad = 8
      const lo = Math.min(...times), hi = Math.max(...times)
      const span = hi - lo || 1
      const pts = times.map((v, i) => [
        list.length === 1 ? W / 2 : pad + (i / (list.length - 1)) * (W - pad * 2),
        pad + ((v - lo) / span) * (H - pad * 2),
      ])
      return { key: eventKey(first.distance, first.stroke), first, list, times, pb, targets, pts, W, H }
    })
    .sort((a, b) => a.first.distance - b.first.distance || a.first.stroke.localeCompare(b.first.stroke))
})

function remove() {
  deleteSwimmer(props.id)
  go('/swimmers')
}
</script>

<template>
  <p class="crumb"><a href="#/swimmers">← All swimmers</a></p>

  <div v-if="!swimmer" class="panel empty">This swimmer no longer exists. <a href="#/swimmers">Back to the roster</a>.</div>

  <template v-else>
    <div class="page-head">
      <div>
        <p class="eyebrow">{{ swimmer.squad }} · born {{ swimmer.birthYear }} · age {{ currentYear() - swimmer.birthYear }}</p>
        <h1>{{ swimmer.name }}</h1>
      </div>
      <div class="row-actions inline">
        <button type="button" class="btn danger" data-testid="swimmer-delete" @click="remove">Delete swimmer</button>
      </div>
    </div>

    <div class="split-layout">
      <section aria-label="Events">
        <p v-if="!events.length" class="panel empty">No races yet. <a href="#/races">Log a race</a> to build a personal-best sheet.</p>
        <article v-for="e in events" :key="e.key" class="panel event" data-testid="event-card">
          <header class="event-head">
            <div>
              <h2 class="panel-title">{{ eventLabel(e.first.distance, e.first.stroke) }}</h2>
              <p class="meta">{{ e.list.length }} swim{{ e.list.length === 1 ? '' : 's' }}</p>
            </div>
            <div class="pb">
              <span class="pb-label">Personal best</span>
              <span class="mono big" data-testid="personal-best">{{ fmtTime(e.pb) }}</span>
            </div>
          </header>

          <ul v-if="e.targets.length" class="gaps" aria-label="Gap to qualifying targets">
            <li v-for="g in e.targets" :key="g.t.id" :class="g.gap.reached ? 'ok' : g.gap.percent <= 2 ? 'near' : ''" data-testid="target-gap">
              <span class="gap-label">{{ g.t.label }} <span class="mono">{{ fmtTime(g.t.time) }}</span></span>
              <span class="mono gapv">
                <template v-if="g.gap.reached">Qualified · </template>{{ fmtSigned(g.gap.seconds) }} s · {{ fmtSigned(g.gap.percent) }}%
              </span>
            </li>
          </ul>
          <p v-else class="meta">No qualifying target set for this event.</p>

          <svg class="prog" :viewBox="`0 0 ${e.W} ${e.H}`" preserveAspectRatio="none" role="img"
            :aria-label="`Progression: ${e.times.map(fmtTime).join(', ')}`">
            <line v-for="y in [16, 32, 48]" :key="y" x1="0" :x2="e.W" :y1="y" :y2="y" class="grid" />
            <polyline v-if="e.pts.length > 1" :points="e.pts.map((p) => p.join(',')).join(' ')" class="line" />
            <circle v-for="(p, i) in e.pts" :key="i" :cx="p[0]" :cy="p[1]" r="4" :class="{ pbdot: e.times[i] === e.pb }" />
          </svg>

          <ol class="times" aria-label="All times in date order">
            <li v-for="(r, i) in e.list" :key="r.id" :class="{ isbest: e.times[i] === e.pb }" data-testid="time-row">
              <span class="date">{{ fmtDate(r.date) }}</span>
              <span class="mono t">{{ fmtTime(e.times[i]) }}</span>
              <span class="mono d">{{ e.times[i] === e.pb ? 'PB' : fmtSigned(e.times[i] - e.pb) }}</span>
              <SplitBars :splits="r.splits" />
              <span class="chip neg" v-if="isNegativeSplit(r)">Neg. split</span>
            </li>
          </ol>
        </article>
      </section>

      <aside class="side">
        <SwimmerForm :editing="swimmer"  />
        <div class="panel facts">
          <h2 class="panel-title">Profile</h2>
          <dl>
            <dt>Squad</dt><dd>{{ swimmer.squad }}</dd>
            <dt>Birth year</dt><dd>{{ swimmer.birthYear }}</dd>
            <dt>Events swum</dt><dd>{{ events.length }}</dd>
            <dt>Races logged</dt><dd>{{ events.reduce((n, e) => n + e.list.length, 0) }}</dd>
          </dl>
          <a class="btn primary linkbtn" href="#/races">Log a race</a>
        </div>
      </aside>
    </div>
  </template>
</template>
