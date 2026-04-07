import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { useAuth } from '../state/AuthContext'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? 'bg-brand-100 text-brand' : 'text-surface-text hover:bg-brand-50 hover:text-surface-dark'
  }`

export function NavBar() {
  const { i18n: i18nInstance } = useTranslation()
  const { user, logout } = useAuth()
  const currentLanguage = i18nInstance.resolvedLanguage ?? 'en'
  const nextLanguage = currentLanguage.toLowerCase().startsWith('pt') ? 'en' : 'pt'
  const languageToggleLabel = currentLanguage.toLowerCase().startsWith('pt')
    ? 'Switch to English'
    : 'Mudar para portugues'

  return (
    <header className="border-b border-brand-100/40 bg-white/20 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link to="/admin" className="font-semibold tracking-tight text-surface-dark">
            Nova Path
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <NavLink to="/admin" end className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/admin/residents" className={navLinkClass}>
              Residents
            </NavLink>
            <NavLink to="/admin/donors" className={navLinkClass}>
              Donors
            </NavLink>
            <NavLink to="/admin/reports" className={navLinkClass}>
              Reports
            </NavLink>
            <NavLink to="/admin/social-media" className={navLinkClass}>
              Social Media
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void i18n.changeLanguage(nextLanguage)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-brand-100 text-surface-text hover:bg-brand-100 hover:text-surface-dark"
              aria-label={languageToggleLabel}
              title={languageToggleLabel}
            >
              <span aria-hidden="true">🌐</span>
            </button>
            <div className="hidden text-sm text-surface-text sm:block">{user?.email}</div>
            <button
              onClick={logout}
              className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-surface hover:bg-brand-dark"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

