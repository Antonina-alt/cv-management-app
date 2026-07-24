import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createAttribute, deleteAttribute, listAttributeCategories, updateAttribute } from '../api/attributes.js'
import { ConflictError } from '../api/http.js'
import AttributeFormModal from '../components/attributes/AttributeFormModal.jsx'
import AttributeList from '../components/attributes/AttributeList.jsx'
import ConfirmationModal from '../components/common/ConfirmationModal.jsx'
import DismissibleAlert from '../components/common/DismissibleAlert.jsx'
import Toolbar from '../components/common/Toolbar.jsx'
import { useAsyncData } from '../hooks/useAsyncData.js'
import { useSelection } from '../hooks/useSelection.js'
import { pushRecentAttributeId } from '../lib/recentAttributes.js'

const AttributesPage = () => {
    const { t } = useTranslation()
    const selection = useSelection()
    const { data } = useAsyncData(listAttributeCategories)
    const categories = data ?? []
    const [refreshToken, setRefreshToken] = useState(0)
    const [modal, setModal] = useState(null)
    const [formError, setFormError] = useState(null)
    const [banner, setBanner] = useState(null)
    const refresh = () => setRefreshToken((value) => value + 1)
    const closeModal = () => {
        setModal(null)
        setFormError(null)
    }
    const handleToggle = (attribute) => {
        selection.toggle(attribute)
        pushRecentAttributeId(attribute.id)
    }
    const handleCreate = async (payload) => {
        try {
            await createAttribute(payload)
            closeModal()
            refresh()
        } catch (error) {
            setFormError(error.message)
        }
    }
    const handleEdit = async (payload) => {
        try {
            const updated = await updateAttribute(selection.single.id, { ...payload, version: selection.single.version })
            selection.setItems([updated])
            closeModal()
            refresh()
        } catch (error) {
            if (!(error instanceof ConflictError)) return setFormError(error.message)
            setBanner(t('attributes.conflict'))
            selection.clear()
            closeModal()
            refresh()
        }
    }
    const handleDelete = async () => {
        try {
            await Promise.all(selection.items.map(({ id, version }) => deleteAttribute(id, version)))
            setBanner(null)
        } catch (error) {
            setBanner(error instanceof ConflictError ? t('attributes.conflict') : error.message)
        }
        selection.clear()
        closeModal()
        refresh()
    }
    const hasSystem = selection.items.some(({ systemKey }) => systemKey)
    const actions = [
        { key: 'create', label: t('attributes.toolbar.create'), variant: 'primary', onClick: () => setModal('create') },
        { key: 'edit', label: t('attributes.toolbar.edit'), variant: 'outline-primary', disabled: !selection.single, onClick: () => setModal('edit') },
        { key: 'delete', label: t('attributes.toolbar.delete'), variant: 'outline-danger', disabled: !selection.items.length || hasSystem, title: hasSystem ? t('attributes.systemNoDelete') : undefined, onClick: () => setModal('delete') },
    ]
    return (
        <div>
            <h1>{t('attributes.title')}</h1>
            <DismissibleAlert onClose={() => setBanner(null)}>{banner}</DismissibleAlert>
            <Toolbar actions={actions} />
            <AttributeList selectedIds={selection.ids} onToggleRow={handleToggle} onToggleAll={selection.toggleAll} refreshToken={refreshToken} />
            {modal === 'create' && <AttributeFormModal show onClose={closeModal} onSubmit={handleCreate} categories={categories} error={formError} />}
            {modal === 'edit' && selection.single && <AttributeFormModal key={selection.single.id} show onClose={closeModal} onSubmit={handleEdit} categories={categories} attribute={selection.single} error={formError} />}
            <ConfirmationModal show={modal === 'delete'} onCancel={closeModal} onConfirm={handleDelete} title={t('attributes.deleteConfirm.title')} body={t('attributes.deleteConfirm.body', { name: selection.items.map(({ name }) => name).join(', ') })} cancelLabel={t('attributes.form.cancel')} confirmLabel={t('attributes.toolbar.delete')} />
        </div>
    )
}

export default AttributesPage
