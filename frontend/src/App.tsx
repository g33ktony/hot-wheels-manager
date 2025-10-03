import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/common/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Sales from './pages/Sales'
import Purchases from './pages/Purchases'
import Deliveries from './pages/Deliveries'
import Customers from './pages/Customers'
import Suppliers from './pages/Suppliers'

function App() {
    return (
        <AuthProvider>
            <Routes>
                {/* Ruta pública */}
                <Route path="/login" element={<Login />} />

                {/* Rutas protegidas */}
                <Route
                    path="/*"
                    element={
                        <PrivateRoute>
                            <Layout>
                                <Routes>
                                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    <Route path="/inventory" element={<Inventory />} />
                                    <Route path="/sales" element={<Sales />} />
                                    <Route path="/purchases" element={<Purchases />} />
                                    <Route path="/deliveries" element={<Deliveries />} />
                                    <Route path="/customers" element={<Customers />} />
                                    <Route path="/suppliers" element={<Suppliers />} />
                                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                </Routes>
                            </Layout>
                        </PrivateRoute>
                    }
                />
            </Routes>
        </AuthProvider>
    )
}

export default App
