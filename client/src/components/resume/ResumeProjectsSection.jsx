import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '')

const ResumeProjectsSection = ({ projects }) => {
    const { t } = useTranslation()

    if (projects.length === 0) {
        return <p className="text-muted">{t('resume.projects.empty')}</p>
    }

    return (
        <div className="d-flex flex-column gap-3">
            {projects.map((project) => (
                <div key={project.id} className="border rounded p-3">
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                        <h6 className="mb-1">{project.title}</h6>
                        <small className="text-muted">{formatDate(project.startDate)} &ndash; {formatDate(project.endDate)}</small>
                    </div>
                    {project.tags?.length > 0 && (
                        <div className="mb-2">
                            {project.tags.map((link) => (
                                <span key={link.tagId} className="badge text-bg-secondary me-1">{link.tag?.name}</span>
                            ))}
                        </div>
                    )}
                    {project.description && <ReactMarkdown>{project.description}</ReactMarkdown>}
                </div>
            ))}
        </div>
    )
}

export default ResumeProjectsSection
