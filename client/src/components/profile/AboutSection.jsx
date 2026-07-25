import { useTranslation } from 'react-i18next'
import { useIdentityForm } from '../../hooks/useIdentityForm.js'
import ErrorAlert from '../common/ErrorAlert.jsx'
import ImageUploader from '../upload/ImageUploader.jsx'
import IdentityFields from './IdentityFields.jsx'

const AboutSection = ({ candidate, onCandidateChange, autosave, onConflict }) => {
    const { t } = useTranslation()
    const identity = useIdentityForm(candidate, { autosaveKey: 'about', autosave, onConflict, onCandidateChange })
    return (
        <div>
            <ErrorAlert error={identity.banner} onClose={() => identity.setBanner(null)} />
            <div className="row g-4">
                <div className="col-md-3"><ImageUploader value={candidate.imageUrl} onUpload={identity.handleUploadImage} onRemove={identity.handleRemoveImage} /></div>
                <div className="col-md-9"><IdentityFields form={identity.form} onChange={identity.handleField} t={t} /></div>
            </div>
        </div>
    )
}

export default AboutSection
