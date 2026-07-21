import { Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

// Read-only. No toolbar needed here since there are no actions to take from this list — opening
// a resume is a navigation, not a row action. Drafts aren't clickable: recruiters can only view
// published resumes (server-enforced), so plain text avoids a dead link.
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
                </tr>
            </thead>
            <tbody>
                {resumes.map((resume) => (
                    <tr key={resume.id}>
                        <td>
                            {resume.status === 'PUBLISHED' ? (
                                <Link to={`/resumes/${resume.id}`}>{resume.candidate?.firstName} {resume.candidate?.lastName}</Link>
                            ) : (
                                <>{resume.candidate?.firstName} {resume.candidate?.lastName}</>
                            )}
                        </td>
                        <td>{resume.status}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
    )
}

export default PositionResumesTable
