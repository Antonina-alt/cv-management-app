import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { search } from '../api/search.js'
import ErrorAlert from '../components/common/ErrorAlert.jsx'
import SearchResultTables from '../components/search/SearchResultTables.jsx'
import { useAsyncData } from '../hooks/useAsyncData.js'

const isEmpty = (results) => !results.positions.length && !results.projects.length && !results.resumes.length

const SearchResultsPage = () => {
    const { t } = useTranslation()
    const [params] = useSearchParams()
    const query = params.get('q')?.trim() ?? ''
    const fetchResults = useCallback(() => search(query), [query])
    const { data: results, loading, error } = useAsyncData(fetchResults, { enabled: Boolean(query) })
    if (!query) return <div><h1>{t('search.title')}</h1><p>{t('search.noQuery')}</p></div>
    return (
        <div>
            <h1>{t('search.title')}</h1>
            <p>{t('search.resultsFor', { query })}</p>
            {loading && <p className="text-muted">{t('search.loading')}</p>}
            <ErrorAlert error={error} />
            {results && <><SearchResultTables results={results} />{isEmpty(results) && <p className="text-muted mt-3">{t('search.emptyAll')}</p>}</>}
        </div>
    )
}

export default SearchResultsPage
