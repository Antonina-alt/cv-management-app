import { useEffect, useState } from 'react'
import { Badge, Table } from 'react-bootstrap'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { search } from '../api/search.js'
import { formatName } from '../lib/formatName.js'
import AccessBadge from '../components/common/AccessBadge.jsx'

const PositionResults = ({ positions }) => {
    const { t } = useTranslation()
    if (positions.length === 0) return null

    return (
        <>
            <h5 className="mt-4">{t('search.sections.positions')}</h5>
            <Table hover responsive>
                <thead>
                    <tr>
                        <th>{t('positions.table.title')}</th>
                        <th>{t('positions.table.company')}</th>
                        <th>{t('positions.table.access')}</th>
                    </tr>
                </thead>
                <tbody>
                    {positions.map((p) => (
                        <tr key={p.id}>
                            <td><Link to={`/positions/${p.id}`}>{p.title}</Link></td>
                            <td>{p.company}</td>
                            <td><AccessBadge isPublic={p.isPublic} /></td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </>
    )
}

const ProjectResults = ({ projects }) => {
    const { t } = useTranslation()
    if (projects.length === 0) return null
    const showCandidate = Boolean(projects[0].candidate)

    return (
        <>
            <h5 className="mt-4">{t('search.sections.projects')}</h5>
            <Table hover responsive>
                <thead>
                    <tr>
                        <th>{t('profile.projects.titleColumn')}</th>
                        {showCandidate && <th>{t('positions.resumes.candidate')}</th>}
                        <th>{t('profile.projects.tags')}</th>
                    </tr>
                </thead>
                <tbody>
                    {projects.map((p) => (
                        <tr key={p.id}>
                            <td>{p.title}</td>
                            {p.candidate && <td>{formatName(p.candidate)}</td>}
                            <td>{p.tags.map((tag) => <Badge key={tag} bg="secondary" className="me-1">{tag}</Badge>)}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </>
    )
}

const ResumeResults = ({ resumes }) => {
    const { t } = useTranslation()
    if (resumes.length === 0) return null

    return (
        <>
            <h5 className="mt-4">{t('search.sections.resumes')}</h5>
            <Table hover responsive>
                <thead>
                    <tr>
                        <th>{t('positions.resumes.candidate')}</th>
                        <th>{t('positions.table.title')}</th>
                        <th>{t('positions.resumes.likes')}</th>
                    </tr>
                </thead>
                <tbody>
                    {resumes.map((r) => (
                        <tr key={r.id}>
                            <td><Link to={`/resumes/${r.id}`}>{formatName(r.candidate)}</Link></td>
                            <td>{r.position.title}</td>
                            <td>{r.likeCount}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </>
    )
}

const isEmpty = (results) =>
    results.positions.length === 0 && results.projects.length === 0 && results.resumes.length === 0

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
            .then((data) => { setResults(data); setError(null) })
            .catch((err) => setError(err.message))
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
