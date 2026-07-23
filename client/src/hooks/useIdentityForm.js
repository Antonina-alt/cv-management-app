import { useEffect, useRef, useState } from 'react'
import { updateAbout, setProfileImage, removeProfileImage } from '../api/profile.js'
import { deleteImage } from '../api/images.js'
import { ConflictError } from '../api/http.js'

export const useIdentityForm = (candidate, { autosaveKey, conflictMessage, autosave, onConflict, onCandidateChange }) => {
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

    const handleConflictOrError = (err, message) => {
        if (err instanceof ConflictError) {
            if (message) setBanner(message)
            onConflict?.()
        } else {
            setBanner(err.message)
        }
    }

    const flush = async (fields) => {
        try {
            applyUpdate(await updateAbout(candidate.id, { ...fields, version: versionRef.current }))
        } catch (err) {
            handleConflictOrError(err)
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
        } catch (err) {
            handleConflictOrError(err, conflictMessage)
        }
    }

    const handleRemoveImage = async () => {
        const previousUrl = candidate.imageUrl
        try {
            applyUpdate(await removeProfileImage(candidate.id, versionRef.current))
            if (previousUrl) deleteImage(previousUrl).catch(() => {})
        } catch (err) {
            handleConflictOrError(err, conflictMessage)
        }
    }

    return { form, banner, setBanner, handleField, handleUploadImage, handleRemoveImage }
}
