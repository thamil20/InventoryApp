import { useEffect, useState } from 'react'
import './AdminDashboard.css'
import { useAuth } from './AuthContext'

const defaultPerms = {
  can_view_inventory: true,
  can_edit_inventory: false,
  can_see_finances: false,
  can_add_items: false,
};

function ManagerDashboard() {
  const { token, user, loading: authLoading } = useAuth()
  const [employees, setEmployees] = useState([])
  const [perms, setPerms] = useState([])
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Invite-related state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState('')
  const [invitations, setInvitations] = useState([])

  useEffect(() => {
    if (!authLoading && user) {
      fetchEmployees()
      fetchInvitations()
    }
  }, [authLoading, user])

  const fetchEmployees = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/manager/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setEmployees(data.employees || [])
      setPerms(data.permissions || [])
    } catch (e) {
      setError('Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  const fetchInvitations = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/manager/invitations`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      setInvitations(data.invitations || [])
    } catch (e) {
      // ignore
    }
  }

  const handleInvite = async () => {
    setInviteStatus('Sending...')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/manager/invite-employee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ email: inviteEmail })
    })
    if (res.ok) {
      setInviteStatus('Invitation sent!')
      setInviteEmail('')
      fetchInvitations()
    } else {
      setInviteStatus('Failed to send invitation.')
    }
  }

  const addEmployee = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/manager/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add employee')
      setEmail('')
      fetchEmployees()
    } catch (err) {
      setError(err.message)
    }
  }

  const updatePerm = async (empId, field, value) => {
    setError('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/manager/employees/${empId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [field]: value })
      })
      if (!res.ok) throw new Error('Failed to update permissions')
      fetchEmployees()
    } catch (err) {
      setError(err.message)
    }
  }

  const removeEmployee = async (empId) => {
    if (!window.confirm('Remove this employee?')) return
    setError('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/manager/employees/${empId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to remove employee')
      fetchEmployees()
    } catch (err) {
      setError(err.message)
    }
  }

  if (authLoading) {
    return <div className="admin-container"><p>Loading...</p></div>
  }

  if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
    return <div className="admin-container"><p>Manager access required.</p></div>
  }

  return (
    <div className="admin-container">
      <h1>Manager Dashboard</h1>
      
      {/* Invite Section */}
      <div className="manager-section">
        <h3>Invite Employee</h3>
        <div className="invite-form">
          <input
            type="email"
            placeholder="Employee email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="form-input"
          />
          <button onClick={handleInvite} disabled={!inviteEmail} className="form-button">
            Invite Employee
          </button>
          {inviteStatus && <span className="invite-status">{inviteStatus}</span>}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="manager-section">
          <h3>Pending Invitations</h3>
          <ul className="invitations-list">
            {invitations.map(inv => (
              <li key={inv.id} className="invitation-item">
                <span className="invitation-email">{inv.email}</span>
                <span className="invitation-status">{inv.accepted ? 'Accepted' : 'Pending'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add Employee Section */}
      <div className="manager-section">
        <h3>Add Employee</h3>
        <form onSubmit={addEmployee} className="admin-search">
          <input 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="Employee email" 
            required 
            className="form-input"
          />
          <button type="submit" className="form-button">Add Employee</button>
        </form>
      </div>

      {error && <p className="error">{error}</p>}
      {loading ? <p className="loading-text">Loading...</p> : null}

      {/* Employees Table */}
      <div className="manager-section">
        <h3>Manage Employees</h3>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Permissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                    No employees added yet
                  </td>
                </tr>
              ) : (
                employees.map(emp => {
                  const perm = perms.find(p => p.employee_id === emp.id) || defaultPerms
                  return (
                    <tr key={emp.id}>
                      <td>{emp.username}</td>
                      <td>{emp.email}</td>
                      <td className="permissions-cell">
                        {Object.keys(defaultPerms).map(field => (
                          <label key={field} className="permission-label">
                            <input 
                              type="checkbox" 
                              checked={!!perm[field]} 
                              onChange={e => updatePerm(emp.id, field, e.target.checked)} 
                            />
                            <span>{field.replace('can_', '').replace('_', ' ')}</span>
                          </label>
                        ))}
                      </td>
                      <td>
                        <button 
                          onClick={() => removeEmployee(emp.id)} 
                          className="action-button remove-button"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ManagerDashboard
