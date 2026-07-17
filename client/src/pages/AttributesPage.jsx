import { useEffect, useState } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { createAttribute, deleteAttribute, listAttributeCategories, updateAttribute } from '../api/attributes.js'
import { ConflictError } from '../api/http.js'
import { pushRecentAttributeId } from '../lib/recentAttributes.js'
import AttributeList from '../components/attributes/AttributeList.jsx'
import AttributeFormModal from '../components/attributes/AttributeFormModal.jsx'

const AttributesPage = () => {
    const { t } = useTranslation()
    const [categories, setCategories] = useState([])
    const [selected, setSelected] = useState(null)
    const [refreshToken, setRefreshToken] = useState(0)
    const [modal, setModal] = useState(null) // 'create' | 'edit' | 'delete'
    const [formError, setFormError] = useState(null)
    const [banner, setBanner] = useState(null)

    useEffect(() => {
        listAttributeCategories().then(setCategories).catch(() => setCategories([]))
    }, [])

    const refresh = () => setRefreshToken((v) => v + 1)

    const handleSelectRow = (attr) => {
        setSelected((prev) => (prev?.id === attr.id ? null : attr))
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
            const updated = await updateAttribute(selected.id, { ...payload, version: selected.version })
            setSelected(updated)
            setBanner(null)
            closeModal()
            refresh()
        } catch (err) {
            if (err instanceof ConflictError) {
                setBanner(t('attributes.conflict'))
                setSelected(null)
                closeModal()
                refresh()
            } else {
                setFormError(err.message)
            }
        }
    }

    const handleDeleteConfirm = async () => {
        try {
            await deleteAttribute(selected.id, selected.version)
            setBanner(null)
            setSelected(null)
            closeModal()
            refresh()
        } catch (err) {
            if (err instanceof ConflictError) {
                setBanner(t('attributes.conflict'))
            } else {
                setBanner(err.message)
            }
            setSelected(null)
            closeModal()
            refresh()
        }
    }

    return (
        <div>
            <h1>{t('attributes.title')}</h1>
            <p>{t('attributes.description')}</p>

            {banner && (
                <div className="alert alert-warning alert-dismissible" role="alert">
                    {banner}
                    <button type="button" className="btn-close" onClick={() => setBanner(null)} />
                </div>
            )}

            <div className="d-flex gap-2 mb-3">
                <Button variant="primary" onClick={() => setModal('create')}>
                    {t('attributes.toolbar.create')}
                </Button>
                <Button variant="outline-secondary" disabled={!selected} onClick={() => setModal('edit')}>
                    {t('attributes.toolbar.edit')}
                </Button>
                <Button
                    variant="outline-danger"
                    disabled={!selected || Boolean(selected?.systemKey)}
                    title={selected?.systemKey ? t('attributes.systemNoDelete') : undefined}
                    onClick={() => setModal('delete')}
                >
                    {t('attributes.toolbar.delete')}
                </Button>
            </div>

            <AttributeList selectedId={selected?.id} onSelectRow={handleSelectRow} refreshToken={refreshToken} />

            {modal === 'create' && (
                <AttributeFormModal
                    show
                    onClose={closeModal}
                    onSubmit={handleCreateSubmit}
                    categories={categories}
                    error={formError}
                />
            )}

            {modal === 'edit' && selected && (
                <AttributeFormModal
                    key={selected.id}
                    show
                    onClose={closeModal}
                    onSubmit={handleEditSubmit}
                    categories={categories}
                    attribute={selected}
                    error={formError}
                />
            )}

            <Modal show={modal === 'delete'} onHide={closeModal}>
                <Modal.Header closeButton>
                    <Modal.Title>{t('attributes.deleteConfirm.title')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {t('attributes.deleteConfirm.body', { name: selected?.name })}
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
