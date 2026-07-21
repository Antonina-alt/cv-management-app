import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutosaveQueue } from '../useAutosaveQueue.js'

describe('useAutosaveQueue', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('does not flush before the delay elapses', () => {
        const { result } = renderHook(() => useAutosaveQueue(1000))
        const flushFn = vi.fn()

        act(() => {
            result.current.schedule('a', flushFn)
        })
        act(() => {
            vi.advanceTimersByTime(999)
        })

        expect(flushFn).not.toHaveBeenCalled()
    })

    it('flushes once after the debounce window, sending only the latest scheduled payload per key', () => {
        const { result } = renderHook(() => useAutosaveQueue(1000))
        const first = vi.fn()
        const second = vi.fn()

        act(() => {
            result.current.schedule('a', first)
            result.current.schedule('a', second)
        })
        act(() => {
            vi.advanceTimersByTime(1000)
        })

        expect(first).not.toHaveBeenCalled()
        expect(second).toHaveBeenCalledTimes(1)
    })

    it('resets the timer on every new edit instead of flushing per keystroke', () => {
        const { result } = renderHook(() => useAutosaveQueue(1000))
        const flushFn = vi.fn()

        act(() => {
            result.current.schedule('a', flushFn)
        })
        act(() => {
            vi.advanceTimersByTime(800)
            result.current.schedule('a', flushFn)
            vi.advanceTimersByTime(800)
        })

        expect(flushFn).not.toHaveBeenCalled()

        act(() => {
            vi.advanceTimersByTime(200)
        })

        expect(flushFn).toHaveBeenCalledTimes(1)
    })

    it('batches edits across different keys into a single flush', () => {
        const { result } = renderHook(() => useAutosaveQueue(1000))
        const aboutFlush = vi.fn()
        const projectFlush = vi.fn()

        act(() => {
            result.current.schedule('about', aboutFlush)
            result.current.schedule('project:1', projectFlush)
        })
        act(() => {
            vi.advanceTimersByTime(1000)
        })

        expect(aboutFlush).toHaveBeenCalledTimes(1)
        expect(projectFlush).toHaveBeenCalledTimes(1)
    })

    it('flushNow flushes immediately and cancels the pending timer', async () => {
        const { result } = renderHook(() => useAutosaveQueue(1000))
        const flushFn = vi.fn()

        act(() => {
            result.current.schedule('a', flushFn)
        })
        await act(async () => {
            await result.current.flushNow()
        })

        expect(flushFn).toHaveBeenCalledTimes(1)

        act(() => {
            vi.advanceTimersByTime(2000)
        })
        expect(flushFn).toHaveBeenCalledTimes(1)
    })
})
