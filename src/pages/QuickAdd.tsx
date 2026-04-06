import { useProperty } from '../contexts/PropertyContext'
import { QuickAddForm } from '../components/quickadd/QuickAddForm'
import { AutoPostManager } from '../components/quickadd/AutoPostManager'
import { useAuth } from '../contexts/AuthContext'

export default function QuickAdd() {
  const { activeProperty: prop } = useProperty()
  const { isOwner } = useAuth()

  if (!prop) return <div className="empty-state" style={{ marginTop: 80 }}><p>No property found.</p></div>

  if (!isOwner) {
    return (
      <main className="page-content">
        <div className="empty-state" style={{ marginTop: 80 }}>
          <span style={{ fontSize: '2rem' }}>🔒</span>
          <p>You have read-only access. Transaction entry is not available.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="page-content">
      <h1 style={{ fontSize: '1.25rem', marginBottom: 24 }}>Quick Add</h1>
      <QuickAddForm />
      <AutoPostManager />
    </main>
  )
}
