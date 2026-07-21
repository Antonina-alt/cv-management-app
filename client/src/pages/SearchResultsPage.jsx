import { useEffect, useState } from 'react'
import { Badge, Table } from 'react-bootstrap'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { search } from '../api/search.js'

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
                    <h5 className="mt-4">{t('search.sections.positions')}</h5>
                    {results.positions.length === 0 ? (
                        <p className="text-muted">{t('search.empty')}</p>
                    ) : (
                        <Table hover responsive>
                            <thead>
                                <tr>
                                    <th>{t('positions.table.title')}</th>
                                    <th>{t('positions.table.company')}</th>
                                    <th>{t('positions.table.access')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.positions.map((p) => (
                                    <tr key={p.id}>
                                        <td><Link to={`/positions/${p.id}`}>{p.title}</Link></td>
                                        <td>{p.company}</td>
                                        <td>
                                            <span className={`badge ${p.isPublic ? 'text-bg-success' : 'text-bg-secondary'}`}>
                                                {t(p.isPublic ? 'positions.public' : 'positions.restricted')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}

                    {results.projects.length > 0 && (
                        <>
                            <h5 className="mt-4">{t('search.sections.projects')}</h5>
                            <Table hover responsive>
                                <thead>
                                    <tr>
                                        <th>{t('profile.projects.titleColumn')}</th>
                                        {results.projects[0].candidate && <th>{t('positions.resumes.candidate')}</th>}
                                        <th>{t('profile.projects.tags')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.projects.map((p) => (
                                        <tr key={p.id}>
                                            <td>{p.title}</td>
                                            {p.candidate && <td>{p.candidate.firstName} {p.candidate.lastName}</td>}
                                            <td>
                                                {p.tags.map((tag) => (
                                                    <Badge key={tag} bg="secondary" className="me-1">{tag}</Badge>
                                                ))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </>
                    )}

                    {results.resumes.length > 0 && (
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
                                    {results.resumes.map((r) => (
                                        <tr key={r.id}>
                                            <td><Link to={`/resumes/${r.id}`}>{r.candidate.firstName} {r.candidate.lastName}</Link></td>
                                            <td>{r.position.title}</td>
                                            <td>{r.likeCount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </>
                    )}

                    {results.positions.length === 0 && results.projects.length === 0 && results.resumes.length === 0 && (
                        <p className="text-muted mt-3">{t('search.empty')}</p>
                    )}
                </>
            )}
        </div>
    )
}

export default SearchResultsPage
