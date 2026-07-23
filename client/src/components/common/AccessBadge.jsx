import { useTranslation } from 'react-i18next'

const AccessBadge = ({ isPublic }) => {
    const { t } = useTranslation()
    const variant = isPublic ? 'success' : 'secondary'
    return <span className={`badge text-bg-${variant}`}>{t(isPublic ? 'positions.public' : 'positions.restricted')}</span>
}

export default AccessBadge
