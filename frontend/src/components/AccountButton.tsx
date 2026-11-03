import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import Button from './Button'

/** Top-right account control: "Log in" when anonymous, an email menu when logged in. */
export default function AccountButton() {
  const { user, logout, openAuthModal } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  if (!user) {
    return (
      <Button variant="ghost" className="px-4! py-2!" onClick={() => openAuthModal('login')}>
        Log in
      </Button>
    )
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        className="px-4! py-2!"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
      >
        <span className="max-w-[10rem] truncate sm:max-w-[16rem]">{user.email}</span>
        <span className="text-xs">▾</span>
      </Button>
      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-white/70 bg-white/95 py-1 shadow-lg backdrop-blur"
        >
          <Link
            to="/history"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-brand-50"
          >
            My feedback
          </Link>
          <button
            role="menuitem"
            onClick={() => {
              setMenuOpen(false)
              logout()
            }}
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-brand-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
