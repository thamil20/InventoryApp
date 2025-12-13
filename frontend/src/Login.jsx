import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        // TODO: Add your login API call here
        // const data = { email, password }
        // const url = `${import.meta.env.VITE_API_URL}/auth/login`
        // const options = {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(data),
        // }
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // After successful login, navigate to dashboard
            // navigate('/')
            
            console.log('Login attempt:', { email, password })
        } catch (err) {
            alert('Error logging in: ' + err)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Login</h2>
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

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="forgot-password">
                        <a href="/forgot-password">Forgot Password?</a>
                    </div>

                    <button type="submit" className="auth-submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                <div className="auth-footer">
                    <p>Don't have an account? <a href="/register">Register here</a></p>
                </div>
            </div>
        </div>
    )
}

export default Login
