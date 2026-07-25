import { useCallback, useState } from 'react'

export const useDialogState = () => {
    const [name, setName] = useState(null)
    const [error, setError] = useState(null)
    const open = useCallback((nextName) => {
        setError(null)
        setName(nextName)
    }, [])
    const close = useCallback(() => {
        setName(null)
        setError(null)
    }, [])
    return { name, error, open, close, setError }
}
