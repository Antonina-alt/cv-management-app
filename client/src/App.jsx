import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'

const App = () => (
    <BrowserRouter>
        <AuthProvider>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route
                    path="/"
                    element={(
                        <ProtectedRoute>
                            <ProfilePage />
                        </ProtectedRoute>
                    )}
                />
            </Routes>
        </AuthProvider>
    </BrowserRouter>
)

export default App
