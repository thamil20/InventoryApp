import { Link } from 'react-router-dom'
import { useState } from 'react'
import './Navigation.css'

function Navigation() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <div className="logo-box"></div>
        </Link>
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
        </ul>
        <ul className="nav-auth">
          {!isLoggedIn ? (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-link">Login</Link>
              </li>
              <li className="nav-item">
                <Link to="/register" className="nav-link">Register</Link>
              </li>
            </>
          ) : (
            <li className="nav-item">
              <Link to="/logout" className="nav-link" onClick={() => setIsLoggedIn(false)}>Logout</Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  )
}

export default Navigation
