import { useCallback, useState } from 'react'

export const useAuthForm = (initialForm, submit) => {
    const [form, setForm] = useState(initialForm)
    const [error, setError] = useState(null)
    const setField = useCallback((field, value) => {
        setForm((current) => ({ ...current, [field]: value }))
    }, [])
    const handleSubmit = async (event) => {
        event.preventDefault()
        setError(null)
        try {
            await submit(form)
        } catch (requestError) {
            setError(requestError)
        }
    }
    return { form, error, setField, handleSubmit }
}
