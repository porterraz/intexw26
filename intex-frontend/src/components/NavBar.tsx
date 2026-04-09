import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../state/useAuth'
import { LanguageToggle } from './LanguageToggle'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-lg text-sm font-semibold ${
    isActive ? 'bg-brand-100 text-brand' : 'text-surface-text hover:bg-brand-50 hover:text-surface-dark'
  }`

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block w-full rounded-md px-3 py-2 text-left text-base font-medium ${
    isActive ? 'bg-brand-100 text-brand' : 'text-surface-text hover:bg-brand-50 hover:text-surface-dark'
  }`

export function NavBar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null)
  const isMobileMenuOpen = mobileMenuPath === location.pathname
  const isAdmin = user?.roles?.includes('Admin') ?? false
  const isDonor = user?.roles?.includes('Donor') ?? false
  const canAccessOps = isAdmin || isDonor
  const viewLabel = isAdmin ? t('nav_admin_view') : isDonor ? t('nav_donor_view') : t('nav_user_view')
  const homePath = isDonor && !isAdmin ? '/donor/dashboard' : canAccessOps ? '/admin' : '/'
  const closeMobileMenu = () => setMobileMenuPath(null)

  return (
    <header className="sticky top-0 z-50 border-b border-brand-100/40 bg-white/95 md:bg-white/20 md:backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex min-h-[68px] items-center justify-between gap-5 py-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-brand-100 text-surface-text hover:bg-brand-50 hover:text-surface-dark"
              aria-label={t('nav_go_back')}
              title={t('nav_go_back')}
            >
              <span aria-hidden="true">←</span>
            </button>
            <Link to={homePath} className="text-4 font-bold tracking-tight leading-tight text-surface-dark">
              {t('nav')}
            </Link>
          </div>

          <nav className="hidden items-center gap-1 lg:flex xl:gap-2">
            {canAccessOps ? (
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
                <NavLink to="/admin/social-media" className={navLinkClass}>
                  {t('nav_social_media')}
                </NavLink>
                <NavLink to="/donate" className={navLinkClass}>
                  {t('nav_make_donation')}
                </NavLink>
              </>
            ) : (
              <NavLink to="/impact" className={navLinkClass}>
                {t('nav_impact')}
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2 xl:gap-3">
            <span className="hidden rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand lg:inline-flex">
              {viewLabel}
            </span>
            <LanguageToggle />
            <div className="hidden max-w-[180px] truncate text-sm text-surface-text xl:block">{user?.email}</div>
            <button
              onClick={logout}
              className="hidden rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-surface hover:bg-brand-dark md:inline-flex"
            >
              {t('nav_logout')}
            </button>
            <button
              type="button"
              onClick={() =>
                setMobileMenuPath((prev) => (prev === location.pathname ? null : location.pathname))
              }
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
        <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={closeMobileMenu}
            aria-label="Close menu"
          />
          <aside
            id="mobile-nav-menu"
            className="absolute right-0 top-0 z-[101] h-full w-72 max-w-[85vw] overflow-y-auto border-l border-brand-100 bg-white p-4 shadow-xl"
          >
            <div className="mb-2 inline-flex rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand">
              {viewLabel}
            </div>
            <div className="mb-4 text-sm text-surface-text">{user?.email}</div>
            <nav className="flex flex-col gap-2">
              {canAccessOps ? (
                <>
                  <NavLink to="/admin" end className={mobileNavLinkClass} onClick={closeMobileMenu}>
                    {t('nav_dashboard')}
                  </NavLink>
                  <NavLink to="/admin/residents" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                    {t('nav_residents')}
                  </NavLink>
                  <NavLink to="/admin/donors" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                    {t('nav_donors')}
                  </NavLink>
                  <NavLink to="/admin/reports" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                    {t('nav_reports')}
                  </NavLink>
                  <NavLink to="/admin/social-media" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                    {t('nav_social_media')}
                  </NavLink>
                  <NavLink to="/donate" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                    {t('nav_make_donation')}
                  </NavLink>
                </>
              ) : (
                <NavLink to="/impact" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                  {t('nav_impact')}
                </NavLink>
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
