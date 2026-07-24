import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const hasModifier = (event) => event.metaKey || event.altKey || event.ctrlKey || event.shiftKey

export const useTableLink = () => {
    const navigate = useNavigate()

    return useCallback((to) => ({
        href: to,
        onClick: (event) => {
            if (event.button !== 0 || hasModifier(event) || event.currentTarget.target === '_blank') return
            event.preventDefault()
            navigate(to)
        },
    }), [navigate])
}
