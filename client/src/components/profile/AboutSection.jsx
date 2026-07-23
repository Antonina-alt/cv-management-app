import { useEffect, useRef, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { updateAbout, setProfileImage, removeProfileImage } from '../../api/profile.js'
import { deleteImage } from '../../api/images.js'
import { ConflictError } from '../../api/http.js'
import ImageUploader from '../upload/ImageUploader.jsx'

// "About me" section: built-in, non-removable attributes (first name, last name, location,
// photo) stored directly on the User record. Text fields autosave through the shared debounce
// queue; the photo drop/remove is a discrete action and saves immediately. `candidate` is the
// profile being viewed (self or, for an admin, any candidate) — never assume it's the logged-in
// user; `onCandidateChange` lets the parent (ProfilePage) keep its own state and the auth
// context in sync when you're editing yourself.
const AboutSection = ({ candidate, onCandidateChange, autosave, onConflict }) => {
    const { t } = useTranslation()
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

    const flush = async (fields) => {
        try {
            const updated = await updateAbout(candidate.id, { ...fields, version: versionRef.current })
            versionRef.current = updated.version
            onCandidateChange(updated)
            setBanner(null)
        } catch (err) {
            if (err instanceof ConflictError) {
                onConflict?.()
            } else {
                setBanner(err.message)
            }
        }
    }

    const handleField = (field, value) => {
        const next = { ...form, [field]: value }
        setForm(next)
        autosave.schedule('about', () => flush(next))
    }

    const handleUploadImage = async (url) => {
        try {
            const updated = await setProfileImage(candidate.id, url, versionRef.current)
            versionRef.current = updated.version
            onCandidateChange(updated)
            setBanner(null)
        } catch (err) {
            if (err instanceof ConflictError) {
                setBanner(t('profile.conflict'))
                onConflict?.()
            } else {
                setBanner(err.message)
            }
        }
    }

    const handleRemoveImage = async () => {
        const previousUrl = candidate.imageUrl
        try {
            const updated = await removeProfileImage(candidate.id, versionRef.current)
            versionRef.current = updated.version
            onCandidateChange(updated)
            setBanner(null)
            if (previousUrl) {
                deleteImage(previousUrl).catch(() => {})
            }
        } catch (err) {
            if (err instanceof ConflictError) {
                setBanner(t('profile.conflict'))
                onConflict?.()
            } else {
                setBanner(err.message)
            }
        }
    }

    return (
        <div>
            {banner && (
                <div className="alert alert-warning alert-dismissible" role="alert">
                    {banner}
                    <button type="button" className="btn-close" onClick={() => setBanner(null)} />
                </div>
            )}

            <div className="row g-4">
                <div className="col-md-3">
                    <ImageUploader value={candidate.imageUrl} onUpload={handleUploadImage} onRemove={handleRemoveImage} />
                </div>
                <div className="col-md-9">
                    <Form.Group className="mb-3">
                        <Form.Label>{t('profile.about.firstName')}</Form.Label>
                        <Form.Control
                            value={form.firstName}
                            onChange={(e) => handleField('firstName', e.target.value)}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>{t('profile.about.lastName')}</Form.Label>
                        <Form.Control
                            value={form.lastName}
                            onChange={(e) => handleField('lastName', e.target.value)}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>{t('profile.about.location')}</Form.Label>
                        <Form.Control
                            value={form.location}
                            onChange={(e) => handleField('location', e.target.value)}
                        />
                    </Form.Group>
                </div>
            </div>
        </div>
    )
}

export default AboutSection
