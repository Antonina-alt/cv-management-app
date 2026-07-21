import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/auth-context.js'
import { updateAbout, setProfileImage, removeProfileImage } from '../../api/profile.js'
import { deleteImage } from '../../api/images.js'
import { ConflictError } from '../../api/http.js'
import ImageUploader from '../upload/ImageUploader.jsx'

// "About me" section: built-in, non-removable attributes (first name, last name, location,
// photo) stored directly on the User record. Text fields autosave through the shared debounce
// queue; the photo drop/remove is a discrete action and saves immediately, exactly like the
// original profile page.
const AboutSection = ({ autosave, onConflict }) => {
    const { t } = useTranslation()
    const { user, updateUser, refresh } = useAuth()
    const [form, setForm] = useState({
        firstName: user.firstName,
        lastName: user.lastName,
        location: user.location ?? '',
    })
    const [banner, setBanner] = useState(null)

    const flush = async (fields) => {
        try {
            const updated = await updateAbout(user.id, { ...fields, version: user.version })
            updateUser(updated)
            setBanner(null)
        } catch (err) {
            if (err instanceof ConflictError) {
                refresh()
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
            const updated = await setProfileImage(url, user.version)
            updateUser(updated)
            setBanner(null)
        } catch (err) {
            if (err instanceof ConflictError) {
                setBanner(t('profile.conflict'))
                refresh()
            } else {
                setBanner(err.message)
            }
        }
    }

    const handleRemoveImage = async () => {
        const previousUrl = user.imageUrl
        try {
            const updated = await removeProfileImage(user.version)
            updateUser(updated)
            setBanner(null)
            if (previousUrl) {
                deleteImage(previousUrl).catch(() => {})
            }
        } catch (err) {
            if (err instanceof ConflictError) {
                setBanner(t('profile.conflict'))
                refresh()
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
                <div className="col-md-4">
                    <ImageUploader value={user.imageUrl} onUpload={handleUploadImage} onRemove={handleRemoveImage} />
                </div>
                <div className="col-md-8">
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
