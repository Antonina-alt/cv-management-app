import {BrowserRouter, Route, Routes} from 'react-router-dom'
import AppLayout from './components/layout/AppLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import {AuthProvider} from './context/AuthContext.jsx'
import {PreferencesProvider} from './context/PreferencesContext.jsx'
import AttributesPage from './pages/AttributesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import PositionDetailPage from './pages/PositionDetailPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ResumePage from './pages/ResumePage.jsx'
import SearchResultsPage from './pages/SearchResultsPage.jsx'
import {lazy, Suspense} from 'react'

const HomePage = lazy(() => import('./pages/HomePage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const PositionsPage = lazy(() => import('./pages/PositionsPage.jsx'))
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))

const protectedPage = (page, roles) => <ProtectedRoute roles={roles}>{page}</ProtectedRoute>

const App = () => (
    <BrowserRouter>
        <AuthProvider>
            <PreferencesProvider>
                <Suspense fallback={<div className="text-center py-5">Loading...</div>}>
                    <Routes>
                        <Route element={<AppLayout/>}>
                            <Route path="/" element={<HomePage/>}/>
                            <Route path="/positions" element={<PositionsPage/>}/>
                            <Route path="/positions/:id" element={<PositionDetailPage/>}/>
                            <Route path="/resumes/:id" element={protectedPage(<ResumePage/>)}/>
                            <Route path="/search" element={<SearchResultsPage/>}/>
                            <Route path="/login" element={<LoginPage/>}/>
                            <Route path="/register" element={<RegisterPage/>}/>
                            <Route path="/profile" element={protectedPage(<ProfilePage/>)}/>
                            <Route path="/profile/:candidateId" element={protectedPage(<ProfilePage/>)}/>
                            <Route path="/attributes"
                                   element={protectedPage(<AttributesPage/>, ['RECRUITER', 'ADMIN'])}/>
                            <Route path="/admin" element={protectedPage(<AdminPage/>, ['ADMIN'])}/>
                        </Route>
                    </Routes>
                </Suspense>
            </PreferencesProvider>
        </AuthProvider>
    </BrowserRouter>
)

export default App
