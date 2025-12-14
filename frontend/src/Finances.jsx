import { useState, useEffect } from 'react'
import './Finances.css'

function Finances() {
  const [financesData, setFinancesData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingExpenses, setEditingExpenses] = useState(false)
  const [expensesInput, setExpensesInput] = useState('')

  useEffect(() => {
    fetchFinances()
  }, [])

  const fetchFinances = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/finances`, {
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

    const maxRevenue = Math.max(...financesData.dailySales.map(day => day.revenue), 1)
    const chartHeight = 200
    
    return (
      <div className="chart-container">
        <h3>Last 7 Days Sales</h3>
        <div className="chart">
          <div className="chart-bars">
            {financesData.dailySales.map((day, index) => {
              const barHeight = (day.revenue / maxRevenue) * chartHeight
              return (
                <div key={index} className="chart-bar-wrapper">
                  <div 
                    className="chart-bar"
                    style={{ height: `${barHeight}px` }}
                    title={`${formatDate(day.date)}: ${formatCurrency(day.revenue)}`}
                  >
                    <span className="bar-value">{formatCurrency(day.revenue)}</span>
                  </div>
                  <div className="chart-label">{formatDate(day.date)}</div>
                </div>
              )
            })}
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
