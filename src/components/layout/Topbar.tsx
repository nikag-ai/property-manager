import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useProperty } from '../../contexts/PropertyContext'
import { APP_METADATA } from '../../lib/constants'
import { ThemeToggle } from './ThemeToggle'

// Simple home icon
function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

export function Topbar() {
  const { user, profile, signOut } = useAuth()
  const { properties, activePropertyId, setActivePropertyId } = useProperty()
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'RL'

  return (
    <header className="topbar">
      <Link to="/" className="topbar-logo" title={`${APP_METADATA.NAME} Home`}>
        <HomeIcon />
        <span className="desktop-only">{APP_METADATA.NAME}</span>
      </Link>

      {properties.length > 0 && (
        <div className="property-selector">
          <select
            value={activePropertyId ?? ''}
            onChange={e => setActivePropertyId(e.target.value)}
            aria-label="Select property"
          >
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.address}</option>
            ))}
          </select>
        </div>
      )}

      <div className="topbar-spacer" />

      <ThemeToggle />

      {profile?.role === 'readonly' && (
        <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
          Read-only
        </span>
      )}

      <div
        className="avatar"
        title={`${user?.email}\nClick to sign out`}
        onClick={signOut}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && signOut()}
        aria-label="Sign out"
      >
        {initials}
      </div>
    </header>
  )
}
