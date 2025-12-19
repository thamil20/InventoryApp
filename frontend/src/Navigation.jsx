import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useTheme } from './ThemeContext'
import { useState } from 'react'
import './Navigation.css'
import icon from './assets/icon.webp'

function Navigation() {
  const { isAuthenticated, user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
    setIsMobileMenuOpen(false)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-left">
          <Link to="/" className="nav-logo" onClick={closeMobileMenu}>
            <img src={icon} alt="Logo" className="logo-icon" />
          </Link>
          <button onClick={toggleTheme} className="theme-toggle" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>

        {/* Mobile menu button */}
        {isAuthenticated && (
          <button
            className={`mobile-menu-btn ${isMobileMenuOpen ? 'open' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        )}

        {/* Desktop menu */}
        {isAuthenticated && (
          <ul className="nav-menu desktop-menu">
            <li className="nav-item">
              <Link to="/" className="nav-link" onClick={closeMobileMenu}>Dashboard</Link>
            </li>
            <li className="nav-item">
              <Link to="/inventory/current" className="nav-link" onClick={closeMobileMenu}>Current Inventory</Link>
            </li>
            <li className="nav-item">
              <Link to="/inventory/create_item" className="nav-link" onClick={closeMobileMenu}>Add Item</Link>
            </li>
            <li className="nav-item">
              <Link to="/inventory/sold" className="nav-link" onClick={closeMobileMenu}>Sold Items</Link>
            </li>
            <li className="nav-item">
              <Link to="/finances" className="nav-link" onClick={closeMobileMenu}>Finances</Link>
            </li>
            {user?.role === 'admin' && (
              <li className="nav-item">
                <Link to="/admin" className="nav-link" onClick={closeMobileMenu}>Admin</Link>
              </li>
            )}
            {user?.role === 'manager' && (
              <li className="nav-item">
                <Link to="/manager" className="nav-link" onClick={closeMobileMenu}>Manager</Link>
              </li>
            )}
          </ul>
        )}

        {/* Mobile menu */}
        {isAuthenticated && (
          <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
            <ul className="nav-menu mobile-nav-list">
              <li className="nav-item">
                <Link to="/" className="nav-link" onClick={closeMobileMenu}>Dashboard</Link>
              </li>
              <li className="nav-item">
                <Link to="/inventory/current" className="nav-link" onClick={closeMobileMenu}>Current Inventory</Link>
              </li>
              <li className="nav-item">
                <Link to="/inventory/create_item" className="nav-link" onClick={closeMobileMenu}>Add Item</Link>
              </li>
              <li className="nav-item">
                <Link to="/inventory/sold" className="nav-link" onClick={closeMobileMenu}>Sold Items</Link>
              </li>
              <li className="nav-item">
                <Link to="/finances" className="nav-link" onClick={closeMobileMenu}>Finances</Link>
              </li>
              {user?.role === 'admin' && (
                <li className="nav-item">
                  <Link to="/admin" className="nav-link" onClick={closeMobileMenu}>Admin</Link>
                </li>
              )}
              {user?.role === 'manager' && (
                <li className="nav-item">
                  <Link to="/manager" className="nav-link" onClick={closeMobileMenu}>Manager</Link>
                </li>
              )}
              <li className="nav-item mobile-auth">
                <span className="nav-link nav-username">Hi, {user?.username}</span>
              </li>
              <li className="nav-item mobile-auth">
                <button onClick={handleLogout} className="nav-link nav-logout-btn">Logout</button>
              </li>
            </ul>
          </div>
        )}

        {/* Desktop auth menu */}
        <ul className="nav-auth desktop-auth">
          {!isAuthenticated ? (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-link">Login</Link>
              </li>
              <li className="nav-item">
                <Link to="/register" className="nav-link">Register</Link>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <span className="nav-link nav-username">Hi, {user?.username}</span>
              </li>
              <li className="nav-item">
                <button onClick={handleLogout} className="nav-link nav-logout-btn">Logout</button>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  )
}

export default Navigation
