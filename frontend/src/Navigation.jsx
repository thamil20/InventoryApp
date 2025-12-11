import { Link } from 'react-router-dom'
import './Navigation.css'

function Navigation() {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">Inventory</Link>
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
      </div>
    </nav>
  )
}

export default Navigation
