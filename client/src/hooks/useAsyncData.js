import { useEffect, useState } from 'react'

export const useAsyncData = (fetcher, deps, { debounceMs = 0 } = {}) => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelled = false
        const run = () => {
            setLoading(true)
            setError(null)
            fetcher()
                .then((result) => { if (!cancelled) setData(result) })
                .catch((err) => { if (!cancelled) setError(err.message) })
                .finally(() => { if (!cancelled) setLoading(false) })
        }
        const handle = setTimeout(run, debounceMs)
        return () => { cancelled = true; clearTimeout(handle) }
    }, deps)

    return { data, loading, error }
}
