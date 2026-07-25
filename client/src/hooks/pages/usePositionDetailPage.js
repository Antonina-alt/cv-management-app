import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConflictError } from '../../api/http.js'
import { getPosition, updatePosition } from '../../api/positions.js'
import { createResume } from '../../api/resumes.js'
import { useAuth } from '../../context/auth-context.js'
import { useAsyncData } from '../useAsyncData.js'

const usePositionPatch = ({ id, position, setPosition, reload, setBanner }) => useCallback(async (fields) => {
    try {
        const updated = await updatePosition(id, { ...fields, version: position.version })
        setPosition(updated)
        setBanner(null)
        return updated
    } catch (error) {
        if (error instanceof ConflictError) {
            setBanner(error)
            reload()
        }
        throw error
    }
}, [id, position, reload, setBanner, setPosition])

const usePositionEditor = (patchPosition) => {
    const [showEdit, setShowEdit] = useState(false)
    const [editError, setEditError] = useState(null)
    const closeEdit = useCallback(() => {
        setShowEdit(false)
        setEditError(null)
    }, [])
    const editPosition = useCallback(async (payload) => {
        try {
            await patchPosition(payload)
            closeEdit()
        } catch (error) {
            if (error instanceof ConflictError) setShowEdit(false)
            else setEditError(error)
        }
    }, [closeEdit, patchPosition])
    return { showEdit, editError, openEdit: () => setShowEdit(true), closeEdit, editPosition }
}

const useResumeCreation = ({ positionId, navigate, setBanner }) => {
    const [creatingResume, setCreatingResume] = useState(false)
    const createCandidateResume = useCallback(async () => {
        setCreatingResume(true)
        try {
            const resume = await createResume(positionId)
            navigate(`/resumes/${resume.id}`)
        } catch (error) {
            setBanner(error)
        } finally {
            setCreatingResume(false)
        }
    }, [navigate, positionId, setBanner])
    return { creatingResume, createCandidateResume }
}

const permissionsFor = (user) => {
    const isAdmin = Boolean(user?.roles.includes('ADMIN'))
    return {
        canManage: Boolean(user) && (user.roles.includes('RECRUITER') || isAdmin),
        canActAsCandidate: Boolean(user) && (!user.roles.includes('RECRUITER') || isAdmin),
    }
}

export const usePositionDetailPage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [banner, setBanner] = useState(null)
    const fetchPosition = useCallback(() => getPosition(id), [id])
    const query = useAsyncData(fetchPosition)
    const patchPosition = usePositionPatch({ id, position: query.data, setPosition: query.setData, reload: query.reload, setBanner })
    const editor = usePositionEditor(patchPosition)
    const resume = useResumeCreation({ positionId: query.data?.id, navigate, setBanner })
    return {
        ...query,
        ...editor,
        ...resume,
        ...permissionsFor(user),
        banner,
        clearBanner: () => setBanner(null),
        goBack: () => navigate(-1),
        openResume: (resumeId) => navigate(`/resumes/${resumeId}`),
        patchPosition,
    }
}
