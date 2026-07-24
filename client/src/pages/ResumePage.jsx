import { useCallback, useMemo, useState } from 'react'
import { Button } from 'react-bootstrap'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ConflictError } from '../api/http.js'
import { updateAttributeValue } from '../api/profile.js'
import { getResume, likeResume, publishResume, unlikeResume } from '../api/resumes.js'
import DismissibleAlert from '../components/common/DismissibleAlert.jsx'
import ResumeAttributeGroups from '../components/resume/ResumeAttributeGroups.jsx'
import ResumeHeaderCard from '../components/resume/ResumeHeaderCard.jsx'
import ResumeIdentitySection from '../components/resume/ResumeIdentitySection.jsx'
import ResumeProjectsSection from '../components/resume/ResumeProjectsSection.jsx'
import { useAuth } from '../context/auth-context.js'
import { useAsyncData } from '../hooks/useAsyncData.js'
import { pickValueFields } from '../lib/attributeValueFields.js'
import { useAutosaveQueue } from '../lib/useAutosaveQueue.js'

const toEmptyMap = (attributes) => Object.fromEntries(attributes.map(({ attributeId, isEmpty }) => [attributeId, isEmpty]))

const ResumePage = () => {
    const { t } = useTranslation()
    const { id } = useParams()
    const navigate = useNavigate()
    const { user, updateUser } = useAuth()
    const autosave = useAutosaveQueue()
    const [emptyMap, setEmptyMap] = useState({})
    const [banner, setBanner] = useState(null)
    const [publishing, setPublishing] = useState(false)
    const [liking, setLiking] = useState(false)
    const fetchResume = useCallback(async () => {
        const data = await getResume(id)
        setEmptyMap(toEmptyMap(data.attributes))
        return data
    }, [id])
    const { data: resume, setData: setResume, loading, error, reload } = useAsyncData(fetchResume)
    const isComplete = useMemo(() => Object.values(emptyMap).every((isEmpty) => !isEmpty), [emptyMap])
    const handleConflict = useCallback(() => {
        setBanner(t('resume.conflict'))
        reload()
    }, [reload, t])
    const handleEmptyChange = useCallback((attributeId, isEmpty) => {
        setEmptyMap((current) => current[attributeId] === isEmpty ? current : { ...current, [attributeId]: isEmpty })
    }, [])
    const flushAttribute = async (attribute, updated) => {
        try {
            const saved = await updateAttributeValue(resume.candidateId, attribute.valueId, { ...pickValueFields(updated), version: attribute.version })
            setResume((current) => current ? { ...current, attributes: current.attributes.map((item) => item.attributeId === attribute.attributeId ? { ...item, version: saved.version } : item) } : current)
            setBanner(null)
        } catch (requestError) {
            requestError instanceof ConflictError ? handleConflict() : setBanner(requestError.message)
        }
    }
    const handleCandidateChange = useCallback((candidate) => {
        setResume((current) => current ? { ...current, candidate } : current)
        if (user?.id === candidate.id) updateUser(candidate)
    }, [setResume, updateUser, user?.id])
    const handlePublish = async () => {
        setPublishing(true)
        try {
            const updated = await publishResume(id, resume.version)
            setResume(updated)
            setEmptyMap(toEmptyMap(updated.attributes))
            setBanner(null)
        } catch (requestError) {
            requestError instanceof ConflictError ? handleConflict() : setBanner(requestError.message)
        } finally {
            setPublishing(false)
        }
    }
    const handleToggleLike = async () => {
        setLiking(true)
        try {
            const result = resume.likedByMe ? await unlikeResume(id) : await likeResume(id)
            setResume((current) => current ? { ...current, ...result } : current)
        } catch (requestError) {
            setBanner(requestError.message)
        } finally {
            setLiking(false)
        }
    }
    if (loading) return <p className="text-muted">{t('resume.loading')}</p>
    if (error) return <div className="alert alert-danger">{error}</div>
    if (!resume) return null
    const canLike = Boolean(user) && user.id !== resume.candidateId && user.roles.some((role) => ['RECRUITER', 'ADMIN'].includes(role))
    return (
        <div>
            <Button variant="link" className="px-0 mb-2" onClick={() => navigate(`/positions/${resume.positionId}`)}>&larr; {resume.position.title}</Button>
            <DismissibleAlert onClose={() => setBanner(null)}>{banner}</DismissibleAlert>
            <ResumeHeaderCard resume={resume} canLike={canLike} liking={liking} publishing={publishing} isComplete={isComplete} onToggleLike={handleToggleLike} onPublish={handlePublish} t={t} />
            <h5>{t('resume.identity.title')}</h5>
            <ResumeIdentitySection candidate={resume.candidate} editableText={resume.canEdit} editableImage={resume.canEdit} autosave={autosave} onConflict={handleConflict} onCandidateChange={handleCandidateChange} />
            <ResumeAttributeGroups attributes={resume.attributes} canEdit={resume.canEdit} onEmptyChange={handleEmptyChange} onSave={(attribute, updated) => autosave.schedule(`attr:${attribute.attributeId}`, () => flushAttribute(attribute, updated))} t={t} />
            <h5 className="mt-4">{t('resume.projects.title')}</h5>
            <ResumeProjectsSection projects={resume.projects} />
        </div>
    )
}

export default ResumePage
