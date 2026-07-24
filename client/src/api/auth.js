import { get, patch, post } from './http.js'

const authPath = (path) => `/api/auth${path}`

export const register = (data) => post(authPath('/register'), data)
export const login = (data) => post(authPath('/login'), data)
export const logout = () => post(authPath('/logout'))
export const me = () => get(authPath('/me'))
export const updateMe = (data) => patch(authPath('/me'), data)
