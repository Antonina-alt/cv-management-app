import { useMemo } from 'react'
import { Badge } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useTableLink } from '../../hooks/useTableLink.js'
import { formatName } from '../../lib/formatName.js'
import AccessBadge from '../common/AccessBadge.jsx'
import CommonDataTable from '../common/CommonDataTable.jsx'

const tableOptions = { paging: false, info: false, ordering: false }

const ResultTable = ({ title, data, columns, emptyMessage }) => data.length ? (
    <section><h5 className="mt-4">{title}</h5><CommonDataTable data={data} columns={columns} emptyMessage={emptyMessage} options={tableOptions} /></section>
) : null

const SearchResultTables = ({ results }) => {
    const { t } = useTranslation()
    const tableLink = useTableLink()
    const showCandidate = results.projects.some(({ candidate }) => Boolean(candidate))
    const positionColumns = useMemo(() => [
        { data: 'title', title: t('positions.table.title'), render: (_, row) => <a {...tableLink(`/positions/${row.id}`)}>{row.title}</a> },
        { data: 'company', title: t('positions.table.company') },
        { data: 'isPublic', title: t('positions.table.access'), render: (_, row) => <AccessBadge isPublic={row.isPublic} /> },
    ], [t, tableLink])
    const projectColumns = useMemo(() => [
        { data: 'title', title: t('profile.projects.titleColumn') },
        ...(showCandidate ? [{ data: (row) => formatName(row.candidate), title: t('positions.resumes.candidate') }] : []),
        { data: (row) => row.tags.join(', '), title: t('profile.projects.tags'), render: (_, row) => <span className="d-flex flex-wrap gap-1">{row.tags.map((tag) => <Badge key={tag} bg="secondary">{tag}</Badge>)}</span> },
    ], [showCandidate, t])
    const resumeColumns = useMemo(() => [
        { data: (row) => formatName(row.candidate), title: t('positions.resumes.candidate'), render: (_, row) => <a {...tableLink(`/resumes/${row.id}`)}>{formatName(row.candidate)}</a> },
        { data: (row) => row.position.title, title: t('positions.table.title') },
        { data: 'likeCount', title: t('positions.resumes.likes') },
    ], [t, tableLink])
    return (
        <>
            <ResultTable title={t('search.sections.positions')} data={results.positions} columns={positionColumns} emptyMessage={t('positions.empty')} />
            <ResultTable title={t('search.sections.projects')} data={results.projects} columns={projectColumns} emptyMessage={t('search.emptyAll')} />
            <ResultTable title={t('search.sections.resumes')} data={results.resumes} columns={resumeColumns} emptyMessage={t('profile.resumes.empty')} />
        </>
    )
}

export default SearchResultTables
