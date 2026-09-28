<script lang="ts">
  import { app, ui, resetData, undo } from './lib/store.svelte'
  import { route } from './lib/router.svelte'
  import { clubCompletion, daysBetween, todayISO, fmtDate, fmtNum } from './lib/logic'
  import Books from './lib/Books.svelte'
  import BookDetail from './lib/BookDetail.svelte'
  import Members from './lib/Members.svelte'
  import Schedule from './lib/Schedule.svelte'

  const parts = $derived(route.path.split('/'))
  const section = $derived(parts[0] || 'books')
  const done = $derived(clubCompletion(app))
  const days = $derived(daysBetween(todayISO(), app.settings.announce))

  const tabs = [
    { id: 'books', label: 'Books' },
    { id: 'members', label: 'Members' },
    { id: 'schedule', label: 'Schedule' },
  ]
</script>

<a class="skip" href="#main">Skip to content</a>

<header class="masthead">
  <div class="wrap mast-grid">
    <div class="brand">
      <svg class="ribbon" viewBox="0 0 24 36" aria-hidden="true"><path d="M2 0h20v36l-10-8-10 8z" /></svg>
      <div>
        <p class="kicker">{app.settings.prize}</p>
        <h1>Shortlist Salon</h1>
      </div>
    </div>
    <div class="summary" data-testid="club-summary" role="group" aria-label="Club completion">
      <div class="summary-top">
        <span class="summary-pct">{done.percent}%</span>
        <span class="summary-label">of the shortlist read<br /><small>{fmtNum(done.read)} of {fmtNum(done.total)} assigned pages</small></span>
      </div>
      <div class="bar on-dark" role="progressbar" aria-label="Club completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow={done.percent}><span style="width:{done.percent}%"></span></div>
    </div>
    <div class="mast-side">
      <p class="deadline">{days > 0 ? `${days} days to the verdict` : days === 0 ? 'Winner named today' : 'Winner named'}<br /><small>{fmtDate(app.settings.announce)}</small></p>
      <button class="btn reset" data-testid="reset-data" onclick={resetData}>Reset data</button>
    </div>
  </div>
  <nav class="wrap tabs" aria-label="Sections">
    {#each tabs as t (t.id)}
      <a href="#/{t.id}" class:active={section === t.id} aria-current={section === t.id ? 'page' : undefined}>{t.label}</a>
    {/each}
  </nav>
</header>

<main id="main" class="wrap" tabindex="-1">
  {#if section === 'members'}
    <Members />
  {:else if section === 'schedule'}
    <Schedule />
  {:else if section === 'books' && parts[1]}
    {#key parts[1]}<BookDetail id={parts[1]} />{/key}
  {:else}
    <Books />
  {/if}
</main>

<footer class="wrap foot">
  <p>Shortlist Salon keeps everything on this device. Titles and authors shown are invented.</p>
</footer>

{#if ui.toast}
  <div class="toast" role="status">
    <span>{ui.toast}</span>
    {#if ui.snapshot}<button class="btn small" onclick={undo}>Undo</button>{/if}
  </div>
{/if}
