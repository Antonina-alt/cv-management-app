import { useEffect, useMemo, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { listAttributeCategories, listAttributes } from '../../api/attributes.js'
import { getRecentAttributeIds } from '../../lib/recentAttributes.js'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import CommonDataTable, { TABLE_MODE } from '../common/CommonDataTable.jsx'
import AttributeTypeBadge from './AttributeTypeBadge.jsx'

const AttributeList = ({ selectedIds = [], onToggleRow, onToggleAll, refreshToken, excludeIds, excludeSystem }) => {
    const { t } = useTranslation()
    const [categories, setCategories] = useState([])
    const [categoryId, setCategoryId] = useState('')
    const [query, setQuery] = useState('')
    const { data: loaded, loading, error } = useAsyncData(
        () => listAttributes({ q: query || undefined, categoryId: categoryId || undefined }),
        [query, categoryId, refreshToken],
        { debounceMs: 200 },
    )
    const attributes = loaded ?? []

    const visibleAttributes = useMemo(
        () => attributes.filter((attribute) => ((!excludeSystem || !attribute.systemKey) && (!excludeIds || !excludeIds.includes(attribute.id)))),
        [attributes, excludeIds, excludeSystem],
    )

    const recentIds = useMemo(() => getRecentAttributeIds(), [refreshToken])

    useEffect(() => {
        listAttributeCategories().then(setCategories).catch(() => setCategories([]))
    }, [])

    const recentAttributes = useMemo(
        () => recentIds.map((id) => visibleAttributes.find((attribute) => attribute.id === id)).filter(Boolean),
        [recentIds, visibleAttributes],
    )

    const columns = useMemo(() => [
        {
            data: 'name',
            title: t('attributes.table.name'),
            render: (data, row) => (
                <>
                    {row.name}
                    {row.systemKey && <span className="badge text-bg-info ms-2">{t('attributes.systemBadge')}</span>}
                </>
            ),
        },
        { data: (row) => row.category?.name ?? '', title: t('attributes.table.category') },
        {
            data: 'type',
            title: t('attributes.table.type'),
            render: (data, row) => <AttributeTypeBadge type={row.type} />,
        },
        { data: 'description', title: t('attributes.table.description') },
    ], [t])

    const mode = onToggleRow ? TABLE_MODE.MULTIPLE : TABLE_MODE.READ_ONLY

    return (
        <div>
            <div className="row g-2 mb-3">
                <div className="col-12 col-md-6 col-lg-4">
                    <Form.Control
                        type="search"
                        placeholder={t('attributes.searchPlaceholder')}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        aria-label={t('attributes.searchPlaceholder')}
                    />
                </div>
                <div className="col-12 col-md-6 col-lg-3">
                    <Form.Select
                        value={categoryId}
                        onChange={(event) => setCategoryId(event.target.value)}
                        aria-label={t('attributes.categoryFilter')}
                    >
                        <option value="">{t('attributes.allCategories')}</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </Form.Select>
                </div>
            </div>

            {recentAttributes.length > 0 && (
                <div className="mb-3">
                    <div className="text-muted small mb-1">{t('attributes.recentlyUsed')}</div>
                    <div className="d-flex flex-wrap gap-2">
                        {recentAttributes.map((attribute) => (
                            <button
                                key={attribute.id}
                                type="button"
                                className={`btn btn-sm ${selectedIds.includes(attribute.id) ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => onToggleRow?.(attribute)}
                            >
                                {attribute.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {error && <div className="alert alert-danger">{error}</div>}
            {loading && <div className="text-muted mb-2">{t('attributes.loading')}</div>}

            <CommonDataTable
                data={loading ? [] : visibleAttributes}
                columns={columns}
                emptyMessage={t('attributes.empty')}
                mode={mode}
                selectedIds={selectedIds}
                onToggleRow={onToggleRow}
                onToggleAll={onToggleAll}
                getRowLabel={(attribute) => attribute.name}
            />
        </div>
    )
}

export default AttributeList
