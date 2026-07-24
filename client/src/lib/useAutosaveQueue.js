import { useCallback, useEffect, useMemo, useRef } from 'react'

export const useAutosaveQueue = (delay = 7000) => {
    const pendingRef = useRef(new Map())
    const timerRef = useRef(null)
    const flushAll = useCallback(async () => {
        const tasks = [...pendingRef.current.values()]
        pendingRef.current.clear()
        await Promise.allSettled(tasks.map((task) => task()))
    }, [])
    const clearTimer = useCallback(() => {
        clearTimeout(timerRef.current)
        timerRef.current = null
    }, [])
    const schedule = useCallback((key, task) => {
        pendingRef.current.set(key, task)
        clearTimer()
        timerRef.current = setTimeout(flushAll, delay)
    }, [clearTimer, delay, flushAll])
    const flushNow = useCallback(() => {
        clearTimer()
        return flushAll()
    }, [clearTimer, flushAll])
    useEffect(() => () => {
        clearTimer()
        void flushAll()
    }, [clearTimer, flushAll])
    return useMemo(() => ({ schedule, flushNow }), [flushNow, schedule])
}
