import { useTranslation } from 'react-i18next'

const HomePage = () => {
    const { t } = useTranslation()

    return (
        <div>
            <h1>{t('home.title')}</h1>
            <p>{t('home.description')}</p>
        </div>
    )
}

export default HomePage
