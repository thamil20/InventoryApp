import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password || password !== confirm) {
      setStatus('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setStatus('Password must be at least 6 characters long.')
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
        setSuccess(true)
        setStatus('Password reset successful! You may now log in.')
        setTimeout(() => navigate('/login'), 3000)
      } else {
        setStatus(data.error || 'Reset failed.')
      }
    } catch (err) {
      setStatus('Network error.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Invalid Reset Link</h2>
          <p className="auth-subtitle">This password reset link is invalid or missing. Please request a new one.</p>
        </div>
        <div className="auth-footer">
          <p><a href="/forgot-password">Request new reset link</a></p>
        </div>
      </div>
    </div>
  )

  if (success) return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Password Reset Successful</h2>
          <p className="auth-subtitle">Your password has been reset successfully. You will be redirected to login shortly.</p>
        </div>
        <div className="success-message">
          {status}
        </div>
        <div className="auth-footer">
          <p><a href="/login">Go to Login</a></p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Reset Password</h2>
          <p className="auth-subtitle">Enter your new password below.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength="6"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm">Confirm Password</label>
            <input
              type="password"
              id="confirm"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength="6"
            />
          </div>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        {status && (
          <div className="error-message">
            {status}
          </div>
        )}
        <div className="auth-footer">
          <p>Remember your password? <a href="/login">Login here</a></p>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
