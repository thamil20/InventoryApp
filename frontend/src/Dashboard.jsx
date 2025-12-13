import { useAuth } from './AuthContext'

function Dashboard() {
  const { user } = useAuth()
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome to the Inventory App, {user?.username}!</p>
      <p>Use the nav bar to navigate through your inventory.</p>
    </div>
  )
}

export default Dashboard
