import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import CommonDataTable from '../common/CommonDataTable.jsx'
import { useTableLink } from '../../hooks/useTableLink.js'

const tableOptions = { paging: false, info: false, ordering: false }

const ResumesSection = ({ resumes }) => {
    const { t } = useTranslation()
    const tableLink = useTableLink()

    const columns = useMemo(() => [
        {
            data: (row) => row.position?.title ?? '',
            title: t('profile.resumes.position'),
            render: (value, row) => <a {...tableLink(`/resumes/${row.id}`)}>{row.position?.title}</a>,
        },
        {
            data: 'status',
            title: t('profile.resumes.status'),
            render: (value, row) => t(`resume.status.${row.status}`),
        },
        { data: (row) => row._count?.likes ?? 0, title: t('profile.resumes.likes') },
    ], [t, tableLink])

    return (
        <CommonDataTable
            data={resumes}
            columns={columns}
            emptyMessage={t('profile.resumes.empty')}
            options={tableOptions}
        />
    )
}

export default ResumesSection
