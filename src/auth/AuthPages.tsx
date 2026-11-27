import { useEffect, useState } from 'react'
import { Link, Outlet, useLoaderData, useNavigate, useOutletContext, useRevalidator, useSearchParams } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { loadAccount } from './loaders'

export function LoginPage() {
  const [params] = useSearchParams()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const reason = params.get('reason')
  const callbackMessage = reason === 'cancelled'
    ? 'Google sign-in was cancelled.'
    : reason === 'callback' ? 'Could not complete Google sign-in. Please try again.' : ''
  const message = error || callbackMessage

  async function signIn() {
    if (!supabase) return

    setPending(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: new URL('/auth/callback', window.location.origin).href },
      })
      if (!error) return
    } catch {
      // Show the same retry message for OAuth and network failures.
    }
    setError('Could not start Google sign-in. Please try again.')
    setPending(false)
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="logo">Tabelo<span>.</span></Link>
        <h1>Sign in to Tabelo</h1>
        <button className="primary-button" onClick={signIn} disabled={!supabase || pending}>
          {pending ? 'Connecting to Google…' : 'Continue with Google'}
        </button>
        {!supabase && <p role="status">Google sign-in is unavailable until Supabase is configured.</p>}
        {supabase && message && <p role="alert">{message}</p>}
      </section>
    </main>
  )
}

export function SignedInLayout() {
  const { user } = useLoaderData<typeof loadAccount>()
  const navigate = useNavigate()
  const { revalidate, state } = useRevalidator()

  useEffect(() => {
    const subscription = supabase?.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') void navigate('/login', { replace: true })
    }).data.subscription
    return () => subscription?.unsubscribe()
  }, [navigate])

  if (user) return <Outlet context={user} />

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Could not verify your account</h1>
        <button className="primary-button" onClick={revalidate} disabled={state === 'loading'}>
          Try again
        </button>
      </section>
    </main>
  )
}

export function DashboardPage() {
  const user = useOutletContext<User>()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function signOut() {
    if (!supabase) return

    setPending(true)
    setError('')
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (!error) return
    } catch {
      // Keep the account open so the user can retry.
    }
    setError('Could not sign out. Please try again.')
    setPending(false)
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="logo">Tabelo<span>.</span></Link>
        <h1>Your account</h1>
        <p>{user.email}</p>
        <button className="primary-button" onClick={signOut} disabled={pending}>
          {pending ? 'Signing out…' : 'Sign out'}
        </button>
        {error && <p role="alert">{error}</p>}
      </section>
    </main>
  )
}
