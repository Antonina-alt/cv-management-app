import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/auth-context.js'
import { getResume, publishResume } from '../api/resumes.js'
import { updateAttributeValue } from '../api/profile.js'
import { useAutosaveQueue } from '../lib/useAutosaveQueue.js'
import { ConflictError } from '../api/http.js'
import ResumeIdentitySection from '../components/resume/ResumeIdentitySection.jsx'
import ResumeAttributeField from '../components/resume/ResumeAttributeField.jsx'
import ResumeProjectsSection from '../components/resume/ResumeProjectsSection.jsx'

const ResumePage = () => {
    const { t } = useTranslation()
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const autosave = useAutosaveQueue()

    const [resume, setResume] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [banner, setBanner] = useState(null)
    const [emptyMap, setEmptyMap] = useState({})
    const [publishing, setPublishing] = useState(false)

    const load = () => {
        setLoading(true)
        getResume(id)
            .then((data) => {
                setResume(data)
                setEmptyMap(Object.fromEntries(data.attributes.map((a) => [a.attributeId, a.isEmpty])))
                setError(null)
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(load, [id])

    const groupedAttributes = useMemo(() => {
        if (!resume) return []
        const groups = new Map()
        for (const attr of resume.attributes) {
            const key = attr.attribute.category?.name ?? ''
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key).push(attr)
        }
        return [...groups.entries()]
    }, [resume])

    const isComplete = useMemo(
        () => Object.values(emptyMap).every((isEmpty) => !isEmpty),
        [emptyMap],
    )

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
                stringValue: updated.stringValue,
                numberValue: updated.numberValue,
                booleanValue: updated.booleanValue,
                dateValue: updated.dateValue,
                dateFrom: updated.dateFrom,
                dateTo: updated.dateTo,
                imageUrl: updated.imageUrl,
                selectedOptionId: updated.selectedOptionId,
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
            if (err instanceof ConflictError) {
                handleConflict()
            } else {
                setBanner(err.message)
            }
        }
    }

    const handleCandidateChange = (updatedCandidate) => {
        setResume((prev) => (prev ? { ...prev, candidate: updatedCandidate } : prev))
    }

    const handlePublish = async () => {
        setPublishing(true)
        try {
            const updated = await publishResume(id, resume.version)
            setResume(updated)
            setEmptyMap(Object.fromEntries(updated.attributes.map((a) => [a.attributeId, a.isEmpty])))
            setBanner(null)
        } catch (err) {
            if (err instanceof ConflictError) {
                handleConflict()
            } else {
                setBanner(err.message)
            }
        } finally {
            setPublishing(false)
        }
    }

    if (loading) return <p className="text-muted">{t('resume.loading')}</p>
    if (error) return <div className="alert alert-danger">{error}</div>
    if (!resume) return null

    const isSelf = user?.id === resume.candidateId

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
                        {resume.canEdit && resume.status === 'DRAFT' && (
                            <Button variant="primary" disabled={!isComplete || publishing} onClick={handlePublish}>
                                {t('resume.publish')}
                            </Button>
                        )}
                    </div>
                </Card.Body>
            </Card>

            <h5>{t('resume.identity.title')}</h5>
            <ResumeIdentitySection
                candidate={resume.candidate}
                editableText={resume.canEdit}
                editableImage={resume.canEdit && isSelf}
                autosave={autosave}
                onConflict={handleConflict}
                onCandidateChange={handleCandidateChange}
            />

            {groupedAttributes.map(([category, attrs]) => (
                <div key={category || 'uncategorized'} className="mt-4">
                    <h5>{category || t('resume.attributes.uncategorized')}</h5>
                    <Card>
                        <Card.Body>
                            {attrs.map((attr) => (
                                <ResumeAttributeField
                                    key={attr.attributeId}
                                    attribute={attr.attribute}
                                    value={attr}
                                    editable={resume.canEdit}
                                    onEmptyChange={handleEmptyChange}
                                    onSave={(updated) => autosave.schedule(`attr:${attr.attributeId}`, () => flushAttribute(attr, updated))}
                                />
                            ))}
                        </Card.Body>
                    </Card>
                </div>
            ))}

            <h5 className="mt-4">{t('resume.projects.title')}</h5>
            <ResumeProjectsSection projects={resume.projects} />
        </div>
    )
}

export default ResumePage
