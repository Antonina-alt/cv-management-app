import { apiRequest } from './http.js';

export const listAttributeCategories = () => apiRequest('/api/attribute-categories', { method: 'GET' });

export const listAttributes = ({ q, categoryId } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (categoryId) params.set('categoryId', categoryId);
    const qs = params.toString();
    return apiRequest(`/api/attributes${qs ? `?${qs}` : ''}`, { method: 'GET' });
};

export const createAttribute = (data) =>
    apiRequest('/api/attributes', { method: 'POST', body: JSON.stringify(data) });

export const updateAttribute = (id, data) =>
    apiRequest(`/api/attributes/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteAttribute = (id, version) =>
    apiRequest(`/api/attributes/${id}`, { method: 'DELETE', body: JSON.stringify({ version }) });
