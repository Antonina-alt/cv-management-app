import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DataTable from 'datatables.net-react'
import DT from 'datatables.net-bs5'
import 'datatables.net-bs5/css/dataTables.bootstrap5.css'
import 'datatables.net-responsive'
import 'datatables.net-responsive-bs5/css/responsive.bootstrap5.css'
import { wireCheckboxCell } from '../../lib/dataTableCheckbox.js'

DataTable.use(DT)

export const TABLE_MODE = {
    READ_ONLY: 'readOnly',
    MULTIPLE: 'multiple',
}

const defaultRowId = (row) => row.id
const defaultRowLabel = (row) => String(row.id ?? '')
const emptyOptions = {}
const CONTROL_COLUMN_INDEX = 0
const SELECT_COLUMN_INDEX = 1

const hasModifier = (event) => event.metaKey || event.altKey || event.ctrlKey || event.shiftKey

const CommonDataTable = ({
    data = [],
    columns,
    emptyMessage,
    mode = TABLE_MODE.READ_ONLY,
    selectedIds = [],
    onToggleRow,
    onToggleAll,
    onRowClick,
    getRowId = defaultRowId,
    getRowLabel = defaultRowLabel,
    options = emptyOptions,
    className = 'table table-hover align-middle w-100',
}) => {
    const { t, i18n } = useTranslation()
    const navigate = useNavigate()
    const containerRef = useRef(null)
    const tableRef = useRef(null)
    const headerCheckboxRef = useRef(null)
    const dataRef = useRef(data)
    const handlersRef = useRef({ onToggleRow, onToggleAll, onRowClick })
    const selectedIdsRef = useRef(selectedIds)
    const getRowIdRef = useRef(getRowId)
    const getRowLabelRef = useRef(getRowLabel)
    const isMultiple = mode === TABLE_MODE.MULTIPLE
    const dataColumnOffset = isMultiple ? 2 : 1

    useEffect(() => {
        dataRef.current = data
        handlersRef.current = { onToggleRow, onToggleAll, onRowClick }
        selectedIdsRef.current = selectedIds
        getRowIdRef.current = getRowId
        getRowLabelRef.current = getRowLabel
    })

    useEffect(() => {
        const container = containerRef.current
        if (!container) return undefined

        const handleResponsiveLink = (event) => {
            const link = event.target.closest('.dtr-details a[href]')
            if (!link || event.defaultPrevented || event.button !== 0 || hasModifier(event)) return
            if (link.target === '_blank' || link.origin !== window.location.origin) return

            event.preventDefault()
            navigate(`${link.pathname}${link.search}${link.hash}`)
        }

        container.addEventListener('click', handleResponsiveLink)
        return () => container.removeEventListener('click', handleResponsiveLink)
    }, [navigate])

    const tableColumns = useMemo(() => {
        const responsiveControl = {
            data: null,
            title: '',
            defaultContent: '',
            className: 'dtr-control all text-center',
            orderable: false,
            searchable: false,
            width: '1%',
            responsivePriority: 1,
        }

        const configured = columns.map(({ render, mobile, ...column }, index) => ({
            responsivePriority: column.responsivePriority ?? index + 2,
            ...column,
        }))

        if (!isMultiple) return [responsiveControl, ...configured]

        return [
            responsiveControl,
            {
                data: null,
                title: '',
                defaultContent: '',
                className: 'all text-center',
                orderable: false,
                searchable: false,
                width: '1%',
                responsivePriority: 1,
            },
            ...configured,
        ]
    }, [columns, isMultiple])

    const slots = useMemo(() => columns.reduce((result, column, index) => {
        if (column.render) result[index + dataColumnOffset] = column.render
        return result
    }, {}), [columns, dataColumnOffset])

    const language = useMemo(() => ({
        emptyTable: emptyMessage,
        zeroRecords: t('common.dataTable.zeroRecords'),
        info: t('common.dataTable.info'),
        infoEmpty: t('common.dataTable.infoEmpty'),
        infoFiltered: t('common.dataTable.infoFiltered'),
        lengthMenu: t('common.dataTable.lengthMenu'),
        loadingRecords: t('common.dataTable.loading'),
        processing: t('common.dataTable.processing'),
        search: t('common.dataTable.search'),
        searchPlaceholder: t('common.dataTable.searchPlaceholder'),
        aria: {
            sortAscending: t('common.dataTable.sortAscending'),
            sortDescending: t('common.dataTable.sortDescending'),
        },
        paginate: {
            first: t('common.dataTable.first'),
            last: t('common.dataTable.last'),
            next: t('common.dataTable.next'),
            previous: t('common.dataTable.previous'),
        },
    }), [emptyMessage, t])

    const tableOptions = useMemo(() => {
        const callerCreatedRow = options.createdRow
        const callerInitComplete = options.initComplete
        const callerRowCallback = options.rowCallback
        const callerResponsive = typeof options.responsive === 'object' ? options.responsive : {}
        const callerDetails = typeof callerResponsive.details === 'object' ? callerResponsive.details : {}

        return {
            searching: false,
            autoWidth: false,
            deferRender: true,
            ...options,
            order: options.order ?? [[dataColumnOffset, 'asc']],
            responsive: options.responsive === false ? false : {
                ...callerResponsive,
                details: {
                    type: 'column',
                    target: CONTROL_COLUMN_INDEX,
                    ...callerDetails,
                },
            },
            language: {
                ...language,
                ...options.language,
                aria: {
                    ...language.aria,
                    ...options.language?.aria,
                },
                paginate: {
                    ...language.paginate,
                    ...options.language?.paginate,
                },
            },
            rowCallback: (row, rowData, displayNumber, displayIndex, dataIndex) => {
                if (isMultiple) {
                    const isSelected = selectedIdsRef.current.includes(getRowIdRef.current(rowData))
                    row.classList.toggle('table-active', isSelected)
                    const checkbox = row.cells[SELECT_COLUMN_INDEX]?.querySelector('input[type="checkbox"]')
                    if (checkbox) checkbox.checked = isSelected
                }

                callerRowCallback?.(row, rowData, displayNumber, displayIndex, dataIndex)
            },
            createdRow: (row, rowData, dataIndex, cells) => {
                const isInteractive = isMultiple || handlersRef.current.onRowClick
                row.style.cursor = isInteractive ? 'pointer' : ''
                row.onclick = (event) => {
                    if (event.target.closest('.dtr-control, a, button, input, select, textarea, label')) return
                    if (isMultiple) handlersRef.current.onToggleRow?.(rowData)
                    else handlersRef.current.onRowClick?.(rowData)
                }

                if (isMultiple) {
                    wireCheckboxCell(
                        row.cells[SELECT_COLUMN_INDEX],
                        getRowLabelRef.current(rowData),
                        () => handlersRef.current.onToggleRow?.(rowData),
                    )
                }

                callerCreatedRow?.(row, rowData, dataIndex, cells)
            },
            initComplete: function initComplete(settings, json) {
                if (isMultiple) {
                    const headerCell = this.api().table().header().querySelectorAll('th')[SELECT_COLUMN_INDEX]
                    wireCheckboxCell(
                        headerCell,
                        t('common.dataTable.selectAll'),
                        (checked) => handlersRef.current.onToggleAll?.(dataRef.current, checked),
                    )
                    headerCheckboxRef.current = headerCell.querySelector('input')
                }

                const api = this.api()
                api.columns.adjust()
                api.responsive?.recalc?.()
                callerInitComplete?.call(this, settings, json)
            },
        }
    }, [dataColumnOffset, isMultiple, language, options, t])

    useEffect(() => {
        const api = tableRef.current?.dt()
        if (!api) return

        api.columns.adjust()
        api.responsive?.recalc?.()
        if (!isMultiple) return

        api.rows().every(function syncSelection() {
            const row = this.node()
            if (!row) return

            const isSelected = selectedIds.includes(getRowId(this.data()))
            row.classList.toggle('table-active', isSelected)
            const checkbox = row.cells[SELECT_COLUMN_INDEX]?.querySelector('input[type="checkbox"]')
            if (checkbox) checkbox.checked = isSelected
        })

        const selectedCount = data.filter((row) => selectedIds.includes(getRowId(row))).length
        const headerCheckbox = headerCheckboxRef.current
        if (!headerCheckbox) return

        headerCheckbox.checked = data.length > 0 && selectedCount === data.length
        headerCheckbox.indeterminate = selectedCount > 0 && selectedCount < data.length
    }, [data, getRowId, isMultiple, selectedIds])

    const tableKey = `${i18n.resolvedLanguage}:${mode}:${columns.length}`

    return (
        <div ref={containerRef} className="w-100">
            <DataTable
                key={tableKey}
                ref={tableRef}
                data={data}
                columns={tableColumns}
                slots={slots}
                options={tableOptions}
                className={className}
            />
        </div>
    )
}

export default CommonDataTable
