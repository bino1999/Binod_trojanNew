import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/auth/Login'
import Dashboard from '@/pages/dashboard'
import Products from '@/pages/products'
import Suppliers from '@/pages/suppliers'
import Inventory from '@/pages/inventory'
import Purchases from '@/pages/purchases'
import Customers from '@/pages/customers'
import InternalUse from '@/pages/internal-use'
import ServiceJobs from '@/pages/service-jobs'
import Sales from '@/pages/sales'
import Returns from '@/pages/returns'
import Adjustments from '@/pages/adjustments'
import Reports from '@/pages/reports'
import Users from '@/pages/users'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, role } = useAuthStore()

  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="customers" element={<Customers />} />
        <Route path="internal-use" element={<InternalUse />} />
        <Route path="service-jobs" element={<ServiceJobs />} />
        <Route path="sales" element={<Sales />} />
        <Route path="returns" element={<Returns />} />
        <Route path="adjustments" element={<Adjustments />} />
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Users />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}
