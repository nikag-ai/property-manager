import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const tabs = [
  { to: '/',         label: 'Overview',          icon: '◈', adminOnly: false },
  { to: '/monthly',  label: 'Summary',           icon: '📊', adminOnly: false },
  { to: '/ledger',   label: 'Ledger',            icon: '📋', adminOnly: false },
  { to: '/expenses', label: 'Expenses',          icon: '📉', adminOnly: false },
  { to: '/income-statement', label: 'Income Statement', icon: '📝', adminOnly: false },
  { to: '/property', label: 'Property Details',  icon: '⚙', adminOnly: false },
  { to: '/add',      label: 'Quick Add',         icon: '+', adminOnly: true },
]

export function TabNav() {
  const { session } = useAuth()
  const isGuest = session?.user?.email === 'guest2@clarksville.app'
  const visibleTabs = tabs.filter(t => isGuest ? !t.adminOnly : true)

  return (
    <nav className="tab-nav" role="navigation" aria-label="Main navigation">
      {visibleTabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => `tab-nav-item ${tab.label === 'Quick Add' ? 'ml-auto-desktop' : ''}${isActive ? ' active' : ''}`}
        >
          <span aria-hidden="true" style={{ fontSize: '0.9rem' }}>{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
