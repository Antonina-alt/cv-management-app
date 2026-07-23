import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
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
    const { candidateId } = useParams()
    const { user, updateUser } = useAuth()
    const targetId = candidateId ?? user.id
    const [profile, setProfile] = useState(null)
    const [error, setError] = useState(null)
    const [refreshToken, setRefreshToken] = useState(0)
    const [banner, setBanner] = useState(null)
    const autosave = useAutosaveQueue()

    useEffect(() => {
        setProfile(null)
        setError(null)
        getProfile(targetId)
            .then(setProfile)
            .catch((err) => setError(err.message))
    }, [targetId, refreshToken])

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

    const handleCandidateChange = (updatedCandidate) => {
        setProfile((prev) => (prev ? { ...prev, user: updatedCandidate } : prev))
        if (updatedCandidate.id === user.id) {
            updateUser(updatedCandidate)
        }
    }

    if (error) {
        return <div className="alert alert-danger">{t('profile.forbidden')}</div>
    }

    // For your own profile, the auth context already has firstName/lastName/email/roles, so the
    // header renders instantly instead of waiting on the profile fetch. When viewing another
    // candidate (admin only), that data only exists once `profile` has loaded.
    const displayUser = profile?.user ?? (candidateId ? null : user)

    return (
        <div>
            <h1>{t('profile.title')}</h1>
            {displayUser && (
                <>
                    <p>{displayUser.firstName} {displayUser.lastName}</p>
                    <p>{displayUser.email}</p>
                    <p>{t('profile.roles')}: {displayUser.roles.join(', ')}</p>
                </>
            )}

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
                        <AboutSection
                            key={`about-${refreshToken}`}
                            candidate={profile.user}
                            onCandidateChange={handleCandidateChange}
                            autosave={autosave}
                            onConflict={handleConflict}
                        />
                    </Tab>
                    <Tab eventKey="info" title={t('profile.tabs.info')}>
                        <InformationSection
                            key={`info-${refreshToken}`}
                            candidateId={targetId}
                            initialValues={profile.attributeValues}
                            autosave={autosave}
                            onConflict={handleConflict}
                        />
                    </Tab>
                    <Tab eventKey="projects" title={t('profile.tabs.projects')}>
                        <ProjectsSection
                            key={`projects-${refreshToken}`}
                            candidateId={targetId}
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
