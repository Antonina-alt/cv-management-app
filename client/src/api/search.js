import { apiRequest } from './http.js';

export const search = (query) => apiRequest(`/api/search?q=${encodeURIComponent(query)}`, { method: 'GET' });
