import { useMemo, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { listPositions } from '../../api/positions.js'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useTableLink } from '../../hooks/useTableLink.js'
import CommonDataTable, { TABLE_MODE } from '../common/CommonDataTable.jsx'
import AccessBadge from '../common/AccessBadge.jsx'

const LEVELS = ['JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD', 'C_LEVEL']

const PositionList = ({ selectedIds = [], onToggleRow, onToggleAll, refreshToken }) => {
    const { t } = useTranslation()
    const tableLink = useTableLink()
    const [company, setCompany] = useState('')
    const [level, setLevel] = useState('')
    const { data: loaded, loading, error } = useAsyncData(
        () => listPositions({ company: company || undefined, level: level || undefined }),
        [company, level, refreshToken],
        { debounceMs: 200 },
    )
    const positions = loaded ?? []

    const columns = useMemo(() => [
        {
            data: 'title',
            title: t('positions.table.title'),
            render: (data, row) => <a {...tableLink(`/positions/${row.id}`)}>{row.title}</a>,
        },
        { data: 'company', title: t('positions.table.company') },
        {
            data: 'level',
            title: t('positions.table.level'),
            render: (data, row) => (row.level ? t(`positions.levels.${row.level}`) : ''),
        },
        {
            data: 'isPublic',
            title: t('positions.table.access'),
            render: (data, row) => <AccessBadge isPublic={row.isPublic} />,
        },
        { data: (row) => row.attributes?.length ?? 0, title: t('positions.table.attributes') },
        { data: (row) => row._count?.resumes ?? 0, title: t('positions.table.resumes') },
    ], [t, tableLink])

    return (
        <div>
            <div className="row g-2 mb-3">
                <div className="col-12 col-md-6 col-lg-4">
                    <Form.Control
                        type="search"
                        placeholder={t('positions.companyFilter')}
                        value={company}
                        onChange={(event) => setCompany(event.target.value)}
                        aria-label={t('positions.companyFilter')}
                    />
                </div>
                <div className="col-12 col-md-6 col-lg-3">
                    <Form.Select
                        value={level}
                        onChange={(event) => setLevel(event.target.value)}
                        aria-label={t('positions.levelFilter')}
                    >
                        <option value="">{t('positions.allLevels')}</option>
                        {LEVELS.map((item) => (
                            <option key={item} value={item}>{t(`positions.levels.${item}`)}</option>
                        ))}
                    </Form.Select>
                </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {loading && <div className="text-muted mb-2">{t('positions.loading')}</div>}

            <CommonDataTable
                data={loading ? [] : positions}
                columns={columns}
                emptyMessage={t('positions.empty')}
                mode={onToggleRow ? TABLE_MODE.MULTIPLE : TABLE_MODE.READ_ONLY}
                selectedIds={selectedIds}
                onToggleRow={onToggleRow}
                onToggleAll={onToggleAll}
                getRowLabel={(position) => position.title}
            />
        </div>
    )
}

export default PositionList
