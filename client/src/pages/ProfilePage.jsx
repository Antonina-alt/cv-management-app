import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/auth-context.js'
import { setProfileImage, removeProfileImage } from '../api/profile.js'
import { deleteImage } from '../api/images.js'
import { ConflictError } from '../api/http.js'
import ImageUploader from '../components/upload/ImageUploader.jsx'

const ProfilePage = () => {
    const { t } = useTranslation()
    const { user, updateUser, refresh } = useAuth()
    const [banner, setBanner] = useState(null)

    const handleUpload = async (url) => {
        try {
            const updated = await setProfileImage(url, user.version)
            updateUser(updated)
            setBanner(null)
        } catch (err) {
            if (err instanceof ConflictError) {
                setBanner(t('profile.image.conflict'))
                refresh()
            } else {
                setBanner(err.message)
            }
        }
    }

    const handleRemove = async () => {
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
                setBanner(t('profile.image.conflict'))
                refresh()
            } else {
                setBanner(err.message)
            }
        }
    }

    return (
        <div>
            <h1>{t('profile.title')}</h1>
            <p>{user.firstName} {user.lastName}</p>
            <p>{user.email}</p>
            <p>{t('profile.roles')}: {user.roles.join(', ')}</p>

            {banner && (
                <div className="alert alert-warning alert-dismissible" role="alert">
                    {banner}
                    <button type="button" className="btn-close" onClick={() => setBanner(null)} />
                </div>
            )}

            <div style={{ maxWidth: 320 }}>
                <ImageUploader value={user.imageUrl} onUpload={handleUpload} onRemove={handleRemove} />
            </div>
        </div>
    )
}

export default ProfilePage
