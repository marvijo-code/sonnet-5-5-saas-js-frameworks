import { createEffect, createRoot, createSignal } from 'solid-js'
import { seedState, uid } from './model.ts'
import type { Block, Inspection, Sighting, State } from './model.ts'

export const KEY = 'rowguard-almanac-v1'

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (p && Array.isArray(p.blocks) && Array.isArray(p.sightings) && Array.isArray(p.inspections)) return p as State
    }
  } catch {
    /* fall through to seed */
  }
  return seedState()
}

export const [state, setState] = createSignal<State>(load())

createRoot(() => {
  createEffect(() => {
    const s = state()
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* storage unavailable */
    }
  })
})

export interface Toast {
  id: number
  msg: string
  undo?: State
}
export const [toast, setToast] = createSignal<Toast | null>(null)
let toastTimer: number | undefined
let toastId = 0

export function notify(msg: string, undo?: State) {
  const id = ++toastId
  setToast({ id, msg, undo })
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => setToast(null), 9000)
}
export function dismissToast() {
  clearTimeout(toastTimer)
  setToast(null)
}
export function undoToast() {
  const t = toast()
  if (t?.undo) setState(t.undo)
  dismissToast()
}

export function saveBlock(v: Omit<Block, 'id'>, id: string | null) {
  if (id) setState((s) => ({ ...s, blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...v } : b)) }))
  else setState((s) => ({ ...s, blocks: [...s.blocks, { ...v, id: uid('b-') }] }))
}
export function deleteBlock(id: string) {
  const before = state()
  const name = before.blocks.find((b) => b.id === id)?.name ?? 'Block'
  setState({
    blocks: before.blocks.filter((b) => b.id !== id),
    sightings: before.sightings.filter((s) => s.blockId !== id),
    inspections: before.inspections.filter((i) => i.blockId !== id),
  })
  notify(`Deleted ${name} with its sightings and inspections.`, before)
}
export function saveSighting(v: Omit<Sighting, 'id'>, id: string | null) {
  if (id) setState((s) => ({ ...s, sightings: s.sightings.map((x) => (x.id === id ? { ...x, ...v } : x)) }))
  else setState((s) => ({ ...s, sightings: [...s.sightings, { ...v, id: uid('s-') }] }))
}
export function deleteSighting(id: string) {
  const before = state()
  setState({ ...before, sightings: before.sightings.filter((x) => x.id !== id) })
  notify('Sighting deleted.', before)
}
export function saveInspection(v: Omit<Inspection, 'id'>, id: string | null) {
  if (id) setState((s) => ({ ...s, inspections: s.inspections.map((x) => (x.id === id ? { ...x, ...v } : x)) }))
  else setState((s) => ({ ...s, inspections: [...s.inspections, { ...v, id: uid('i-') }] }))
}
export function deleteInspection(id: string) {
  const before = state()
  setState({ ...before, inspections: before.inspections.filter((x) => x.id !== id) })
  notify('Inspection deleted.', before)
}
export function resetData() {
  const before = state()
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  setState(seedState())
  notify('Data reset to the sample almanac.', before)
}
