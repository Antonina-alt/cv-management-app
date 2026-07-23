import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/auth-context.js'
import { getPosition, updatePosition } from '../api/positions.js'
import { createResume } from '../api/resumes.js'
import { ConflictError } from '../api/http.js'
import PositionFormModal from '../components/positions/PositionFormModal.jsx'
import PositionAttributesSection from '../components/positions/PositionAttributesSection.jsx'
import PositionProjectFilterSection from '../components/positions/PositionProjectFilterSection.jsx'
import PositionAccessRulesSection from '../components/positions/PositionAccessRulesSection.jsx'
import PositionResumesTable from '../components/positions/PositionResumesTable.jsx'

const PositionDetailPage = () => {
    const { t } = useTranslation()
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const canManage = Boolean(user) && (user.roles.includes('RECRUITER') || user.roles.includes('ADMIN'))

    const [position, setPosition] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [banner, setBanner] = useState(null)
    const [showEdit, setShowEdit] = useState(false)
    const [editError, setEditError] = useState(null)
    const [creatingResume, setCreatingResume] = useState(false)

    const load = () => {
        setLoading(true)
        getPosition(id)
            .then((data) => { setPosition(data); setError(null) })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(load, [id])

    const patch = async (fields) => {
        try {
            const updated = await updatePosition(id, { ...fields, version: position.version })
            setPosition(updated)
            setBanner(null)
            return updated
        } catch (err) {
            if (err instanceof ConflictError) {
                setBanner(t('positions.conflict'))
                load()
            }
            throw err
        }
    }

    const handleEditSubmit = async (payload) => {
        try {
            await patch(payload)
            setShowEdit(false)
            setEditError(null)
        } catch (err) {
            if (!(err instanceof ConflictError)) setEditError(err.message)
            else setShowEdit(false)
        }
    }

    const handleCreateResume = async () => {
        setCreatingResume(true)
        try {
            const resume = await createResume(position.id)
            navigate(`/resumes/${resume.id}`)
        } catch (err) {
            setBanner(err.message)
        } finally {
            setCreatingResume(false)
        }
    }

    if (loading) return <p className="text-muted">{t('positions.loading')}</p>
    if (error) return <div className="alert alert-danger">{error}</div>
    if (!position) return null

    return (
        <div>
            <Button variant="link" className="px-0 mb-2" onClick={() => navigate(-1)}>
                &larr; {t('common.back')}
            </Button>

            {banner && (
                <div className="alert alert-warning alert-dismissible" role="alert">
                    {banner}
                    <button type="button" className="btn-close" onClick={() => setBanner(null)} />
                </div>
            )}

            <Card className="mb-4">
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-start">
                        <div>
                            <Card.Title>{position.title}</Card.Title>
                            <div className="text-muted mb-2">
                                {[position.company, position.level ? t(`positions.levels.${position.level}`) : null]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </div>
                            <span className={`badge ${position.isPublic ? 'text-bg-success' : 'text-bg-secondary'}`}>
                                {t(position.isPublic ? 'positions.public' : 'positions.restricted')}
                            </span>
                            {position.description && <p className="mt-3 mb-0">{position.description}</p>}
                        </div>
                        {canManage && (
                            <Button variant="outline-primary" size="sm" onClick={() => setShowEdit(true)}>
                                {t('positions.toolbar.edit')}
                            </Button>
                        )}
                    </div>
                </Card.Body>
            </Card>

            {user && !canManage && (
                <div className="d-flex gap-2 mb-4">
                    {position.myResume ? (
                        <Button variant="primary" onClick={() => navigate(`/resumes/${position.myResume.id}`)}>
                            {t('positions.resumes.open')}
                        </Button>
                    ) : (
                        <Button variant="primary" disabled={creatingResume} onClick={handleCreateResume}>
                            {t('positions.resumes.create')}
                        </Button>
                    )}
                </div>
            )}

            <h5>{t('positions.attributesSection.title')}</h5>
            <PositionAttributesSection
                attributes={position.attributes}
                onSave={(attributeIds) => patch({ attributeIds })}
                disabled={!canManage}
            />

            <h5 className="mt-4">{t('positions.projectFilter.title')}</h5>
            <PositionProjectFilterSection
                tags={position.projectTagFilters.map((f) => f.tag.name)}
                maxProjects={position.maxProjects}
                onSave={(fields) => patch(fields)}
                disabled={!canManage}
            />

            <h5 className="mt-4">{t('positions.accessRules.title')}</h5>
            <PositionAccessRulesSection
                rules={position.accessRules}
                onSave={(accessRules) => patch({ accessRules })}
                disabled={!canManage}
            />

            {canManage && (
                <>
                    <h5 className="mt-4">{t('positions.resumes.title')}</h5>
                    <PositionResumesTable resumes={position.resumes ?? []} />
                </>
            )}

            {showEdit && (
                <PositionFormModal
                    show
                    onClose={() => { setShowEdit(false); setEditError(null) }}
                    onSubmit={handleEditSubmit}
                    position={position}
                    error={editError}
                />
            )}
        </div>
    )
}

export default PositionDetailPage
