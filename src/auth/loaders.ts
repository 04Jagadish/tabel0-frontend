import { isAuthSessionMissingError } from '@supabase/supabase-js'
import { replace } from 'react-router-dom'
import type { LoaderFunctionArgs } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export async function completeSignIn({ request }: LoaderFunctionArgs) {
  if (!supabase) return replace('/login')

  const params = new URL(request.url).searchParams
  if (params.get('error') === 'access_denied') return replace('/login?reason=cancelled')

  const code = params.get('code')
  if (!code || params.has('error')) return replace('/login?reason=callback')

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.session) return replace('/dashboard')
  } catch {
    // Send callback failures to the sign-in page without leaving the code in the URL.
  }
  return replace('/login?reason=callback')
}

export async function loadAccount() {
  if (!supabase) return replace('/login')

  const { data, error } = await supabase.auth.getUser()
  if (isAuthSessionMissingError(error) || error?.status === 401) return replace('/login')
  if (error) return { user: null }
  if (!data.user) return replace('/login')

  return { user: data.user }
}
