import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const LoginPage = () => {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        try {
            await login({ email, password })
            navigate('/', { replace: true })
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div>
            <h1>Log in</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email">Email</label>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                    <label htmlFor="password">Password</label>
                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {error && <p role="alert">{error}</p>}
                <button type="submit">Log in</button>
            </form>
            <p>
                No account? <Link to="/register">Register</Link>
            </p>
        </div>
    )
}

export default LoginPage
