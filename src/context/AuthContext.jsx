import { createContext, useContext, useEffect, useState } from 'react'
import { getMe, login, logout } from '../api/auth'
import {
  getValidSession,
  readSession,
  removeSession,
  storeSession,
} from '../api/client'

const AuthContext = createContext(null)

/** Restores and verifies the tab's identity and manages login, expiration and logout. */
export function AuthProvider({ children }) {
  console.debug('[AuthProvider] Rendering session boundary')
  const [session, setSession] = useState(readSession)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  /** Clears the local authenticated identity and stored bearer token. */
  function clearSession() {
    console.info('[Auth] Clearing local session')
    removeSession()
    setSession(null)
  }
  /** Reflects refreshed credentials without remounting the active business page. */
  function updateSession() {
    console.debug('[Auth] Updating refreshed session')
    setSession(readSession())
  }
  /** Verifies a restored identity and subscribes to unauthorized responses. */
  useEffect(() => {
    console.info('[Auth] Verifying restored session')
    let active = true
    window.addEventListener('involens:unauthorized', clearSession)
    window.addEventListener('involens:session-changed', updateSession)
    if (readSession()) {
      getMe()
        .then((user) => {
          if (active)
            setSession((current) => (current ? { ...current, user } : null))
        })
        .catch((failure) => {
          if (active) {
            setError(failure.message)
            if (failure.httpStatus === 401) clearSession()
          }
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    } else setLoading(false)
    return () => {
      active = false
      window.removeEventListener('involens:unauthorized', clearSession)
      window.removeEventListener('involens:session-changed', updateSession)
    }
  }, [])
  /** Rotates expiring credentials, retrying temporary failures without discarding the session. */
  useEffect(() => {
    console.debug('[Auth] Scheduling access token renewal')
    if (!session) return
    let active = true
    let delay = 1000
    let timer
    /** Refreshes expired credentials and retries temporary network or server failures. */
    async function renewSession() {
      console.info('[Auth] Renewing expired access token')
      try {
        await getValidSession(true, session.accessToken)
      } catch {
        if (active && readSession()) {
          console.warn('[Auth] Scheduling token renewal retry', { delay })
          timer = window.setTimeout(renewSession, delay)
          delay = Math.min(delay * 2, 30000)
        }
      }
    }
    timer = window.setTimeout(
      renewSession,
      Math.max(0, session.expiresAt - Date.now()),
    )
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [session?.expiresAt])
  /** Starts a tab session using the token and expiry returned by the backend. */
  async function signIn(credentials) {
    console.info('[Auth] Starting login')
    const result = await login(credentials)
    const next = storeSession(result)
    setSession(next)
    setError('')
    console.info('[Auth] Login completed')
  }
  /** Calls stateless logout and clears local credentials even if the call fails. */
  async function signOut() {
    console.info('[Auth] Starting logout')
    const operation = logout()
    clearSession()
    try {
      await operation
    } catch (failure) {
      setError(failure.message)
    }
  }
  return (
    <AuthContext.Provider
      value={{ user: session?.user, loading, error, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/** Gives screens access to the current identity and session operations. */
export function useAuth() {
  console.debug('[Auth] Reading identity context')
  return useContext(AuthContext)
}
