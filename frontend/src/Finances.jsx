import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import './Finances.css'

function Finances() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [financesData, setFinancesData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingExpenses, setEditingExpenses] = useState(false)
  const [expensesInput, setExpensesInput] = useState('')
  const [timePeriod, setTimePeriod] = useState('7')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Export functionality state
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportStartDate, setExportStartDate] = useState('')
  const [exportEndDate, setExportEndDate] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportHistory, setExportHistory] = useState([])
  const [loadingExports, setLoadingExports] = useState(false)

  useEffect(() => {
    fetchFinances()
    fetchExportHistory()
  }, [timePeriod])

  const fetchFinances = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/finances?days=${timePeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 403) {
        alert("You don't have permission to view finances. Redirecting to dashboard.")
        navigate('/')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch finances data')
      }

      const data = await response.json()
      setFinancesData(data)
      setExpensesInput(data.expenses.toString())
      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const fetchExportHistory = async () => {
    // Only fetch if user has permission
    if (!user || !['default', 'manager', 'admin'].includes(user.role)) {
      return
    }
    
    try {
      setLoadingExports(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/finances/exports`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setExportHistory(data.exports || [])
      }
    } catch (err) {
      console.error('Error fetching export history:', err)
    } finally {
      setLoadingExports(false)
    }
  }

  const handleExport = async () => {
    if (!exportStartDate || !exportEndDate) {
      alert('Please select both start and end dates.')
      return
    }

    const start = new Date(exportStartDate)
    const end = new Date(exportEndDate)
    
    if (start >= end) {
      alert('Start date must be before end date.')
      return
    }

    try {
      setExporting(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/finances/export`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start_date: exportStartDate,
          end_date: exportEndDate
        })
      })

      if (response.ok) {
        // Trigger download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'finances_export.csv'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        // Close modal and refresh history
        setShowExportModal(false)
        setExportStartDate('')
        setExportEndDate('')
        fetchExportHistory()
        
        alert('Export completed successfully!')
      } else {
        const errorData = await response.json()
        alert('Export failed: ' + (errorData.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Export failed: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  const downloadExport = async (exportId, filename) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/finances/export/${exportId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Failed to download export')
      }
    } catch (err) {
      alert('Download failed: ' + err.message)
    }
  }

  const handleUpdateExpenses = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/finances/expenses`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expenses: parseFloat(expensesInput) || 0 })
      })

      if (response.status === 403) {
        alert("You don't have permission to update expenses. Redirecting to dashboard.")
        navigate('/')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to update expenses')
      }

      await fetchFinances()
      setEditingExpenses(false)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCancelEdit = () => {
    setExpensesInput(financesData?.expenses.toString() || '0')
    setEditingExpenses(false)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}/${day}`
  }

  const renderChart = () => {
    if (!financesData || !financesData.dailySales) return null
    
    const salesData = financesData.dailySales
    if (!salesData || salesData.length === 0) return null

    // Group data into rows of 7 days each
    const rows = []
    for (let i = 0; i < salesData.length; i += 7) {
      rows.push(salesData.slice(i, i + 7))
    }

    const maxRevenue = Math.max(...salesData.map(day => day.revenue), 1)
    const chartHeight = 150
    
    const getPeriodLabel = () => {
      switch(timePeriod) {
        case '7': return 'Last 7 Days of Sales'
        case '30': return 'Last 30 Days of Sales'
        case '90': return 'Last 90 Days of Sales'
        case 'year': return 'All Sales Data'
        default: return 'Sales Data'
      }
    }
    
    return (
      <div className="chart-container">
        <div className="chart-header">
          <h3>{getPeriodLabel()}</h3>
          <div className="period-selector">
            <label htmlFor="period-dropdown">Time Period: </label>
            <select 
              id="period-dropdown"
              value={timePeriod} 
              onChange={(e) => setTimePeriod(e.target.value)}
              className="period-dropdown"
            >
              <option value="7">7 Days</option>
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
              <option value="year">Whole Year</option>
            </select>
          </div>
        </div>
        <div className="chart-grid-wrapper">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="chart-row">
              <div className="chart-bars">
                {row.map((day, dayIndex) => {
                  const barHeight = (day.revenue / maxRevenue) * chartHeight
                  const globalDayIndex = rowIndex * 7 + dayIndex + 1
                  return (
                    <div key={dayIndex} className="chart-bar-wrapper">
                      <div 
                        className="chart-bar"
                        style={{ height: `${barHeight}px` }}
                        title={`Day ${globalDayIndex} (${formatDate(day.date)}): ${formatCurrency(day.revenue)} - ${day.items_sold || 0} items`}
                      >
                        <span className="bar-value">{formatCurrency(day.revenue)}</span>
                      </div>
                      <div className="chart-label">{formatDate(day.date)}</div>
                      <div className="chart-day-number">Day {globalDayIndex}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="sales-details">
          <div className="sales-details-header">
            <h4>Detailed Sales Data</h4>
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search by date (e.g., Dec 18, 12/18, 2025)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="clear-search-btn"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <div className="sales-table-container">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Revenue</th>
                  <th>Items Sold</th>
                </tr>
              </thead>
              <tbody>
                {salesData
                  .filter(day => {
                    if (!searchTerm) return true
                    const dateStr = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    const dateStr2 = new Date(day.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
                    const searchLower = searchTerm.toLowerCase()
                    return dateStr.toLowerCase().includes(searchLower) || dateStr2.includes(searchLower)
                  })
                  .map((day, index) => (
                    <tr key={index}>
                      <td>{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td>{formatCurrency(day.revenue)}</td>
                      <td>{day.items_sold || 0}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td><strong>Total{searchTerm ? ' (Filtered)' : ''}</strong></td>
                  <td><strong>{formatCurrency(
                    salesData
                      .filter(day => {
                        if (!searchTerm) return true
                        const dateStr = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        const dateStr2 = new Date(day.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
                        const searchLower = searchTerm.toLowerCase()
                        return dateStr.toLowerCase().includes(searchLower) || dateStr2.includes(searchLower)
                      })
                      .reduce((sum, day) => sum + day.revenue, 0)
                  )}</strong></td>
                  <td><strong>{
                    salesData
                      .filter(day => {
                        if (!searchTerm) return true
                        const dateStr = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        const dateStr2 = new Date(day.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
                        const searchLower = searchTerm.toLowerCase()
                        return dateStr.toLowerCase().includes(searchLower) || dateStr2.includes(searchLower)
                      })
                      .reduce((sum, day) => sum + (day.items_sold || 0), 0)
                  }</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="finances-container"><p>Loading finances...</p></div>
  }

  if (error) {
    return <div className="finances-container"><p className="error">Error: {error}</p></div>
  }

  return (
    <div className="finances-container">
      <h1>Financial Overview</h1>
      
      <div className="finance-cards">
        <div className="finance-card revenue-card">
          <h2>Total Revenue</h2>
          <p className="finance-amount">{formatCurrency(financesData?.totalRevenue || 0)}</p>
          <p className="finance-description">Total earnings from sold items</p>
        </div>
        
        <div className="finance-card expenses-card">
          <h2>Total Expenses</h2>
          {editingExpenses ? (
            <div className="expenses-edit">
              <input
                type="number"
                step="0.01"
                value={expensesInput}
                onChange={(e) => setExpensesInput(e.target.value)}
                className="expenses-input"
                placeholder="Enter expenses"
              />
              <div className="expenses-buttons">
                <button onClick={handleUpdateExpenses} className="save-btn">Save</button>
                <button onClick={handleCancelEdit} className="cancel-btn">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <p className="finance-amount">{formatCurrency(financesData?.expenses || 0)}</p>
              <button onClick={() => setEditingExpenses(true)} className="edit-btn">
                Edit Expenses
              </button>
            </>
          )}
          <p className="finance-description">Total money spent on inventory</p>
        </div>
        
        <div className="finance-card potential-card">
          <h2>Potential Revenue</h2>
          <p className="finance-amount">{formatCurrency(financesData?.potentialRevenue || 0)}</p>
          <p className="finance-description">Value of current inventory</p>
        </div>
        
        <div className="finance-card profit-card">
          <h2>Current Profit</h2>
          <p className="finance-amount">
            {formatCurrency((financesData?.totalRevenue || 0) - (financesData?.expenses || 0))}
          </p>
          <p className="finance-description">Total revenue minus expenses</p>
        </div>
      </div>

      {/* Export Button - Only for defaults and managers */}
      {user && ['default', 'manager', 'admin'].includes(user.role) && (
        <div className="export-section">
          <button 
            onClick={() => setShowExportModal(true)} 
            className="export-btn"
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>
      )}

      <div className="chart-section">
        {renderChart()}
      </div>

      {/* Export History Table - Only for defaults and managers */}
      {user && ['default', 'manager', 'admin'].includes(user.role) && (
        <div className="export-history-section">
          <h2>Export History</h2>
          {loadingExports ? (
            <p>Loading export history...</p>
          ) : exportHistory.length > 0 ? (
            <div className="export-table-container">
              <table className="export-table">
                <thead>
                  <tr>
                    <th>Date Range</th>
                    <th>Export Type</th>
                    <th>File Size</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exportHistory.map((exportItem) => (
                    <tr key={exportItem.id}>
                      <td>
                        {new Date(exportItem.start_date).toLocaleDateString()} - {new Date(exportItem.end_date).toLocaleDateString()}
                      </td>
                      <td>{exportItem.export_type}</td>
                      <td>{exportItem.file_size ? `${Math.round(exportItem.file_size / 1024)} KB` : 'N/A'}</td>
                      <td>{new Date(exportItem.created_at).toLocaleDateString()}</td>
                      <td>
                        <button 
                          onClick={() => downloadExport(exportItem.id, exportItem.filename)}
                          className="download-btn"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No exports found. Create your first export above.</p>
          )}
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Export Financial Data</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowExportModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="start-date">Start Date:</label>
                <input
                  type="date"
                  id="start-date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="end-date">End Date:</label>
                <input
                  type="date"
                  id="end-date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  required
                />
              </div>
              <div className="export-info">
                <p>This will export all financial data including sold items and current inventory within the selected date range.</p>
                <p>The file will be downloaded to your default downloads folder.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setShowExportModal(false)} 
                className="cancel-btn"
                disabled={exporting}
              >
                Cancel
              </button>
              <button 
                onClick={handleExport} 
                className="export-modal-btn"
                disabled={exporting || !exportStartDate || !exportEndDate}
              >
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Finances
