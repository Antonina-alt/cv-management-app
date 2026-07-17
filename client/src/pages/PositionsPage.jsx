import { useTranslation } from 'react-i18next'

const PositionsPage = () => {
    const { t } = useTranslation()

    return (
        <div>
            <h1>{t('positions.title')}</h1>
            <p>{t('positions.description')}</p>
        </div>
    )
}

export default PositionsPage
