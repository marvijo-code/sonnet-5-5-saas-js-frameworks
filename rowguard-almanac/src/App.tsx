import { createMemo, createSignal, For, Match, onCleanup, Show, Switch } from 'solid-js'
import type { JSX } from 'solid-js'
import { computeDue, computeRisk, fmtDate, tierOf, todayISO } from './model.ts'
import type { Block, Due, Inspection, Sighting } from './model.ts'
import { Gauge, Logo, Seal } from './components.tsx'
import { BlockForm, InspectionForm, SightingForm } from './forms.tsx'
import { deleteBlock, deleteInspection, deleteSighting, dismissToast, resetData, state, toast, undoToast } from './store.ts'

/* ---------- routing ---------- */
const [hash, setHash] = createSignal(location.hash)
window.addEventListener('hashchange', () => {
  setHash(location.hash)
  window.scrollTo(0, 0)
})
const route = createMemo(() => {
  const [path, q = ''] = hash().replace(/^#\/?/, '').split('?')
  return { segs: path.split('/').filter(Boolean), query: new URLSearchParams(q) }
})
if (!location.hash || location.hash === '#' || location.hash === '#/') location.replace('#/blocks')

/* ---------- helpers ---------- */
const today = () => todayISO()
const blockName = (id: string) => state().blocks.find((b) => b.id === id)?.name ?? 'Unknown block'
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
const dues = createMemo(() => state().blocks.map((b) => computeDue(b, state(), today())))
const overdueCount = () => dues().filter((d) => d.overdue).length
const highRiskCount = () => dues().filter((d) => d.score >= 60).length

function dueText(d: Due): string {
  if (!d.last) return 'Never inspected · due today'
  if (d.daysLeft < 0) return `Overdue by ${plural(-d.daysLeft, 'day')}`
  if (d.daysLeft === 0) return 'Due today'
  return `Due in ${plural(d.daysLeft, 'day')}`
}
function focusForm(testid: string) {
  queueMicrotask(() => {
    const el = document.querySelector(`[data-testid="${testid}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    ;(el?.querySelector('input, select, textarea') as HTMLElement | null)?.focus({ preventScroll: true })
  })
}

function PageHead(props: { kicker: string; title: string; children?: JSX.Element }) {
  return (
    <div class="page-head">
      <p class="kicker">{props.kicker}</p>
      <h1>{props.title}</h1>
      {props.children}
    </div>
  )
}

/* ---------- Blocks list ---------- */
function BlocksPage() {
  const [editing, setEditing] = createSignal<Block | null>(null)
  const [token, setToken] = createSignal(0)
  const sorted = createMemo(() =>
    [...dues()].sort((a, b) => b.score - a.score || a.block.name.localeCompare(b.block.name)),
  )
  const edit = (b: Block | null) => {
    setEditing(b)
    setToken((t) => t + 1)
    focusForm('block-form')
  }
  return (
    <>
      <PageHead kicker="The plots under watch" title="Blocks">
        <p class="lede">Every block ranked by spread risk, highest first. Risk climbs with confirmed sightings in the last 30 days, adult insects, nearby host trees and grapevines.</p>
      </PageHead>
      <div class="split">
        <section aria-label="Block list">
          <ul class="rows" data-testid="block-list">
            <For each={sorted()} fallback={<li class="empty">No blocks yet. Add your first block using the form.</li>}>
              {(d) => (
                <li class={`row tier-${tierOf(d.score)}`} data-testid="block-row">
                  <Seal score={d.score} />
                  <div class="row-main">
                    <h2 class="row-title"><a href={`#/blocks/${d.block.id}`}>{d.block.name}</a></h2>
                    <p class="meta">
                      <span class="cap">{d.block.crop}</span><i>·</i>{d.block.area} ha<i>·</i>host trees: {d.block.hostTrees ? 'yes' : 'no'}
                    </p>
                    <p class="meta" classList={{ warn: d.overdue }}>Next inspection · {fmtDate(d.due)} · {dueText(d)}</p>
                  </div>
                  <div class="row-actions">
                    <a class="btn small" href={`#/blocks/${d.block.id}`} aria-label={`Open ${d.block.name}`}>Open</a>
                    <button type="button" class="btn small" onClick={() => edit(d.block)} aria-label={`Edit ${d.block.name}`}>Edit</button>
                    <button type="button" class="btn small danger" data-testid="block-delete" onClick={() => deleteBlock(d.block.id)} aria-label={`Delete ${d.block.name}`}>Delete</button>
                  </div>
                </li>
              )}
            </For>
          </ul>
        </section>
        <aside>
          <BlockForm editing={editing()} token={token()} onDone={() => edit(null)} />
        </aside>
      </div>
    </>
  )
}

/* ---------- Block detail ---------- */
function BlockDetail(props: { id: string }) {
  const block = createMemo(() => state().blocks.find((b) => b.id === props.id))
  return (
    <Show when={block()} fallback={<NotFound what="block" back="#/blocks" />}>
      {(b) => <BlockDetailBody block={b()} />}
    </Show>
  )
}

function BlockDetailBody(props: { block: Block }) {
  const risk = createMemo(() => computeRisk(props.block, state().sightings, today()))
  const due = createMemo(() => computeDue(props.block, state(), today()))
  const sightings = createMemo(() => state().sightings.filter((s) => s.blockId === props.block.id).sort((a, b) => b.date.localeCompare(a.date)))
  const inspections = createMemo(() => state().inspections.filter((i) => i.blockId === props.block.id).sort((a, b) => b.doneDate.localeCompare(a.doneDate)))
  const parts = createMemo(() => {
    const r = risk()
    return [
      { label: 'Confirmed sightings, last 30 days', detail: `${r.confirmedCount} × 10`, pts: r.confirmedPts, id: 'confirmed' },
      { label: 'Confirmed adult, last 30 days', detail: r.hasAdult ? 'yes' : 'none', pts: r.adultPts, id: 'adult' },
      { label: 'Host trees nearby', detail: props.block.hostTrees ? 'yes' : 'no', pts: r.hostPts, id: 'hosts' },
      { label: 'Grape crop', detail: props.block.crop === 'grape' ? 'yes' : `${props.block.crop}`, pts: r.grapePts, id: 'grape' },
    ]
  })
  return (
    <>
      <a class="back" href="#/blocks">← All blocks</a>
      <PageHead kicker={`${props.block.crop} · ${props.block.area} ha · host trees ${props.block.hostTrees ? 'nearby' : 'not nearby'}`} title={props.block.name} />
      <div class="detail-grid">
        <section class={`panel score-panel tier-${tierOf(risk().score)}`} aria-labelledby="score-h">
          <h2 id="score-h">Spread risk</h2>
          <div class="score-top">
            <Seal score={risk().score} big />
            <div class="score-gauge"><Gauge score={risk().score} /></div>
          </div>
          <dl class="breakdown" data-testid="risk-breakdown">
            <For each={parts()}>
              {(p) => (
                <div class="brow" classList={{ zero: p.pts === 0 }} data-testid={`risk-part-${p.id}`}>
                  <dt>{p.label}<small>{p.detail}</small></dt>
                  <dd>+{p.pts}</dd>
                </div>
              )}
            </For>
            <div class="brow total">
              <dt>Total{risk().raw > 100 ? <small>capped at 100 (raw {risk().raw})</small> : null}</dt>
              <dd>{risk().score}</dd>
            </div>
          </dl>
        </section>
        <section class="panel due-panel" aria-labelledby="due-h">
          <h2 id="due-h">Next inspection</h2>
          <p class="due-date" classList={{ warn: due().overdue }}>{fmtDate(due().due)}</p>
          <p class="meta" classList={{ warn: due().overdue }}>{dueText(due())}</p>
          <p class="meta">Every {plural(due().interval, 'day')} at this risk level.</p>
          <Show when={due().last} fallback={<p class="meta">No inspection recorded yet.</p>}>
            {(l) => <p class="meta">Last done {fmtDate(l().doneDate)} by {l().inspector} — {l().finding}.</p>}
          </Show>
          <div class="actions">
            <a class="btn small" href={`#/inspections?block=${props.block.id}`}>Log inspection</a>
            <a class="btn small" href={`#/sightings?block=${props.block.id}`}>Log sighting</a>
          </div>
        </section>
      </div>
      <div class="split">
        <div class="stack">
          <section aria-labelledby="bs-h">
            <h2 id="bs-h" class="section-h">Sightings on this block</h2>
            <ul class="rows compact" data-testid="block-sightings">
              <For each={sightings()} fallback={<li class="empty">No sightings recorded.</li>}>
                {(s) => (
                  <li class="row simple">
                    <div class="row-main">
                      <p class="meta strong">{fmtDate(s.date)} · <span class="cap">{s.stage}</span> × {s.count} · {s.confirmed ? 'confirmed' : 'unconfirmed'}</p>
                      <Show when={s.notes}><p class="meta">{s.notes}</p></Show>
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </section>
          <section aria-labelledby="bi-h">
            <h2 id="bi-h" class="section-h">Inspections on this block</h2>
            <ul class="rows compact" data-testid="block-inspections">
              <For each={inspections()} fallback={<li class="empty">No inspections recorded.</li>}>
                {(i) => (
                  <li class="row simple">
                    <div class="row-main">
                      <p class="meta strong">{fmtDate(i.doneDate)} · {i.inspector} · <span classList={{ warn: i.finding === 'pest found' }}>{i.finding}</span></p>
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </section>
        </div>
        <aside>
          <BlockForm editing={props.block} token={0} onDone={() => {}} />
          <button type="button" class="btn danger wide" data-testid="block-delete" onClick={() => { deleteBlock(props.block.id); location.hash = '#/blocks' }}>
            Delete this block
          </button>
        </aside>
      </div>
    </>
  )
}

function NotFound(props: { what: string; back: string }) {
  return (
    <div class="panel notfound">
      <h1>That {props.what} isn’t in the almanac</h1>
      <p>It may have been deleted.</p>
      <a class="btn" href={props.back}>Back to the list</a>
    </div>
  )
}

/* ---------- Sightings ---------- */
function SightingsPage() {
  const [filter, setFilter] = createSignal(route().query.get('block') ?? '')
  const [editing, setEditing] = createSignal<Sighting | null>(null)
  const [token, setToken] = createSignal(0)
  const list = createMemo(() =>
    state().sightings
      .filter((s) => !filter() || s.blockId === filter())
      .sort((a, b) => b.date.localeCompare(a.date)),
  )
  const edit = (s: Sighting | null) => {
    setEditing(s)
    setToken((t) => t + 1)
    focusForm('sighting-form')
  }
  return (
    <>
      <PageHead kicker="Field observations" title="Sighting log">
        <p class="lede">Every lanternfly seen, newest first. Only confirmed sightings from the last 30 days raise a block’s risk.</p>
      </PageHead>
      <div class="split">
        <section aria-label="Sighting list">
          <div class="filter">
            <label for="sighting-filter">Show block</label>
            <select id="sighting-filter" onChange={(e) => setFilter(e.currentTarget.value)}>
              <option value="" selected={!filter()}>All blocks</option>
              <For each={state().blocks}>{(b) => <option value={b.id} selected={filter() === b.id}>{b.name}</option>}</For>
            </select>
            <span class="count" aria-live="polite">{plural(list().length, 'sighting')}</span>
          </div>
          <ul class="rows" data-testid="sighting-list">
            <For each={list()} fallback={<li class="empty">No sightings match. Log one using the form.</li>}>
              {(s) => (
                <li class={`row simple stage-${s.stage.replace(' ', '-')}`} data-testid="sighting-row">
                  <div class="date-chip"><b>{fmtDate(s.date).split(' ')[0]}</b><span>{fmtDate(s.date).split(' ').slice(1).join(' ')}</span></div>
                  <div class="row-main">
                    <h2 class="row-title"><a href={`#/blocks/${s.blockId}`}>{blockName(s.blockId)}</a></h2>
                    <p class="meta strong">
                      <span class="cap">{s.stage}</span> × {s.count}<i>·</i>
                      <span class={s.confirmed ? 'badge ok' : 'badge'}>{s.confirmed ? 'Confirmed' : 'Unconfirmed'}</span>
                    </p>
                    <Show when={s.notes}><p class="meta">{s.notes}</p></Show>
                  </div>
                  <div class="row-actions">
                    <button type="button" class="btn small" onClick={() => edit(s)} aria-label={`Edit sighting on ${blockName(s.blockId)}, ${fmtDate(s.date)}`}>Edit</button>
                    <button type="button" class="btn small danger" data-testid="sighting-delete" onClick={() => deleteSighting(s.id)} aria-label={`Delete sighting on ${blockName(s.blockId)}, ${fmtDate(s.date)}`}>Delete</button>
                  </div>
                </li>
              )}
            </For>
          </ul>
        </section>
        <aside>
          <SightingForm editing={editing()} preset={filter()} token={token()} onDone={() => edit(null)} />
        </aside>
      </div>
    </>
  )
}

/* ---------- Inspections ---------- */
function InspectionsPage() {
  const [editing, setEditing] = createSignal<Inspection | null>(null)
  const [preset, setPreset] = createSignal(route().query.get('block') ?? '')
  const [token, setToken] = createSignal(0)
  const schedule = createMemo(() =>
    [...dues()].sort((a, b) => a.due.localeCompare(b.due) || b.score - a.score || a.block.name.localeCompare(b.block.name)),
  )
  const log = createMemo(() => [...state().inspections].sort((a, b) => b.doneDate.localeCompare(a.doneDate)))
  const open = (i: Inspection | null, blockId = '') => {
    setEditing(i)
    setPreset(blockId)
    setToken((t) => t + 1)
    focusForm('inspection-form')
  }
  return (
    <>
      <PageHead kicker="The rounds" title="Inspection schedule">
        <p class="lede">Every block by due date, overdue first. The interval tightens with risk: 3 days at 60 or more, 7 days from 30 to 59, otherwise 14.</p>
      </PageHead>
      <div class="split">
        <div class="stack">
          <section aria-label="Due dates">
            <ul class="rows" data-testid="inspection-list">
              <For each={schedule()} fallback={<li class="empty">No blocks to inspect yet.</li>}>
                {(d) => (
                  <li class={`row due tier-${tierOf(d.score)}`} classList={{ overdue: d.overdue }} data-testid="inspection-row">
                    <div class="date-chip due-chip" classList={{ late: d.overdue }}>
                      <b>{fmtDate(d.due).split(' ')[0]}</b><span>{fmtDate(d.due).split(' ').slice(1, 2)}</span>
                    </div>
                    <div class="row-main">
                      <h2 class="row-title"><a href={`#/blocks/${d.block.id}`}>{d.block.name}</a></h2>
                      <p class="meta strong" classList={{ warn: d.overdue }}>{dueText(d)}</p>
                      <p class="meta">Risk {d.score} · every {plural(d.interval, 'day')}</p>
                      <p class="meta">
                        <Show when={d.last} fallback="No inspection on record.">
                          Last: {fmtDate(d.last!.doneDate)} by {d.last!.inspector} — {d.last!.finding}
                        </Show>
                      </p>
                    </div>
                    <div class="row-actions">
                      <button type="button" class="btn small" onClick={() => open(null, d.block.id)} aria-label={`Log inspection for ${d.block.name}`}>Log inspection</button>
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </section>
          <section aria-labelledby="log-h">
            <h2 id="log-h" class="section-h">Inspection log</h2>
            <ul class="rows compact" data-testid="inspection-log">
              <For each={log()} fallback={<li class="empty">Nothing logged yet.</li>}>
                {(i) => (
                  <li class="row simple" data-testid="inspection-log-row">
                    <div class="row-main">
                      <p class="meta strong">{blockName(i.blockId)}</p>
                      <p class="meta">{fmtDate(i.doneDate)} · {i.inspector} · <span classList={{ warn: i.finding === 'pest found' }}>{i.finding}</span></p>
                    </div>
                    <div class="row-actions">
                      <button type="button" class="btn small" onClick={() => open(i)} aria-label={`Edit inspection of ${blockName(i.blockId)}, ${fmtDate(i.doneDate)}`}>Edit</button>
                      <button type="button" class="btn small danger" data-testid="inspection-delete" onClick={() => deleteInspection(i.id)} aria-label={`Delete inspection of ${blockName(i.blockId)}, ${fmtDate(i.doneDate)}`}>Delete</button>
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </section>
        </div>
        <aside>
          <InspectionForm editing={editing()} preset={preset()} token={token()} onDone={() => open(null)} />
        </aside>
      </div>
    </>
  )
}

/* ---------- shell ---------- */
export default function App() {
  const section = () => route().segs[0] ?? 'blocks'
  const link = (to: string, label: string, n: string) => (
    <a href={`#/${to}`} aria-current={section() === to ? 'page' : undefined}>
      <span class="num" aria-hidden="true">{n}</span>{label}
    </a>
  )
  onCleanup(() => {})
  return (
    <>
      <a class="skip" href="#main">Skip to content</a>
      <header class="mast">
        <div class="wrap mast-in">
          <a class="brand" href="#/blocks" aria-label="Rowguard Almanac, home">
            <Logo />
            <span class="brand-text">
              <b>Rowguard Almanac</b>
              <small>Spotted lanternfly watch · EU edition 2026</small>
            </span>
          </a>
          <div class="summary" role="group" aria-label="Summary">
            <p class="stat" classList={{ hot: highRiskCount() > 0 }} data-testid="high-risk-summary" title="Blocks with spread risk of 60 or more">
              <b>{highRiskCount()}</b> high-risk {highRiskCount() === 1 ? 'block' : 'blocks'}
            </p>
            <p class="stat" classList={{ hot: overdueCount() > 0 }} data-testid="overdue-summary">
              <b>{overdueCount()}</b> overdue {overdueCount() === 1 ? 'inspection' : 'inspections'}
            </p>
          </div>
        </div>
        <nav class="wrap tabs" aria-label="Sections">
          {link('blocks', 'Blocks', 'I')}
          {link('sightings', 'Sightings', 'II')}
          {link('inspections', 'Inspections', 'III')}
        </nav>
      </header>
      <main id="main" class="wrap" tabindex="-1">
        <Switch fallback={<NotFound what="page" back="#/blocks" />}>
          <Match when={section() === 'blocks' && route().segs.length === 1}><BlocksPage /></Match>
          <Match when={section() === 'blocks' && route().segs.length === 2}><BlockDetail id={route().segs[1]} /></Match>
          <Match when={section() === 'sightings'}><SightingsPage /></Match>
          <Match when={section() === 'inspections'}><InspectionsPage /></Match>
        </Switch>
      </main>
      <footer class="foot wrap">
        <p>First found in the EU in Hungary, September 2026. Everything here is kept in this browser only.</p>
        <button type="button" class="btn small" data-testid="reset-data" onClick={resetData}>Reset data</button>
      </footer>
      <Show when={toast()}>
        {(t) => (
          <div class="toast" role="status">
            <span>{t().msg}</span>
            <Show when={t().undo}><button type="button" onClick={undoToast}>Undo</button></Show>
            <button type="button" onClick={dismissToast} aria-label="Dismiss message">✕</button>
          </div>
        )}
      </Show>
    </>
  )
}
