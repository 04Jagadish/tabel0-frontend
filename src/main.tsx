import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

const signInStatus = <main className="auth-page"><p role="status">Checking sign-in…</p></main>

const router = createBrowserRouter([
  {
    hydrateFallbackElement: signInStatus,
    shouldRevalidate: ({ currentUrl, nextUrl, defaultShouldRevalidate }) =>
      currentUrl.pathname !== nextUrl.pathname || defaultShouldRevalidate,
    lazy: async () => {
      const [{ SignedInLayout }, { loadAccount }] = await Promise.all([
        import('./auth/AuthPages'), import('./auth/loaders'),
      ])
      return { Component: SignedInLayout, loader: loadAccount }
    },
    children: [
      { path: '/', Component: App },
      {
        path: '/dashboard',
        lazy: async () => ({ Component: (await import('./auth/AuthPages')).DashboardPage }),
      },
    ],
  },
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
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
