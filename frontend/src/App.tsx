import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AdminLayout from './components/AdminLayout'
import EmployeeLayout from './components/EmployeeLayout'
import SupervisorLayout from './components/SupervisorLayout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminAgingDashboard from './pages/admin/AgingDashboard'
import AdminWorkflows from './pages/admin/Workflows'
import AdminWorkflowEditor from './pages/admin/WorkflowEditor'
import AdminRoles from './pages/admin/Roles'
import EmployeeDashboard from './pages/employee/Dashboard'
import EmployeeApplications from './pages/employee/Applications'
import EmployeeNewApplication from './pages/employee/NewApplication'
import EmployeeApplicationDetail from './pages/employee/ApplicationDetail'
import SupervisorDashboard from './pages/supervisor/Dashboard'
import SupervisorPendingList from './pages/supervisor/PendingList'
import SupervisorApprovedList from './pages/supervisor/ApprovedList'
import SupervisorApprovalDetail from './pages/supervisor/ApprovalDetail'
import { useAuthStore } from './store/authStore'

function App() {
  const { user } = useAuthStore()

  const getRedirectPath = () => {
    if (!user) return '/login'
    switch (user.role) {
      case 'admin':
        return '/admin/dashboard'
      case 'employee':
        return '/employee/dashboard'
      case 'supervisor':
        return '/supervisor/dashboard'
      default:
        return '/login'
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to={getRedirectPath()} replace />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="aging-dashboard" element={<AdminAgingDashboard />} />
        <Route path="workflows" element={<AdminWorkflows />} />
        <Route path="workflows/:id" element={<AdminWorkflowEditor />} />
        <Route path="roles" element={<AdminRoles />} />
      </Route>

      <Route path="/employee" element={<EmployeeLayout />}>
        <Route path="dashboard" element={<EmployeeDashboard />} />
        <Route path="applications" element={<EmployeeApplications />} />
        <Route path="applications/new" element={<EmployeeNewApplication />} />
        <Route path="applications/:id" element={<EmployeeApplicationDetail />} />
      </Route>

      <Route path="/supervisor" element={<SupervisorLayout />}>
        <Route path="dashboard" element={<SupervisorDashboard />} />
        <Route path="pending" element={<SupervisorPendingList />} />
        <Route path="approved" element={<SupervisorApprovedList />} />
        <Route path="rejected" element={<SupervisorApprovedList />} />
        <Route path="approvals/:id" element={<SupervisorApprovalDetail />} />
      </Route>
    </Routes>
  )
}

export default App
