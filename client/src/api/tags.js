import { apiRequest } from './http.js';

export const searchTags = (q) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    const qs = params.toString();
    return apiRequest(`/api/tags${qs ? `?${qs}` : ''}`, { method: 'GET' });
};
