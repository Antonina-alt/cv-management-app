import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

const SearchResultsPage = () => {
    const { t } = useTranslation()
    const [searchParams] = useSearchParams()
    const query = searchParams.get('q') ?? ''

    return (
        <div>
            <h1>{t('search.title')}</h1>
            {query ? <p>{t('search.resultsFor', { query })}</p> : <p>{t('search.noQuery')}</p>}
            <p>{t('search.description')}</p>
        </div>
    )
}

export default SearchResultsPage
