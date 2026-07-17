import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const ProtectedRoute = ({ children, roles }) => {
    const { user, loading } = useAuth()

    if (loading) {
        return null
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    if (roles && !user.roles.includes('ADMIN') && !roles.some((role) => user.roles.includes(role))) {
        return <Navigate to="/" replace />
    }

    return children
}

export default ProtectedRoute
