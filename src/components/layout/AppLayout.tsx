import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Topbar } from './Topbar'
import { TabNav } from './TabNav'
import { PropertyProvider } from '../../contexts/PropertyContext'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🏠</div>
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  if (!session) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export function AppLayout() {
  return (
    <PropertyProvider>
      <div className="app-layout">
        <Topbar />
        <TabNav />
        <Outlet />
      </div>
    </PropertyProvider>
  )
}
