import { apiRequest } from './http.js';

export const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch('/api/images', {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(body?.message ?? `Request failed with status ${res.status}`);
    }

    return body;
};

export const deleteImage = (url) =>
    apiRequest('/api/images', { method: 'DELETE', body: JSON.stringify({ url }) });
