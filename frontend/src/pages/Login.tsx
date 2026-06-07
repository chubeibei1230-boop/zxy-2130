import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User, Settings } from 'lucide-react'
import { authAPI } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { UserRole } from '@/types'

const roleOptions: { value: UserRole; label: string; desc: string }[] = [
  { value: 'admin', label: '管理员', desc: '配置流程模板和角色' },
  { value: 'employee', label: '员工', desc: '提交申请和查看进度' },
  { value: 'supervisor', label: '主管', desc: '审批和处理申请' },
]

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [role, setRole] = useState<UserRole>('employee')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await authAPI.login({ username, password, role })
      login(response.user, response.accessToken)

      const redirectMap = {
        admin: '/admin/dashboard',
        employee: '/employee/dashboard',
        supervisor: '/supervisor/dashboard',
      }
      navigate(redirectMap[role])
    } catch (err: any) {
      setError(err.response?.data?.detail || '登录失败，请检查用户名和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-800 to-accent-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">工作流审批系统</h1>
          <p className="text-primary-100 mt-2">企业内部审批管理平台</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-gray-100">
            {roleOptions.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`flex-1 py-4 px-2 text-center transition-colors ${
                  role === r.value
                    ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600 font-semibold'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <div className="text-sm">{r.label}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <p className="text-sm text-gray-500 text-center mb-6">
              {roleOptions.find((r) => r.value === role)?.desc}
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  用户名
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                测试账号：
                <br />
                管理员: admin / admin123
                <br />
                员工: employee1 / 123456
                <br />
                主管: supervisor1 / 123456
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
