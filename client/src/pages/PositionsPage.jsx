import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createPosition, deletePosition, duplicatePosition } from '../api/positions.js'
import ConfirmationModal from '../components/common/ConfirmationModal.jsx'
import ErrorAlert from '../components/common/ErrorAlert.jsx'
import Toolbar from '../components/common/Toolbar.jsx'
import PositionFormModal from '../components/positions/PositionFormModal.jsx'
import PositionList from '../components/positions/PositionList.jsx'
import { useAuth } from '../context/auth-context.js'
import { useSelection } from '../hooks/useSelection.js'

const PositionsPage = () => {
    const { t } = useTranslation()
    const { user } = useAuth()
    const navigate = useNavigate()
    const selection = useSelection()
    const [refreshToken, setRefreshToken] = useState(0)
    const [modal, setModal] = useState(null)
    const [formError, setFormError] = useState(null)
    const [banner, setBanner] = useState(null)
    const canManage = Boolean(user) && user.roles.some((role) => ['RECRUITER', 'ADMIN'].includes(role))
    const refresh = () => setRefreshToken((value) => value + 1)
    const closeModal = () => {
        setModal(null)
        setFormError(null)
    }
    const handleCreate = async (payload) => {
        try {
            const created = await createPosition(payload)
            closeModal()
            navigate(`/positions/${created.id}`)
        } catch (error) {
            setFormError(error)
        }
    }
    const handleDuplicate = async () => {
        try {
            await Promise.all(selection.items.map(({ id }) => duplicatePosition(id)))
            setBanner(null)
        } catch (error) {
            setBanner(error)
        }
        selection.clear()
        refresh()
    }
    const handleDelete = async () => {
        try {
            await Promise.all(selection.items.map(({ id, version }) => deletePosition(id, version)))
            setBanner(null)
        } catch (error) {
            setBanner(error)
        }
        selection.clear()
        closeModal()
        refresh()
    }
    const actions = canManage ? [
        { key: 'create', label: t('positions.toolbar.create'), variant: 'primary', onClick: () => setModal('create') },
        { key: 'open', label: t('positions.toolbar.open'), variant: 'outline-primary', disabled: !selection.single, onClick: () => navigate(`/positions/${selection.single.id}`) },
        { key: 'duplicate', label: t('positions.toolbar.duplicate'), variant: 'outline-primary', disabled: !selection.items.length, onClick: handleDuplicate },
        { key: 'delete', label: t('positions.toolbar.delete'), variant: 'outline-danger', disabled: !selection.items.length, onClick: () => setModal('delete') },
    ] : []
    return (
        <div>
            <h1>{t('positions.title')}</h1>
            <ErrorAlert error={banner} onClose={() => setBanner(null)} />
            {canManage && <Toolbar actions={actions} />}
            <PositionList selectedIds={canManage ? selection.ids : []} onToggleRow={canManage ? selection.toggle : undefined} onToggleAll={canManage ? selection.toggleAll : undefined} refreshToken={refreshToken} />
            {modal === 'create' && <PositionFormModal show onClose={closeModal} onSubmit={handleCreate} error={formError} />}
            <ConfirmationModal show={modal === 'delete'} onCancel={closeModal} onConfirm={handleDelete} title={t('positions.deleteConfirm.title')} body={t('positions.deleteConfirm.body', { titles: selection.items.map(({ title }) => title).join(', ') })} cancelLabel={t('positions.form.cancel')} confirmLabel={t('positions.toolbar.delete')} />
        </div>
    )
}

export default PositionsPage
