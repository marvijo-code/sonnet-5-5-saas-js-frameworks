import { createEffect, createMemo, createSignal, For, on, Show } from 'solid-js'
import { CROPS, FINDINGS, STAGES, dayNumber, todayISO } from './model.ts'
import type { Block, Crop, Finding, Inspection, Sighting, Stage } from './model.ts'
import { Field, describedBy } from './components.tsx'
import { notify, saveBlock, saveInspection, saveSighting, state } from './store.ts'

type Errs = Record<string, string>
const val = (e: Event) => (e.currentTarget as HTMLInputElement).value

function focusFirstInvalid(form: HTMLFormElement | undefined) {
  queueMicrotask(() => (form?.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus())
}

function validDate(date: string, today: string): string | undefined {
  if (!date) return 'Choose a date.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(dayNumber(date))) return 'Enter a valid date.'
  if (date > today) return 'The date cannot be in the future.'
}

/* ---------------- Block ---------------- */
export function BlockForm(props: { editing: Block | null; token: number; onDone: () => void }) {
  const init = () =>
    props.editing
      ? { name: props.editing.name, crop: props.editing.crop as string, area: String(props.editing.area), host: props.editing.hostTrees ? 'yes' : 'no' }
      : { name: '', crop: 'grape', area: '', host: 'no' }
  const [v, setV] = createSignal(init())
  const [submitted, setSubmitted] = createSignal(false)
  let form: HTMLFormElement | undefined
  createEffect(on(() => [props.token, props.editing?.id], () => { setV(init()); setSubmitted(false) }, { defer: true }))

  const all = createMemo<Errs>(() => {
    const e: Errs = {}
    const name = v().name.trim()
    if (!name) e.name = 'Enter a block name.'
    else if (state().blocks.some((b) => b.id !== props.editing?.id && b.name.trim().toLowerCase() === name.toLowerCase()))
      e.name = 'Another block already has this name.'
    const raw = v().area.trim()
    const area = Number(raw)
    if (!raw) e.area = 'Enter the area in hectares.'
    else if (!Number.isFinite(area) || area <= 0) e.area = 'Area must be a number greater than 0.'
    return e
  })
  const errs = () => (submitted() ? all() : ({} as Errs))
  const set = (k: 'name' | 'crop' | 'area' | 'host') => (e: Event) => setV({ ...v(), [k]: val(e) })

  const submit = (e: SubmitEvent) => {
    e.preventDefault()
    if (Object.keys(all()).length) { setSubmitted(true); focusFirstInvalid(form); return }
    saveBlock({ name: v().name.trim(), crop: v().crop as Crop, area: Number(v().area.trim()), hostTrees: v().host === 'yes' }, props.editing?.id ?? null)
    notify(props.editing ? 'Block saved.' : 'Block added.')
    setSubmitted(false)
    props.onDone()
  }

  return (
    <form class="panel form" data-testid="block-form" novalidate ref={form} onSubmit={submit} aria-label={props.editing ? 'Edit block' : 'Add block'}>
      <h2>{props.editing ? 'Edit block' : 'Add a block'}</h2>
      <Field id="block-name" label="Block name" error={errs().name}>
        <input id="block-name" name="name" type="text" autocomplete="off" value={v().name} onInput={set('name')}
          aria-invalid={errs().name ? 'true' : 'false'} aria-describedby={describedBy('block-name', errs().name)} />
      </Field>
      <div class="two">
        <Field id="block-crop" label="Crop">
          <select id="block-crop" name="crop" onChange={set('crop')}>
            <For each={CROPS}>{(c) => <option value={c} selected={v().crop === c}>{c}</option>}</For>
          </select>
        </Field>
        <Field id="block-area" label="Area (hectares)" error={errs().area}>
          <input id="block-area" name="area" type="number" step="any" inputmode="decimal" value={v().area} onInput={set('area')}
            aria-invalid={errs().area ? 'true' : 'false'} aria-describedby={describedBy('block-area', errs().area)} />
        </Field>
      </div>
      <Field id="block-host" label="Host trees nearby" hint="Tree-of-heaven (Ailanthus) or other favoured hosts within reach.">
        <select id="block-host" name="hostTrees" onChange={set('host')} aria-describedby="block-host-hint">
          <option value="yes" selected={v().host === 'yes'}>yes</option>
          <option value="no" selected={v().host === 'no'}>no</option>
        </select>
      </Field>
      <div class="actions">
        <button type="submit" class="btn primary" data-testid="block-save">{props.editing ? 'Save block' : 'Add block'}</button>
        <Show when={props.editing && props.token > 0}>
          <button type="button" class="btn" onClick={props.onDone}>Cancel edit</button>
        </Show>
      </div>
    </form>
  )
}

/* ---------------- Sighting ---------------- */
export function SightingForm(props: { editing: Sighting | null; preset: string; token: number; onDone: () => void }) {
  const init = () =>
    props.editing
      ? { blockId: props.editing.blockId, date: props.editing.date, stage: props.editing.stage as string, count: String(props.editing.count), confirmed: props.editing.confirmed ? 'yes' : 'no', notes: props.editing.notes }
      : { blockId: props.preset, date: todayISO(), stage: 'adult', count: '1', confirmed: 'no', notes: '' }
  const [v, setV] = createSignal(init())
  const [submitted, setSubmitted] = createSignal(false)
  let form: HTMLFormElement | undefined
  createEffect(on(() => [props.token, props.editing?.id, props.preset], () => { setV(init()); setSubmitted(false) }, { defer: true }))

  const all = createMemo<Errs>(() => {
    const e: Errs = {}
    if (!v().blockId || !state().blocks.some((b) => b.id === v().blockId)) e.blockId = 'Choose a block.'
    const d = validDate(v().date, todayISO())
    if (d) e.date = d
    const c = v().count.trim()
    if (!c) e.count = 'Enter how many were seen.'
    else if (!/^\d+$/.test(c)) e.count = 'Count must be a whole number.'
    else if (Number(c) < 1) e.count = 'Count must be at least 1.'
    return e
  })
  const errs = () => (submitted() ? all() : ({} as Errs))
  const set = (k: 'blockId' | 'date' | 'stage' | 'count' | 'confirmed' | 'notes') => (e: Event) => setV({ ...v(), [k]: val(e) })

  const submit = (e: SubmitEvent) => {
    e.preventDefault()
    if (Object.keys(all()).length) { setSubmitted(true); focusFirstInvalid(form); return }
    saveSighting({ blockId: v().blockId, date: v().date, stage: v().stage as Stage, count: Number(v().count.trim()), confirmed: v().confirmed === 'yes', notes: v().notes.trim() }, props.editing?.id ?? null)
    notify(props.editing ? 'Sighting saved.' : 'Sighting logged.')
    setSubmitted(false)
    props.onDone()
  }

  return (
    <form class="panel form" data-testid="sighting-form" novalidate ref={form} onSubmit={submit} aria-label={props.editing ? 'Edit sighting' : 'Log sighting'}>
      <h2>{props.editing ? 'Edit sighting' : 'Log a sighting'}</h2>
      <Field id="sighting-block" label="Block" error={errs().blockId}>
        <select id="sighting-block" name="block" onChange={set('blockId')} aria-invalid={errs().blockId ? 'true' : 'false'} aria-describedby={describedBy('sighting-block', errs().blockId)}>
          <option value="" selected={!v().blockId}>Choose a block…</option>
          <For each={state().blocks}>{(b) => <option value={b.id} selected={v().blockId === b.id}>{b.name}</option>}</For>
        </select>
      </Field>
      <div class="two">
        <Field id="sighting-date" label="Date seen" error={errs().date}>
          <input id="sighting-date" name="date" type="date" max={todayISO()} value={v().date} onInput={set('date')}
            aria-invalid={errs().date ? 'true' : 'false'} aria-describedby={describedBy('sighting-date', errs().date)} />
        </Field>
        <Field id="sighting-stage" label="Life stage">
          <select id="sighting-stage" name="stage" onChange={set('stage')}>
            <For each={STAGES}>{(s) => <option value={s} selected={v().stage === s}>{s}</option>}</For>
          </select>
        </Field>
      </div>
      <div class="two">
        <Field id="sighting-count" label="Count" error={errs().count}>
          <input id="sighting-count" name="count" type="number" step="any" inputmode="numeric" value={v().count} onInput={set('count')}
            aria-invalid={errs().count ? 'true' : 'false'} aria-describedby={describedBy('sighting-count', errs().count)} />
        </Field>
        <Field id="sighting-confirmed" label="Confirmed">
          <select id="sighting-confirmed" name="confirmed" onChange={set('confirmed')}>
            <option value="yes" selected={v().confirmed === 'yes'}>yes</option>
            <option value="no" selected={v().confirmed === 'no'}>no</option>
          </select>
        </Field>
      </div>
      <Field id="sighting-notes" label="Notes">
        <textarea id="sighting-notes" name="notes" rows="3" value={v().notes} onInput={set('notes')} />
      </Field>
      <div class="actions">
        <button type="submit" class="btn primary" data-testid="sighting-save">{props.editing ? 'Save sighting' : 'Log sighting'}</button>
        <Show when={props.editing}>
          <button type="button" class="btn" onClick={props.onDone}>Cancel edit</button>
        </Show>
      </div>
    </form>
  )
}

/* ---------------- Inspection ---------------- */
export function InspectionForm(props: { editing: Inspection | null; preset: string; token: number; onDone: () => void }) {
  const init = () =>
    props.editing
      ? { blockId: props.editing.blockId, inspector: props.editing.inspector, doneDate: props.editing.doneDate, finding: props.editing.finding as string }
      : { blockId: props.preset, inspector: '', doneDate: todayISO(), finding: 'clear' }
  const [v, setV] = createSignal(init())
  const [submitted, setSubmitted] = createSignal(false)
  let form: HTMLFormElement | undefined
  createEffect(on(() => [props.token, props.editing?.id, props.preset], () => { setV(init()); setSubmitted(false) }, { defer: true }))

  const all = createMemo<Errs>(() => {
    const e: Errs = {}
    if (!v().blockId || !state().blocks.some((b) => b.id === v().blockId)) e.blockId = 'Choose a block.'
    if (!v().inspector.trim()) e.inspector = 'Enter the inspector’s name.'
    const d = validDate(v().doneDate, todayISO())
    if (d) e.doneDate = d
    return e
  })
  const errs = () => (submitted() ? all() : ({} as Errs))
  const set = (k: 'blockId' | 'inspector' | 'doneDate' | 'finding') => (e: Event) => setV({ ...v(), [k]: val(e) })

  const submit = (e: SubmitEvent) => {
    e.preventDefault()
    if (Object.keys(all()).length) { setSubmitted(true); focusFirstInvalid(form); return }
    saveInspection({ blockId: v().blockId, inspector: v().inspector.trim(), doneDate: v().doneDate, finding: v().finding as Finding }, props.editing?.id ?? null)
    notify(props.editing ? 'Inspection saved.' : 'Inspection logged.')
    setSubmitted(false)
    props.onDone()
  }

  return (
    <form class="panel form" data-testid="inspection-form" novalidate ref={form} onSubmit={submit} aria-label={props.editing ? 'Edit inspection' : 'Log inspection'}>
      <h2>{props.editing ? 'Edit inspection' : 'Log an inspection'}</h2>
      <Field id="insp-block" label="Block" error={errs().blockId}>
        <select id="insp-block" name="block" onChange={set('blockId')} aria-invalid={errs().blockId ? 'true' : 'false'} aria-describedby={describedBy('insp-block', errs().blockId)}>
          <option value="" selected={!v().blockId}>Choose a block…</option>
          <For each={state().blocks}>{(b) => <option value={b.id} selected={v().blockId === b.id}>{b.name}</option>}</For>
        </select>
      </Field>
      <Field id="insp-inspector" label="Inspector" error={errs().inspector}>
        <input id="insp-inspector" name="inspector" type="text" autocomplete="off" value={v().inspector} onInput={set('inspector')}
          aria-invalid={errs().inspector ? 'true' : 'false'} aria-describedby={describedBy('insp-inspector', errs().inspector)} />
      </Field>
      <div class="two">
        <Field id="insp-date" label="Done on" error={errs().doneDate}>
          <input id="insp-date" name="doneDate" type="date" max={todayISO()} value={v().doneDate} onInput={set('doneDate')}
            aria-invalid={errs().doneDate ? 'true' : 'false'} aria-describedby={describedBy('insp-date', errs().doneDate)} />
        </Field>
        <Field id="insp-finding" label="Finding">
          <select id="insp-finding" name="finding" onChange={set('finding')}>
            <For each={FINDINGS}>{(f) => <option value={f} selected={v().finding === f}>{f}</option>}</For>
          </select>
        </Field>
      </div>
      <div class="actions">
        <button type="submit" class="btn primary" data-testid="inspection-save">{props.editing ? 'Save inspection' : 'Log inspection'}</button>
        <Show when={props.editing}>
          <button type="button" class="btn" onClick={props.onDone}>Cancel edit</button>
        </Show>
      </div>
    </form>
  )
}
