import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { listRecentPositions } from '../../api/home.js'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useTableLink } from '../../hooks/useTableLink.js'
import CommonDataTable from '../common/CommonDataTable.jsx'
import AccessBadge from '../common/AccessBadge.jsx'

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
            render: (value, row) => <a {...tableLink(`/positions/${row.id}`)}>{row.title}</a>,
        },
        { data: 'company', title: t('positions.table.company') },
        {
            data: 'level',
            title: t('positions.table.level'),
            render: (value, row) => (row.level ? t(`positions.levels.${row.level}`) : ''),
        },
        {
            data: 'isPublic',
            title: t('positions.table.access'),
            render: (value, row) => <AccessBadge isPublic={row.isPublic} />,
        },
        { data: (row) => row._count?.resumes ?? 0, title: t('positions.table.resumes') },
    ], [t, tableLink])

    if (error) return <div className="alert alert-danger">{error}</div>
    if (loading) return <p className="text-muted">{t('positions.loading')}</p>

    return (
        <CommonDataTable
            data={positions}
            columns={columns}
            emptyMessage={t('positions.empty')}
            options={tableOptions}
        />
    )
}

export default RecentPositionsTable
