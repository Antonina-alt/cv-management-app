import { apiRequest } from './http.js';

export const createResume = (positionId) =>
    apiRequest('/api/resumes', { method: 'POST', body: JSON.stringify({ positionId }) });

export const getResume = (id) => apiRequest(`/api/resumes/${id}`, { method: 'GET' });

export const publishResume = (id, version) =>
    apiRequest(`/api/resumes/${id}/publish`, { method: 'PATCH', body: JSON.stringify({ version }) });

export const likeResume = (id) => apiRequest(`/api/resumes/${id}/like`, { method: 'PUT' });

export const unlikeResume = (id) => apiRequest(`/api/resumes/${id}/like`, { method: 'DELETE' });
