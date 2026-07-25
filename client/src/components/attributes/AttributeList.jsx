import { useCallback, useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { listAttributeCategories, listAttributes } from '../../api/attributes.js'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { getRecentAttributeIds } from '../../lib/recentAttributes.js'
import CommonDataTable from '../common/CommonDataTable.jsx'
import { TABLE_MODE } from '../../lib/tableMode.js'
import DismissibleAlert from '../common/DismissibleAlert.jsx'
import AttributeTypeBadge from './AttributeTypeBadge.jsx'

const AttributeList = ({ selectedIds = [], onToggleRow = undefined, onToggleAll = undefined, refreshToken = 0, excludeIds = undefined, excludeSystem = false }) => {
    const { t } = useTranslation()
    const [categoryId, setCategoryId] = useState('')
    const [query, setQuery] = useState('')
    const fetchAttributes = useCallback(() => listAttributes({ q: query || undefined, categoryId: categoryId || undefined }), [categoryId, query])
    const { data, loading, error } = useAsyncData(fetchAttributes, { debounceMs: 200, refreshKey: refreshToken })
    const { data: categoryData } = useAsyncData(listAttributeCategories)
    const categories = categoryData ?? []
    const visible = useMemo(() => (data ?? []).filter((attribute) => (!excludeSystem || !attribute.systemKey) && (!excludeIds || !excludeIds.includes(attribute.id))), [data, excludeIds, excludeSystem],)
    const recent = getRecentAttributeIds().map((id) => visible.find((attribute) => attribute.id === id)).filter(Boolean)
    const columns = useMemo(() => [
        { data: 'name', title: t('attributes.table.name'), className: 'all text-break', render: (_, row) => <>{row.name}{row.systemKey && <span className="badge text-bg-info ms-2">{t('attributes.systemBadge')}</span>}</> },
        { data: (row) => row.category?.name ?? '', title: t('attributes.table.category'), className: 'min-tablet-l text-break' },
        { data: 'type', title: t('attributes.table.type'), className: 'min-tablet-p', render: (_, row) => <AttributeTypeBadge type={row.type} /> },
        { data: 'description', title: t('attributes.table.description'), className: 'desktop text-break' },
    ], [t])
    return (
        <div>
            <div className="row g-2 mb-3">
                <div className="col-12 col-md-6 col-lg-4"><Form.Control type="search" placeholder={t('attributes.searchPlaceholder')} value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t('attributes.searchPlaceholder')} /></div>
                <div className="col-12 col-md-6 col-lg-3">
                    <Form.Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-label={t('attributes.categoryFilter')}>
                        <option value="">{t('attributes.allCategories')}</option>
                        {categories.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
                    </Form.Select>
                </div>
            </div>
            {recent.length > 0 && (
                <div className="mb-3">
                    <div className="text-muted small mb-1">{t('attributes.recentlyUsed')}</div>
                    <div className="d-flex flex-wrap gap-2">{recent.map((attribute) => <Button key={attribute.id} size="sm" variant={selectedIds.includes(attribute.id) ? 'primary' : 'outline-secondary'} onClick={() => onToggleRow?.(attribute)}>{attribute.name}</Button>)}</div>
                </div>
            )}
            <DismissibleAlert variant="danger">{error}</DismissibleAlert>
            {loading ? (<div className="text-muted mb-2">{t('admin.loading')}</div>) : (
                <CommonDataTable data={visible} columns={columns} emptyMessage={t('attributes.empty')} mode={onToggleRow ? TABLE_MODE.MULTIPLE : TABLE_MODE.READ_ONLY} selectedIds={selectedIds} onToggleRow={onToggleRow} onToggleAll={onToggleAll} getRowLabel={(attribute) => attribute.name} />
            )}
        </div>
    )
}

export default AttributeList
