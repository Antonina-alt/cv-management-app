import { Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const ResumesSection = ({ resumes }) => {
    const { t } = useTranslation()

    if (resumes.length === 0) {
        return <p className="text-muted">{t('profile.resumes.empty')}</p>
    }

    return (
        <Table hover responsive>
            <thead>
                <tr>
                    <th>{t('profile.resumes.position')}</th>
                    <th>{t('profile.resumes.status')}</th>
                    <th>{t('profile.resumes.likes')}</th>
                </tr>
            </thead>
            <tbody>
                {resumes.map((resume) => (
                    <tr key={resume.id}>
                        <td><Link to={`/resumes/${resume.id}`}>{resume.position?.title}</Link></td>
                        <td>{resume.status}</td>
                        <td>{resume._count?.likes ?? 0}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
    )
}

export default ResumesSection
