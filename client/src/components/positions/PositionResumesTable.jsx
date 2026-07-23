import { Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatName } from '../../lib/formatName.js'

const PositionResumesTable = ({ resumes }) => {
    const { t } = useTranslation()

    if (resumes.length === 0) {
        return <p className="text-muted">{t('positions.resumes.empty')}</p>
    }

    return (
        <Table hover responsive>
            <thead>
                <tr>
                    <th>{t('positions.resumes.candidate')}</th>
                    <th>{t('positions.resumes.status')}</th>
                    <th>{t('positions.resumes.likes')}</th>
                </tr>
            </thead>
            <tbody>
                {resumes.map((resume) => (
                    <tr key={resume.id}>
                        <td>
                            {resume.status === 'PUBLISHED' ? (
                                <Link to={`/resumes/${resume.id}`}>{formatName(resume.candidate)}</Link>
                            ) : (
                                <>{formatName(resume.candidate)}</>
                            )}
                        </td>
                        <td>{resume.status}</td>
                        <td>{resume._count?.likes ?? 0}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
    )
}

export default PositionResumesTable
