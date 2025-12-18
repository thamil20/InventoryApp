import { useEffect, useState } from 'react'
import './AdminDashboard.css'
import { useAuth } from './AuthContext'

function AdminDashboard() {
  const { token, user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({})
  const roleOptions = ["default", "employee", "manager", "admin"]

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async (q = '') => {
    try {
      setLoading(true)
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchUsers(query)
  }

  const startEdit = (u) => {
    setEditingId(u.id)
    setEditValues({ username: u.username, email: u.email, phone: u.phone, role: u.role })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValues({})
  }

  const saveEdit = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editValues)
      })
      if (!res.ok) throw new Error('Failed to update user')
      await fetchUsers(query)
      cancelEdit()
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteUser = async (id) => {
    if (!confirm('Delete this user? This action cannot be undone.')) return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to delete user')
      await fetchUsers(query)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!user || !user.is_admin) {
    return <div className="admin-container"><p>Admin access required.</p></div>
  }

  return (
    <div className="admin-container">
      <h1>Admin Dashboard</h1>
      <div className="admin-controls">
        <form onSubmit={handleSearch} className="admin-search">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by username or email" />
          <button type="submit">Search</button>
          <button type="button" onClick={() => { setQuery(''); fetchUsers('') }}>Clear</button>
        </form>
      </div>

      {loading ? <p>Loading users...</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Admin</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>
                  {editingId === u.id ? (
                    <input value={editValues.username} onChange={(e) => setEditValues({...editValues, username: e.target.value})} />
                  ) : u.username}
                </td>
                <td>
                  {editingId === u.id ? (
                    <input value={editValues.email} onChange={(e) => setEditValues({...editValues, email: e.target.value})} />
                  ) : u.email}
                </td>
                <td>
                  {editingId === u.id ? (
                    <input value={editValues.phone || ''} onChange={(e) => setEditValues({...editValues, phone: e.target.value})} />
                  ) : (u.phone || '')}
                </td>
                <td>
                  {editingId === u.id ? (
                    <select value={editValues.role} onChange={e => setEditValues({...editValues, role: e.target.value})}>
                      {roleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : u.role}
                </td>
                <td>{new Date(u.createdAt).toLocaleString()}</td>
                <td className="actions">
                  {editingId === u.id ? (
                    <>
                      <button onClick={() => saveEdit(u.id)}>Save</button>
                      <button onClick={cancelEdit}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(u)}>Edit</button>
                      <button onClick={() => deleteUser(u.id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminDashboard
