import { useTranslation } from 'react-i18next'

const AdminPage = () => {
    const { t } = useTranslation()

    return (
        <div>
            <h1>{t('admin.title')}</h1>
            <p>{t('admin.description')}</p>
        </div>
    )
}

export default AdminPage
