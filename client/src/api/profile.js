import { get, patch, post, remove } from './http.js'

const profilePath = (candidateId, suffix = '') => `/api/profile/${candidateId}${suffix}`

export const setProfileImage = (candidateId, imageUrl, version) => patch(profilePath(candidateId, '/image'), { imageUrl, version })
export const removeProfileImage = (candidateId, version) => remove(profilePath(candidateId, '/image'), { version })
export const getProfile = (candidateId) => get(profilePath(candidateId))
export const updateAbout = (candidateId, data) => patch(profilePath(candidateId, '/about'), data)
export const createAttributeValue = (candidateId, data) => post(profilePath(candidateId, '/attribute-values'), data)
export const updateAttributeValue = (candidateId, valueId, data) => patch(profilePath(candidateId, `/attribute-values/${valueId}`), data)
export const deleteAttributeValue = (candidateId, valueId, version) => remove(profilePath(candidateId, `/attribute-values/${valueId}`), { version })
export const createProject = (candidateId, data) => post(profilePath(candidateId, '/projects'), data)
export const updateProject = (candidateId, projectId, data) => patch(profilePath(candidateId, `/projects/${projectId}`), data)
export const deleteProject = (candidateId, projectId, version) => remove(profilePath(candidateId, `/projects/${projectId}`), { version })
