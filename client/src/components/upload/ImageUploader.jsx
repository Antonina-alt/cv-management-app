import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useTranslation } from 'react-i18next'
import { uploadImage } from '../../api/images.js'

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

// Reusable, entity-agnostic image drag&drop uploader (used by the profile photo now,
// and by CandidateAttributeValue IMAGE attributes later). It only knows how to upload/
// report a URL — the parent owns the DB link (write on upload, unlink+delete on remove).
const ImageUploader = ({ value, onUpload, onRemove, disabled }) => {
    const { t } = useTranslation()
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState(null)

    const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
        if (rejectedFiles.length > 0) {
            setError(t('profile.image.invalid'))
            return
        }

        const file = acceptedFiles[0]
        if (!file) return

        setError(null)
        setUploading(true)
        uploadImage(file)
            .then((body) => onUpload(body.url))
            .catch(() => setError(t('profile.image.uploadFailed')))
            .finally(() => setUploading(false))
    }, [onUpload, t])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: ALLOWED_MIME_TYPES.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
        maxSize: MAX_FILE_SIZE_BYTES,
        maxFiles: 1,
        disabled: disabled || uploading,
    })

    // Once an image is set, drop the dropzone chrome (border/padding/hint text) and show just
    // the image — it's still clickable/droppable to replace, only the framing goes away.
    const showDropzoneChrome = !value || uploading

    return (
        <div className="d-flex flex-column align-items-center">
            <div
                {...getRootProps()}
                className={showDropzoneChrome ? `border rounded p-4 text-center ${isDragActive ? 'border-primary bg-body-tertiary' : 'border-secondary-subtle'}` : ''}
                style={{ cursor: disabled || uploading ? 'default' : 'pointer', display: showDropzoneChrome ? 'block' : 'inline-block' }}
            >
                <input {...getInputProps()} />
                {value ? (
                    <img
                        src={value}
                        alt={t('profile.image.preview')}
                        className={showDropzoneChrome ? 'img-thumbnail mb-2' : 'img-thumbnail'}
                        style={{ maxWidth: 160, maxHeight: 160 }}
                    />
                ) : null}
                {showDropzoneChrome && (
                    <p className="mb-0 text-muted">
                        {uploading ? t('profile.image.uploading') : t('profile.image.dropHint')}
                    </p>
                )}
            </div>

            {error && <div className="alert alert-danger mt-2 mb-0">{error}</div>}

            {value && !uploading && (
                <button
                    type="button"
                    className="btn btn-outline-danger btn-sm mt-2"
                    disabled={disabled}
                    onClick={onRemove}
                >
                    {t('profile.image.remove')}
                </button>
            )}
        </div>
    )
}

export default ImageUploader
