/**
 * Tiny pub/sub for global keyboard shortcuts.
 * AppShell translates keys → named events; pages subscribe with useShortcut('settle', fn).
 */
import { useEffect, useRef } from 'react'

export type ShortcutName = 'search' | 'newBill' | 'save' | 'help' | 'focusSearch' | 'settle' | 'print' | 'kot' | 'enter'

const listeners = new Map<ShortcutName, Set<() => void>>()

export function emitShortcut(name: ShortcutName): boolean {
  const set = listeners.get(name)
  if (!set || set.size === 0) return false
  // only the most recently registered handler fires (topmost screen wins)
  const last = Array.from(set).pop()
  last?.()
  return true
}

export function useShortcut(name: ShortcutName, handler: () => void, enabled = true) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    if (!enabled) return
    const fn = () => ref.current()
    if (!listeners.has(name)) listeners.set(name, new Set())
    listeners.get(name)!.add(fn)
    return () => {
      listeners.get(name)!.delete(fn)
    }
  }, [name, enabled])
}

export const isTypingTarget = (el: EventTarget | null) => {
  const t = el as HTMLElement | null
  if (!t) return false
  return t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable
}

/** Stack so Esc closes only the topmost modal/drawer */
const escStack: (() => void)[] = []
export function pushEsc(fn: () => void) {
  escStack.push(fn)
  return () => {
    const i = escStack.lastIndexOf(fn)
    if (i >= 0) escStack.splice(i, 1)
  }
}
export function popEsc(): boolean {
  const fn = escStack[escStack.length - 1]
  if (fn) {
    fn()
    return true
  }
  return false
}
export const hasOpenOverlay = () => escStack.length > 0
