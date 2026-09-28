<script lang="ts">
  import { app, deleteBook } from './store.svelte'
  import { paceFor, todayISO, fmtNum, fmtDate, votesFor, spineColor } from './logic'
  import { go } from './router.svelte'
  import BookForm from './BookForm.svelte'
  import Cover from './Cover.svelte'
  import Progress from './Progress.svelte'

  let { id }: { id: string } = $props()
  let editing = $state(false)
  const book = $derived(app.books.find((b) => b.id === id))
  const today = todayISO()
  const readers = $derived(app.members.filter((m) => book?.assigned.includes(m.id)))
  const votes = $derived(book ? votesFor(app, book.id) : [])
  const days = $derived(Math.max(0, Math.round((Date.parse(app.settings.announce) - Date.parse(today)) / 86400000)))
</script>

{#if !book}
  <section class="panel notfound">
    <h2>That book isn’t on the shelf</h2>
    <p>It may have been deleted. <a href="#/books">Back to the shortlist</a></p>
  </section>
{:else}
  <p class="crumb"><a href="#/books">← The shortlist</a></p>
  <header class="detail-head" style="--spine:{spineColor(book.id)}">
    <Cover id={book.id} title={book.title} size="lg" />
    <div>
      <p class="eyebrow">{app.settings.prize} shortlist</p>
      <h2 class="detail-title">{book.title}</h2>
      <p class="byline">{book.author}</p>
      <p class="meta">
        {fmtNum(book.pages)} pages · {votes.length} {votes.length === 1 ? 'prediction' : 'predictions'} to win{votes.length ? `: ${votes.map((v) => v.name).join(', ')}` : ''}
      </p>
      <div class="row-actions left">
        <button class="btn small" onclick={() => (editing = !editing)} aria-expanded={editing}>{editing ? 'Close editor' : 'Edit book'}</button>
        <button class="btn small danger" data-testid="book-delete" onclick={() => { deleteBook(book.id); go('books') }}>Delete book</button>
      </div>
    </div>
  </header>

  {#if editing}
    <BookForm {book} onDone={() => (editing = false)} oncancel={() => (editing = false)} />
  {/if}

  <section class="panel" aria-labelledby="pace-h">
    <h3 id="pace-h" class="panel-title">Progress &amp; pace to {fmtDate(app.settings.announce)}</h3>
    <p class="hint">{days} {days === 1 ? 'day' : 'days'} remain from today. “Needed” is pages left ÷ days left.</p>
    {#if readers.length === 0}
      <p class="empty">No one is assigned yet. Use “Edit book” to assign readers.</p>
    {/if}
    <ul class="readers" data-testid="pace-plan">
      {#each readers as m (m.id)}
        {@const p = paceFor(book, m, app, today)}
        <li class="reader" class:behind={p.behind}>
          <div class="reader-top">
            <strong>{m.name}</strong>
            <span class="pct" aria-label="{p.percent} percent complete">{p.percent}%</span>
          </div>
          <Progress percent={p.percent} color={p.behind ? 'var(--oxblood)' : spineColor(book.id)} label="{m.name} progress on {book.title}" />
          <p class="meta">
            Page {p.current} of {book.pages} ·
            {#if p.remaining === 0}
              <span class="tag done">Finished</span>
            {:else}
              needs <strong>{p.needed.toFixed(1)}</strong> pages/day · reads {m.speed}/day
              {#if p.behind}<span class="tag behind">Behind</span>{:else}<span class="tag ok">On pace</span>{/if}
            {/if}
          </p>
        </li>
      {/each}
    </ul>
  </section>
{/if}
