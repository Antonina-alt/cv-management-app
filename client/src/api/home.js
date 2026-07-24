import { get, withQuery } from './http.js'

export const getHomeStats = () => get('/api/home/stats')
export const listRecentPositions = ({ limit } = {}) => get(withQuery('/api/home/recent-positions', { limit }))
