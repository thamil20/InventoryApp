import { useState } from 'react'

function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password || password !== confirm) {
      setStatus('Passwords do not match.')
      return
    }
    setLoading(true)
    setStatus('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('Password reset successful! You may now log in.')
      } else {
        setStatus(data.error || 'Reset failed.')
      }
    } catch (err) {
      setStatus('Network error.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return <div className="auth-container"><p>Invalid or missing token.</p></div>

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Reset Password</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading}>Reset Password</button>
        </form>
        {status && <p className="error-message">{status}</p>}
      </div>
    </div>
  )
}

export default ResetPassword
