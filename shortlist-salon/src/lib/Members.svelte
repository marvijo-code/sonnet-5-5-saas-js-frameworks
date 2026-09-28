<script lang="ts">
  import { app, deleteMember, deleteLog } from './store.svelte'
  import { paceFor, todayISO, fmtDate, spineColor } from './logic'
  import type { Log, Member } from './types'
  import MemberForm from './MemberForm.svelte'
  import LogForm from './LogForm.svelte'
  import Progress from './Progress.svelte'

  let editingMember = $state<Member | null>(null)
  let editingLog = $state<Log | null>(null)
  const today = todayISO()
  const sortedLogs = $derived([...app.logs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)))
  const nameOf = (id: string) => app.members.find((m) => m.id === id)?.name ?? 'Unknown'
  const titleOf = (id: string) => app.books.find((b) => b.id === id)?.title ?? 'Unknown'
</script>

<div class="split">
  <section aria-labelledby="members-h">
    <div class="section-head">
      <p class="eyebrow">Who’s in the room</p>
      <h2 id="members-h">Members <span class="count">{app.members.length}</span></h2>
    </div>
    {#if app.members.length === 0}<p class="empty">No members yet. Invite the first reader.</p>{/if}
    <ul class="members" data-testid="member-list">
      {#each app.members as m (m.id)}
        {@const pick = app.books.find((b) => b.id === m.predicted)}
        <li class="member">
          <div class="member-head">
            <span class="avatar" aria-hidden="true">{m.name.trim().charAt(0).toUpperCase()}</span>
            <div>
              <h3>{m.name}</h3>
              <p class="meta">{m.speed} pages/day · backs <em>{pick ? pick.title : 'no one yet'}</em></p>
            </div>
            <div class="row-actions">
              <button class="btn small" onclick={() => (editingMember = m)} aria-label="Edit {m.name}">Edit</button>
              <button class="btn small danger" onclick={() => { if (editingMember?.id === m.id) editingMember = null; deleteMember(m.id) }} aria-label="Delete {m.name}">Delete</button>
            </div>
          </div>
          <ul class="mini">
            {#each app.books.filter((b) => b.assigned.includes(m.id)) as b (b.id)}
              {@const p = paceFor(b, m, app, today)}
              <li>
                <a href="#/books/{b.id}">{b.title}</a>
                <span class="pct">{p.percent}%</span>
                <Progress percent={p.percent} color={p.behind ? 'var(--oxblood)' : spineColor(b.id)} label="{m.name} on {b.title}" />
              </li>
            {:else}
              <li class="hint">Not assigned to any book.</li>
            {/each}
          </ul>
        </li>
      {/each}
    </ul>

    <div class="section-head logs-head">
      <p class="eyebrow">Marginalia</p>
      <h2 id="logs-h">Reading logs <span class="count">{app.logs.length}</span></h2>
    </div>
    {#if app.logs.length === 0}<p class="empty">No reading logged yet.</p>{/if}
    <ul class="logs" aria-labelledby="logs-h">
      {#each sortedLogs as l (l.id)}
        <li class="log">
          <span class="log-date">{fmtDate(l.date, false)}</span>
          <span class="log-what"><strong>{nameOf(l.memberId)}</strong> reached page <strong>{l.page}</strong> of <a href="#/books/{l.bookId}">{titleOf(l.bookId)}</a></span>
          <span class="row-actions">
            <button class="btn small" onclick={() => (editingLog = l)} aria-label="Edit log: {nameOf(l.memberId)}, {titleOf(l.bookId)}, {fmtDate(l.date)}">Edit</button>
            <button class="btn small danger" onclick={() => { if (editingLog?.id === l.id) editingLog = null; deleteLog(l.id) }} aria-label="Delete log: {nameOf(l.memberId)}, {titleOf(l.bookId)}, {fmtDate(l.date)}">Delete</button>
          </span>
        </li>
      {/each}
    </ul>
  </section>
  <aside class="stack">
    {#key editingMember?.id ?? 'new'}
      <MemberForm member={editingMember} onDone={() => (editingMember = null)} oncancel={editingMember ? () => (editingMember = null) : undefined} />
    {/key}
    {#key editingLog?.id ?? 'new'}
      <LogForm log={editingLog} onDone={() => (editingLog = null)} oncancel={editingLog ? () => (editingLog = null) : undefined} />
    {/key}
  </aside>
</div>
