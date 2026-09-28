<script lang="ts">
  import { untrack } from 'svelte'
  import type { Book } from './types'
  import { app, saveBook, notify } from './store.svelte'
  import { validateBook } from './logic'
  import Field from './Field.svelte'

  let { book = null, onDone, oncancel }: { book?: Book | null; onDone?: (id: string) => void; oncancel?: () => void } = $props()

  const init = untrack(() => book)
  let title = $state(init?.title ?? '')
  let author = $state(init?.author ?? '')
  let pages = $state(init ? String(init.pages) : '')
  let assigned = $state<string[]>(init ? [...init.assigned] : [])
  let errors = $state<Record<string, string>>({})
  let titleEl: HTMLInputElement

  const dropped = $derived(
    book
      ? app.logs.filter((l) => l.bookId === book.id && !assigned.includes(l.memberId)).length
      : 0,
  )

  function toggle(id: string) {
    assigned = assigned.includes(id) ? assigned.filter((x) => x !== id) : [...assigned, id]
  }

  function submit(e: SubmitEvent) {
    e.preventDefault()
    errors = validateBook(app, { title, author, pages }, book?.id)
    if (Object.keys(errors).length) {
      const first = ['title', 'author', 'pages'].find((k) => errors[k])
      document.getElementById('bf-' + first)?.focus()
      return
    }
    const id = saveBook({ title, author, pages: Number(pages), assigned }, book?.id)
    notify(book ? `Saved “${title.trim()}”.` : `Added “${title.trim()}” to the shortlist.`)
    if (!book) {
      title = author = pages = ''
      assigned = []
      titleEl?.focus()
    }
    onDone?.(id)
  }
</script>

<form class="panel form" data-testid="book-form" onsubmit={submit} novalidate aria-label={book ? 'Edit book' : 'Add a book'}>
  <h2 class="panel-title">{book ? 'Edit this book' : 'Add a book'}</h2>
  <Field label="Title" id="bf-title" error={errors.title}>
    <input id="bf-title" bind:this={titleEl} bind:value={title} autocomplete="off" aria-invalid={!!errors.title} aria-describedby={errors.title ? 'bf-title-err' : undefined} />
  </Field>
  <Field label="Author" id="bf-author" error={errors.author}>
    <input id="bf-author" bind:value={author} autocomplete="off" aria-invalid={!!errors.author} aria-describedby={errors.author ? 'bf-author-err' : undefined} />
  </Field>
  <Field label="Pages" id="bf-pages" error={errors.pages}>
    <input id="bf-pages" bind:value={pages} inputmode="numeric" autocomplete="off" aria-invalid={!!errors.pages} aria-describedby={errors.pages ? 'bf-pages-err' : undefined} />
  </Field>
  <fieldset class="checks">
    <legend>Assigned readers</legend>
    {#if app.members.length === 0}
      <p class="hint">Add members first, then assign them here.</p>
    {/if}
    {#each app.members as m (m.id)}
      <label class="check">
        <input type="checkbox" checked={assigned.includes(m.id)} onchange={() => toggle(m.id)} />
        <span>{m.name}</span>
      </label>
    {/each}
    {#if dropped}
      <p class="hint warn">Unassigning readers removes {dropped} of their reading {dropped === 1 ? 'log' : 'logs'} for this book.</p>
    {/if}
  </fieldset>
  <div class="actions">
    <button class="btn primary" type="submit" data-testid="book-save">{book ? 'Save changes' : 'Add book'}</button>
    {#if oncancel}<button class="btn ghost" type="button" onclick={oncancel}>Cancel</button>{/if}
  </div>
</form>
