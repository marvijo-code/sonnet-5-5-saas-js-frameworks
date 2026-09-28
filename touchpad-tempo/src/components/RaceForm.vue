<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { DISTANCES, fmtTime, isoDaysAgo, r2, saveRace, state, STROKES, type Race, type Stroke } from '../lib'

const props = defineProps<{ editing: Race | null }>()
const emit = defineEmits<{ saved: [] ; cancel: [] }>()

const f = reactive({ swimmerId: '', distance: '100', stroke: 'freestyle' as Stroke, date: isoDaysAgo(0), splits: '' })
const errors = reactive<Record<string, string>>({})

function fill() {
  const r = props.editing
  f.swimmerId = r?.swimmerId ?? ''
  f.distance = String(r?.distance ?? 100)
  f.stroke = r?.stroke ?? 'freestyle'
  f.date = r?.date ?? isoDaysAgo(0)
  f.splits = r ? r.splits.join(', ') : ''
  for (const k of Object.keys(errors)) delete errors[k]
}
watch(() => props.editing, fill, { immediate: true })

const need = computed(() => +f.distance / 50)
const parts = computed(() => f.splits.split(/[\s,;]+/).filter(Boolean))
const nums = computed(() => parts.value.map((p) => (/^\d+([.,]\d+)?$/.test(p) ? parseFloat(p.replace(',', '.')) : NaN)))
const preview = computed(() => (nums.value.length && nums.value.every((n) => n > 0) ? r2(nums.value.reduce((a, b) => a + b, 0)) : null))
const sortedSwimmers = computed(() => [...state.swimmers].sort((a, b) => a.name.localeCompare(b.name)))

function submit() {
  for (const k of Object.keys(errors)) delete errors[k]
  if (!f.swimmerId) errors.swimmerId = 'Choose a swimmer.'
  if (!f.date || isNaN(new Date(f.date).getTime())) errors.date = 'Enter the race date.'
  if (!parts.value.length) errors.splits = `Enter ${need.value} split${need.value > 1 ? 's' : ''} of 50 m for a ${f.distance} m race.`
  else if (parts.value.length !== need.value)
    errors.splits = `A ${f.distance} m race needs exactly ${need.value} split${need.value > 1 ? 's' : ''}; you entered ${parts.value.length}.`
  else if (nums.value.some((n) => !(n > 0))) errors.splits = 'Every split must be a number of seconds greater than 0.'
  if (Object.keys(errors).length) return
  saveRace(
    { swimmerId: f.swimmerId, distance: +f.distance, stroke: f.stroke, date: f.date, splits: nums.value.map(r2) },
    props.editing?.id,
  )
  if (!props.editing) {
    f.splits = ''
  }
  emit('saved')
}
</script>

<template>
  <form class="panel form" data-testid="race-form" novalidate @submit.prevent="submit" aria-labelledby="rf-title">
    <h2 id="rf-title" class="panel-title">{{ editing ? 'Edit race' : 'Log a race' }}</h2>

    <div class="field" :class="{ bad: errors.swimmerId }">
      <label for="rf-swimmer">Swimmer</label>
      <select id="rf-swimmer" v-model="f.swimmerId" name="swimmer" :aria-invalid="!!errors.swimmerId" aria-describedby="rf-swimmer-err">
        <option value="">Choose a swimmer…</option>
        <option v-for="s in sortedSwimmers" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <p id="rf-swimmer-err" class="err" role="alert" v-if="errors.swimmerId" data-testid="error-swimmer">{{ errors.swimmerId }}</p>
    </div>

    <div class="row2">
      <div class="field">
        <label for="rf-dist">Distance</label>
        <select id="rf-dist" v-model="f.distance" name="distance">
          <option v-for="d in DISTANCES" :key="d" :value="String(d)">{{ d }} m</option>
        </select>
      </div>
      <div class="field">
        <label for="rf-stroke">Stroke</label>
        <select id="rf-stroke" v-model="f.stroke" name="stroke">
          <option v-for="s in STROKES" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>

    <div class="field" :class="{ bad: errors.date }">
      <label for="rf-date">Date</label>
      <input id="rf-date" v-model="f.date" name="date" type="date" :aria-invalid="!!errors.date" aria-describedby="rf-date-err" />
      <p id="rf-date-err" class="err" role="alert" v-if="errors.date" data-testid="error-date">{{ errors.date }}</p>
    </div>

    <div class="field" :class="{ bad: errors.splits }">
      <label for="rf-splits">50 m splits in seconds, comma-separated</label>
      <input id="rf-splits" v-model="f.splits" name="splits" inputmode="decimal" autocomplete="off"
        :placeholder="Array.from({ length: need }, (_, i) => (28 + i * 1.6).toFixed(1)).join(', ')"
        :aria-invalid="!!errors.splits" aria-describedby="rf-splits-err rf-splits-hint" />
      <p id="rf-splits-hint" class="hint">
        {{ parts.length }} of {{ need }} splits
        <template v-if="preview !== null && parts.length === need"> · final time <b class="mono">{{ fmtTime(preview) }}</b></template>
      </p>
      <p id="rf-splits-err" class="err" role="alert" v-if="errors.splits" data-testid="error-splits">{{ errors.splits }}</p>
    </div>

    <div class="actions">
      <button type="submit" class="btn primary" data-testid="race-save">{{ editing ? 'Save changes' : 'Log race' }}</button>
      <button v-if="editing" type="button" class="btn ghost" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>
