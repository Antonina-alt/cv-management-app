import { useTranslation } from 'react-i18next'
import { useIdentityForm } from '../../hooks/useIdentityForm.js'
import DismissibleAlert from '../common/DismissibleAlert.jsx'
import IdentityFields from '../profile/IdentityFields.jsx'
import ImageUploader from '../upload/ImageUploader.jsx'

const IdentityPhoto = ({ candidate, editable, onUpload, onRemove, t }) => {
    if (editable) return <ImageUploader value={candidate.imageUrl} onUpload={onUpload} onRemove={onRemove} />
    if (candidate.imageUrl) return <img src={candidate.imageUrl} alt={t('profile.image.preview')} className="img-thumbnail" style={{ maxWidth: 160, maxHeight: 160 }} />
    return <div className="border border-danger rounded p-4 text-center text-danger">{t('resume.identity.noPhoto')}</div>
}

const ResumeIdentitySection = ({ candidate, editableText, editableImage, autosave, onConflict, onCandidateChange }) => {
    const { t } = useTranslation()
    const identity = useIdentityForm(candidate, { autosaveKey: 'resume-about', conflictMessage: t('resume.identity.conflict'), autosave, onConflict, onCandidateChange })
    return (
        <div>
            <DismissibleAlert onClose={() => identity.setBanner(null)}>{identity.banner}</DismissibleAlert>
            <div className="row g-4">
                <div className="col-md-3"><IdentityPhoto candidate={candidate} editable={editableImage} onUpload={identity.handleUploadImage} onRemove={identity.handleRemoveImage} t={t} /></div>
                <div className="col-md-9"><IdentityFields form={identity.form} disabled={!editableText} highlightEmpty onChange={identity.handleField} t={t} /></div>
            </div>
        </div>
    )
}

export default ResumeIdentitySection
