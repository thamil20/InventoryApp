import { useAuth } from './AuthContext'
import { useState, useEffect } from 'react'
import './Dashboard.css'

function Dashboard() {
  const { user, setUser } = useAuth()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [requesting, setRequesting] = useState(false)
  const [requestSent, setRequestSent] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const data = await response.json()
      setDashboardData(data)
      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleManagerRequest = async () => {
    const confirmed = window.confirm('Are you sure you want to become a manager? This will grant manager permissions.');
    if (!confirmed) return;
    setRequesting(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/request-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) {
        let msg = 'Failed to become manager';
        try { const data = await res.json(); msg = data.error || msg; } catch (_) {}
        throw new Error(msg);
      }
      setRequestSent(true);
      setUser(prev => ({ ...(prev || {}), role: 'manager' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setRequesting(false);
    }
  }

  if (loading) {
    return <div className="dashboard-container"><p>Loading dashboard...</p></div>
  }

  if (error) {
    return <div className="dashboard-container"><p className="error">Error: {error}</p></div>
  }
  
  return (
    <div className="dashboard-container">
      {user?.role === 'default' && (
        <div className="become-manager-btn-container">
          {requestSent ? (
            <button className="become-manager-btn" disabled>Role updated to Manager</button>
          ) : (
            <button className="become-manager-btn" onClick={handleManagerRequest} disabled={requesting}>
              {requesting ? 'Requesting...' : 'Click to become a manager'}
            </button>
          )}
        </div>
      )}
      <h1>Dashboard</h1>
      <p className="welcome-message">Welcome back, {user?.username}!</p>

      {/* Profit Card */}
      <div className="profit-section">
        <div className="profit-card-dash">
          <h2>Current Profit</h2>
          <p className="profit-amount">{formatCurrency(dashboardData?.profit || 0)}</p>
          <div className="profit-breakdown">
            <span>Revenue: {formatCurrency(dashboardData?.totalRevenue || 0)}</span>
            <span>Expenses: {formatCurrency(dashboardData?.expenses || 0)}</span>
          </div>
        </div>
      </div>

      {/* Recent Items Sections */}
      <div className="dashboard-grid">
        {/* Recent Inventory */}
        <div className="dashboard-section">
          <h2>Recently Added Inventory</h2>
          {dashboardData?.recentInventory && dashboardData.recentInventory.length > 0 ? (
            <div className="items-list">
              {dashboardData.recentInventory.map((item, index) => (
                <div key={index} className="item-card">
                  <div className="item-header">
                    <span className="item-name">{item.name}</span>
                    <span className="item-price">{formatCurrency(item.price)}</span>
                  </div>
                  <div className="item-details">
                    <span className="item-quantity">Qty: {item.quantity}</span>
                    <span className="item-date">{formatDate(item.addedDate)}</span>
                  </div>
                  {item.category && <span className="item-category">{item.category}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="no-items">No inventory items yet</p>
          )}
        </div>

        {/* Recent Sold Items */}
        <div className="dashboard-section">
          <h2>Recently Sold Items</h2>
          {dashboardData?.recentSold && dashboardData.recentSold.length > 0 ? (
            <div className="items-list">
              {dashboardData.recentSold.map((item, index) => (
                <div key={index} className="item-card sold-card">
                  <div className="item-header">
                    <span className="item-name">{item.name}</span>
                    <span className="item-price">{formatCurrency(item.salePrice)}</span>
                  </div>
                  <div className="item-details">
                    <span className="item-quantity">Sold: {item.quantitySold}</span>
                    <span className="item-date">{formatDate(item.saleDate)}</span>
                  </div>
                  {item.category && <span className="item-category">{item.category}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="no-items">No sold items yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
