import { useEffect, useState } from 'react'
import './AdminDashboard.css'
import { useAuth } from './AuthContext'

const defaultPerms = {
  can_view_inventory: true,
  can_edit_inventory: false,
  can_see_finances: false,
  can_add_items: false,
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteStatus, setInviteStatus] = useState('');
    const [invitations, setInvitations] = useState([]);
}
    useEffect(() => {
      fetch('/api/manager/invitations', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
        .then(res => res.json())
        .then(data => setInvitations(data.invitations || []));
    }, []);

    const handleInvite = async () => {
      setInviteStatus('Sending...');
      const res = await fetch('/api/manager/invite-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ email: inviteEmail })
      });
      if (res.ok) {
        setInviteStatus('Invitation sent!');
        setInviteEmail('');
      } else {
        setInviteStatus('Failed to send invitation.');
      }
    };

function ManagerDashboard() {
  const { token, user } = useAuth()
  const [employees, setEmployees] = useState([])
  const [perms, setPerms] = useState([])
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchEmployees()
  }, [])

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
        <div style={{ marginBottom: 20 }}>
          <input
            type="email"
            placeholder="Employee email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
          />
          <button onClick={handleInvite} disabled={!inviteEmail}>Invite Employee</button>
          <span style={{ marginLeft: 10 }}>{inviteStatus}</span>
        </div>
        <div>
          <h4>Pending Invitations</h4>
          <ul>
            {invitations.map(inv => (
              <li key={inv.id}>{inv.email} - {inv.accepted ? 'Accepted' : 'Pending'}</li>
            ))}
          </ul>
        </div>
      setLoading(false)
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

  if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
    return <div className="admin-container"><p>Manager access required.</p></div>
  }

  return (
    <div className="admin-container">
      <h1>Manager Dashboard</h1>
      <form onSubmit={addEmployee} className="admin-search">
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Employee email" required />
        <button type="submit">Add Employee</button>
      </form>
      {error && <p className="error">{error}</p>}
      {loading ? <p>Loading...</p> : null}
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
            {employees.map(emp => {
              const perm = perms.find(p => p.employee_id === emp.id) || defaultPerms
              return (
                <tr key={emp.id}>
                  <td>{emp.username}</td>
                  <td>{emp.email}</td>
                  <td>
                    {Object.keys(defaultPerms).map(field => (
                      <label key={field} style={{marginRight:8}}>
                        <input type="checkbox" checked={!!perm[field]} onChange={e => updatePerm(emp.id, field, e.target.checked)} />
                        {field.replace('can_', '').replace('_', ' ')}
                      </label>
                    ))}
                  </td>
                  <td>
                    <button onClick={() => removeEmployee(emp.id)}>Remove</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ManagerDashboard
