import { useEffect, useMemo, useRef, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import DataTable from 'datatables.net-react'
import DT from 'datatables.net-bs5'
import 'datatables.net-bs5/css/dataTables.bootstrap5.css'
import { listAttributeCategories, listAttributes } from '../../api/attributes.js'
import { getRecentAttributeIds } from '../../lib/recentAttributes.js'
import AttributeTypeBadge from './AttributeTypeBadge.jsx'

// eslint-disable-next-line react-hooks/rules-of-hooks -- DataTables static registration, not a React hook
DataTable.use(DT)

// Shared list used both as the manage-mode table (task 04, with a toolbar above it)
// and, later, as the attribute picker inside other forms (tasks 06/07).
const AttributeList = ({ selectedIds = [], onToggleRow, onToggleAll, refreshToken }) => {
    const { t } = useTranslation()
    const [categories, setCategories] = useState([])
    const [categoryId, setCategoryId] = useState('')
    const [query, setQuery] = useState('')
    const [attributes, setAttributes] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const dtRef = useRef(null)
    const headerCheckboxRef = useRef(null)
    const onToggleRowRef = useRef(onToggleRow)
    const onToggleAllRef = useRef(onToggleAll)
    const attributesRef = useRef(attributes)
    useEffect(() => {
        onToggleRowRef.current = onToggleRow
        onToggleAllRef.current = onToggleAll
        attributesRef.current = attributes
    })

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

    const columns = useMemo(() => [
        { data: null, title: '', orderable: false, className: 'dt-checkbox-column' },
        { data: 'name', title: t('attributes.table.name') },
        { data: (row) => row.category?.name ?? '', title: t('attributes.table.category') },
        { data: 'type', title: t('attributes.table.type') },
        { data: 'description', title: t('attributes.table.description') },
    ], [t])

    const slots = useMemo(() => ({
        1: (data, row) => (
            <>
                {row.name}
                {row.systemKey && (
                    <span className="badge text-bg-info ms-2">{t('attributes.systemBadge')}</span>
                )}
            </>
        ),
        3: (data, row) => <AttributeTypeBadge type={row.type} />,
        4: (data, row) => (
            <span className="text-truncate d-inline-block" style={{ maxWidth: 320 }}>{row.description}</span>
        ),
    }), [t])

    const options = useMemo(() => ({
        searching: false,
        language: { emptyTable: t('attributes.empty') },
        createdRow: (row, data) => {
            row.style.cursor = onToggleRowRef.current ? 'pointer' : ''
            row.onclick = () => onToggleRowRef.current?.(data)

            const checkboxCell = row.cells[0]
            const checkbox = document.createElement('input')
            checkbox.type = 'checkbox'
            checkbox.className = 'form-check-input'
            checkbox.setAttribute('aria-label', data.name)
            checkbox.onclick = (e) => {
                e.stopPropagation()
                onToggleRowRef.current?.(data)
            }
            checkboxCell.replaceChildren(checkbox)
        },
        initComplete: function initComplete() {
            const headerCell = this.api().table().header().querySelector('th')
            const checkbox = document.createElement('input')
            checkbox.type = 'checkbox'
            checkbox.className = 'form-check-input'
            checkbox.setAttribute('aria-label', t('attributes.selectAll'))
            checkbox.onclick = (e) => {
                e.stopPropagation()
                onToggleAllRef.current?.(attributesRef.current, e.target.checked)
            }
            headerCell.replaceChildren(checkbox)
            headerCheckboxRef.current = checkbox
        },
    }), [t])

    useEffect(() => {
        const api = dtRef.current?.dt()
        if (!api) return
        api.rows().every(function syncSelected() {
            const node = this.node()
            if (!node) return
            const isSelected = selectedIds.includes(this.data().id)
            node.classList.toggle('table-active', isSelected)
            const checkbox = node.querySelector('input[type="checkbox"]')
            if (checkbox) checkbox.checked = isSelected
        })

        const headerCheckbox = headerCheckboxRef.current
        if (headerCheckbox) {
            const selectedCount = attributes.filter((a) => selectedIds.includes(a.id)).length
            headerCheckbox.checked = attributes.length > 0 && selectedCount === attributes.length
            headerCheckbox.indeterminate = selectedCount > 0 && selectedCount < attributes.length
        }
    }, [selectedIds, attributes])

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
                                className={`btn btn-sm ${selectedIds.includes(attr.id) ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => onToggleRow?.(attr)}
                            >
                                {attr.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {error && <div className="alert alert-danger">{error}</div>}
            {loading && <div className="text-muted mb-2">{t('attributes.loading')}</div>}

            <DataTable
                ref={dtRef}
                data={loading ? [] : attributes}
                columns={columns}
                slots={slots}
                options={options}
                className="table table-hover"
            />
        </div>
    )
}

export default AttributeList
