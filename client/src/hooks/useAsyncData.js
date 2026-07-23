import { useEffect, useState } from 'react'

export const useAsyncData = (fetcher, deps) => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        fetcher()
            .then((result) => { if (!cancelled) { setData(result); setError(null) } })
            .catch((err) => { if (!cancelled) setError(err.message) })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, deps)

    return { data, loading, error }
}
