import { useTranslation } from 'react-i18next'
import { useIdentityForm } from '../../hooks/useIdentityForm.js'
import DismissibleAlert from '../common/DismissibleAlert.jsx'
import ImageUploader from '../upload/ImageUploader.jsx'
import IdentityFields from './IdentityFields.jsx'

const AboutSection = ({ candidate, onCandidateChange, autosave, onConflict }) => {
    const { t } = useTranslation()
    const identity = useIdentityForm(candidate, { autosaveKey: 'about', conflictMessage: t('profile.conflict'), autosave, onConflict, onCandidateChange })
    return (
        <div>
            <DismissibleAlert onClose={() => identity.setBanner(null)}>{identity.banner}</DismissibleAlert>
            <div className="row g-4">
                <div className="col-md-3"><ImageUploader value={candidate.imageUrl} onUpload={identity.handleUploadImage} onRemove={identity.handleRemoveImage} /></div>
                <div className="col-md-9"><IdentityFields form={identity.form} onChange={identity.handleField} t={t} /></div>
            </div>
        </div>
    )
}

export default AboutSection
