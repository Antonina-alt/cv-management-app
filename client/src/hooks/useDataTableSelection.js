import { useEffect, useRef } from 'react'
import { SELECT_COLUMN_INDEX } from '../lib/dataTableConfig.js'

const syncRow = (row, selected) => {
    row.classList.toggle('table-active', selected)
    const checkbox = row.cells[SELECT_COLUMN_INDEX]?.querySelector('input[type="checkbox"]')
    if (checkbox) checkbox.checked = selected
}

export const useDataTableSelection = ({ tableRef, data, selectedIds, getRowId, enabled }) => {
    const headerCheckboxRef = useRef(null)
    useEffect(() => {
        const api = tableRef.current?.dt()
        if (!api) return
        api.columns.adjust()
        api.responsive?.recalc?.()
        if (!enabled) return
        api.rows().every(function updateRow() {
            const row = this.node()
            if (row) syncRow(row, selectedIds.includes(getRowId(this.data())))
        })
        const selectedCount = data.filter((row) => selectedIds.includes(getRowId(row))).length
        const checkbox = headerCheckboxRef.current
        if (!checkbox) return
        checkbox.checked = data.length > 0 && selectedCount === data.length
        checkbox.indeterminate = selectedCount > 0 && selectedCount < data.length
    }, [data, enabled, getRowId, selectedIds, tableRef])
    return headerCheckboxRef
}
