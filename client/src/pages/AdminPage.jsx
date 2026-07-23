import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/auth-context.js'
import { setUserBlocked, deleteUser, assignRole, removeRole } from '../api/admin.js'
import { ConflictError } from '../api/http.js'
import UserList from '../components/admin/UserList.jsx'
import RoleModal from '../components/admin/RoleModal.jsx'

const AdminPage = () => {
    const { t } = useTranslation()
    const { user, refresh } = useAuth()
    const navigate = useNavigate()

    const [selected, setSelected] = useState([])
    const [refreshToken, setRefreshToken] = useState(0)
    const [modal, setModal] = useState(null) // 'delete' | 'roles'
    const [formError, setFormError] = useState(null)
    const [banner, setBanner] = useState(null)

    const refreshList = () => setRefreshToken((v) => v + 1)
    const singleSelected = selected.length === 1 ? selected[0] : null
    const selectionIncludesSelf = selected.some((u) => u.id === user.id)

    const handleToggleRow = (row) => {
        setSelected((prev) => (
            prev.some((u) => u.id === row.id)
                ? prev.filter((u) => u.id !== row.id)
                : [...prev, row]
        ))
    }

    const handleToggleAll = (rows, selectAll) => {
        setSelected((prev) => {
            if (selectAll) {
                const existingIds = new Set(prev.map((u) => u.id))
                return [...prev, ...rows.filter((u) => !existingIds.has(u.id))]
            }
            const removedIds = new Set(rows.map((u) => u.id))
            return prev.filter((u) => !removedIds.has(u.id))
        })
    }

    const closeModal = () => {
        setModal(null)
        setFormError(null)
    }

    const handleViewProfile = () => {
        if (singleSelected) navigate(`/profile/${singleSelected.id}`)
    }

    const handleBlock = async () => {
        const targets = selected.filter((u) => !u.isBlocked && u.id !== user.id)
        try {
            await Promise.all(targets.map((u) => setUserBlocked(u.id, true, u.version)))
            setBanner(null)
        } catch (err) {
            setBanner(err instanceof ConflictError ? t('admin.conflict') : err.message)
        }
        setSelected([])
        refreshList()
    }

    const handleUnblock = async () => {
        const targets = selected.filter((u) => u.isBlocked)
        try {
            await Promise.all(targets.map((u) => setUserBlocked(u.id, false, u.version)))
            setBanner(null)
        } catch (err) {
            setBanner(err instanceof ConflictError ? t('admin.conflict') : err.message)
        }
        setSelected([])
        refreshList()
    }

    const handleDeleteConfirm = async () => {
        const targets = selected.filter((u) => u.id !== user.id)
        try {
            await Promise.all(targets.map((u) => deleteUser(u.id, u.version)))
            setBanner(null)
        } catch (err) {
            setBanner(err instanceof ConflictError ? t('admin.conflict') : err.message)
        }
        setSelected([])
        closeModal()
        refreshList()
    }

    const handleRoleSubmit = async ({ toAdd, toRemove }) => {
        if (!singleSelected) return
        try {
            await Promise.all([
                ...toAdd.map((role) => assignRole(singleSelected.id, role)),
                ...toRemove.map((role) => removeRole(singleSelected.id, role)),
            ])
            closeModal()
            setSelected([])

            if (singleSelected.id === user.id && toRemove.includes('ADMIN')) {
                await refresh()
                navigate('/')
                return
            }

            refreshList()
        } catch (err) {
            setFormError(err.message)
        }
    }

    return (
        <div>
            <h1>{t('admin.title')}</h1>
            <p>{t('admin.description')}</p>

            {banner && (
                <div className="alert alert-warning alert-dismissible" role="alert">
                    {banner}
                    <button type="button" className="btn-close" onClick={() => setBanner(null)} />
                </div>
            )}

            <div className="d-flex flex-wrap gap-2 mb-3">
                <Button variant="outline-primary" disabled={!singleSelected} onClick={handleViewProfile}>
                    {t('admin.toolbar.viewProfile')}
                </Button>
                <Button
                    variant="outline-secondary"
                    disabled={selected.length === 0 || selectionIncludesSelf || selected.every((u) => u.isBlocked)}
                    onClick={handleBlock}
                >
                    {t('admin.toolbar.block')}
                </Button>
                <Button
                    variant="outline-secondary"
                    disabled={selected.length === 0 || selected.every((u) => !u.isBlocked)}
                    onClick={handleUnblock}
                >
                    {t('admin.toolbar.unblock')}
                </Button>
                <Button variant="outline-primary" disabled={!singleSelected} onClick={() => setModal('roles')}>
                    {t('admin.toolbar.manageRoles')}
                </Button>
                <Button
                    variant="outline-danger"
                    disabled={selected.length === 0 || selectionIncludesSelf}
                    onClick={() => setModal('delete')}
                >
                    {t('admin.toolbar.delete')}
                </Button>
            </div>

            <UserList
                selectedIds={selected.map((u) => u.id)}
                onToggleRow={handleToggleRow}
                onToggleAll={handleToggleAll}
                refreshToken={refreshToken}
            />

            {modal === 'roles' && (
                <RoleModal
                    show
                    user={singleSelected}
                    onClose={closeModal}
                    onSubmit={handleRoleSubmit}
                    error={formError}
                />
            )}

            <Modal show={modal === 'delete'} onHide={closeModal}>
                <Modal.Header closeButton>
                    <Modal.Title>{t('admin.deleteConfirm.title')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {t('admin.deleteConfirm.body', {
                        names: selected.map((u) => `${u.firstName} ${u.lastName}`).join(', '),
                    })}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeModal}>
                        {t('admin.roleModal.cancel')}
                    </Button>
                    <Button variant="danger" onClick={handleDeleteConfirm}>
                        {t('admin.toolbar.delete')}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default AdminPage
