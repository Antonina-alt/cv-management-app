import { get, patch, post, remove, withQuery } from './http.js'

export const listPositions = ({ company, level } = {}) => get(withQuery('/api/positions', { company, level }))
export const getPosition = (id) => get(`/api/positions/${id}`)
export const createPosition = (data) => post('/api/positions', data)
export const updatePosition = (id, data) => patch(`/api/positions/${id}`, data)
export const deletePosition = (id, version) => remove(`/api/positions/${id}`, { version })
export const duplicatePosition = (id) => post(`/api/positions/${id}/duplicate`)
