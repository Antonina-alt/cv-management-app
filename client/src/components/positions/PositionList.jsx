import { useEffect, useMemo, useRef, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import DataTable from 'datatables.net-react'
import DT from 'datatables.net-bs5'
import 'datatables.net-bs5/css/dataTables.bootstrap5.css'
import { listPositions } from '../../api/positions.js'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { wireCheckboxCell } from '../../lib/dataTableCheckbox.js'
import AccessBadge from '../common/AccessBadge.jsx'

// eslint-disable-next-line react-hooks/rules-of-hooks -- DataTables static registration, not a React hook
DataTable.use(DT)

const LEVELS = ['JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD', 'C_LEVEL']

const PositionList = ({ selectedIds = [], onToggleRow, onToggleAll, refreshToken, onRowClick }) => {
    const { t } = useTranslation()
    const [company, setCompany] = useState('')
    const [level, setLevel] = useState('')
    const { data: loaded, loading, error } = useAsyncData(
        () => listPositions({ company: company || undefined, level: level || undefined }),
        [company, level, refreshToken],
        { debounceMs: 200 },
    )
    const positions = loaded ?? []
    const dtRef = useRef(null)
    const headerCheckboxRef = useRef(null)
    const onToggleRowRef = useRef(onToggleRow)
    const onToggleAllRef = useRef(onToggleAll)
    const positionsRef = useRef(positions)

    useEffect(() => {
        onToggleRowRef.current = onToggleRow
        onToggleAllRef.current = onToggleAll
        positionsRef.current = positions
    })

    const columns = useMemo(() => [
        ...(onToggleRow ? [{ data: null, title: '', orderable: false, className: 'dt-checkbox-column', width: '1%' }] : []),
        { data: 'title', title: t('positions.table.title') },
        { data: 'company', title: t('positions.table.company') },
        { data: 'level', title: t('positions.table.level') },
        { data: 'isPublic', title: t('positions.table.access') },
        { data: (row) => row.attributes?.length ?? 0, title: t('positions.table.attributes') },
        { data: (row) => row._count?.resumes ?? 0, title: t('positions.table.resumes') },
    ], [t, onToggleRow])

    const offset = onToggleRow ? 1 : 0

    const slots = useMemo(() => ({
        [2 + offset]: (data, row) => (row.level ? t(`positions.levels.${row.level}`) : ''),
        [3 + offset]: (data, row) => <AccessBadge isPublic={row.isPublic} />,
    }), [t, offset])

    const options = useMemo(() => ({
        searching: false,
        autoWidth: false,
        language: { emptyTable: t('positions.empty') },
        createdRow: (row, data) => {
            row.style.cursor = onToggleRowRef.current || onRowClick ? 'pointer' : ''
            row.onclick = () => {
                if (onToggleRowRef.current) onToggleRowRef.current(data)
                else onRowClick?.(data)
            }
            if (!onToggleRowRef.current) return
            wireCheckboxCell(row.cells[0], data.title, () => onToggleRowRef.current?.(data))
        },
        initComplete: function initComplete() {
            if (!onToggleAllRef.current) return
            const headerCell = this.api().table().header().querySelector('th')
            wireCheckboxCell(headerCell, t('positions.selectAll'), (checked) => onToggleAllRef.current?.(positionsRef.current, checked))
            headerCheckboxRef.current = headerCell.querySelector('input')
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
            const selectedCount = positions.filter((p) => selectedIds.includes(p.id)).length
            headerCheckbox.checked = positions.length > 0 && selectedCount === positions.length
            headerCheckbox.indeterminate = selectedCount > 0 && selectedCount < positions.length
        }
    }, [selectedIds, positions, onToggleRow])

    return (
        <div>
            <div className="d-flex flex-wrap gap-2 mb-3">
                <Form.Control
                    type="search"
                    style={{ maxWidth: 220 }}
                    placeholder={t('positions.companyFilter')}
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    aria-label={t('positions.companyFilter')}
                />
                <Form.Select
                    style={{ maxWidth: 200 }}
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    aria-label={t('positions.levelFilter')}
                >
                    <option value="">{t('positions.allLevels')}</option>
                    {LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>{t(`positions.levels.${lvl}`)}</option>
                    ))}
                </Form.Select>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {loading && <div className="text-muted mb-2">{t('positions.loading')}</div>}

            <DataTable
                ref={dtRef}
                data={loading ? [] : positions}
                columns={columns}
                slots={slots}
                options={options}
                className="table table-hover"
            />
        </div>
    )
}

export default PositionList
