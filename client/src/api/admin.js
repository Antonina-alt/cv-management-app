import { apiRequest } from './http.js';

export const listUsers = ({ q } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    const qs = params.toString();
    return apiRequest(`/api/admin/users${qs ? `?${qs}` : ''}`, { method: 'GET' });
};

export const setUserBlocked = (id, isBlocked, version) =>
    apiRequest(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ isBlocked, version }) });

export const deleteUser = (id, version) =>
    apiRequest(`/api/admin/users/${id}`, { method: 'DELETE', body: JSON.stringify({ version }) });

export const assignRole = (id, role) =>
    apiRequest(`/api/admin/users/${id}/roles`, { method: 'POST', body: JSON.stringify({ role }) });

export const removeRole = (id, role) =>
    apiRequest(`/api/admin/users/${id}/roles/${role}`, { method: 'DELETE' });
