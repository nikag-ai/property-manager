import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { APP_METADATA } from '../lib/constants'

export default function Auth() {
  const { session } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    let targetEmail = ''
    if (password === 'admin2026') {
      targetEmail = 'nik.agarwal98@gmail.com'
    } else if (password === 'guest2026') {
      targetEmail = 'guest2@clarksville.app'
    } else {
      setError('Invalid site password')
      setLoading(false)
      return
    }

    const { error: err } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: password
    })
    
    setLoading(false)
    if (err) setError(err.message)
  }

  if (session) {
    return <Navigate to="/" replace />
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(ellipse at 50% 0%, rgba(88,166,255,0.08) 0%, var(--bg) 60%)',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏠</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>{APP_METADATA.NAME}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {APP_METADATA.DESCRIPTION}
          </p>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 4 }}>Access Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
            Enter your site password to securely unlock properties.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Site Password</label>
              <input
                id="password"
                type="password"
                required
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Unlocking…' : 'Unlock Dashboard →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
