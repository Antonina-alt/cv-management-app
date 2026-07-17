import { useEffect, useMemo, useState } from 'react'
import { Form, Table } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { listAttributeCategories, listAttributes } from '../../api/attributes.js'
import { getRecentAttributeIds } from '../../lib/recentAttributes.js'
import AttributeTypeBadge from './AttributeTypeBadge.jsx'

// Shared list used both as the manage-mode table (task 04, with a toolbar above it)
// and, later, as the attribute picker inside other forms (tasks 06/07).
const AttributeList = ({ selectedId, onSelectRow, refreshToken }) => {
    const { t } = useTranslation()
    const [categories, setCategories] = useState([])
    const [categoryId, setCategoryId] = useState('')
    const [query, setQuery] = useState('')
    const [attributes, setAttributes] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Re-read on every refreshToken bump so a fresh pick is reflected immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const recentIds = useMemo(() => getRecentAttributeIds(), [refreshToken])

    useEffect(() => {
        listAttributeCategories().then(setCategories).catch(() => setCategories([]))
    }, [])

    useEffect(() => {
        let cancelled = false

        const handle = setTimeout(() => {
            if (cancelled) return
            setLoading(true)
            setError(null)
            listAttributes({ q: query || undefined, categoryId: categoryId || undefined })
                .then((data) => { if (!cancelled) setAttributes(data) })
                .catch((err) => { if (!cancelled) setError(err.message) })
                .finally(() => { if (!cancelled) setLoading(false) })
        }, 200)

        return () => { cancelled = true; clearTimeout(handle) }
    }, [query, categoryId, refreshToken])

    const recentAttributes = useMemo(
        () => recentIds
            .map((id) => attributes.find((a) => a.id === id))
            .filter(Boolean),
        [recentIds, attributes],
    )

    return (
        <div>
            <div className="d-flex flex-wrap gap-2 mb-3">
                <Form.Control
                    type="search"
                    style={{ maxWidth: 280 }}
                    placeholder={t('attributes.searchPlaceholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label={t('attributes.searchPlaceholder')}
                />
                <Form.Select
                    style={{ maxWidth: 220 }}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    aria-label={t('attributes.categoryFilter')}
                >
                    <option value="">{t('attributes.allCategories')}</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </Form.Select>
            </div>

            {recentAttributes.length > 0 && (
                <div className="mb-3">
                    <div className="text-muted small mb-1">{t('attributes.recentlyUsed')}</div>
                    <div className="d-flex flex-wrap gap-2">
                        {recentAttributes.map((attr) => (
                            <button
                                key={attr.id}
                                type="button"
                                className={`btn btn-sm ${selectedId === attr.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => onSelectRow?.(attr)}
                            >
                                {attr.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {error && <div className="alert alert-danger">{error}</div>}

            <Table hover responsive>
                <thead>
                    <tr>
                        <th>{t('attributes.table.name')}</th>
                        <th>{t('attributes.table.category')}</th>
                        <th>{t('attributes.table.type')}</th>
                        <th>{t('attributes.table.description')}</th>
                    </tr>
                </thead>
                <tbody>
                    {loading && (
                        <tr><td colSpan={4} className="text-muted">{t('attributes.loading')}</td></tr>
                    )}
                    {!loading && attributes.length === 0 && (
                        <tr><td colSpan={4} className="text-muted">{t('attributes.empty')}</td></tr>
                    )}
                    {!loading && attributes.map((attr) => (
                        <tr
                            key={attr.id}
                            role="row"
                            aria-selected={selectedId === attr.id}
                            className={selectedId === attr.id ? 'table-active' : ''}
                            onClick={() => onSelectRow?.(attr)}
                            style={{ cursor: onSelectRow ? 'pointer' : undefined }}
                        >
                            <td>
                                {attr.name}
                                {attr.systemKey && (
                                    <span className="badge text-bg-info ms-2">{t('attributes.systemBadge')}</span>
                                )}
                            </td>
                            <td>{attr.category?.name}</td>
                            <td><AttributeTypeBadge type={attr.type} /></td>
                            <td className="text-truncate" style={{ maxWidth: 320 }}>{attr.description}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    )
}

export default AttributeList
