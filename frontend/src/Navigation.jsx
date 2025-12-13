import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import './Navigation.css'
import icon from './assets/icon.webp'

function Navigation() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <img src={icon} alt="Logo" className="logo-icon" />
        </Link>
        {isAuthenticated && (
          <ul className="nav-menu">
            <li className="nav-item">
              <Link to="/" className="nav-link">Dashboard</Link>
            </li>
            <li className="nav-item">
              <Link to="/inventory/current" className="nav-link">Current Inventory</Link>
            </li>
            <li className="nav-item">
              <Link to="/inventory/create_item" className="nav-link">Add Item</Link>
            </li>
            <li className="nav-item">
              <Link to="/inventory/sold" className="nav-link">Sold Items</Link>
            </li>
          </ul>
        )}
        <ul className="nav-auth">
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
