import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPosition, deletePosition, duplicatePosition } from '../../api/positions.js'
import { useAuth } from '../../context/auth-context.js'
import { useListPageState } from '../useListPageState.js'

const MANAGER_ROLES = ['RECRUITER', 'ADMIN']

const useCreatePosition = ({ close, setError, navigate }) => useCallback(async (payload) => {
    try {
        const position = await createPosition(payload)
        close()
        navigate(`/positions/${position.id}`)
    } catch (error) {
        setError(error)
    }
}, [close, navigate, setError])

const useDuplicatePositions = ({ items, clear, refresh, setBanner }) => useCallback(async () => {
    try {
        await Promise.all(items.map(({ id }) => duplicatePosition(id)))
        setBanner(null)
    } catch (error) {
        setBanner(error)
    }
    clear()
    refresh()
}, [clear, items, refresh, setBanner])

const useDeletePositions = ({ items, clear, close, refresh, setBanner }) => useCallback(async () => {
    try {
        await Promise.all(items.map(({ id, version }) => deletePosition(id, version)))
        setBanner(null)
    } catch (error) {
        setBanner(error)
    }
    clear()
    close()
    refresh()
}, [clear, close, items, refresh, setBanner])

export const usePositionsPage = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const state = useListPageState()
    const selection = state.selection
    const dialog = state.dialog
    const create = useCreatePosition({ close: dialog.close, setError: dialog.setError, navigate })
    const duplicate = useDuplicatePositions({ items: selection.items, clear: selection.clear, refresh: state.refresh, setBanner: state.setBanner })
    const remove = useDeletePositions({ items: selection.items, clear: selection.clear, close: dialog.close, refresh: state.refresh, setBanner: state.setBanner })
    return {
        ...state,
        canManage: Boolean(user) && user.roles.some((role) => MANAGER_ROLES.includes(role)),
        create,
        duplicate,
        openSelected: () => navigate(`/positions/${selection.single.id}`),
        remove,
    }
}
