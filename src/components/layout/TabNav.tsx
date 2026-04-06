import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/',         label: 'Overview',          icon: '◈' },
  { to: '/monthly',  label: 'Monthly Breakdown',  icon: '▤' },
  { to: '/expenses', label: 'Expenses',           icon: '📉' },
  { to: '/add',      label: 'Quick Add',          icon: '+' },
  { to: '/property', label: 'Property Details',   icon: '⚙' },
]

export function TabNav() {
  return (
    <nav className="tab-nav" role="navigation" aria-label="Main navigation">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => `tab-nav-item${isActive ? ' active' : ''}`}
        >
          <span aria-hidden="true" style={{ fontSize: '0.9rem' }}>{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
