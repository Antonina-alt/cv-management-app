import { apiRequest } from './http.js';

export const setProfileImage = (imageUrl, version) =>
    apiRequest('/api/profile/image', { method: 'PATCH', body: JSON.stringify({ imageUrl, version }) });

export const removeProfileImage = (version) =>
    apiRequest('/api/profile/image', { method: 'DELETE', body: JSON.stringify({ version }) });
