import { Table } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

// Read-only; populated once resume generation (task 08) exists. No toolbar needed here since
// there are no actions to take from this list.
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
                        <td>{resume.candidate?.firstName} {resume.candidate?.lastName}</td>
                        <td>{resume.status}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
    )
}

export default PositionResumesTable
