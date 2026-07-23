import { useState } from 'react'

export const useObjectSelection = () => {
    const [items, setItems] = useState([])
    const toggle = (item) => setItems((prev) => (
        prev.some((i) => i.id === item.id) ? prev.filter((i) => i.id !== item.id) : [...prev, item]
    ))
    const toggleAll = (candidates, selectAll) => setItems((prev) => {
        if (selectAll) {
            const existing = new Set(prev.map((i) => i.id))
            return [...prev, ...candidates.filter((c) => !existing.has(c.id))]
        }
        const removed = new Set(candidates.map((c) => c.id))
        return prev.filter((i) => !removed.has(i.id))
    })
    return { items, toggle, toggleAll, setItems, clear: () => setItems([]) }
}
