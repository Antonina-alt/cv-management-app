import { apiRequest } from './http.js';

export const getHomeStats = () => apiRequest('/api/home/stats', { method: 'GET' });

export const listRecentPositions = ({ limit } = {}) => {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit);
    const qs = params.toString();
    return apiRequest(`/api/home/recent-positions${qs ? `?${qs}` : ''}`, { method: 'GET' });
};
