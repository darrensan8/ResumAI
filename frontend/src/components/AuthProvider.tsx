import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import axios from 'axios'
import { API_URL } from '../lib/api'
import { AuthContext, TOKEN_KEY, authHeaders, type AuthView, type User } from '../lib/auth'
import AuthModal from './AuthModal'

// Set once the first-visit "log in or skip" prompt has been dismissed in this browser.
const PROMPT_SEEN_KEY = 'auth_prompt_seen'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [modalView, setModalView] = useState<AuthView | null>(() =>
    !localStorage.getItem(TOKEN_KEY) && !localStorage.getItem(PROMPT_SEEN_KEY) ? 'welcome' : null
  )

  // Restore the logged-in user from a saved token; drop the token if it is expired or invalid.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return
    axios
      .get(`${API_URL}/api/auth/me`, { headers: authHeaders() })
      .then((res) => setUser(res.data))
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 401) localStorage.removeItem(TOKEN_KEY)
      })
  }, [])

  const authenticate = useCallback(async (path: 'login' | 'signup', email: string, password: string) => {
    // The session headers let the backend attach this browser's anonymous analyses to the account.
    const res = await axios.post(`${API_URL}/api/auth/${path}`, { email, password }, { headers: authHeaders() })
    localStorage.setItem(TOKEN_KEY, res.data.token)
    localStorage.setItem(PROMPT_SEEN_KEY, '1')
    setUser(res.data.user)
    setModalView(null)
  }, [])

  const closeModal = () => {
    localStorage.setItem(PROMPT_SEEN_KEY, '1')
    setModalView(null)
  }

  const value = useMemo(
    () => ({
      user,
      login: (email: string, password: string) => authenticate('login', email, password),
      signup: (email: string, password: string) => authenticate('signup', email, password),
      logout: () => {
        localStorage.removeItem(TOKEN_KEY)
        setUser(null)
      },
      openAuthModal: (view: AuthView = 'login') => setModalView(view),
    }),
    [user, authenticate]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      {modalView && <AuthModal view={modalView} onViewChange={setModalView} onClose={closeModal} />}
    </AuthContext.Provider>
  )
}
