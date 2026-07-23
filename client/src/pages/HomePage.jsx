import { useTranslation } from 'react-i18next'
import HomeStats from '../components/home/HomeStats.jsx'
import RecentPositionsTable from '../components/home/RecentPositionsTable.jsx'

const HomePage = () => {
    const { t } = useTranslation()

    return (
        <div>
            <h1>{t('home.title')}</h1>

            <HomeStats />

            <h2 className="h4">{t('home.recentPositions')}</h2>
            <RecentPositionsTable />
        </div>
    )
}

export default HomePage
