import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProfile } from '../../api/profile.js'
import { useAuth } from '../../context/auth-context.js'
import { useAutosaveQueue } from '../../lib/useAutosaveQueue.js'
import { useAsyncData } from '../useAsyncData.js'

export const useProfilePage = () => {
    const { candidateId } = useParams()
    const { user, updateUser } = useAuth()
    const targetId = candidateId ?? user?.id
    const [revision, setRevision] = useState(0)
    const [banner, setBanner] = useState(null)
    const autosave = useAutosaveQueue()
    const fetchProfile = useCallback(() => getProfile(targetId), [targetId])
    const query = useAsyncData(fetchProfile, { enabled: Boolean(targetId), refreshKey: revision })

    const handleConflict = useCallback((error) => {
        setBanner(error)
        setRevision((value) => value + 1)
    }, [])

    const changeCandidate = useCallback((candidate) => {
        query.setData((current) => current ? { ...current, user: candidate } : current)
        if (candidate.id === user?.id) updateUser(candidate)
    }, [query, updateUser, user?.id])

    return {
        ...query,
        autosave,
        banner,
        candidateId: targetId,
        changeCandidate,
        clearBanner: () => setBanner(null),
        displayUser: query.data?.user ?? (candidateId ? null : user),
        handleConflict,
        revision,
    }
}
