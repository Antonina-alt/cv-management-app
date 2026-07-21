import { useEffect, useState } from 'react'
import { Tab, Tabs } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/auth-context.js'
import { getProfile } from '../api/profile.js'
import { useAutosaveQueue } from '../lib/useAutosaveQueue.js'
import AboutSection from '../components/profile/AboutSection.jsx'
import InformationSection from '../components/profile/InformationSection.jsx'
import ProjectsSection from '../components/profile/ProjectsSection.jsx'
import ResumesSection from '../components/profile/ResumesSection.jsx'

const ProfilePage = () => {
    const { t } = useTranslation()
    const { user } = useAuth()
    const [profile, setProfile] = useState(null)
    const [refreshToken, setRefreshToken] = useState(0)
    const [banner, setBanner] = useState(null)
    const autosave = useAutosaveQueue()

    useEffect(() => {
        getProfile(user.id).then(setProfile).catch(() => setProfile(null))
    }, [user.id, refreshToken])

    useEffect(() => () => {
        autosave.flushNow().catch(() => {})
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Sections remount (via the refreshToken-derived key) to pick up the reloaded data, so the
    // conflict banner is owned here rather than inside the section that's about to unmount.
    const handleConflict = () => {
        setBanner(t('profile.conflict'))
        setRefreshToken((v) => v + 1)
    }

    return (
        <div>
            <h1>{t('profile.title')}</h1>
            <p>{user.firstName} {user.lastName}</p>
            <p>{user.email}</p>
            <p>{t('profile.roles')}: {user.roles.join(', ')}</p>

            {banner && (
                <div className="alert alert-warning alert-dismissible" role="alert">
                    {banner}
                    <button type="button" className="btn-close" onClick={() => setBanner(null)} />
                </div>
            )}

            {!profile ? (
                <p className="text-muted">{t('attributes.loading')}</p>
            ) : (
                <Tabs defaultActiveKey="about" className="mb-3">
                    <Tab eventKey="about" title={t('profile.tabs.about')}>
                        <AboutSection key={`about-${refreshToken}`} autosave={autosave} onConflict={handleConflict} />
                    </Tab>
                    <Tab eventKey="info" title={t('profile.tabs.info')}>
                        <InformationSection
                            key={`info-${refreshToken}`}
                            candidateId={user.id}
                            initialValues={profile.attributeValues}
                            autosave={autosave}
                            onConflict={handleConflict}
                        />
                    </Tab>
                    <Tab eventKey="projects" title={t('profile.tabs.projects')}>
                        <ProjectsSection
                            key={`projects-${refreshToken}`}
                            candidateId={user.id}
                            initialProjects={profile.projects}
                            onConflict={handleConflict}
                        />
                    </Tab>
                    <Tab eventKey="resumes" title={t('profile.tabs.resumes')}>
                        <ResumesSection resumes={profile.resumes} />
                    </Tab>
                </Tabs>
            )}
        </div>
    )
}

export default ProfilePage
