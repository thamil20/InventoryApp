import { useState } from 'react'
import './Login.css'

const ForgotPassword = () => {
    const [email, setEmail] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        // TODO: Add your forgot password API call here
        // const data = { email }
        // const url = `${import.meta.env.VITE_API_URL}/auth/forgot-password`
        // const options = {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(data),
        // }
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            setSuccessMessage('Password reset link has been sent to your email.')
            setEmail('')
            
            console.log('Forgot password request for:', email)
        } catch (err) {
            alert('Error sending reset link: ' + err)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Forgot Password</h2>
                    <p className="auth-subtitle">Enter your email address and we'll send you a link to reset your password.</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="auth-submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                    </button>

                    {successMessage && (
                        <div className="success-message">
                            {successMessage}
                        </div>
                    )}
                </form>
                <div className="auth-footer">
                    <p>Remember your password? <a href="/login">Login here</a></p>
                </div>
            </div>
        </div>
    )
}

export default ForgotPassword
