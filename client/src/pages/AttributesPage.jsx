import { useEffect, useState } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { createAttribute, deleteAttribute, listAttributeCategories, updateAttribute } from '../api/attributes.js'
import { ConflictError } from '../api/http.js'
import { pushRecentAttributeId } from '../lib/recentAttributes.js'
import { useObjectSelection } from '../hooks/useObjectSelection.js'
import AttributeList from '../components/attributes/AttributeList.jsx'
import AttributeFormModal from '../components/attributes/AttributeFormModal.jsx'

const AttributesPage = () => {
    const { t } = useTranslation()
    const [categories, setCategories] = useState([])
    const selection = useObjectSelection()
    const [refreshToken, setRefreshToken] = useState(0)
    const [modal, setModal] = useState(null)
    const [formError, setFormError] = useState(null)
    const [banner, setBanner] = useState(null)

    useEffect(() => {
        listAttributeCategories().then(setCategories).catch(() => setCategories([]))
    }, [])

    const refresh = () => setRefreshToken((v) => v + 1)

    const selectedAttrs = selection.items
    const selectedIds = selectedAttrs.map((a) => a.id)
    const singleSelected = selectedAttrs.length === 1 ? selectedAttrs[0] : null
    const canDelete = selectedAttrs.length > 0 && selectedAttrs.every((a) => !a.systemKey)
    const hasSystemSelected = selectedAttrs.some((a) => a.systemKey)

    const handleToggleRow = (attr) => {
        selection.toggle(attr)
        pushRecentAttributeId(attr.id)
        refresh()
    }

    const closeModal = () => {
        setModal(null)
        setFormError(null)
    }

    const handleCreateSubmit = async (payload) => {
        try {
            await createAttribute(payload)
            setBanner(null)
            closeModal()
            refresh()
        } catch (err) {
            setFormError(err.message)
        }
    }

    const handleEditSubmit = async (payload) => {
        try {
            const updated = await updateAttribute(singleSelected.id, { ...payload, version: singleSelected.version })
            selection.setItems([updated])
            setBanner(null)
            closeModal()
            refresh()
        } catch (err) {
            if (err instanceof ConflictError) {
                setBanner(t('attributes.conflict'))
                selection.clear()
                closeModal()
                refresh()
            } else {
                setFormError(err.message)
            }
        }
    }

    const handleDeleteConfirm = async () => {
        try {
            await Promise.all(selectedAttrs.map((a) => deleteAttribute(a.id, a.version)))
            setBanner(null)
        } catch (err) {
            setBanner(err instanceof ConflictError ? t('attributes.conflict') : err.message)
        }
        selection.clear()
        closeModal()
        refresh()
    }

    return (
        <div>
            <h1>{t('attributes.title')}</h1>

            {banner && (
                <div className="alert alert-warning alert-dismissible" role="alert">
                    {banner}
                    <button type="button" className="btn-close" onClick={() => setBanner(null)} />
                </div>
            )}

            <div className="d-flex flex-wrap gap-2 mb-3">
                <Button variant="primary" onClick={() => setModal('create')}>
                    {t('attributes.toolbar.create')}
                </Button>
                <Button variant="outline-primary" disabled={!singleSelected} onClick={() => setModal('edit')}>
                    {t('attributes.toolbar.edit')}
                </Button>
                <Button
                    variant="outline-danger"
                    disabled={!canDelete}
                    title={hasSystemSelected ? t('attributes.systemNoDelete') : undefined}
                    onClick={() => setModal('delete')}
                >
                    {t('attributes.toolbar.delete')}
                </Button>
            </div>

            <AttributeList
                selectedIds={selectedIds}
                onToggleRow={handleToggleRow}
                onToggleAll={selection.toggleAll}
                refreshToken={refreshToken}
            />

            {modal === 'create' && (
                <AttributeFormModal
                    show
                    onClose={closeModal}
                    onSubmit={handleCreateSubmit}
                    categories={categories}
                    error={formError}
                />
            )}

            {modal === 'edit' && singleSelected && (
                <AttributeFormModal
                    key={singleSelected.id}
                    show
                    onClose={closeModal}
                    onSubmit={handleEditSubmit}
                    categories={categories}
                    attribute={singleSelected}
                    error={formError}
                />
            )}

            <Modal show={modal === 'delete'} onHide={closeModal}>
                <Modal.Header closeButton>
                    <Modal.Title>{t('attributes.deleteConfirm.title')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {t('attributes.deleteConfirm.body', { name: selectedAttrs.map((a) => a.name).join(', ') })}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeModal}>
                        {t('attributes.form.cancel')}
                    </Button>
                    <Button variant="danger" onClick={handleDeleteConfirm}>
                        {t('attributes.toolbar.delete')}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default AttributesPage
