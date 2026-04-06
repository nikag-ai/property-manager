import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [sent, setSent]   = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  const handleDevLogin = async () => {
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({
      email: 'nik.agarwal98@gmail.com',
      password: 'password123'
    })
    setLoading(false)
    if (err) setError(err.message)
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
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏠</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>RentLedger</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Real estate investment tracking, honest numbers
          </p>
        </div>

        <div className="card">
          {sent ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>📬</div>
              <h2 style={{ marginBottom: 8 }}>Check your email</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                We sent a magic link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
                Click it to sign in.
              </p>
              <button
                className="btn btn-ghost"
                style={{ marginTop: 20 }}
                onClick={() => { setSent(false); setEmail('') }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ marginBottom: 4 }}>Sign in</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
                We'll send you a magic link — no password needed.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    required
                    className="form-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoFocus
                  />
                </div>

                {error && <div className="form-error">{error}</div>}

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Sending…' : 'Send magic link →'}
                </button>

                <button type="button" className="btn btn-secondary" onClick={handleDevLogin} disabled={loading}>
                  🛠 Password Login (Bypass Email)
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
