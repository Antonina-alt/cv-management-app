import { useCallback, useState } from 'react'

const resolveValue = (value) => value?.target ? value.target.value : value

export const useFormState = (initialState) => {
    const [form, setForm] = useState(initialState)
    const setField = useCallback((field, value) => {
        setForm((current) => ({ ...current, [field]: resolveValue(value) }))
    }, [])
    const bindField = useCallback((field) => ({
        value: form[field],
        onChange: (event) => setField(field, event),
    }), [form, setField])
    return { form, setForm, setField, bindField }
}
