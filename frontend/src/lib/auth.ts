import { createContext, useContext } from 'react'

export type User = { id: string; email: string }
export type AuthView = 'welcome' | 'login' | 'signup'

export type AuthContextValue = {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => void
  openAuthModal: (view?: AuthView) => void
}

export const TOKEN_KEY = 'auth_token'

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Identity headers for API calls: the anonymous session plus, if logged in, the auth token. */
export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const sessionId = localStorage.getItem('session_id')
  const token = localStorage.getItem(TOKEN_KEY)
  if (sessionId) headers['X-Session-ID'] = sessionId
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}
