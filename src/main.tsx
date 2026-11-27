import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

const signInStatus = <main className="auth-page"><p role="status">Checking sign-in…</p></main>

const router = createBrowserRouter([
  { path: '/', Component: App },
  {
    path: '/login',
    hydrateFallbackElement: signInStatus,
    lazy: async () => ({ Component: (await import('./auth/AuthPages')).LoginPage }),
  },
  {
    path: '/auth/callback',
    element: signInStatus,
    hydrateFallbackElement: signInStatus,
    lazy: async () => ({ loader: (await import('./auth/loaders')).completeSignIn }),
  },
  {
    path: '/dashboard',
    hydrateFallbackElement: signInStatus,
    lazy: async () => {
      const [{ DashboardPage }, { loadAccount }] = await Promise.all([
        import('./auth/AuthPages'), import('./auth/loaders'),
      ])
      return { Component: DashboardPage, loader: loadAccount }
    },
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
