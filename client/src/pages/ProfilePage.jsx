import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/auth-context.js'

const ProfilePage = () => {
    const { t } = useTranslation()
    const { user } = useAuth()

    return (
        <div>
            <h1>{t('profile.title')}</h1>
            <p>{user.firstName} {user.lastName}</p>
            <p>{user.email}</p>
            <p>{t('profile.roles')}: {user.roles.join(', ')}</p>
        </div>
    )
}

export default ProfilePage
