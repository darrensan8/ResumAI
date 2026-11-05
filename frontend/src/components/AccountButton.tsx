import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '../lib/auth'

const trigger =
  'flex h-8 items-center gap-2 rounded-lg px-3 text-sm text-ink-2 transition-colors duration-150 ' +
  'hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-blue-ink'

const item =
  'flex h-9 w-full items-center rounded-md px-3 text-left text-sm text-ink-2 transition-colors duration-150 ' +
  'hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-blue-ink'

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
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  if (!user) {
    return (
      <button className={trigger} onClick={() => openAuthModal('login')}>
        Log in
      </button>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        className={trigger}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
      >
        <span className="max-w-[10rem] truncate sm:max-w-[16rem]">{user.email}</span>
        <ChevronDown size={16} strokeWidth={1.5} className="text-ink-3" />
      </button>
      {menuOpen && (
        <div
          role="menu"
          className="animate-rise absolute right-0 z-30 mt-2 w-48 rounded-xl border border-line bg-paper p-1 shadow-[var(--shadow-sheet)] [animation-duration:200ms]"
        >
          <Link to="/history" role="menuitem" onClick={() => setMenuOpen(false)} className={item}>
            Past reviews
          </Link>
          <button
            role="menuitem"
            onClick={() => {
              setMenuOpen(false)
              logout()
            }}
            className={item}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
