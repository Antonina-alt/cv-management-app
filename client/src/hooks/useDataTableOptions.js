import { useMemo } from 'react'
import { wireCheckboxCell } from '../lib/dataTableCheckbox.js'
import { CONTROL_COLUMN_INDEX, SELECT_COLUMN_INDEX } from '../lib/dataTableConfig.js'
import { useLatest } from './useLatest.js'
import DT from 'datatables.net-bs5'

const responsiveRenderer = DT.Responsive.renderer.listHiddenNodes()
const shouldIgnoreRowClick = (target) => target.closest('.dtr-control, a, button, input, select, textarea, label')
const mergeLanguage = (base, custom = {}) => ({
    ...base,
    ...custom,
    aria: { ...base.aria, ...custom.aria, paginate: {...base.aria?.paginate, ...custom.aria?.paginate} },
    paginate: { ...base.paginate, ...custom.paginate },
})

export const useDataTableOptions = ({
    options,
    language,
    dataColumnOffset,
    isMultiple,
    data,
    selectedIds,
    getRowId,
    getRowLabel,
    onToggleRow,
    onToggleAll,
    onRowClick,
    headerCheckboxRef,
    selectAllLabel
}) => {
    const dataRef = useLatest(data)
    const selectedRef = useLatest(selectedIds)
    const handlersRef = useLatest({ onToggleRow, onToggleAll, onRowClick })
    const getRowIdRef = useLatest(getRowId)
    const getRowLabelRef = useLatest(getRowLabel)

    return useMemo(() => {
        const responsive = typeof options.responsive === 'object' ? options.responsive : {}
        const details = typeof responsive.details === 'object' ? responsive.details : {}
        const caller = { row: options.rowCallback, created: options.createdRow, initialized: options.initComplete }
        return {
            searching: false,
            autoWidth: false,
            deferRender: true,
            pagingType: 'full_numbers',
            ...options,
            order: options.order ?? [[dataColumnOffset, 'asc']],
            responsive: options.responsive === false ? false : { ...responsive, details: { type: 'column', target: CONTROL_COLUMN_INDEX, renderer: responsiveRenderer, ...details } },
            language: mergeLanguage(language, options.language),
            rowCallback: (row, rowData, ...args) => {
                if (isMultiple) {
                    const selected = selectedRef.current.includes(getRowIdRef.current(rowData))
                    row.classList.toggle('table-active', selected)
                    const checkbox = row.cells[SELECT_COLUMN_INDEX]?.querySelector('input[type="checkbox"]')
                    if (checkbox) checkbox.checked = selected
                }
                caller.row?.(row, rowData, ...args)
            },
            createdRow: (row, rowData, ...args) => {
                row.style.cursor = isMultiple || handlersRef.current.onRowClick ? 'pointer' : ''
                row.onclick = (event) => {
                    if (shouldIgnoreRowClick(event.target)) return
                    isMultiple ? handlersRef.current.onToggleRow?.(rowData) : handlersRef.current.onRowClick?.(rowData)
                }
                if (isMultiple) wireCheckboxCell(row.cells[SELECT_COLUMN_INDEX], getRowLabelRef.current(rowData), () => handlersRef.current.onToggleRow?.(rowData))
                caller.created?.(row, rowData, ...args)
            },
            initComplete: function initComplete(settings, json) {
                if (isMultiple) {
                    const cell = this.api().table().header().querySelectorAll('th')[SELECT_COLUMN_INDEX]
                    wireCheckboxCell(cell, selectAllLabel, (checked) => handlersRef.current.onToggleAll?.(dataRef.current, checked))
                    headerCheckboxRef.current = cell.querySelector('input')
                }
                const api = this.api()
                api.columns.adjust()
                api.responsive?.recalc?.()
                caller.initialized?.call(this, settings, json)
            },
        }
    }, [dataColumnOffset, dataRef, getRowIdRef, getRowLabelRef, handlersRef, headerCheckboxRef, isMultiple, language, options, selectAllLabel, selectedRef])
}
