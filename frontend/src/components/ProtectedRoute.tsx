import React from 'react'
import { Navigate } from 'react-router-dom'
import { isAuthenticated } from '../lib/auth'

interface Props {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default ProtectedRoute
