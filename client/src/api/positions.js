import { apiRequest } from './http.js';

export const listPositions = ({ company, level } = {}) => {
    const params = new URLSearchParams();
    if (company) params.set('company', company);
    if (level) params.set('level', level);
    const qs = params.toString();
    return apiRequest(`/api/positions${qs ? `?${qs}` : ''}`, { method: 'GET' });
};

export const getPosition = (id) => apiRequest(`/api/positions/${id}`, { method: 'GET' });

export const createPosition = (data) =>
    apiRequest('/api/positions', { method: 'POST', body: JSON.stringify(data) });

export const updatePosition = (id, data) =>
    apiRequest(`/api/positions/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deletePosition = (id, version) =>
    apiRequest(`/api/positions/${id}`, { method: 'DELETE', body: JSON.stringify({ version }) });

export const duplicatePosition = (id) =>
    apiRequest(`/api/positions/${id}/duplicate`, { method: 'POST' });
