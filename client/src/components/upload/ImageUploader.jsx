import { useCallback, useState } from 'react'
import { Button } from 'react-bootstrap'
import { useDropzone } from 'react-dropzone'
import { useTranslation } from 'react-i18next'
import { uploadImage } from '../../api/images.js'
import { createError } from '../../lib/errors.js'
import ErrorAlert from '../common/ErrorAlert.jsx'

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

const rejectionError = (rejectedFiles) => {
    const code = rejectedFiles[0]?.errors[0]?.code
    return createError(code === 'file-too-large' ? 'IMAGE_TOO_LARGE' : 'IMAGE_TYPE_INVALID')
}

const ImageUploader = ({ value, onUpload, onRemove, disabled }) => {
    const { t } = useTranslation()
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState(null)

    const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
        if (rejectedFiles.length) return setError(rejectionError(rejectedFiles))
        const file = acceptedFiles[0]
        if (!file) return
        setError(null)
        setUploading(true)
        uploadImage(file)
            .then(({ url }) => onUpload(url))
            .catch(setError)
            .finally(() => setUploading(false))
    }, [onUpload])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: Object.fromEntries(ALLOWED_MIME_TYPES.map((type) => [type, []])),
        maxSize: MAX_FILE_SIZE_BYTES,
        maxFiles: 1,
        disabled: disabled || uploading,
    })

    const showDropzoneChrome = !value || uploading

    return (
        <div className="d-flex flex-column align-items-center">
            <div
                {...getRootProps()}
                className={showDropzoneChrome ? `border rounded p-4 text-center ${isDragActive ? 'border-primary bg-body-tertiary' : 'border-secondary-subtle'}` : ''}
                style={{ cursor: disabled || uploading ? 'default' : 'pointer', display: showDropzoneChrome ? 'block' : 'inline-block' }}
            >
                <input {...getInputProps()} />
                {value && <img src={value} alt={t('profile.image.preview')} className={showDropzoneChrome ? 'img-thumbnail mb-2' : 'img-thumbnail'} style={{ maxWidth: 160, maxHeight: 160 }} />}
                {showDropzoneChrome && <p className="mb-0 text-muted">{uploading ? t('profile.image.uploading') : t('profile.image.dropHint')}</p>}
            </div>
            <ErrorAlert error={error} className="mt-2 mb-0" />
            {value && !uploading && <Button type="button" variant="outline-danger" size="sm" className="mt-2" disabled={disabled} onClick={onRemove}>{t('profile.image.remove')}</Button>}
        </div>
    )
}

export default ImageUploader
