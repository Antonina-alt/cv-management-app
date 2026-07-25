import { useEffect, useRef, useState } from 'react'
import { ConflictError } from '../api/http.js'
import { deleteImage } from '../api/images.js'
import { removeProfileImage, setProfileImage, updateAbout } from '../api/profile.js'

export const useIdentityForm = (candidate, { autosaveKey, autosave, onConflict, onCandidateChange }) => {
    const [form, setForm] = useState({
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        location: candidate.location ?? '',
    })
    const [banner, setBanner] = useState(null)
    const versionRef = useRef(candidate.version)

    useEffect(() => {
        versionRef.current = candidate.version
    }, [candidate.version])

    const applyUpdate = (updated) => {
        versionRef.current = updated.version
        onCandidateChange(updated)
        setBanner(null)
    }

    const handleError = (error) => {
        if (error instanceof ConflictError) return onConflict?.(error)
        setBanner(error)
    }

    const flush = async (fields) => {
        try {
            applyUpdate(await updateAbout(candidate.id, { ...fields, version: versionRef.current }))
        } catch (error) {
            handleError(error)
        }
    }

    const handleField = (field, value) => {
        const next = { ...form, [field]: value }
        setForm(next)
        autosave.schedule(autosaveKey, () => flush(next))
    }

    const handleUploadImage = async (url) => {
        try {
            applyUpdate(await setProfileImage(candidate.id, url, versionRef.current))
        } catch (error) {
            handleError(error)
        }
    }

    const handleRemoveImage = async () => {
        const previousUrl = candidate.imageUrl
        try {
            applyUpdate(await removeProfileImage(candidate.id, versionRef.current))
            if (previousUrl) deleteImage(previousUrl).catch(() => {})
        } catch (error) {
            handleError(error)
        }
    }

    return { form, banner, setBanner, handleField, handleUploadImage, handleRemoveImage }
}
