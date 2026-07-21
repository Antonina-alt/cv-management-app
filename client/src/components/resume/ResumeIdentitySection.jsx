import { useEffect, useRef, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import ImageUploader from '../upload/ImageUploader.jsx'
import { updateAbout, setProfileImage, removeProfileImage } from '../../api/profile.js'
import { deleteImage } from '../../api/images.js'
import { ConflictError } from '../../api/http.js'

// The candidate's always-shown identity block (name/location/photo), stored directly on User.
// Text fields autosave through the shared debounce queue; the photo drop/remove saves
// immediately. Photo editing only works for the logged-in candidate themselves — /api/profile/
// image always targets the caller, not an arbitrary candidateId (see server route).
const ResumeIdentitySection = ({ candidate, editableText, editableImage, autosave, onConflict, onCandidateChange }) => {
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
        autosave.schedule('resume-about', () => flush(next))
    }

    const handleUploadImage = async (url) => {
        try {
            const updated = await setProfileImage(url, versionRef.current)
            versionRef.current = updated.version
            onCandidateChange(updated)
            setBanner(null)
        } catch (err) {
            if (err instanceof ConflictError) {
                setBanner(t('resume.identity.conflict'))
                onConflict?.()
            } else {
                setBanner(err.message)
            }
        }
    }

    const handleRemoveImage = async () => {
        const previousUrl = candidate.imageUrl
        try {
            const updated = await removeProfileImage(versionRef.current)
            versionRef.current = updated.version
            onCandidateChange(updated)
            setBanner(null)
            if (previousUrl) {
                deleteImage(previousUrl).catch(() => {})
            }
        } catch (err) {
            if (err instanceof ConflictError) {
                setBanner(t('resume.identity.conflict'))
                onConflict?.()
            } else {
                setBanner(err.message)
            }
        }
    }

    const locationEmpty = !form.location

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
                    {editableImage ? (
                        <ImageUploader value={candidate.imageUrl} onUpload={handleUploadImage} onRemove={handleRemoveImage} />
                    ) : candidate.imageUrl ? (
                        <img
                            src={candidate.imageUrl}
                            alt={t('profile.image.preview')}
                            className="img-thumbnail"
                            style={{ maxWidth: 160, maxHeight: 160 }}
                        />
                    ) : (
                        <div className="border border-danger rounded p-4 text-center text-danger">
                            {t('resume.identity.noPhoto')}
                        </div>
                    )}
                </div>
                <div className="col-md-9">
                    <Form.Group className="mb-3">
                        <Form.Label>{t('profile.about.firstName')}</Form.Label>
                        <Form.Control
                            value={form.firstName}
                            disabled={!editableText}
                            onChange={(e) => handleField('firstName', e.target.value)}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>{t('profile.about.lastName')}</Form.Label>
                        <Form.Control
                            value={form.lastName}
                            disabled={!editableText}
                            onChange={(e) => handleField('lastName', e.target.value)}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className={locationEmpty ? 'text-danger' : ''}>{t('profile.about.location')}</Form.Label>
                        <Form.Control
                            className={locationEmpty ? 'border-danger' : ''}
                            value={form.location}
                            disabled={!editableText}
                            onChange={(e) => handleField('location', e.target.value)}
                        />
                    </Form.Group>
                </div>
            </div>
        </div>
    )
}

export default ResumeIdentitySection
