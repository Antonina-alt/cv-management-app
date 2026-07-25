import { useTranslation } from 'react-i18next'
import { formatName } from '../../lib/formatName.js'
import ConfirmationModal from '../common/ConfirmationModal.jsx'
import RoleModal from './RoleModal.jsx'

const AdminDialogs = ({ dialog, selection, onDelete, onRoles }) => {
    const { t } = useTranslation()
    return (
        <>
            {dialog.name === 'roles' && <RoleModal show user={selection.single} onClose={dialog.close} onSubmit={onRoles} error={dialog.error} />}
            <ConfirmationModal show={dialog.name === 'delete'} onCancel={dialog.close} onConfirm={onDelete} title={t('admin.deleteConfirm.title')} body={t('admin.deleteConfirm.body', { names: selection.items.map(formatName).join(', ') })} cancelLabel={t('admin.roleModal.cancel')} confirmLabel={t('admin.toolbar.delete')} />
        </>
    )
}

export default AdminDialogs
