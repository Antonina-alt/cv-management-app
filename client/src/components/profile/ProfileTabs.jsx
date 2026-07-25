import { Tab, Tabs } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import AboutSection from './AboutSection.jsx'
import InformationSection from './InformationSection.jsx'
import ProjectsSection from './ProjectsSection.jsx'
import ResumesSection from './ResumesSection.jsx'

const ProfileTabs = ({ page }) => {
    const { t } = useTranslation()
    const profile = page.data
    return (
        <Tabs defaultActiveKey="about" mountOnEnter className="mb-3">
            <Tab eventKey="about" title={t('profile.tabs.about')}><AboutSection key={`about-${page.revision}`} candidate={profile.user} onCandidateChange={page.changeCandidate} autosave={page.autosave} onConflict={page.handleConflict} /></Tab>
            <Tab eventKey="info" title={t('profile.tabs.info')}><InformationSection key={`info-${page.revision}`} candidateId={page.candidateId} initialValues={profile.attributeValues} autosave={page.autosave} onConflict={page.handleConflict} /></Tab>
            <Tab eventKey="projects" title={t('profile.tabs.projects')}><ProjectsSection key={`projects-${page.revision}`} candidateId={page.candidateId} initialProjects={profile.projects} onConflict={page.handleConflict} /></Tab>
            <Tab eventKey="resumes" title={t('profile.tabs.resumes')}><ResumesSection resumes={profile.resumes} /></Tab>
        </Tabs>
    )
}

export default ProfileTabs
