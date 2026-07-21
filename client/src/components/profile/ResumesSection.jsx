import { Table } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

// Stub: resumes are generated in task 08. This just gives the future feature somewhere to
// render — the data already flows through the profile bundle since the Resume model exists.
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
                </tr>
            </thead>
            <tbody>
                {resumes.map((resume) => (
                    <tr key={resume.id}>
                        <td>{resume.position?.title}</td>
                        <td>{resume.status}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
    )
}

export default ResumesSection
