import { useTranslation } from 'react-i18next'

const AttributeTypeBadge = ({ type }) => {
    const { t } = useTranslation()
    return <span className="badge text-bg-secondary">{t(`attributes.types.${type}`)}</span>
}

export default AttributeTypeBadge
