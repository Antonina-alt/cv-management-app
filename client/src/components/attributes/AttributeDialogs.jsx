import { useTranslation } from 'react-i18next'
import ConfirmationModal from '../common/ConfirmationModal.jsx'
import AttributeFormModal from './AttributeFormModal.jsx'

const AttributeDialogs = ({ dialog, selection, categories, onCreate, onEdit, onDelete }) => {
    const { t } = useTranslation()
    return (
        <>
            {dialog.name === 'create' && <AttributeFormModal show onClose={dialog.close} onSubmit={onCreate} categories={categories} error={dialog.error} />}
            {dialog.name === 'edit' && selection.single && <AttributeFormModal key={selection.single.id} show onClose={dialog.close} onSubmit={onEdit} categories={categories} attribute={selection.single} error={dialog.error} />}
            <ConfirmationModal show={dialog.name === 'delete'} onCancel={dialog.close} onConfirm={onDelete} title={t('attributes.deleteConfirm.title')} body={t('attributes.deleteConfirm.body', { name: selection.items.map(({ name }) => name).join(', ') })} cancelLabel={t('attributes.form.cancel')} confirmLabel={t('attributes.toolbar.delete')} />
        </>
    )
}

export default AttributeDialogs
