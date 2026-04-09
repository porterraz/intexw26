import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../state/AuthContext'
import { isPortugueseLanguage } from '../lib/locale'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? 'bg-brand-100 text-brand' : 'text-surface-text hover:bg-brand-50 hover:text-surface-dark'
  }`

export function NavBar() {
  const { i18n: i18nInstance, t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const isAdmin = user?.roles?.includes('Admin') ?? false
  const isDonor = user?.roles?.includes('Donor') ?? false
  const homePath = isDonor && !isAdmin ? '/donor/dashboard' : '/admin'
  const currentLanguage = i18nInstance.resolvedLanguage ?? 'en'
  const nextLanguage = currentLanguage.toLowerCase().startsWith('pt') ? 'en' : 'pt'
  const languageToggleLabel = currentLanguage.toLowerCase().startsWith('pt')
    ? 'Switch to English'
    : 'Mudar para portugues'
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  useEffect(() => {
    closeMobileMenu()
  }, [location.pathname])

  return (
    <header className="border-b border-brand-100/40 bg-white/20 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-brand-100 text-surface-text hover:bg-brand-50 hover:text-surface-dark"
              aria-label={t('nav_go_back')}
              title={t('nav_go_back')}
            >
              <span aria-hidden="true">←</span>
            </button>
            <Link to={homePath} className="font-semibold tracking-tight text-surface-dark">
              {t('nav')}
            </Link>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            {isDonor && !isAdmin ? (
              <>
                <NavLink to="/donor/dashboard" end className={navLinkClass}>
                  {t('nav_my_dashboard')}
                </NavLink>
                <NavLink to="/donate" className={navLinkClass}>
                  {t('nav_make_donation')}
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/admin" end className={navLinkClass}>
                  {t('nav_dashboard')}
                </NavLink>
                <NavLink to="/admin/residents" className={navLinkClass}>
                  {t('nav_residents')}
                </NavLink>
                <NavLink to="/admin/donors" className={navLinkClass}>
                  {t('nav_donors')}
                </NavLink>
                <NavLink to="/admin/reports" className={navLinkClass}>
                  {t('nav_reports')}
                </NavLink>
                <NavLink to="/donate" className={navLinkClass}>
                  {t('nav_donate')}
                </NavLink>
                <NavLink to="/admin/social-media" className={navLinkClass}>
                  {t('nav_social_media')}
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void i18nInstance.changeLanguage(nextLanguage)}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-brand-100 px-2.5 text-surface-text hover:bg-brand-100 hover:text-surface-dark"
              aria-label={languageToggleLabel}
              title={languageToggleLabel}
            >
              <span aria-hidden="true">🌐</span>
              <span className="text-xs font-semibold uppercase tracking-wide">
                {isPortuguese ? 'PT' : 'EN'}
              </span>
            </button>
            <div className="hidden text-sm text-surface-text sm:block">{user?.email}</div>
            <button
              onClick={logout}
              className="hidden rounded-md bg-brand px-3 py-2 text-sm font-semibold text-surface hover:bg-brand-dark md:inline-flex"
            >
              {t('nav_logout')}
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-brand-100 text-surface-text hover:bg-brand-50 hover:text-surface-dark md:hidden"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              title={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-menu"
            >
              <span aria-hidden="true">{isMobileMenuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>
      </div>
      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-surface-dark/30"
            onClick={closeMobileMenu}
            aria-label="Close menu"
          />
          <aside
            id="mobile-nav-menu"
            className="absolute right-0 top-0 h-full w-72 max-w-[85vw] border-l border-brand-100 bg-white p-4 shadow-xl"
          >
            <div className="mb-4 text-sm text-surface-text">{user?.email}</div>
            <nav className="flex flex-col gap-2">
              {isDonor && !isAdmin ? (
                <>
                  <NavLink to="/donor/dashboard" end className={navLinkClass} onClick={closeMobileMenu}>
                    {t('nav_my_dashboard')}
                  </NavLink>
                  <NavLink to="/donate" className={navLinkClass} onClick={closeMobileMenu}>
                    {t('nav_make_donation')}
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/admin" end className={navLinkClass} onClick={closeMobileMenu}>
                    {t('nav_dashboard')}
                  </NavLink>
                  <NavLink to="/admin/residents" className={navLinkClass} onClick={closeMobileMenu}>
                    {t('nav_residents')}
                  </NavLink>
                  <NavLink to="/admin/donors" className={navLinkClass} onClick={closeMobileMenu}>
                    {t('nav_donors')}
                  </NavLink>
                  <NavLink to="/admin/reports" className={navLinkClass} onClick={closeMobileMenu}>
                    {t('nav_reports')}
                  </NavLink>
                  <NavLink to="/donate" className={navLinkClass} onClick={closeMobileMenu}>
                    {t('nav_donate')}
                  </NavLink>
                  <NavLink to="/admin/social-media" className={navLinkClass} onClick={closeMobileMenu}>
                    {t('nav_social_media')}
                  </NavLink>
                </>
              )}
            </nav>
            <button
              onClick={logout}
              className="mt-4 w-full rounded-md bg-brand px-3 py-2 text-sm font-semibold text-surface hover:bg-brand-dark"
            >
              {t('nav_logout')}
            </button>
          </aside>
        </div>
      ) : null}
    </header>
  )
}
