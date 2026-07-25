import { useCallback } from 'react'
import { createAttribute, deleteAttribute, listAttributeCategories, updateAttribute } from '../../api/attributes.js'
import { ConflictError } from '../../api/http.js'
import { pushRecentAttributeId } from '../../lib/recentAttributes.js'
import { useAsyncData } from '../useAsyncData.js'
import { useListPageState } from '../useListPageState.js'

const useToggleAttribute = (toggle) => useCallback((attribute) => {
    toggle(attribute)
    pushRecentAttributeId(attribute.id)
}, [toggle])

const useCreateAttribute = ({ close, refresh, setError }) => useCallback(async (payload) => {
    try {
        await createAttribute(payload)
        close()
        refresh()
    } catch (error) {
        setError(error)
    }
}, [close, refresh, setError])

const useEditAttribute = ({ selected, setItems, clear, close, refresh, setBanner, setError }) => useCallback(async (payload) => {
    try {
        const updated = await updateAttribute(selected.id, { ...payload, version: selected.version })
        setItems([updated])
        close()
        refresh()
    } catch (error) {
        if (!(error instanceof ConflictError)) return setError(error)
        setBanner(error)
        clear()
        close()
        refresh()
    }
}, [clear, close, refresh, selected, setBanner, setError, setItems])

const useDeleteAttributes = ({ items, clear, close, refresh, setBanner }) => useCallback(async () => {
    try {
        await Promise.all(items.map(({ id, version }) => deleteAttribute(id, version)))
        setBanner(null)
    } catch (error) {
        setBanner(error)
    }
    clear()
    close()
    refresh()
}, [clear, close, items, refresh, setBanner])

export const useAttributesPage = () => {
    const state = useListPageState()
    const { data } = useAsyncData(listAttributeCategories)
    const dialog = state.dialog
    const selection = state.selection
    const create = useCreateAttribute({ close: dialog.close, refresh: state.refresh, setError: dialog.setError })
    const edit = useEditAttribute({ selected: selection.single, setItems: selection.setItems, clear: selection.clear, close: dialog.close, refresh: state.refresh, setBanner: state.setBanner, setError: dialog.setError })
    const remove = useDeleteAttributes({ items: selection.items, clear: selection.clear, close: dialog.close, refresh: state.refresh, setBanner: state.setBanner })
    const toggleAttribute = useToggleAttribute(selection.toggle)
    return {
        ...state,
        categories: data ?? [],
        create,
        edit,
        hasSystem: selection.items.some(({ systemKey }) => systemKey),
        remove,
        toggleAttribute,
    }
}
