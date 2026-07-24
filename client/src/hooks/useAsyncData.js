import { useCallback, useEffect, useState } from 'react'

const toMessage = (error) => error?.message ?? String(error)

export const useAsyncData = (fetcher, { debounceMs = 0, enabled = true, refreshKey } = {}) => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(enabled)
    const [error, setError] = useState(null)
    const [reloadToken, setReloadToken] = useState(0)

    useEffect(() => {
        if (!enabled) return undefined
        let active = true
        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const result = await fetcher()
                if (active) setData(result)
            } catch (requestError) {
                if (active) setError(toMessage(requestError))
            } finally {
                if (active) setLoading(false)
            }
        }
        const timer = setTimeout(load, debounceMs)
        return () => {
            active = false
            clearTimeout(timer)
        }
    }, [debounceMs, enabled, fetcher, refreshKey, reloadToken])

    const reload = useCallback(() => setReloadToken((value) => value + 1), [])
    return { data, loading: enabled && loading, error, reload, setData }
}
