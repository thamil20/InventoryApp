import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

const Register = () => {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (password !== confirmPassword) {
            alert('Passwords do not match')
            return
        }

        setIsSubmitting(true)

        // TODO: Add your registration API call here
        // const data = { name, email, password }
        // const url = `${import.meta.env.VITE_API_URL}/auth/register`
        // const options = {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(data),
        // }
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // After successful registration, navigate to login or dashboard
            // navigate('/login')
            
            console.log('Registration attempt:', { name, email, password })
        } catch (err) {
            alert('Error registering: ' + err)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Register</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

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

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="auth-submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating account...' : 'Register'}
                    </button>
                </form>
                <div className="auth-footer">
                    <p>Already have an account? <a href="/login">Login here</a></p>
                </div>
            </div>
        </div>
    )
}

export default Register
