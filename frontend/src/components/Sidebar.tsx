import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Workflow,
  Users,
  FileText,
  PlusSquare,
  Clock,
  CheckCircle,
  LogOut,
  Settings,
  BarChart3,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface SidebarProps {
  role: 'admin' | 'employee' | 'supervisor'
}

const menuConfig = {
  admin: [
    { path: '/admin/dashboard', label: '仪表盘', icon: LayoutDashboard },
    { path: '/admin/aging-dashboard', label: '时效看板', icon: BarChart3 },
    { path: '/admin/workflows', label: '流程模板', icon: Workflow },
    { path: '/admin/roles', label: '角色管理', icon: Users },
  ],
  employee: [
    { path: '/employee/dashboard', label: '工作台', icon: LayoutDashboard },
    { path: '/employee/applications', label: '我的申请', icon: FileText },
    { path: '/employee/applications/new', label: '新建申请', icon: PlusSquare },
  ],
  supervisor: [
    { path: '/supervisor/dashboard', label: '审批台', icon: LayoutDashboard },
    { path: '/supervisor/pending', label: '待办审批', icon: Clock },
    { path: '/supervisor/approved', label: '已办审批', icon: CheckCircle },
  ],
}

const roleLabels = {
  admin: '管理员',
  employee: '员工',
  supervisor: '主管',
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const menuItems = menuConfig[role]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-xl font-bold text-primary-800 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          工作流系统
        </h1>
        <p className="text-sm text-gray-500 mt-1">{roleLabels[role]}端</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-primary-700 font-semibold">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.department}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          退出登录
        </button>
      </div>
    </div>
  )
}

export default Sidebar
