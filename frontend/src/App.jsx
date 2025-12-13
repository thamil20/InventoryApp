import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { AuthProvider, useAuth } from './AuthContext'
import Navigation from './Navigation.jsx'
import Dashboard from './Dashboard.jsx'
import CurrentInventoryList from './CurrentInventoryList.jsx'
import SoldItemsList from './SoldItemsList.jsx'
import AddItemForm from './AddItemForm.jsx'
import Finances from './Finances.jsx'
import Login from './Login.jsx'
import Register from './Register.jsx'
import ForgotPassword from './ForgotPassword.jsx'

// Protected Route wrapper component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return <div>Loading...</div>
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function AppContent() {
  return (
    <>
      <Navigation />
      <div className="app-container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inventory/current" 
            element={
              <ProtectedRoute>
                <CurrentInventoryList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inventory/sold" 
            element={
              <ProtectedRoute>
                <SoldItemsList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inventory/create_item" 
            element={
              <ProtectedRoute>
                <AddItemForm />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/finances" 
            element={
              <ProtectedRoute>
                <Finances />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
