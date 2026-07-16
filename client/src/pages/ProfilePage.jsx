import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const ProfilePage = () => {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    return (
        <div>
            <h1>Profile</h1>
            <p>{user.firstName} {user.lastName}</p>
            <p>{user.email}</p>
            <p>Roles: {user.roles.join(', ')}</p>
            <button type="button" onClick={handleLogout}>Log out</button>
        </div>
    )
}

export default ProfilePage
