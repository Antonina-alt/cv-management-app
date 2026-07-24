import { get, patch, post, put, remove } from './http.js'

export const createResume = (positionId) => post('/api/resumes', { positionId })
export const getResume = (id) => get(`/api/resumes/${id}`)
export const publishResume = (id, version) => patch(`/api/resumes/${id}/publish`, { version })
export const likeResume = (id) => put(`/api/resumes/${id}/like`)
export const unlikeResume = (id) => remove(`/api/resumes/${id}/like`)
