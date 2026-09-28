<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { currentYear, saveSwimmer, state, type Swimmer } from '../lib'

const props = defineProps<{ editing: Swimmer | null }>()
const emit = defineEmits<{ saved: [id: string]; cancel: [] }>()

const f = reactive({ name: '', birthYear: '', squad: '' })
const errors = reactive<Record<string, string>>({})

function fill() {
  const s = props.editing
  f.name = s?.name ?? ''
  f.birthYear = s ? String(s.birthYear) : ''
  f.squad = s?.squad ?? ''
  for (const k of Object.keys(errors)) delete errors[k]
}
watch(() => props.editing, fill, { immediate: true })

const squads = computed(() => [...new Set(state.swimmers.map((s) => s.squad))].sort())

function validate() {
  for (const k of Object.keys(errors)) delete errors[k]
  if (!f.name.trim()) errors.name = 'Enter the swimmer’s name.'
  const y = f.birthYear.trim()
  if (!y) errors.birthYear = 'Enter a birth year.'
  else if (!/^\d{4}$/.test(y) || +y < 1950 || +y > currentYear())
    errors.birthYear = `Birth year must be between 1950 and ${currentYear()}.`
  if (!f.squad.trim()) errors.squad = 'Enter or pick a squad.'
  return Object.keys(errors).length === 0
}

function submit() {
  if (!validate()) return
  const id = saveSwimmer(
    { name: f.name.trim(), birthYear: +f.birthYear.trim(), squad: f.squad.trim() },
    props.editing?.id,
  )
  if (!props.editing) fill()
  emit('saved', id)
}
</script>

<template>
  <form class="panel form" data-testid="swimmer-form" novalidate @submit.prevent="submit" aria-labelledby="sf-title">
    <h2 id="sf-title" class="panel-title">{{ editing ? 'Edit swimmer' : 'Add swimmer' }}</h2>

    <div class="field" :class="{ bad: errors.name }">
      <label for="sf-name">Name</label>
      <input id="sf-name" v-model="f.name" name="name" autocomplete="off" :aria-invalid="!!errors.name"
        aria-describedby="sf-name-err" />
      <p id="sf-name-err" class="err" role="alert" v-if="errors.name" data-testid="error-name">{{ errors.name }}</p>
    </div>

    <div class="field" :class="{ bad: errors.birthYear }">
      <label for="sf-year">Birth year</label>
      <input id="sf-year" v-model="f.birthYear" name="birthYear" inputmode="numeric" autocomplete="off" maxlength="4"
        :aria-invalid="!!errors.birthYear" aria-describedby="sf-year-err" />
      <p id="sf-year-err" class="err" role="alert" v-if="errors.birthYear" data-testid="error-birthYear">{{ errors.birthYear }}</p>
    </div>

    <div class="field" :class="{ bad: errors.squad }">
      <label for="sf-squad">Squad</label>
      <input id="sf-squad" v-model="f.squad" name="squad" list="sf-squads" autocomplete="off"
        :aria-invalid="!!errors.squad" aria-describedby="sf-squad-err" />
      <datalist id="sf-squads"><option v-for="s in squads" :key="s" :value="s" /></datalist>
      <p id="sf-squad-err" class="err" role="alert" v-if="errors.squad" data-testid="error-squad">{{ errors.squad }}</p>
    </div>

    <div class="actions">
      <button type="submit" class="btn primary" data-testid="swimmer-save">{{ editing ? 'Save changes' : 'Add swimmer' }}</button>
      <button v-if="editing" type="button" class="btn ghost" @click="fill(); emit('cancel')">Cancel</button>
    </div>
  </form>
</template>
