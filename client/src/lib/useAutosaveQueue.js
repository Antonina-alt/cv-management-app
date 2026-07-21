import { useEffect, useRef } from 'react'

// Batches edits from multiple fields/entities behind a single debounce timer so autosave
// flushes every `delay` ms of inactivity instead of on every keystroke. Scheduling under the
// same key twice replaces the pending flush (only the latest value is ever sent).
export const useAutosaveQueue = (delay = 7000) => {
    const pending = useRef(new Map())
    const timer = useRef(null)

    const flushAll = async () => {
        const fns = [...pending.current.values()]
        pending.current.clear()
        await Promise.all(fns.map((fn) => fn()))
    }

    const schedule = (key, flushFn) => {
        pending.current.set(key, flushFn)
        clearTimeout(timer.current)
        timer.current = setTimeout(flushAll, delay)
    }

    const flushNow = () => {
        clearTimeout(timer.current)
        return flushAll()
    }

    useEffect(() => () => clearTimeout(timer.current), [])

    return { schedule, flushNow }
}
