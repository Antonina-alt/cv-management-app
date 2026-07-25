import { useTranslation } from 'react-i18next'
import AdminDialogs from '../components/admin/AdminDialogs.jsx'
import AdminToolbar from '../components/admin/AdminToolbar.jsx'
import UserList from '../components/admin/UserList.jsx'
import ErrorAlert from '../components/common/ErrorAlert.jsx'
import { useAdminPage } from '../hooks/pages/useAdminPage.js'

const AdminPage = () => {
    const { t } = useTranslation()
    const page = useAdminPage()
    return (
        <div>
            <h1>{t('admin.title')}</h1>
            <ErrorAlert error={page.banner} onClose={page.clearBanner} />
            <AdminToolbar selection={page.selection} includesSelf={page.includesSelf} onViewProfile={page.viewProfile} onBlock={() => page.setBlocked(true)} onUnblock={() => page.setBlocked(false)} onRoles={() => page.dialog.open('roles')} onDelete={() => page.dialog.open('delete')} />
            <UserList selectedIds={page.selection.ids} onToggleRow={page.selection.toggle} onToggleAll={page.selection.toggleAll} refreshToken={page.refreshToken} />
            <AdminDialogs dialog={page.dialog} selection={page.selection} onDelete={page.deleteSelected} onRoles={page.updateRoles} />
        </div>
    )
}

export default AdminPage
