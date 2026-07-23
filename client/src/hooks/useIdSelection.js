import { useState } from 'react'

export const useIdSelection = () => {
    const [ids, setIds] = useState([])
    const toggle = (id) => setIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
    const toggleAll = (rows, selectAll) => setIds((prev) => {
        if (selectAll) {
            const existing = new Set(prev)
            return [...prev, ...rows.map((r) => r.id).filter((id) => !existing.has(id))]
        }
        const removed = new Set(rows.map((r) => r.id))
        return prev.filter((id) => !removed.has(id))
    })
    return { ids, toggle, toggleAll, setIds }
}
