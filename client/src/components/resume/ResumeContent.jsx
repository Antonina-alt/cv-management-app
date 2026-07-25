import { useTranslation } from 'react-i18next'
import ResumeAttributeGroups from './ResumeAttributeGroups.jsx'
import ResumeHeaderCard from './ResumeHeaderCard.jsx'
import ResumeIdentitySection from './ResumeIdentitySection.jsx'
import ResumeProjectsSection from './ResumeProjectsSection.jsx'

const ResumeContent = ({ page }) => {
    const { t } = useTranslation()
    const resume = page.data
    return (
        <>
            <ResumeHeaderCard resume={resume} canLike={page.canLike} liking={page.liking} publishing={page.publishing} isComplete={page.isComplete} onToggleLike={page.toggleLike} onPublish={page.publish} t={t} />
            <h5>{t('resume.identity.title')}</h5>
            <ResumeIdentitySection candidate={resume.candidate} editableText={resume.canEdit} editableImage={resume.canEdit} autosave={page.autosave} onConflict={page.handleConflict} onCandidateChange={page.changeCandidate} />
            <ResumeAttributeGroups attributes={resume.attributes} canEdit={resume.canEdit} onEmptyChange={page.changeEmptyState} onSave={page.scheduleAttributeSave} t={t} />
            <h5 className="mt-4">{t('resume.projects.title')}</h5>
            <ResumeProjectsSection projects={resume.projects} />
        </>
    )
}

export default ResumeContent
