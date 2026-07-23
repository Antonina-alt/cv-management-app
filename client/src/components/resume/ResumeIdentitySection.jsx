import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import ImageUploader from '../upload/ImageUploader.jsx'
import { useIdentityForm } from '../../hooks/useIdentityForm.js'

const IdentityPhoto = ({ candidate, editableImage, onUpload, onRemove, t }) => {
    if (editableImage) return <ImageUploader value={candidate.imageUrl} onUpload={onUpload} onRemove={onRemove} />
    if (candidate.imageUrl) {
        return (
            <img
                src={candidate.imageUrl}
                alt={t('profile.image.preview')}
                className="img-thumbnail"
                style={{ maxWidth: 160, maxHeight: 160 }}
            />
        )
    }
    return <div className="border border-danger rounded p-4 text-center text-danger">{t('resume.identity.noPhoto')}</div>
}

const ResumeIdentitySection = ({ candidate, editableText, editableImage, autosave, onConflict, onCandidateChange }) => {
    const { t } = useTranslation()
    const { form, banner, setBanner, handleField, handleUploadImage, handleRemoveImage } = useIdentityForm(candidate, {
        autosaveKey: 'resume-about',
        conflictMessage: t('resume.identity.conflict'),
        autosave,
        onConflict,
        onCandidateChange,
    })
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
                    <IdentityPhoto
                        candidate={candidate}
                        editableImage={editableImage}
                        onUpload={handleUploadImage}
                        onRemove={handleRemoveImage}
                        t={t}
                    />
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
