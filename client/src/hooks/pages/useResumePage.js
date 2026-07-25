import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConflictError } from '../../api/http.js'
import { updateAttributeValue } from '../../api/profile.js'
import { getResume, likeResume, publishResume, unlikeResume } from '../../api/resumes.js'
import { useAuth } from '../../context/auth-context.js'
import { pickValueFields } from '../../lib/attributeValueFields.js'
import { useAutosaveQueue } from '../../lib/useAutosaveQueue.js'
import { useAsyncData } from '../useAsyncData.js'

const toEmptyMap = (attributes) => Object.fromEntries(attributes.map(({ attributeId, isEmpty }) => [attributeId, isEmpty]))

const useEmptyAttributes = () => {
    const [emptyMap, setEmptyMap] = useState({})
    const changeEmptyState = useCallback((attributeId, isEmpty) => {
        setEmptyMap((current) => current[attributeId] === isEmpty ? current : { ...current, [attributeId]: isEmpty })
    }, [])
    const isComplete = useMemo(() => Object.values(emptyMap).every((isEmpty) => !isEmpty), [emptyMap])
    return { setEmptyMap, changeEmptyState, isComplete }
}

const useResumeQuery = (id, setEmptyMap) => {
    const fetchResume = useCallback(async () => {
        const resume = await getResume(id)
        setEmptyMap(toEmptyMap(resume.attributes))
        return resume
    }, [id, setEmptyMap])
    return useAsyncData(fetchResume)
}

const useConflictHandler = (setBanner, reload) => useCallback((error) => {
    setBanner(error)
    reload()
}, [reload, setBanner])

const replaceAttributeVersion = (resume, attributeId, version) => ({
    ...resume,
    attributes: resume.attributes.map((item) => item.attributeId === attributeId ? { ...item, version } : item),
})

const useAttributeSaver = ({ resume, setResume, handleConflict, setBanner }) => useCallback(async (attribute, updated) => {
    try {
        const payload = { ...pickValueFields(updated), version: attribute.version }
        const saved = await updateAttributeValue(resume.candidateId, attribute.valueId, payload)
        setResume((current) => current ? replaceAttributeVersion(current, attribute.attributeId, saved.version) : current)
        setBanner(null)
    } catch (error) {
        error instanceof ConflictError ? handleConflict(error) : setBanner(error)
    }
}, [handleConflict, resume, setBanner, setResume])

const useResumePublisher = ({ id, resume, setResume, setEmptyMap, handleConflict, setBanner }) => {
    const [publishing, setPublishing] = useState(false)
    const publish = useCallback(async () => {
        setPublishing(true)
        try {
            const updated = await publishResume(id, resume.version)
            setResume(updated)
            setEmptyMap(toEmptyMap(updated.attributes))
            setBanner(null)
        } catch (error) {
            error instanceof ConflictError ? handleConflict(error) : setBanner(error)
        } finally {
            setPublishing(false)
        }
    }, [handleConflict, id, resume, setBanner, setEmptyMap, setResume])
    return { publish, publishing }
}

const useLikeToggle = ({ id, resume, setResume, setBanner }) => {
    const [liking, setLiking] = useState(false)
    const toggleLike = useCallback(async () => {
        setLiking(true)
        try {
            const result = resume.likedByMe ? await unlikeResume(id) : await likeResume(id)
            setResume((current) => current ? { ...current, ...result } : current)
        } catch (error) {
            setBanner(error)
        } finally {
            setLiking(false)
        }
    }, [id, resume, setBanner, setResume])
    return { liking, toggleLike }
}

const useCandidateChange = ({ userId, updateUser, setResume }) => useCallback((candidate) => {
    setResume((current) => current ? { ...current, candidate } : current)
    if (userId === candidate.id) updateUser(candidate)
}, [setResume, updateUser, userId])

export const useResumePage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user, updateUser } = useAuth()
    const autosave = useAutosaveQueue()
    const empty = useEmptyAttributes()
    const [banner, setBanner] = useState(null)
    const query = useResumeQuery(id, empty.setEmptyMap)
    const handleConflict = useConflictHandler(setBanner, query.reload)
    const saveAttribute = useAttributeSaver({ resume: query.data, setResume: query.setData, handleConflict, setBanner })
    const publisher = useResumePublisher({ id, resume: query.data, setResume: query.setData, setEmptyMap: empty.setEmptyMap, handleConflict, setBanner })
    const like = useLikeToggle({ id, resume: query.data, setResume: query.setData, setBanner })
    const changeCandidate = useCandidateChange({ userId: user?.id, updateUser, setResume: query.setData })
    const scheduleAttributeSave = useCallback((attribute, updated) => autosave.schedule(`attr:${attribute.attributeId}`, () => saveAttribute(attribute, updated)), [autosave, saveAttribute])
    const resume = query.data
    return {
        ...query,
        ...empty,
        ...publisher,
        ...like,
        autosave,
        banner,
        canLike: Boolean(user && resume) && user.id !== resume.candidateId && user.roles.some((role) => ['RECRUITER', 'ADMIN'].includes(role)),
        changeCandidate,
        clearBanner: () => setBanner(null),
        handleConflict,
        openPosition: () => navigate(`/positions/${resume.positionId}`),
        scheduleAttributeSave,
    }
}
