import { useState, useEffect } from 'react'
import './Finances.css'

function Finances() {
  const [financesData, setFinancesData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingExpenses, setEditingExpenses] = useState(false)
  const [expensesInput, setExpensesInput] = useState('')
  const [timePeriod, setTimePeriod] = useState('7')

  useEffect(() => {
    fetchFinances()
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

    // Group data into weeks (7-day periods)
    const weeklyData = []
    for (let i = 0; i < salesData.length; i += 7) {
      const weekDays = salesData.slice(i, i + 7)
      const weekRevenue = weekDays.reduce((sum, day) => sum + day.revenue, 0)
      const weekItemsSold = weekDays.reduce((sum, day) => sum + (day.items_sold || 0), 0)
      
      // Get start and end dates for the week
      const startDate = new Date(weekDays[0].date)
      const endDate = new Date(weekDays[weekDays.length - 1].date)
      
      weeklyData.push({
        startDate: startDate,
        endDate: endDate,
        revenue: weekRevenue,
        itemsSold: weekItemsSold,
        days: weekDays
      })
    }

    const maxRevenue = Math.max(...weeklyData.map(week => week.revenue), 1)
    const chartHeight = 200
    
    const getPeriodLabel = () => {
      switch(timePeriod) {
        case '7': return 'Last 7 Days of Sales'
        case '30': return 'Last 30 Days of Sales'
        case '90': return 'Last 90 Days of Sales'
        case 'year': return 'All Sales Data'
        default: return 'Sales Data'
      }
    }

    const formatWeekLabel = (startDate, endDate) => {
      const start = `${startDate.getMonth() + 1}/${startDate.getDate()}`
      const end = `${endDate.getMonth() + 1}/${endDate.getDate()}`
      return `${start}-${end}`
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
        <div className="chart">
          <div className="chart-bars">
            {weeklyData.map((week, index) => {
              const barHeight = (week.revenue / maxRevenue) * chartHeight
              return (
                <div key={index} className="chart-bar-wrapper">
                  <div 
                    className="chart-bar"
                    style={{ height: `${barHeight}px` }}
                    title={`Week ${index + 1} (${formatWeekLabel(week.startDate, week.endDate)}): ${formatCurrency(week.revenue)} - ${week.itemsSold} items`}
                  >
                    <span className="bar-value">{formatCurrency(week.revenue)}</span>
                  </div>
                  <div className="chart-label">{formatWeekLabel(week.startDate, week.endDate)}</div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="sales-details">
          <h4>Detailed Sales Data</h4>
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
                {salesData.map((day, index) => (
                  <tr key={index}>
                    <td>{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td>{formatCurrency(day.revenue)}</td>
                    <td>{day.items_sold || 0}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td><strong>Total</strong></td>
                  <td><strong>{formatCurrency(salesData.reduce((sum, day) => sum + day.revenue, 0))}</strong></td>
                  <td><strong>{salesData.reduce((sum, day) => sum + (day.items_sold || 0), 0)}</strong></td>
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

      <div className="chart-section">
        {renderChart()}
      </div>
    </div>
  )
}

export default Finances
