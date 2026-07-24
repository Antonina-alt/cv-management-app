import { useEffect, useMemo, useState } from 'react'
import { Badge } from 'react-bootstrap'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { search } from '../api/search.js'
import { formatName } from '../lib/formatName.js'
import AccessBadge from '../components/common/AccessBadge.jsx'
import CommonDataTable from '../components/common/CommonDataTable.jsx'
import { useTableLink } from '../hooks/useTableLink.js'

const tableOptions = { paging: false, info: false, ordering: false }

const PositionResults = ({ positions }) => {
    const { t } = useTranslation()
    const tableLink = useTableLink()
    const columns = useMemo(() => [
        {
            data: 'title',
            title: t('positions.table.title'),
            render: (value, row) => <a {...tableLink(`/positions/${row.id}`)}>{row.title}</a>,
        },
        { data: 'company', title: t('positions.table.company') },
        {
            data: 'isPublic',
            title: t('positions.table.access'),
            render: (value, row) => <AccessBadge isPublic={row.isPublic} />,
        },
    ], [t, tableLink])

    if (positions.length === 0) return null

    return (
        <section>
            <h5 className="mt-4">{t('search.sections.positions')}</h5>
            <CommonDataTable
                data={positions}
                columns={columns}
                emptyMessage={t('positions.empty')}
                options={tableOptions}
            />
        </section>
    )
}

const ProjectResults = ({ projects }) => {
    const { t } = useTranslation()
    const showCandidate = projects.some((project) => Boolean(project.candidate))

    const columns = useMemo(() => [
        { data: 'title', title: t('profile.projects.titleColumn') },
        ...(showCandidate ? [{
            data: (row) => formatName(row.candidate),
            title: t('positions.resumes.candidate'),
        }] : []),
        {
            data: (row) => row.tags.join(', '),
            title: t('profile.projects.tags'),
            render: (value, row) => (
                <span className="d-flex flex-wrap gap-1">
                    {row.tags.map((tag) => <Badge key={tag} bg="secondary">{tag}</Badge>)}
                </span>
            ),
        },
    ], [showCandidate, t])

    if (projects.length === 0) return null

    return (
        <section>
            <h5 className="mt-4">{t('search.sections.projects')}</h5>
            <CommonDataTable
                data={projects}
                columns={columns}
                emptyMessage={t('search.emptyAll')}
                options={tableOptions}
            />
        </section>
    )
}

const ResumeResults = ({ resumes }) => {
    const { t } = useTranslation()
    const tableLink = useTableLink()
    const columns = useMemo(() => [
        {
            data: (row) => formatName(row.candidate),
            title: t('positions.resumes.candidate'),
            render: (value, row) => <a {...tableLink(`/resumes/${row.id}`)}>{formatName(row.candidate)}</a>,
        },
        { data: (row) => row.position.title, title: t('positions.table.title') },
        { data: 'likeCount', title: t('positions.resumes.likes') },
    ], [t, tableLink])

    if (resumes.length === 0) return null

    return (
        <section>
            <h5 className="mt-4">{t('search.sections.resumes')}</h5>
            <CommonDataTable
                data={resumes}
                columns={columns}
                emptyMessage={t('profile.resumes.empty')}
                options={tableOptions}
            />
        </section>
    )
}

const isEmpty = (results) => (
    results.positions.length === 0 && results.projects.length === 0 && results.resumes.length === 0
)

const SearchResultsPage = () => {
    const { t } = useTranslation()
    const [searchParams] = useSearchParams()
    const query = searchParams.get('q') ?? ''
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!query) {
            setResults(null)
            return
        }

        setLoading(true)
        search(query)
            .then((data) => {
                setResults(data)
                setError(null)
            })
            .catch((requestError) => setError(requestError.message))
            .finally(() => setLoading(false))
    }, [query])

    if (!query) {
        return (
            <div>
                <h1>{t('search.title')}</h1>
                <p>{t('search.noQuery')}</p>
            </div>
        )
    }

    return (
        <div>
            <h1>{t('search.title')}</h1>
            <p>{t('search.resultsFor', { query })}</p>

            {loading && <p className="text-muted">{t('search.loading')}</p>}
            {error && <div className="alert alert-danger">{error}</div>}

            {results && (
                <>
                    <PositionResults positions={results.positions} />
                    <ProjectResults projects={results.projects} />
                    <ResumeResults resumes={results.resumes} />
                    {isEmpty(results) && <p className="text-muted mt-3">{t('search.emptyAll')}</p>}
                </>
            )}
        </div>
    )
}

export default SearchResultsPage
