<script lang="ts">
  import { untrack } from 'svelte'
  import type { Member } from './types'
  import { app, saveMember, notify } from './store.svelte'
  import { validateMember } from './logic'
  import Field from './Field.svelte'

  let { member = null, onDone, oncancel }: { member?: Member | null; onDone?: () => void; oncancel?: () => void } = $props()

  const init = untrack(() => member)
  let name = $state(init?.name ?? '')
  let speed = $state(init ? String(init.speed) : '')
  let predicted = $state(init?.predicted ?? '')
  let errors = $state<Record<string, string>>({})
  let nameEl: HTMLInputElement

  function submit(e: SubmitEvent) {
    e.preventDefault()
    errors = validateMember(app, { name, speed }, member?.id)
    if (Object.keys(errors).length) {
      document.getElementById(errors.name ? 'mf-name' : 'mf-speed')?.focus()
      return
    }
    saveMember({ name, speed: Number(speed), predicted: predicted || null }, member?.id)
    notify(member ? `Saved ${name.trim()}.` : `${name.trim()} has joined the salon.`)
    if (!member) {
      name = speed = predicted = ''
      nameEl?.focus()
    }
    onDone?.()
  }
</script>

<form class="panel form" data-testid="member-form" onsubmit={submit} novalidate aria-label={member ? 'Edit member' : 'Add a member'}>
  <h2 class="panel-title">{member ? 'Edit member' : 'Add a member'}</h2>
  <Field label="Name" id="mf-name" error={errors.name}>
    <input id="mf-name" bind:this={nameEl} bind:value={name} autocomplete="off" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'mf-name-err' : undefined} />
  </Field>
  <Field label="Reading speed (pages per day)" id="mf-speed" error={errors.speed}>
    <input id="mf-speed" bind:value={speed} inputmode="decimal" autocomplete="off" aria-invalid={!!errors.speed} aria-describedby={errors.speed ? 'mf-speed-err' : undefined} />
  </Field>
  <Field label="Predicted winner" id="mf-winner">
    <select id="mf-winner" data-testid="winner-vote" bind:value={predicted}>
      <option value="">No prediction yet</option>
      {#each app.books as b (b.id)}
        <option value={b.id}>{b.title}</option>
      {/each}
    </select>
  </Field>
  <div class="actions">
    <button class="btn primary" type="submit" data-testid="member-save">{member ? 'Save member' : 'Add member'}</button>
    {#if oncancel}<button class="btn ghost" type="button" onclick={oncancel}>Cancel</button>{/if}
  </div>
</form>
