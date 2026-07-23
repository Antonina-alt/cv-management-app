import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import ImageUploader from '../upload/ImageUploader.jsx'
import { useIdentityForm } from '../../hooks/useIdentityForm.js'

const AboutSection = ({ candidate, onCandidateChange, autosave, onConflict }) => {
    const { t } = useTranslation()
    const { form, banner, setBanner, handleField, handleUploadImage, handleRemoveImage } = useIdentityForm(candidate, {
        autosaveKey: 'about',
        conflictMessage: t('profile.conflict'),
        autosave,
        onConflict,
        onCandidateChange,
    })

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
                        <Form.Control value={form.firstName} onChange={(e) => handleField('firstName', e.target.value)} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>{t('profile.about.lastName')}</Form.Label>
                        <Form.Control value={form.lastName} onChange={(e) => handleField('lastName', e.target.value)} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>{t('profile.about.location')}</Form.Label>
                        <Form.Control value={form.location} onChange={(e) => handleField('location', e.target.value)} />
                    </Form.Group>
                </div>
            </div>
        </div>
    )
}

export default AboutSection
