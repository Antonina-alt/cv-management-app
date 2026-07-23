import { useEffect, useMemo, useRef, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import DataTable from 'datatables.net-react'
import DT from 'datatables.net-bs5'
import 'datatables.net-bs5/css/dataTables.bootstrap5.css'
import { listUsers } from '../../api/admin.js'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { formatName } from '../../lib/formatName.js'

// eslint-disable-next-line react-hooks/rules-of-hooks -- DataTables static registration, not a React hook
DataTable.use(DT)

const UserList = ({ selectedIds = [], onToggleRow, onToggleAll, refreshToken }) => {
    const { t } = useTranslation()
    const [q, setQ] = useState('')
    const { data: loaded, loading, error } = useAsyncData(
        () => listUsers({ q: q || undefined }),
        [q, refreshToken],
        { debounceMs: 200 },
    )
    const users = loaded ?? []
    const dtRef = useRef(null)
    const headerCheckboxRef = useRef(null)
    const onToggleRowRef = useRef(onToggleRow)
    const onToggleAllRef = useRef(onToggleAll)
    const usersRef = useRef(users)

    useEffect(() => {
        onToggleRowRef.current = onToggleRow
        onToggleAllRef.current = onToggleAll
        usersRef.current = users
    })

    const columns = useMemo(() => [
        ...(onToggleRow ? [{ data: null, title: '', orderable: false, className: 'dt-checkbox-column', width: '1%' }] : []),
        { data: (row) => formatName(row), title: t('admin.table.name') },
        { data: 'email', title: t('admin.table.email') },
        { data: (row) => row.roles.join(', '), title: t('admin.table.roles') },
        { data: 'isBlocked', title: t('admin.table.status') },
        { data: (row) => new Date(row.createdAt).toLocaleDateString(), title: t('admin.table.createdAt') },
    ], [t, onToggleRow])

    const offset = onToggleRow ? 1 : 0

    const slots = useMemo(() => ({
        [2 + offset]: (data, row) => (
            <span className="d-flex flex-wrap gap-1">
                {row.roles.map((role) => (
                    <span key={role} className="badge text-bg-secondary">{t(`admin.roles.${role}`)}</span>
                ))}
            </span>
        ),
        [3 + offset]: (data, row) => (
            <span className={`badge ${row.isBlocked ? 'text-bg-danger' : 'text-bg-success'}`}>
                {t(row.isBlocked ? 'admin.status.blocked' : 'admin.status.active')}
            </span>
        ),
    }), [t, offset])

    const options = useMemo(() => ({
        searching: false,
        autoWidth: false,
        language: { emptyTable: t('admin.empty') },
        createdRow: (row, data) => {
            row.style.cursor = onToggleRowRef.current ? 'pointer' : ''
            row.onclick = () => onToggleRowRef.current?.(data)

            if (!onToggleRowRef.current) return

            const checkboxCell = row.cells[0]
            checkboxCell.style.width = '1px'
            checkboxCell.style.whiteSpace = 'nowrap'
            const checkbox = document.createElement('input')
            checkbox.type = 'checkbox'
            checkbox.className = 'form-check-input'
            checkbox.setAttribute('aria-label', formatName(data))
            checkbox.onclick = (e) => {
                e.stopPropagation()
                onToggleRowRef.current?.(data)
            }
            checkboxCell.replaceChildren(checkbox)
        },
        initComplete: function initComplete() {
            if (!onToggleAllRef.current) return
            const headerCell = this.api().table().header().querySelector('th')
            headerCell.style.width = '1px'
            headerCell.style.whiteSpace = 'nowrap'
            const checkbox = document.createElement('input')
            checkbox.type = 'checkbox'
            checkbox.className = 'form-check-input'
            checkbox.setAttribute('aria-label', t('admin.selectAll'))
            checkbox.onclick = (e) => {
                e.stopPropagation()
                onToggleAllRef.current?.(usersRef.current, e.target.checked)
            }
            headerCell.replaceChildren(checkbox)
            headerCheckboxRef.current = checkbox
        },
    }), [t])

    useEffect(() => {
        const api = dtRef.current?.dt()
        if (!api || !onToggleRow) return
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
            const selectedCount = users.filter((u) => selectedIds.includes(u.id)).length
            headerCheckbox.checked = users.length > 0 && selectedCount === users.length
            headerCheckbox.indeterminate = selectedCount > 0 && selectedCount < users.length
        }
    }, [selectedIds, users, onToggleRow])

    return (
        <div>
            <div className="d-flex flex-wrap gap-2 mb-3">
                <Form.Control
                    type="search"
                    style={{ maxWidth: 260 }}
                    placeholder={t('admin.searchPlaceholder')}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    aria-label={t('admin.searchPlaceholder')}
                />
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {loading && <div className="text-muted mb-2">{t('admin.loading')}</div>}

            <DataTable
                ref={dtRef}
                data={loading ? [] : users}
                columns={columns}
                slots={slots}
                options={options}
                className="table table-hover"
            />
        </div>
    )
}

export default UserList
