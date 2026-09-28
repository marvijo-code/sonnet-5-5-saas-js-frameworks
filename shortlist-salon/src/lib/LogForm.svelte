<script lang="ts">
  import { untrack } from 'svelte'
  import type { Log } from './types'
  import { app, saveLog, notify } from './store.svelte'
  import { validateLog, todayISO } from './logic'
  import Field from './Field.svelte'

  let { log = null, onDone, oncancel }: { log?: Log | null; onDone?: () => void; oncancel?: () => void } = $props()

  const init = untrack(() => log)
  let memberId = $state(init?.memberId ?? '')
  let bookId = $state(init?.bookId ?? '')
  let date = $state(init?.date ?? todayISO())
  let page = $state(init ? String(init.page) : '')
  let errors = $state<Record<string, string>>({})

  const member = $derived(app.members.find((m) => m.id === memberId))
  const mine = $derived(app.books.filter((b) => member && b.assigned.includes(member.id)))
  const others = $derived(app.books.filter((b) => !mine.includes(b)))
  const chosen = $derived(app.books.find((b) => b.id === bookId))

  function submit(e: SubmitEvent) {
    e.preventDefault()
    errors = validateLog(app, { memberId, bookId, date, page }, log?.id)
    const first = ['member', 'book', 'date', 'page'].find((k) => errors[k])
    if (first) {
      document.getElementById('lf-' + first)?.focus()
      return
    }
    saveLog({ memberId, bookId, date, page: Number(page) }, log?.id)
    notify(log ? 'Reading log updated.' : 'Reading log added.')
    if (!log) page = ''
    onDone?.()
  }
</script>

<form class="panel form" data-testid="log-form" onsubmit={submit} novalidate aria-label={log ? 'Edit reading log' : 'Add a reading log'}>
  <h2 class="panel-title">{log ? 'Edit reading log' : 'Log a reading session'}</h2>
  <Field label="Member" id="lf-member" error={errors.member}>
    <select id="lf-member" bind:value={memberId} aria-invalid={!!errors.member} aria-describedby={errors.member ? 'lf-member-err' : undefined}>
      <option value="">Choose a member…</option>
      {#each app.members as m (m.id)}<option value={m.id}>{m.name}</option>{/each}
    </select>
  </Field>
  <Field label="Book" id="lf-book" error={errors.book}>
    <select id="lf-book" bind:value={bookId} aria-invalid={!!errors.book} aria-describedby={errors.book ? 'lf-book-err' : undefined}>
      <option value="">Choose a book…</option>
      {#if member}
        <optgroup label="Assigned to {member.name}">
          {#each mine as b (b.id)}<option value={b.id}>{b.title}</option>{/each}
        </optgroup>
        <optgroup label="Not assigned">
          {#each others as b (b.id)}<option value={b.id}>{b.title}</option>{/each}
        </optgroup>
      {:else}
        {#each app.books as b (b.id)}<option value={b.id}>{b.title}</option>{/each}
      {/if}
    </select>
  </Field>
  <div class="two">
    <Field label="Date" id="lf-date" error={errors.date}>
      <input id="lf-date" type="date" bind:value={date} aria-invalid={!!errors.date} aria-describedby={errors.date ? 'lf-date-err' : undefined} />
    </Field>
    <Field label="Current page" id="lf-page" error={errors.page} hint={chosen ? `of ${chosen.pages}` : ''}>
      <input id="lf-page" bind:value={page} inputmode="numeric" autocomplete="off" aria-invalid={!!errors.page} aria-describedby={errors.page ? 'lf-page-err' : chosen ? 'lf-page-hint' : undefined} />
    </Field>
  </div>
  <div class="actions">
    <button class="btn primary" type="submit" data-testid="log-save">{log ? 'Save log' : 'Add log'}</button>
    {#if oncancel}<button class="btn ghost" type="button" onclick={oncancel}>Cancel</button>{/if}
  </div>
</form>
