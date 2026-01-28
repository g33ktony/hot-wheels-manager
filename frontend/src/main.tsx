import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from 'react-query'
// Theme system v1.0 - Dynamic color customization enabled
import { Toaster } from 'react-hot-toast'
import { store } from './store/store'
import App from './App.tsx'
import './index.css'

// Configuración optimizada de React Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 10 * 60 * 1000, // 10 minutos - datos frescos por más tiempo
            cacheTime: 15 * 60 * 1000, // 15 minutos - mantener en cache más tiempo
            keepPreviousData: true, // Mostrar datos anteriores mientras carga nuevos (pagination)
        },
        mutations: {
            retry: 1,
        },
    },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Provider store={store}>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <App />
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: '#363636',
                                color: '#fff',
                            },
                            success: {
                                duration: 3000,
                                iconTheme: {
                                    primary: '#22c55e',
                                    secondary: '#fff',
                                },
                            },
                            error: {
                                duration: 5000,
                                iconTheme: {
                                    primary: '#ef4444',
                                    secondary: '#fff',
                                },
                            },
                        }}
                    />
                </BrowserRouter>
            </QueryClientProvider>
        </Provider>
    </React.StrictMode>,
)
