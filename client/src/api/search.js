import { get, withQuery } from './http.js'

export const search = (query) => get(withQuery('/api/search', { q: query }))
