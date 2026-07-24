import { useCallback, useState } from 'react'
import { Tab, Tabs } from 'react-bootstrap'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getProfile } from '../api/profile.js'
import DismissibleAlert from '../components/common/DismissibleAlert.jsx'
import AboutSection from '../components/profile/AboutSection.jsx'
import InformationSection from '../components/profile/InformationSection.jsx'
import ProjectsSection from '../components/profile/ProjectsSection.jsx'
import ResumesSection from '../components/profile/ResumesSection.jsx'
import { useAuth } from '../context/auth-context.js'
import { useAsyncData } from '../hooks/useAsyncData.js'
import { formatName } from '../lib/formatName.js'
import { useAutosaveQueue } from '../lib/useAutosaveQueue.js'

const ProfilePage = () => {
    const { t } = useTranslation()
    const { candidateId } = useParams()
    const { user, updateUser } = useAuth()
    const targetId = candidateId ?? user?.id
    const [revision, setRevision] = useState(0)
    const [banner, setBanner] = useState(null)
    const autosave = useAutosaveQueue()
    const fetchProfile = useCallback(() => getProfile(targetId), [targetId])
    const { data: profile, setData: setProfile, loading, error } = useAsyncData(fetchProfile, { enabled: Boolean(targetId), refreshKey: revision })
    const handleConflict = useCallback(() => {
        setBanner(t('profile.conflict'))
        setRevision((value) => value + 1)
    }, [t])
    const handleCandidateChange = useCallback((candidate) => {
        setProfile((current) => current ? { ...current, user: candidate } : current)
        if (candidate.id === user?.id) updateUser(candidate)
    }, [setProfile, updateUser, user?.id])
    if (error) return <div className="alert alert-danger">{t('profile.forbidden')}</div>
    const displayUser = profile?.user ?? (candidateId ? null : user)
    return (
        <div>
            <h1>{t('profile.title')}</h1>
            {displayUser && <><p>{formatName(displayUser)}</p><p>{displayUser.email}</p><p>{t('profile.roles')}: {displayUser.roles.join(', ')}</p></>}
            <DismissibleAlert onClose={() => setBanner(null)}>{banner}</DismissibleAlert>
            {loading || !profile ? <p className="text-muted">{t('attributes.loading')}</p> : (
                <Tabs defaultActiveKey="about" mountOnEnter className="mb-3">
                    <Tab eventKey="about" title={t('profile.tabs.about')}><AboutSection key={`about-${revision}`} candidate={profile.user} onCandidateChange={handleCandidateChange} autosave={autosave} onConflict={handleConflict} /></Tab>
                    <Tab eventKey="info" title={t('profile.tabs.info')}><InformationSection key={`info-${revision}`} candidateId={targetId} initialValues={profile.attributeValues} autosave={autosave} onConflict={handleConflict} /></Tab>
                    <Tab eventKey="projects" title={t('profile.tabs.projects')}><ProjectsSection key={`projects-${revision}`} candidateId={targetId} initialProjects={profile.projects} onConflict={handleConflict} /></Tab>
                    <Tab eventKey="resumes" title={t('profile.tabs.resumes')}><ResumesSection resumes={profile.resumes} /></Tab>
                </Tabs>
            )}
        </div>
    )
}

export default ProfilePage
