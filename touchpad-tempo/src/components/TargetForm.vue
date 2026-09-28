<script setup lang="ts">
import { reactive, watch } from 'vue'
import { DISTANCES, fmtTime, saveTarget, STROKES, type Stroke, type Target } from '../lib'

const props = defineProps<{ editing: Target | null }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const f = reactive({ label: '', distance: '100', stroke: 'freestyle' as Stroke, time: '' })
const errors = reactive<Record<string, string>>({})

function fill() {
  const t = props.editing
  f.label = t?.label ?? ''
  f.distance = String(t?.distance ?? 100)
  f.stroke = t?.stroke ?? 'freestyle'
  f.time = t ? String(t.time) : ''
  for (const k of Object.keys(errors)) delete errors[k]
}
watch(() => props.editing, fill, { immediate: true })

const num = (s: string) => (/^\s*\d+([.,]\d+)?\s*$/.test(s) ? parseFloat(s.replace(',', '.')) : NaN)

function submit() {
  for (const k of Object.keys(errors)) delete errors[k]
  if (!f.label.trim()) errors.label = 'Give the target a label, e.g. National Juniors.'
  const t = num(f.time)
  if (!f.time.trim()) errors.time = 'Enter the qualifying time in seconds.'
  else if (!(t > 0)) errors.time = 'Time must be a number of seconds greater than 0.'
  if (Object.keys(errors).length) return
  saveTarget({ label: f.label.trim(), distance: +f.distance, stroke: f.stroke, time: Math.round(t * 100) / 100 }, props.editing?.id)
  if (!props.editing) fill()
  emit('saved')
}
</script>

<template>
  <form class="panel form" data-testid="target-form" novalidate @submit.prevent="submit" aria-labelledby="tf-title">
    <h2 id="tf-title" class="panel-title">{{ editing ? 'Edit target' : 'Add target' }}</h2>

    <div class="field" :class="{ bad: errors.label }">
      <label for="tf-label">Label</label>
      <input id="tf-label" v-model="f.label" name="label" autocomplete="off" :aria-invalid="!!errors.label"
        aria-describedby="tf-label-err" />
      <p id="tf-label-err" class="err" role="alert" v-if="errors.label" data-testid="error-label">{{ errors.label }}</p>
    </div>

    <div class="row2">
      <div class="field">
        <label for="tf-dist">Distance</label>
        <select id="tf-dist" v-model="f.distance" name="distance">
          <option v-for="d in DISTANCES" :key="d" :value="String(d)">{{ d }} m</option>
        </select>
      </div>
      <div class="field">
        <label for="tf-stroke">Stroke</label>
        <select id="tf-stroke" v-model="f.stroke" name="stroke">
          <option v-for="s in STROKES" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>

    <div class="field" :class="{ bad: errors.time }">
      <label for="tf-time">Qualifying time (seconds)</label>
      <input id="tf-time" v-model="f.time" name="time" inputmode="decimal" autocomplete="off" placeholder="e.g. 140.00"
        :aria-invalid="!!errors.time" aria-describedby="tf-time-err tf-time-hint" />
      <p id="tf-time-hint" class="hint" v-if="num(f.time) > 0">= {{ fmtTime(num(f.time)) }}</p>
      <p id="tf-time-err" class="err" role="alert" v-if="errors.time" data-testid="error-time">{{ errors.time }}</p>
    </div>

    <div class="actions">
      <button type="submit" class="btn primary" data-testid="target-save">{{ editing ? 'Save changes' : 'Add target' }}</button>
      <button v-if="editing" type="button" class="btn ghost" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>
