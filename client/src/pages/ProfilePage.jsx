import { useTranslation } from 'react-i18next'
import ErrorAlert from '../components/common/ErrorAlert.jsx'
import ProfileSummary from '../components/profile/ProfileSummary.jsx'
import ProfileTabs from '../components/profile/ProfileTabs.jsx'
import { useProfilePage } from '../hooks/pages/useProfilePage.js'

const ProfilePage = () => {
    const { t } = useTranslation()
    const page = useProfilePage()
    if (page.error) return <ErrorAlert error={page.error} />
    return (
        <div>
            <h1>{t('profile.title')}</h1>
            <ProfileSummary user={page.displayUser} />
            <ErrorAlert error={page.banner} onClose={page.clearBanner} />
            {page.loading || !page.data ? <p className="text-muted">{t('attributes.loading')}</p> : <ProfileTabs page={page} />}
        </div>
    )
}

export default ProfilePage
