import { createContext, useState, useContext, useEffect } from 'react'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(localStorage.getItem('token'))
    const [loading, setLoading] = useState(true)

    // Check if user is logged in on mount only
    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('token')
            if (storedToken) {
                // Fetch user data if token exists
                await fetchCurrentUser(storedToken)
            } else {
                setLoading(false)
            }
        }
        initAuth()
    }, []) // Only run once on mount

    const fetchCurrentUser = async (authToken) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setUser(data.user)
            } else {
                // Token is invalid, clear it
                console.error('Token validation failed')
                logout()
            }
        } catch (error) {
            console.error('Error fetching user:', error)
            logout()
        } finally {
            setLoading(false)
        }
    }

    const login = (token, userData) => {
        localStorage.setItem('token', token)
        setToken(token)
        setUser(userData)
    }

    const logout = () => {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
    }

    const refreshUser = async () => {
        const storedToken = localStorage.getItem('token')
        if (storedToken) {
            await fetchCurrentUser(storedToken)
        }
    }

    const value = {
        user,
        setUser,
        token,
        loading,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!token
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
