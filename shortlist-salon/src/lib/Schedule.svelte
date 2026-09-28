<script lang="ts">
  import { app, saveSettings, notify } from './store.svelte'
  import { paceFor, todayISO, fmtDate, addDays, daysBetween, validateSettings, SHORTLIST_DATE, spineColor } from './logic'
  import Field from './Field.svelte'

  const today = todayISO()
  const days = $derived(daysBetween(today, app.settings.announce))
  const span = $derived(Math.max(1, daysBetween(SHORTLIST_DATE, app.settings.announce)))
  const elapsed = $derived(Math.min(100, Math.max(0, (daysBetween(SHORTLIST_DATE, today) / span) * 100)))
  const weeks = $derived(Math.floor(Math.max(days, 0) / 7))

  let prize = $state(app.settings.prize)
  let announce = $state(app.settings.announce)
  let errors = $state<Record<string, string>>({})

  function submit(e: SubmitEvent) {
    e.preventDefault()
    errors = validateSettings({ prize, announce })
    if (Object.keys(errors).length) {
      document.getElementById(errors.prize ? 'sf-prize' : 'sf-date')?.focus()
      return
    }
    saveSettings({ prize, announce })
    notify('Club settings saved.')
  }

  function plan(memberId: string) {
    const m = app.members.find((x) => x.id === memberId)!
    const rows = app.books
      .filter((b) => b.assigned.includes(memberId))
      .map((b) => ({ book: b, p: paceFor(b, m, app, today) }))
    const left = rows.reduce((n, r) => n + r.p.remaining, 0)
    const finishAll = left === 0 ? null : addDays(today, Math.ceil(left / m.speed))
    return { m, rows, left, finishAll, days: Math.max(days, 1) }
  }
</script>

<section class="hero" aria-labelledby="count-h">
  <p class="eyebrow light">Until the winner is named</p>
  <h2 id="count-h" class="hero-count">
    <span class="big" data-testid="countdown">{Math.max(days, 0)}</span>
    <span class="unit">{days === 1 ? 'day' : 'days'}</span>
  </h2>
  <p class="hero-sub">
    {#if days > 0}
      {weeks} {weeks === 1 ? 'week' : 'weeks'} and {days % 7} {days % 7 === 1 ? 'day' : 'days'} to the {app.settings.prize} announcement on {fmtDate(app.settings.announce)}.
    {:else if days === 0}
      The {app.settings.prize} winner is named today.
    {:else}
      The {app.settings.prize} winner was named on {fmtDate(app.settings.announce)}.
    {/if}
  </p>
  <div class="timeline" role="img" aria-label="{Math.round(elapsed)} percent of the reading window elapsed">
    <span class="tl-fill" style="width:{elapsed}%"></span>
    <span class="tl-marker" style="left:{elapsed}%"></span>
  </div>
  <div class="tl-labels"><span>Shortlist · {fmtDate(SHORTLIST_DATE, false)}</span><span>Winner · {fmtDate(app.settings.announce, false)}</span></div>
</section>

<div class="split">
  <section aria-labelledby="plan-h">
    <div class="section-head">
      <p class="eyebrow">Projected from each reader’s pace</p>
      <h2 id="plan-h">Reading plan</h2>
    </div>
    <div class="plans" data-testid="pace-plan">
      {#each app.members as mem (mem.id)}
        {@const pl = plan(mem.id)}
        <article class="plan" aria-label="Plan for {mem.name}">
          <header>
            <h3>{mem.name}</h3>
            <span class="meta">{mem.speed} pages/day</span>
          </header>
          {#if pl.rows.length === 0}
            <p class="hint">No books assigned.</p>
          {:else}
            <ul>
              {#each pl.rows as r (r.book.id)}
                <li class:behind={r.p.behind} style="--spine:{spineColor(r.book.id)}">
                  <a href="#/books/{r.book.id}">{r.book.title}</a>
                  <span class="when">
                    {#if r.p.finish === null}
                      <span class="tag done">Finished</span>
                    {:else}
                      <span class="date">{fmtDate(r.p.finish)}</span>
                      {#if r.p.late}<span class="tag behind">After the announcement</span>{:else}<span class="tag ok">Before the announcement</span>{/if}
                    {/if}
                  </span>
                  <span class="meta">{r.p.remaining} pages left</span>
                </li>
              {/each}
            </ul>
            <p class="plan-foot">
              {#if pl.finishAll === null}
                All assigned books finished.
              {:else}
                Everything done by <strong>{fmtDate(pl.finishAll)}</strong> reading one after another ({pl.left} pages).
              {/if}
            </p>
          {/if}
        </article>
      {/each}
      {#if app.members.length === 0}<p class="empty">Add members to see the plan.</p>{/if}
    </div>
  </section>

  <aside>
    <form class="panel form" data-testid="settings-form" onsubmit={submit} novalidate aria-label="Club settings">
      <h2 class="panel-title">Club settings</h2>
      <Field label="Prize name" id="sf-prize" error={errors.prize}>
        <input id="sf-prize" bind:value={prize} autocomplete="off" aria-invalid={!!errors.prize} aria-describedby={errors.prize ? 'sf-prize-err' : undefined} />
      </Field>
      <Field label="Winner announcement date" id="sf-date" error={errors.announce}>
        <input id="sf-date" type="date" bind:value={announce} aria-invalid={!!errors.announce} aria-describedby={errors.announce ? 'sf-date-err' : undefined} />
      </Field>
      <div class="actions"><button class="btn primary" type="submit" data-testid="settings-save">Save settings</button></div>
    </form>
  </aside>
</div>
