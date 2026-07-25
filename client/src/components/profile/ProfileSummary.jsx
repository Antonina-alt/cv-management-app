import { useTranslation } from 'react-i18next'
import { formatName } from '../../lib/formatName.js'

const ProfileSummary = ({ user }) => {
    const { t } = useTranslation()
    if (!user) return null
    return <><p>{formatName(user)}</p><p>{user.email}</p><p>{t('profile.roles')}: {user.roles.join(', ')}</p></>
}

export default ProfileSummary
