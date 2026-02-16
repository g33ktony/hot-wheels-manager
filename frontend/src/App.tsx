import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SearchProvider } from './contexts/SearchContext'
import { ThemeProvider } from './contexts/ThemeContext'
import PrivateRoute from './components/PrivateRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/common/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import ItemDetail from './pages/ItemDetail'
import Sales from './pages/Sales'
import SalesStatistics from './pages/SalesStatistics'
import Purchases from './pages/Purchases'
import Deliveries from './pages/Deliveries'
import CloudinaryDebug from './pages/CloudinaryDebug'
import Search from './pages/Search'
import ThemeSettings from './pages/ThemeSettings'
import CatalogBrowser from './pages/public/CatalogBrowser'
import Leads from './pages/Leads'
import DataReports from './pages/DataReports'

// POS y Gemini Vision integrados
import Customers from './pages/Customers'
import CustomerProfile from './pages/CustomerProfile'
import Suppliers from './pages/Suppliers'
import Boxes from './pages/Boxes'
import PendingItemsPage from './pages/PendingItemsPage'
import PreSaleHub from './pages/PreSaleHub'
import PreSaleEditPage from './pages/PreSaleEditPage'
import POS from './pages/POS'
import GeminiTest from './pages/GeminiTest'
import { DeliveryAnalytics } from './pages/DeliveryAnalytics'
import StoreSettings from './pages/StoreSettings'

// Test: Deployment optimization - only frontend changes
function App() {
    return (
        <AuthProvider>
            <SearchProvider>
                <ThemeProvider>
                    <Routes>
                        {/* Public routes - no authentication required */}
                        <Route path="/" element={<Navigate to="/browse" replace />} />
                        <Route path="/browse" element={<CatalogBrowser />} />
                        <Route path="/login" element={<Login />} />

                        {/* Rutas protegidas */}
                        <Route
                            path="/*"
                            element={
                                <ErrorBoundary>
                                    <PrivateRoute>
                                        <Layout>
                                            <Routes>
                                                <Route path="/dashboard" element={<Dashboard />} />
                                                <Route path="/search" element={<Search />} />
                                                <Route path="/inventory" element={<Inventory />} />
                                                <Route path="/inventory/:id" element={<ItemDetail />} />
                                                <Route path="/pos" element={<POS />} />
                                                <Route path="/gemini-test" element={<GeminiTest />} />
                                                <Route path="/sales" element={<Sales />} />
                                                <Route path="/sales-statistics" element={<SalesStatistics />} />
                                                <Route path="/purchases" element={<Purchases />} />
                                                <Route path="/presale/:id/edit" element={<PreSaleEditPage />} />
                                                <Route path="/presale" element={<PreSaleHub />} />
                                                <Route path="/pending-items" element={<PendingItemsPage />} />
                                                <Route path="/deliveries" element={<Deliveries />} />
                                                <Route path="/delivery-analytics" element={<DeliveryAnalytics />} />
                                                <Route path="/customers" element={<Customers />} />
                                                <Route path="/customers/:customerId" element={<CustomerProfile />} />
                                                <Route path="/suppliers" element={<Suppliers />} />
                                                <Route path="/leads" element={<Leads />} />
                                                <Route path="/data-reports" element={<DataReports />} />
                                                <Route path="/boxes" element={<Boxes />} />
                                                <Route path="/cloudinary-debug" element={<CloudinaryDebug />} />
                                                <Route path="/theme-settings" element={<ThemeSettings />} />
                                                <Route path="/store-settings" element={<StoreSettings />} />
                                                <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                            </Routes>
                                        </Layout>
                                    </PrivateRoute>
                                </ErrorBoundary>
                            }
                        />
                    </Routes>
                </ThemeProvider>
            </SearchProvider>
        </AuthProvider>
    )
}

export default App
// Test watchPatterns
// Test watchPatterns
