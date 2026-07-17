import { useTranslation } from 'react-i18next'

const AttributesPage = () => {
    const { t } = useTranslation()

    return (
        <div>
            <h1>{t('attributes.title')}</h1>
            <p>{t('attributes.description')}</p>
        </div>
    )
}

export default AttributesPage
