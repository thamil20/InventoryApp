import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Navigation from './Navigation.jsx'
import Dashboard from './Dashboard.jsx'
import CurrentInventoryList from './CurrentInventoryList.jsx'
import AddItemForm from './AddItemForm.jsx'
import Login from './Login.jsx'
import Register from './Register.jsx'
import ForgotPassword from './ForgotPassword.jsx'

function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory/current" element={<CurrentInventoryList />} />
          <Route path="/inventory/create_item" element={<AddItemForm />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
