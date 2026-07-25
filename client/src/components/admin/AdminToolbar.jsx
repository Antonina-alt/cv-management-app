import { useTranslation } from 'react-i18next'
import Toolbar from '../common/Toolbar.jsx'

const AdminToolbar = ({ selection, includesSelf, onViewProfile, onBlock, onUnblock, onRoles, onDelete }) => {
    const { t } = useTranslation()
    const actions = [
        { key: 'profile', label: t('admin.toolbar.viewProfile'), variant: 'outline-primary', disabled: !selection.single, onClick: onViewProfile },
        { key: 'block', label: t('admin.toolbar.block'), variant: 'outline-secondary', disabled: !selection.items.length || includesSelf || selection.items.every(({ isBlocked }) => isBlocked), onClick: onBlock },
        { key: 'unblock', label: t('admin.toolbar.unblock'), variant: 'outline-secondary', disabled: !selection.items.length || selection.items.every(({ isBlocked }) => !isBlocked), onClick: onUnblock },
        { key: 'roles', label: t('admin.toolbar.manageRoles'), variant: 'outline-primary', disabled: !selection.single, onClick: onRoles },
        { key: 'delete', label: t('admin.toolbar.delete'), variant: 'outline-danger', disabled: !selection.items.length || includesSelf, onClick: onDelete },
    ]
    return <Toolbar actions={actions} />
}

export default AdminToolbar
