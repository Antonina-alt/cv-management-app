import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import CommonDataTable from '../common/CommonDataTable.jsx'
import { formatName } from '../../lib/formatName.js'
import { useTableLink } from '../../hooks/useTableLink.js'

const tableOptions = { paging: false, info: false, ordering: false }

const PositionResumesTable = ({ resumes }) => {
    const { t } = useTranslation()
    const tableLink = useTableLink()

    const columns = useMemo(() => [
        {
            data: (row) => formatName(row.candidate),
            title: t('positions.resumes.candidate'),
            render: (value, row) => (
                row.status === 'PUBLISHED'
                    ? <a {...tableLink(`/resumes/${row.id}`)}>{formatName(row.candidate)}</a>
                    : formatName(row.candidate)
            ),
        },
        {
            data: 'status',
            title: t('positions.resumes.status'),
            render: (value, row) => t(`resume.status.${row.status}`),
        },
        { data: (row) => row._count?.likes ?? 0, title: t('positions.resumes.likes') },
    ], [t, tableLink])

    return (
        <CommonDataTable
            data={resumes}
            columns={columns}
            emptyMessage={t('positions.resumes.empty')}
            options={tableOptions}
        />
    )
}

export default PositionResumesTable
