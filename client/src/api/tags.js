import { get, withQuery } from './http.js'

export const searchTags = (q) => get(withQuery('/api/tags', { q }))
