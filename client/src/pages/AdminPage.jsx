import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { assignRole, deleteUser, removeRole, setUserBlocked } from '../api/admin.js'
import { ConflictError } from '../api/http.js'
import RoleModal from '../components/admin/RoleModal.jsx'
import UserList from '../components/admin/UserList.jsx'
import ConfirmationModal from '../components/common/ConfirmationModal.jsx'
import DismissibleAlert from '../components/common/DismissibleAlert.jsx'
import Toolbar from '../components/common/Toolbar.jsx'
import { useAuth } from '../context/auth-context.js'
import { useSelection } from '../hooks/useSelection.js'
import { formatName } from '../lib/formatName.js'

const AdminPage = () => {
    const { t } = useTranslation()
    const { user, refresh } = useAuth()
    const navigate = useNavigate()
    const selection = useSelection()
    const [refreshToken, setRefreshToken] = useState(0)
    const [modal, setModal] = useState(null)
    const [formError, setFormError] = useState(null)
    const [banner, setBanner] = useState(null)
    const refreshList = () => setRefreshToken((value) => value + 1)
    const closeModal = () => {
        setModal(null)
        setFormError(null)
    }
    const setBlocked = async (isBlocked) => {
        const targets = isBlocked
            ? selection.items.filter((item) => !item.isBlocked && item.id !== user.id)
            : selection.items.filter((item) => item.isBlocked)
        try {
            await Promise.all(targets.map((item) => setUserBlocked(item.id, isBlocked, item.version)))
            setBanner(null)
        } catch (error) {
            setBanner(error instanceof ConflictError ? t('admin.conflict') : error.message)
        }
        selection.clear()
        refreshList()
    }
    const handleDelete = async () => {
        try {
            await Promise.all(selection.items.filter(({ id }) => id !== user.id).map(({ id, version }) => deleteUser(id, version)))
            setBanner(null)
        } catch (error) {
            setBanner(error instanceof ConflictError ? t('admin.conflict') : error.message)
        }
        selection.clear()
        closeModal()
        refreshList()
    }
    const handleRoles = async ({ toAdd, toRemove }) => {
        try {
            await Promise.all([...toAdd.map((role) => assignRole(selection.single.id, role)), ...toRemove.map((role) => removeRole(selection.single.id, role))])
            const removedOwnAdmin = selection.single.id === user.id && toRemove.includes('ADMIN')
            closeModal()
            selection.clear()
            if (removedOwnAdmin) {
                await refresh()
                navigate('/')
            } else refreshList()
        } catch (error) {
            setFormError(error.message)
        }
    }
    const includesSelf = selection.items.some(({ id }) => id === user.id)
    const actions = [
        { key: 'profile', label: t('admin.toolbar.viewProfile'), variant: 'outline-primary', disabled: !selection.single, onClick: () => navigate(`/profile/${selection.single.id}`) },
        { key: 'block', label: t('admin.toolbar.block'), variant: 'outline-secondary', disabled: !selection.items.length || includesSelf || selection.items.every(({ isBlocked }) => isBlocked), onClick: () => setBlocked(true) },
        { key: 'unblock', label: t('admin.toolbar.unblock'), variant: 'outline-secondary', disabled: !selection.items.length || selection.items.every(({ isBlocked }) => !isBlocked), onClick: () => setBlocked(false) },
        { key: 'roles', label: t('admin.toolbar.manageRoles'), variant: 'outline-primary', disabled: !selection.single, onClick: () => setModal('roles') },
        { key: 'delete', label: t('admin.toolbar.delete'), variant: 'outline-danger', disabled: !selection.items.length || includesSelf, onClick: () => setModal('delete') },
    ]
    return (
        <div>
            <h1>{t('admin.title')}</h1>
            <DismissibleAlert onClose={() => setBanner(null)}>{banner}</DismissibleAlert>
            <Toolbar actions={actions} />
            <UserList selectedIds={selection.ids} onToggleRow={selection.toggle} onToggleAll={selection.toggleAll} refreshToken={refreshToken} />
            {modal === 'roles' && <RoleModal show user={selection.single} onClose={closeModal} onSubmit={handleRoles} error={formError} />}
            <ConfirmationModal show={modal === 'delete'} onCancel={closeModal} onConfirm={handleDelete} title={t('admin.deleteConfirm.title')} body={t('admin.deleteConfirm.body', { names: selection.items.map(formatName).join(', ') })} cancelLabel={t('admin.roleModal.cancel')} confirmLabel={t('admin.toolbar.delete')} />
        </div>
    )
}

export default AdminPage
