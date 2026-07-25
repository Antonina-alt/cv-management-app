import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { listRecentPositions } from '../../api/home.js'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useTableLink } from '../../hooks/useTableLink.js'
import CommonDataTable from '../common/CommonDataTable.jsx'
import AccessBadge from '../common/AccessBadge.jsx'
import ErrorAlert from '../common/ErrorAlert.jsx'

const fetchRecent = () => listRecentPositions({ limit: 5 })
const tableOptions = { paging: false, info: false, ordering: false }

const RecentPositionsTable = () => {
    const { t } = useTranslation()
    const tableLink = useTableLink()
    const { data, loading, error } = useAsyncData(fetchRecent)
    const positions = Array.isArray(data) ? data : []

    const columns = useMemo(() => [
        {
            data: 'title',
            title: t('positions.table.title'),
            className: 'all text-break',
            render: (value, row) => <a {...tableLink(`/positions/${row.id}`)}>{row.title}</a>,
        },
        { data: 'company', title: t('positions.table.company'), className: 'min-tablet-p text-break' },
        {
            data: 'level',
            title: t('positions.table.level'),
            className: 'min-tablet-l',
            render: (value, row) => (row.level ? t(`positions.levels.${row.level}`) : ''),
        },
        {
            data: 'isPublic',
            title: t('positions.table.access'),
            className: 'text-end',
            responsivePriority: 2,
            render: (value, row) => <AccessBadge isPublic={row.isPublic} />,
        },
        { data: (row) => row._count?.resumes ?? 0, title: t('positions.table.resumes'), className: 'min-tablet-p text-start text-md-end' },
    ], [t, tableLink])

    if (error) return <ErrorAlert error={error} />
    if (loading) return <p className="text-muted">{t('positions.loading')}</p>

    return (
        <CommonDataTable
            data={positions}
            columns={columns}
            emptyMessage={t('positions.empty')}
            options={tableOptions}
            className="table table-sm table-hover align-middle w-100"
        />
    )
}

export default RecentPositionsTable
