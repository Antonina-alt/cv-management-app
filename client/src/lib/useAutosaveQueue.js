import { useEffect, useRef } from 'react'

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
