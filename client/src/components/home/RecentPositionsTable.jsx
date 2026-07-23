import { Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { listRecentPositions } from '../../api/home.js'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import AccessBadge from '../common/AccessBadge.jsx'

const fetchRecent = () => listRecentPositions({ limit: 5 })

const RecentPositionsTable = () => {
    const { t } = useTranslation()
    const { data, loading, error } = useAsyncData(fetchRecent, [])
    const positions = Array.isArray(data) ? data : []

    if (error) return <div className="alert alert-danger">{error}</div>
    if (!loading && positions.length === 0) return <p className="text-muted">{t('positions.empty')}</p>

    return (
        <Table hover responsive>
            <thead>
                <tr>
                    <th>{t('positions.table.title')}</th>
                    <th>{t('positions.table.company')}</th>
                    <th>{t('positions.table.level')}</th>
                    <th>{t('positions.table.access')}</th>
                    <th>{t('positions.table.resumes')}</th>
                </tr>
            </thead>
            <tbody>
                {positions.map((position) => (
                    <tr key={position.id}>
                        <td><Link to={`/positions/${position.id}`}>{position.title}</Link></td>
                        <td>{position.company}</td>
                        <td>{position.level ? t(`positions.levels.${position.level}`) : ''}</td>
                        <td><AccessBadge isPublic={position.isPublic} /></td>
                        <td>{position._count?.resumes ?? 0}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
    )
}

export default RecentPositionsTable
