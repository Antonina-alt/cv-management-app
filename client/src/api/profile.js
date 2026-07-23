import { apiRequest } from './http.js';

export const setProfileImage = (candidateId, imageUrl, version) =>
    apiRequest(`/api/profile/${candidateId}/image`, { method: 'PATCH', body: JSON.stringify({ imageUrl, version }) });

export const removeProfileImage = (candidateId, version) =>
    apiRequest(`/api/profile/${candidateId}/image`, { method: 'DELETE', body: JSON.stringify({ version }) });

export const getProfile = (candidateId) =>
    apiRequest(`/api/profile/${candidateId}`, { method: 'GET' });

export const updateAbout = (candidateId, data) =>
    apiRequest(`/api/profile/${candidateId}/about`, { method: 'PATCH', body: JSON.stringify(data) });

export const createAttributeValue = (candidateId, data) =>
    apiRequest(`/api/profile/${candidateId}/attribute-values`, { method: 'POST', body: JSON.stringify(data) });

export const updateAttributeValue = (candidateId, valueId, data) =>
    apiRequest(`/api/profile/${candidateId}/attribute-values/${valueId}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteAttributeValue = (candidateId, valueId, version) =>
    apiRequest(`/api/profile/${candidateId}/attribute-values/${valueId}`, { method: 'DELETE', body: JSON.stringify({ version }) });

export const createProject = (candidateId, data) =>
    apiRequest(`/api/profile/${candidateId}/projects`, { method: 'POST', body: JSON.stringify(data) });

export const updateProject = (candidateId, projectId, data) =>
    apiRequest(`/api/profile/${candidateId}/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteProject = (candidateId, projectId, version) =>
    apiRequest(`/api/profile/${candidateId}/projects/${projectId}`, { method: 'DELETE', body: JSON.stringify({ version }) });
