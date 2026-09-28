import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { STORAGE_KEY, loadState, saveState, seedState } from './lib.ts'
import type { AppState } from './lib.ts'

interface Toast {
  id: number
  message: string
  restore: AppState
}

interface Store {
  state: AppState
  /** apply a change; pass a toast message to offer undo */
  update: (fn: (s: AppState) => AppState, undoMessage?: string) => void
  reset: () => void
  toast: Toast | null
  undo: () => void
  dismissToast: () => void
  whatIf: string
  setWhatIf: (v: string) => void
  now: Date
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)
  const ref = useRef(state)
  const [toast, setToast] = useState<Toast | null>(null)
  const [whatIf, setWhatIf] = useState('')
  const now = useMemo(() => new Date(), [])

  const commit = useCallback((next: AppState) => {
    ref.current = next
    saveState(next)
    setState(next)
  }, [])

  const update = useCallback(
    (fn: (s: AppState) => AppState, undoMessage?: string) => {
      const prev = ref.current
      commit(fn(prev))
      if (undoMessage) setToast({ id: Date.now(), message: undoMessage, restore: prev })
    },
    [commit],
  )

  const reset = useCallback(() => {
    const prev = ref.current
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    commit(seedState())
    setWhatIf('')
    setToast({ id: Date.now(), message: 'Data reset to the starter fleet', restore: prev })
  }, [commit])

  const undo = useCallback(() => {
    if (toast) commit(toast.restore)
    setToast(null)
  }, [toast, commit])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 9000)
    return () => clearTimeout(t)
  }, [toast])

  const value = useMemo(
    () => ({ state, update, reset, toast, undo, dismissToast: () => setToast(null), whatIf, setWhatIf, now }),
    [state, update, reset, toast, undo, whatIf, now],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('StoreProvider missing')
  return s
}
