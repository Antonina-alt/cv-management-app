import { useTranslation } from 'react-i18next'
import ConfirmationModal from '../common/ConfirmationModal.jsx'
import PositionFormModal from './PositionFormModal.jsx'

const PositionDialogs = ({ dialog, selection, onCreate, onDelete }) => {
    const { t } = useTranslation()
    return (
        <>
            {dialog.name === 'create' && <PositionFormModal show onClose={dialog.close} onSubmit={onCreate} error={dialog.error} />}
            <ConfirmationModal show={dialog.name === 'delete'} onCancel={dialog.close} onConfirm={onDelete} title={t('positions.deleteConfirm.title')} body={t('positions.deleteConfirm.body', { titles: selection.items.map(({ title }) => title).join(', ') })} cancelLabel={t('positions.form.cancel')} confirmLabel={t('positions.toolbar.delete')} />
        </>
    )
}

export default PositionDialogs
