import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const hasModifier = (event) => event.metaKey || event.altKey || event.ctrlKey || event.shiftKey

export const useResponsiveTableLinks = (containerRef) => {
    const navigate = useNavigate()
    useEffect(() => {
        const container = containerRef.current
        if (!container) return undefined
        const openLink = (event) => {
            const link = event.target.closest('.dtr-details a[href]')
            if (!link || event.defaultPrevented || event.button !== 0 || hasModifier(event)) return
            if (link.target === '_blank' || link.origin !== window.location.origin) return
            event.preventDefault()
            navigate(`${link.pathname}${link.search}${link.hash}`)
        }
        container.addEventListener('click', openLink)
        return () => container.removeEventListener('click', openLink)
    }, [containerRef, navigate])
}
