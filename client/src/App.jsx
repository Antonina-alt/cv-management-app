import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { PreferencesProvider } from './context/PreferencesContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import HomePage from './pages/HomePage.jsx'
import PositionsPage from './pages/PositionsPage.jsx'
import PositionDetailPage from './pages/PositionDetailPage.jsx'
import SearchResultsPage from './pages/SearchResultsPage.jsx'
import AttributesPage from './pages/AttributesPage.jsx'
import AdminPage from './pages/AdminPage.jsx'

const App = () => (
    <BrowserRouter>
        <AuthProvider>
            <PreferencesProvider>
                <Routes>
                    <Route element={<AppLayout />}>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/positions" element={<PositionsPage />} />
                        <Route
                            path="/positions/:id"
                            element={(
                                <ProtectedRoute>
                                    <PositionDetailPage />
                                </ProtectedRoute>
                            )}
                        />
                        <Route path="/search" element={<SearchResultsPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route
                            path="/profile"
                            element={(
                                <ProtectedRoute>
                                    <ProfilePage />
                                </ProtectedRoute>
                            )}
                        />
                        <Route
                            path="/attributes"
                            element={(
                                <ProtectedRoute roles={['RECRUITER', 'ADMIN']}>
                                    <AttributesPage />
                                </ProtectedRoute>
                            )}
                        />
                        <Route
                            path="/admin"
                            element={(
                                <ProtectedRoute roles={['ADMIN']}>
                                    <AdminPage />
                                </ProtectedRoute>
                            )}
                        />
                    </Route>
                </Routes>
            </PreferencesProvider>
        </AuthProvider>
    </BrowserRouter>
)

export default App
