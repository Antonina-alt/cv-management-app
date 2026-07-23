import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/auth-context.js'
import { getResume, publishResume, likeResume, unlikeResume } from '../api/resumes.js'
import { updateAttributeValue } from '../api/profile.js'
import { useAutosaveQueue } from '../lib/useAutosaveQueue.js'
import { pickValueFields } from '../lib/attributeValueFields.js'
import { ConflictError } from '../api/http.js'
import ResumeIdentitySection from '../components/resume/ResumeIdentitySection.jsx'
import ResumeAttributeField from '../components/resume/ResumeAttributeField.jsx'
import ResumeProjectsSection from '../components/resume/ResumeProjectsSection.jsx'

const toEmptyMap = (attributes) => Object.fromEntries(attributes.map((a) => [a.attributeId, a.isEmpty]))

const groupByCategory = (attributes) => {
    const groups = new Map()
    for (const attr of attributes) {
        const key = attr.attribute.category?.name ?? ''
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(attr)
    }
    return [...groups.entries()]
}

const ResumeHeaderCard = ({ resume, canLike, liking, publishing, isComplete, onToggleLike, onPublish, t }) => (
    <Card className="mb-4">
        <Card.Body>
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                    <Card.Title>{resume.position.title}</Card.Title>
                    <div className="text-muted mb-2">
                        {[resume.position.company, resume.position.level ? t(`positions.levels.${resume.position.level}`) : null]
                            .filter(Boolean)
                            .join(' · ')}
                    </div>
                    <Badge bg={resume.status === 'PUBLISHED' ? 'success' : 'secondary'}>
                        {t(`resume.status.${resume.status}`)}
                    </Badge>
                </div>
                <div className="d-flex align-items-center gap-2">
                    {canLike && (
                        <Button variant={resume.likedByMe ? 'danger' : 'outline-danger'} size="sm" disabled={liking} onClick={onToggleLike}>
                            {resume.likedByMe ? t('resume.unlike') : t('resume.like')} ({resume.likeCount})
                        </Button>
                    )}
                    {resume.canEdit && resume.status === 'DRAFT' && (
                        <Button variant="primary" disabled={!isComplete || publishing} onClick={onPublish}>
                            {t('resume.publish')}
                        </Button>
                    )}
                </div>
            </div>
        </Card.Body>
    </Card>
)

const AttributeGroup = ({ category, attrs, canEdit, onEmptyChange, onSave, t }) => (
    <div className="mt-4">
        <h5>{category || t('resume.attributes.uncategorized')}</h5>
        <Card>
            <Card.Body>
                {attrs.map((attr) => (
                    <ResumeAttributeField
                        key={attr.attributeId}
                        attribute={attr.attribute}
                        value={attr}
                        editable={canEdit}
                        onEmptyChange={onEmptyChange}
                        onSave={(updated) => onSave(attr, updated)}
                    />
                ))}
            </Card.Body>
        </Card>
    </div>
)

const ResumePage = () => {
    const { t } = useTranslation()
    const { id } = useParams()
    const navigate = useNavigate()
    const { user, updateUser } = useAuth()
    const autosave = useAutosaveQueue()

    const [resume, setResume] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [banner, setBanner] = useState(null)
    const [emptyMap, setEmptyMap] = useState({})
    const [publishing, setPublishing] = useState(false)
    const [liking, setLiking] = useState(false)

    const load = () => {
        setLoading(true)
        getResume(id)
            .then((data) => {
                setResume(data)
                setEmptyMap(toEmptyMap(data.attributes))
                setError(null)
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(load, [id])

    useEffect(() => () => {
        autosave.flushNow().catch(() => {})
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const groupedAttributes = useMemo(() => (resume ? groupByCategory(resume.attributes) : []), [resume])

    const isComplete = useMemo(() => Object.values(emptyMap).every((isEmpty) => !isEmpty), [emptyMap])

    const handleConflict = () => {
        setBanner(t('resume.conflict'))
        load()
    }

    const handleEmptyChange = (attributeId, isEmpty) => {
        setEmptyMap((prev) => (prev[attributeId] === isEmpty ? prev : { ...prev, [attributeId]: isEmpty }))
    }

    const flushAttribute = async (attr, updated) => {
        try {
            const saved = await updateAttributeValue(resume.candidateId, attr.valueId, {
                ...pickValueFields(updated),
                version: attr.version,
            })
            setResume((prev) => (
                prev ? {
                    ...prev,
                    attributes: prev.attributes.map((a) => (a.attributeId === attr.attributeId ? { ...a, version: saved.version } : a)),
                } : prev
            ))
            setBanner(null)
        } catch (err) {
            if (err instanceof ConflictError) handleConflict()
            else setBanner(err.message)
        }
    }

    const handleCandidateChange = (updatedCandidate) => {
        setResume((prev) => (prev ? { ...prev, candidate: updatedCandidate } : prev))
        if (user?.id === updatedCandidate.id) updateUser(updatedCandidate)
    }

    const handlePublish = async () => {
        setPublishing(true)
        try {
            const updated = await publishResume(id, resume.version)
            setResume(updated)
            setEmptyMap(toEmptyMap(updated.attributes))
            setBanner(null)
        } catch (err) {
            if (err instanceof ConflictError) handleConflict()
            else setBanner(err.message)
        } finally {
            setPublishing(false)
        }
    }

    const handleToggleLike = async () => {
        setLiking(true)
        try {
            const result = resume.likedByMe ? await unlikeResume(id) : await likeResume(id)
            setResume((prev) => (prev ? { ...prev, ...result } : prev))
        } catch (err) {
            setBanner(err.message)
        } finally {
            setLiking(false)
        }
    }

    if (loading) return <p className="text-muted">{t('resume.loading')}</p>
    if (error) return <div className="alert alert-danger">{error}</div>
    if (!resume) return null

    const isSelf = user?.id === resume.candidateId
    const canLike = Boolean(user) && !isSelf && (user.roles.includes('RECRUITER') || user.roles.includes('ADMIN'))

    return (
        <div>
            <Button variant="link" className="px-0 mb-2" onClick={() => navigate(`/positions/${resume.positionId}`)}>
                &larr; {resume.position.title}
            </Button>

            {banner && (
                <div className="alert alert-warning alert-dismissible" role="alert">
                    {banner}
                    <button type="button" className="btn-close" onClick={() => setBanner(null)} />
                </div>
            )}

            <ResumeHeaderCard
                resume={resume}
                canLike={canLike}
                liking={liking}
                publishing={publishing}
                isComplete={isComplete}
                onToggleLike={handleToggleLike}
                onPublish={handlePublish}
                t={t}
            />

            <h5>{t('resume.identity.title')}</h5>
            <ResumeIdentitySection
                candidate={resume.candidate}
                editableText={resume.canEdit}
                editableImage={resume.canEdit}
                autosave={autosave}
                onConflict={handleConflict}
                onCandidateChange={handleCandidateChange}
            />

            {groupedAttributes.map(([category, attrs]) => (
                <AttributeGroup
                    key={category || 'uncategorized'}
                    category={category}
                    attrs={attrs}
                    canEdit={resume.canEdit}
                    onEmptyChange={handleEmptyChange}
                    onSave={(attr, updated) => autosave.schedule(`attr:${attr.attributeId}`, () => flushAttribute(attr, updated))}
                    t={t}
                />
            ))}

            <h5 className="mt-4">{t('resume.projects.title')}</h5>
            <ResumeProjectsSection projects={resume.projects} />
        </div>
    )
}

export default ResumePage
