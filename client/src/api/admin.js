import { get, patch, post, remove, withQuery } from './http.js'

export const listUsers = ({ q } = {}) => get(withQuery('/api/admin/users', { q }))
export const setUserBlocked = (id, isBlocked, version) => patch(`/api/admin/users/${id}`, { isBlocked, version })
export const deleteUser = (id, version) => remove(`/api/admin/users/${id}`, { version })
export const assignRole = (id, role) => post(`/api/admin/users/${id}/roles`, { role })
export const removeRole = (id, role) => remove(`/api/admin/users/${id}/roles/${role}`)
