import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { SearchProvider } from './contexts/SearchContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { StoreProvider } from './contexts/StoreContext'
import PrivateRoute from './components/PrivateRoute'
import SysAdminRoute from './components/SysAdminRoute'
import AdminOrSysAdminRoute from './components/AdminOrSysAdminRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/common/Layout'
import { Loading } from './components/common/Loading'

const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const ChangePassword = lazy(() => import('./pages/ChangePassword'))
const Users = lazy(() => import('./pages/Users'))
const Stores = lazy(() => import('./pages/Stores'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Inventory = lazy(() => import('./pages/Inventory'))
const ItemDetail = lazy(() => import('./pages/ItemDetail'))
const Sales = lazy(() => import('./pages/Sales'))
const SalesStatistics = lazy(() => import('./pages/SalesStatistics'))
const Purchases = lazy(() => import('./pages/Purchases'))
const Deliveries = lazy(() => import('./pages/Deliveries'))
const CloudinaryDebug = lazy(() => import('./pages/CloudinaryDebug'))
const Search = lazy(() => import('./pages/Search'))
const ThemeSettings = lazy(() => import('./pages/ThemeSettings'))
const CatalogBrowser = lazy(() => import('./pages/public/CatalogBrowser'))
const Leads = lazy(() => import('./pages/Leads'))
const DataReports = lazy(() => import('./pages/DataReports'))
const Customers = lazy(() => import('./pages/Customers'))
const CustomerProfile = lazy(() => import('./pages/CustomerProfile'))
const Suppliers = lazy(() => import('./pages/Suppliers'))
const Boxes = lazy(() => import('./pages/Boxes'))
const PendingItemsPage = lazy(() => import('./pages/PendingItemsPage'))
const PreSaleHub = lazy(() => import('./pages/PreSaleHub'))
const PreSaleEditPage = lazy(() => import('./pages/PreSaleEditPage'))
const POS = lazy(() => import('./pages/POS'))
const GeminiTest = lazy(() => import('./pages/GeminiTest'))
const DeliveryAnalytics = lazy(() => import('./pages/DeliveryAnalytics').then((module) => ({ default: module.DeliveryAnalytics })))
const StoreSettings = lazy(() => import('./pages/StoreSettings'))
const CatalogBrowserPage = lazy(() => import('./pages/CatalogBrowserPage'))
const CatalogDetailPage = lazy(() => import('./pages/CatalogDetailPage'))

const routeFallback = <Loading fullScreen text="Cargando pagina..." />

// Test: Deployment optimization - only frontend changes
function App() {
    return (
        <AuthProvider>
            <StoreProvider>
                <SearchProvider>
                    <ThemeProvider>
                        <Suspense fallback={routeFallback}>
                            <Routes>
                                {/* Public routes - no authentication required */}
                                <Route path="/" element={<Navigate to="/browse" replace />} />
                                <Route path="/browse" element={<CatalogBrowser />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/signup" element={<Signup />} />

                                {/* Rutas protegidas */}
                                <Route
                                    path="/*"
                                    element={
                                        <ErrorBoundary>
                                            <PrivateRoute>
                                                <Layout>
                                                    <Routes>
                                                        <Route path="/dashboard" element={<Dashboard />} />
                                                        <Route path="/change-password" element={<ChangePassword />} />
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
                                                        <Route path="/leads" element={<SysAdminRoute><Leads /></SysAdminRoute>} />
                                                        <Route path="/data-reports" element={<SysAdminRoute><DataReports /></SysAdminRoute>} />
                                                        <Route path="/boxes" element={<Boxes />} />
                                                        <Route path="/cloudinary-debug" element={<CloudinaryDebug />} />
                                                        <Route path="/theme-settings" element={<ThemeSettings />} />
                                                        <Route path="/store-settings" element={<StoreSettings />} />
                                                        <Route path="/catalog" element={<CatalogBrowserPage />} />
                                                        <Route path="/catalog/items/:id" element={<CatalogDetailPage />} />
                                                        <Route path="/admin/users" element={<SysAdminRoute><Users /></SysAdminRoute>} />
                                                        <Route path="/admin/stores" element={<AdminOrSysAdminRoute><Stores /></AdminOrSysAdminRoute>} />
                                                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                                    </Routes>
                                                </Layout>
                                            </PrivateRoute>
                                        </ErrorBoundary>
                                    }
                                />
                            </Routes>
                        </Suspense>
                    </ThemeProvider>
                </SearchProvider>
            </StoreProvider>
        </AuthProvider>
    )
}

export default App
// Test watchPatterns
// Test watchPatterns
