import { post, remove } from './http.js'

export const uploadImage = (file) => {
    const formData = new FormData()
    formData.append('image', file)
    return post('/api/images', formData)
}

export const deleteImage = (url) => remove('/api/images', { url })
