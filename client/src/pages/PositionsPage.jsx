import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/auth-context.js'
import { createPosition, deletePosition, duplicatePosition } from '../api/positions.js'
import { ConflictError } from '../api/http.js'
import PositionList from '../components/positions/PositionList.jsx'
import PositionFormModal from '../components/positions/PositionFormModal.jsx'

const PositionsPage = () => {
    const { t } = useTranslation()
    const { user } = useAuth()
    const navigate = useNavigate()
    const canManage = Boolean(user) && (user.roles.includes('RECRUITER') || user.roles.includes('ADMIN'))

    const [selected, setSelected] = useState([])
    const [refreshToken, setRefreshToken] = useState(0)
    const [modal, setModal] = useState(null) // 'create' | 'delete'
    const [formError, setFormError] = useState(null)
    const [banner, setBanner] = useState(null)

    const refresh = () => setRefreshToken((v) => v + 1)
    const singleSelected = selected.length === 1 ? selected[0] : null

    const handleToggleRow = (position) => {
        setSelected((prev) => (
            prev.some((p) => p.id === position.id)
                ? prev.filter((p) => p.id !== position.id)
                : [...prev, position]
        ))
    }

    const handleToggleAll = (positions, selectAll) => {
        setSelected((prev) => {
            if (selectAll) {
                const existingIds = new Set(prev.map((p) => p.id))
                return [...prev, ...positions.filter((p) => !existingIds.has(p.id))]
            }
            const removedIds = new Set(positions.map((p) => p.id))
            return prev.filter((p) => !removedIds.has(p.id))
        })
    }

    const closeModal = () => {
        setModal(null)
        setFormError(null)
    }

    const handleCreateSubmit = async (payload) => {
        try {
            const created = await createPosition(payload)
            closeModal()
            refresh()
            navigate(`/positions/${created.id}`)
        } catch (err) {
            setFormError(err.message)
        }
    }

    const handleOpen = () => {
        if (singleSelected) navigate(`/positions/${singleSelected.id}`)
    }

    const handleDuplicate = async () => {
        if (selected.length === 0) return
        try {
            await Promise.all(selected.map((p) => duplicatePosition(p.id)))
            setBanner(null)
            setSelected([])
            refresh()
        } catch (err) {
            setBanner(err.message)
        }
    }

    const handleDeleteConfirm = async () => {
        try {
            await Promise.all(selected.map((p) => deletePosition(p.id, p.version)))
            setBanner(null)
        } catch (err) {
            setBanner(err instanceof ConflictError ? t('positions.conflict') : err.message)
        }
        setSelected([])
        closeModal()
        refresh()
    }

    return (
        <div>
            <h1>{t('positions.title')}</h1>
            <p>{t('positions.description')}</p>

            {banner && (
                <div className="alert alert-warning alert-dismissible" role="alert">
                    {banner}
                    <button type="button" className="btn-close" onClick={() => setBanner(null)} />
                </div>
            )}

            {canManage && (
                <div className="d-flex gap-2 mb-3">
                    <Button variant="primary" onClick={() => setModal('create')}>
                        {t('positions.toolbar.create')}
                    </Button>
                    <Button variant="outline-primary" disabled={!singleSelected} onClick={handleOpen}>
                        {t('positions.toolbar.open')}
                    </Button>
                    <Button variant="outline-primary" disabled={selected.length === 0} onClick={handleDuplicate}>
                        {t('positions.toolbar.duplicate')}
                    </Button>
                    <Button
                        variant="outline-danger"
                        disabled={selected.length === 0}
                        onClick={() => setModal('delete')}
                    >
                        {t('positions.toolbar.delete')}
                    </Button>
                </div>
            )}

            <PositionList
                selectedIds={canManage ? selected.map((p) => p.id) : []}
                onToggleRow={canManage ? handleToggleRow : undefined}
                onToggleAll={canManage ? handleToggleAll : undefined}
                onRowClick={!canManage ? (position) => navigate(`/positions/${position.id}`) : undefined}
                refreshToken={refreshToken}
            />

            {modal === 'create' && (
                <PositionFormModal
                    show
                    onClose={closeModal}
                    onSubmit={handleCreateSubmit}
                    error={formError}
                />
            )}

            <Modal show={modal === 'delete'} onHide={closeModal}>
                <Modal.Header closeButton>
                    <Modal.Title>{t('positions.deleteConfirm.title')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {t('positions.deleteConfirm.body', { titles: selected.map((p) => p.title).join(', ') })}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeModal}>
                        {t('positions.form.cancel')}
                    </Button>
                    <Button variant="danger" onClick={handleDeleteConfirm}>
                        {t('positions.toolbar.delete')}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default PositionsPage
