import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { assignRole, deleteUser, removeRole, setUserBlocked } from '../../api/admin.js'
import { useAuth } from '../../context/auth-context.js'
import { useListPageState } from '../useListPageState.js'

const blockTargets = (items, userId, isBlocked) => items.filter((item) => isBlocked
    ? !item.isBlocked && item.id !== userId
    : item.isBlocked)

const useFinishListAction = (clear, refresh) => useCallback(() => {
    clear()
    refresh()
}, [clear, refresh])

const useSetBlocked = ({ items, userId, finish, setBanner }) => useCallback(async (isBlocked) => {
    try {
        const targets = blockTargets(items, userId, isBlocked)
        await Promise.all(targets.map((item) => setUserBlocked(item.id, isBlocked, item.version)))
        setBanner(null)
    } catch (error) {
        setBanner(error)
    }
    finish()
}, [finish, items, setBanner, userId])

const useDeleteSelected = ({ items, userId, close, finish, setBanner }) => useCallback(async () => {
    try {
        const targets = items.filter(({ id }) => id !== userId)
        await Promise.all(targets.map(({ id, version }) => deleteUser(id, version)))
        setBanner(null)
    } catch (error) {
        setBanner(error)
    }
    close()
    finish()
}, [close, finish, items, setBanner, userId])

const updateUserRoles = (id, toAdd, toRemove) => Promise.all([
    ...toAdd.map((role) => assignRole(id, role)),
    ...toRemove.map((role) => removeRole(id, role)),
])

const useUpdateRoles = ({ selected, userId, clear, close, refresh, refreshUser, navigate, setError }) => useCallback(async ({ toAdd, toRemove }) => {
    try {
        await updateUserRoles(selected.id, toAdd, toRemove)
        const lostAdminAccess = selected.id === userId && toRemove.includes('ADMIN')
        close()
        clear()
        if (!lostAdminAccess) return refresh()
        await refreshUser()
        navigate('/')
    } catch (error) {
        setError(error)
    }
}, [clear, close, navigate, refresh, refreshUser, selected, setError, userId])

export const useAdminPage = () => {
    const { user, refresh: refreshUser } = useAuth()
    const navigate = useNavigate()
    const state = useListPageState()
    const finish = useFinishListAction(state.selection.clear, state.refresh)
    const common = { items: state.selection.items, userId: user.id, finish, setBanner: state.setBanner }
    const setBlocked = useSetBlocked(common)
    const deleteSelected = useDeleteSelected({ ...common, close: state.dialog.close })
    const updateRoles = useUpdateRoles({ selected: state.selection.single, userId: user.id, clear: state.selection.clear, close: state.dialog.close, refresh: state.refresh, refreshUser, navigate, setError: state.dialog.setError })
    return {
        ...state,
        deleteSelected,
        includesSelf: state.selection.items.some(({ id }) => id === user.id),
        setBlocked,
        updateRoles,
        viewProfile: () => navigate(`/profile/${state.selection.single.id}`),
    }
}
