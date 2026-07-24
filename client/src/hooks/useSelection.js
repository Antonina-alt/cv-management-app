import { useCallback, useMemo, useState } from 'react'

const defaultGetId = (item) => item.id

export const useSelection = (getId = defaultGetId) => {
    const [items, setItems] = useState([])
    const ids = useMemo(() => items.map(getId), [getId, items])
    const single = items.length === 1 ? items[0] : null

    const toggle = useCallback((item) => {
        const id = getId(item)
        setItems((current) => current.some((selected) => getId(selected) === id)
            ? current.filter((selected) => getId(selected) !== id)
            : [...current, item])
    }, [getId])

    const toggleAll = useCallback((rows, selectAll) => {
        const rowIds = new Set(rows.map(getId))
        setItems((current) => selectAll
            ? [...current, ...rows.filter((row) => !current.some((selected) => getId(selected) === getId(row)))]
            : current.filter((selected) => !rowIds.has(getId(selected))))
    }, [getId])

    const clear = useCallback(() => setItems([]), [])
    return { items, ids, single, toggle, toggleAll, clear, setItems }
}
