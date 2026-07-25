import { useCallback, useState } from 'react'
import { Button } from 'react-bootstrap'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ConflictError } from '../api/http.js'
import { getPosition, updatePosition } from '../api/positions.js'
import { createResume } from '../api/resumes.js'
import ErrorAlert from '../components/common/ErrorAlert.jsx'
import PositionAccessRulesSection from '../components/positions/PositionAccessRulesSection.jsx'
import PositionAttributesSection from '../components/positions/PositionAttributesSection.jsx'
import PositionFormModal from '../components/positions/PositionFormModal.jsx'
import PositionProjectFilterSection from '../components/positions/PositionProjectFilterSection.jsx'
import PositionResumesTable from '../components/positions/PositionResumesTable.jsx'
import PositionSummaryCard from '../components/positions/PositionSummaryCard.jsx'
import { useAuth } from '../context/auth-context.js'
import { useAsyncData } from '../hooks/useAsyncData.js'

const PositionDetailPage = () => {
    const { t } = useTranslation()
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [banner, setBanner] = useState(null)
    const [showEdit, setShowEdit] = useState(false)
    const [editError, setEditError] = useState(null)
    const [creatingResume, setCreatingResume] = useState(false)
    const fetchPosition = useCallback(() => getPosition(id), [id])
    const { data: position, setData: setPosition, loading, error, reload } = useAsyncData(fetchPosition)
    const isAdmin = Boolean(user?.roles.includes('ADMIN'))
    const canManage = Boolean(user) && (user.roles.includes('RECRUITER') || isAdmin)
    const canActAsCandidate = Boolean(user) && (!user.roles.includes('RECRUITER') || isAdmin)
    const patchPosition = async (fields) => {
        try {
            const updated = await updatePosition(id, { ...fields, version: position.version })
            setPosition(updated)
            setBanner(null)
            return updated
        } catch (requestError) {
            if (requestError instanceof ConflictError) {
                setBanner(requestError)
                reload()
            }
            throw requestError
        }
    }
    const edit = async (payload) => {
        try {
            await patchPosition(payload)
            setShowEdit(false)
            setEditError(null)
        } catch (requestError) {
            if (requestError instanceof ConflictError) setShowEdit(false)
            else setEditError(requestError)
        }
    }
    const createCandidateResume = async () => {
        setCreatingResume(true)
        try {
            const resume = await createResume(position.id)
            navigate(`/resumes/${resume.id}`)
        } catch (requestError) {
            setBanner(requestError)
        } finally {
            setCreatingResume(false)
        }
    }
    if (loading) return <p className="text-muted">{t('positions.loading')}</p>
    if (error) return <ErrorAlert error={error} />
    if (!position) return null
    return (
        <div>
            <Button variant="link" className="px-0 mb-2" onClick={() => navigate(-1)}>&larr; {t('common.back')}</Button>
            <ErrorAlert error={banner} onClose={() => setBanner(null)} />
            <PositionSummaryCard position={position} editable={canManage} onEdit={() => setShowEdit(true)} t={t} />
            {canActAsCandidate && <div className="d-flex gap-2 mb-4"><Button variant="primary" disabled={creatingResume} onClick={position.myResume ? () => navigate(`/resumes/${position.myResume.id}`) : createCandidateResume}>{t(position.myResume ? 'positions.resumes.open' : 'positions.resumes.create')}</Button></div>}
            <h5>{t('positions.attributesSection.title')}</h5>
            <PositionAttributesSection attributes={position.attributes} onSave={(attributeIds) => patchPosition({ attributeIds })} disabled={!canManage} />
            <h5 className="mt-4">{t('positions.projectFilter.title')}</h5>
            <PositionProjectFilterSection tags={position.projectTagFilters.map(({ tag }) => tag.name)} maxProjects={position.maxProjects} onSave={patchPosition} disabled={!canManage} />
            <h5 className="mt-4">{t('positions.accessRules.title')}</h5>
            <PositionAccessRulesSection rules={position.accessRules} onSave={(accessRules) => patchPosition({ accessRules })} disabled={!canManage} />
            {canManage && <><h5 className="mt-4">{t('positions.resumes.title')}</h5><PositionResumesTable resumes={position.resumes ?? []} /></>}
            {showEdit && <PositionFormModal show onClose={() => { setShowEdit(false); setEditError(null) }} onSubmit={edit} position={position} error={editError} />}
        </div>
    )
}

export default PositionDetailPage
