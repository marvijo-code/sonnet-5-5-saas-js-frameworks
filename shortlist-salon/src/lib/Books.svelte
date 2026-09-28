<script lang="ts">
  import { app, deleteBook } from './store.svelte'
  import { votesFor, fmtNum, spineColor } from './logic'
  import type { Book } from './types'
  import BookForm from './BookForm.svelte'
  import Cover from './Cover.svelte'

  let editing = $state<Book | null>(null)
  const topVotes = $derived(Math.max(0, ...app.books.map((b) => votesFor(app, b.id).length)))
</script>

<div class="split">
  <section aria-labelledby="books-h">
    <div class="section-head">
      <p class="eyebrow">The longlist, cut down</p>
      <h2 id="books-h">The shortlist <span class="count">{app.books.length}</span></h2>
    </div>
    {#if app.books.length === 0}
      <p class="empty">The shelf is bare. Add the first book on the shortlist.</p>
    {/if}
    <ul class="books" data-testid="book-list">
      {#each app.books as b (b.id)}
        {@const votes = votesFor(app, b.id)}
        <li class="book-row" data-testid="book-row" style="--spine:{spineColor(b.id)}">
          <Cover id={b.id} title={b.title} />
          <div class="book-main">
            <h3><a href="#/books/{b.id}">{b.title}</a></h3>
            <p class="byline">{b.author}</p>
            <p class="meta">
              {fmtNum(b.pages)} pages · {b.assigned.length}
              {b.assigned.length === 1 ? 'reader' : 'readers'}
            </p>
          </div>
          <div class="vote" class:lead={votes.length > 0 && votes.length === topVotes}>
            <span class="vote-n" data-testid="winner-vote" aria-label="{votes.length} {votes.length === 1 ? 'member predicts' : 'members predict'} {b.title} as winner">{votes.length}</span>
            <span class="vote-l" aria-hidden="true">{votes.length === 1 ? 'vote' : 'votes'}<br />to win</span>
          </div>
          <div class="row-actions">
            <button class="btn small" onclick={() => (editing = b)} aria-label="Edit {b.title}">Edit</button>
            <button class="btn small danger" data-testid="book-delete" onclick={() => { if (editing?.id === b.id) editing = null; deleteBook(b.id) }} aria-label="Delete {b.title}">Delete</button>
          </div>
        </li>
      {/each}
    </ul>
  </section>
  <aside>
    {#key editing?.id ?? 'new'}
      <BookForm book={editing} onDone={() => (editing = null)} oncancel={editing ? () => (editing = null) : undefined} />
    {/key}
  </aside>
</div>
