import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import 'datatables.net-bs5/css/dataTables.bootstrap5.css'
import 'datatables.net-responsive'
import 'datatables.net-responsive-bs5/css/responsive.bootstrap5.css'
import { useDataTableOptions } from '../../hooks/useDataTableOptions.js'
import { useDataTableSelection } from '../../hooks/useDataTableSelection.js'
import { useResponsiveTableLinks } from '../../hooks/useResponsiveTableLinks.js'
import { buildTableColumns, buildTableLanguage, buildTableSlots } from '../../lib/dataTableConfig.js'
import DataTable from '../../lib/dataTableAdapter.js'
import { TABLE_MODE } from '../../lib/tableMode.js'
import EmptyState from './EmptyState.jsx'

const defaultRowId = (row) => row.id
const defaultRowLabel = (row) => String(row.id ?? '')
const emptyOptions = {}

const CommonDataTable = ({ data = [], columns, emptyMessage, mode = TABLE_MODE.READ_ONLY, selectedIds = [], onToggleRow = undefined, onToggleAll = undefined, onRowClick = undefined, getRowId = defaultRowId, getRowLabel = defaultRowLabel, options = emptyOptions, className = 'table table-hover align-middle w-100' }) => {
    const { t, i18n } = useTranslation()
    const containerRef = useRef(null)
    const tableRef = useRef(null)
    const isMultiple = mode === TABLE_MODE.MULTIPLE
    const offset = isMultiple ? 2 : 1
    const tableColumns = useMemo(() => buildTableColumns(columns, isMultiple), [columns, isMultiple])
    const slots = useMemo(() => buildTableSlots(columns, offset), [columns, offset])
    const language = useMemo(() => buildTableLanguage(t, emptyMessage), [emptyMessage, t])
    const headerCheckboxRef = useDataTableSelection({ tableRef, data, selectedIds, getRowId, enabled: isMultiple })
    const tableOptions = useDataTableOptions({ options, language, dataColumnOffset: offset, isMultiple, data, selectedIds, getRowId, getRowLabel, onToggleRow, onToggleAll, onRowClick, headerCheckboxRef, selectAllLabel: t('common.dataTable.selectAll') })
    useResponsiveTableLinks(containerRef)
    if (!data.length) {
        return <EmptyState>{emptyMessage}</EmptyState>
    }
    return (
        <div ref={containerRef} className="w-100">
            <DataTable key={`${i18n.resolvedLanguage}:${mode}:${columns.length}`} ref={tableRef} data={data} columns={tableColumns} slots={slots} options={tableOptions} className={className} />
        </div>
    )
}

export default CommonDataTable
