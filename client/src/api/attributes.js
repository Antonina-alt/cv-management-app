import { get, patch, post, remove, withQuery } from './http.js'

export const listAttributeCategories = () => get('/api/attribute-categories')
export const listAttributes = ({ q, categoryId } = {}) => get(withQuery('/api/attributes', { q, categoryId }))
export const createAttribute = (data) => post('/api/attributes', data)
export const updateAttribute = (id, data) => patch(`/api/attributes/${id}`, data)
export const deleteAttribute = (id, version) => remove(`/api/attributes/${id}`, { version })
