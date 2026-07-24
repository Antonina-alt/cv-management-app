export const CONTROL_COLUMN_INDEX = 0
export const SELECT_COLUMN_INDEX = 1

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

const selectionColumn = {
    data: null,
    title: '',
    defaultContent: '',
    className: 'all text-center',
    orderable: false,
    searchable: false,
    width: '1%',
    responsivePriority: 1,
}

const toDataTableColumn = (source, index) => {
    const column = { ...source }
    delete column.render
    return {responsivePriority: column.responsivePriority ?? index + 2, ...column}
}

export const buildTableColumns = (columns, isMultiple) => {
    const configured = columns.map(toDataTableColumn)
    return isMultiple
        ? [responsiveControl, selectionColumn, ...configured]
        : [responsiveControl, ...configured]
}

export const buildTableSlots = (columns, offset) => columns.reduce((slots, column, index) => {
    if (column.render) slots[index + offset] = column.render
    return slots
}, {})

export const buildTableLanguage = (t, emptyMessage) => ({
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
        paginate: {
            first: t('common.dataTable.first'),
            previous: t('common.dataTable.previous'),
            next: t('common.dataTable.next'),
            last: t('common.dataTable.last'),
        },
    },
    paginate: {
        first: '&lt;&lt;',
        previous: '&lt;',
        next: '&gt;',
        last: '&gt;&gt;',
    },
})
