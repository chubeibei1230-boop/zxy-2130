import React, { useEffect, useState } from 'react'
import { Workflow, Users, FileText, CheckCircle } from 'lucide-react'
import { workflowAPI, applicationAPI, userAPI } from '@/services/api'

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    workflows: 0,
    users: 0,
    applications: 0,
    completed: 0,
  })
  const [recentApps, setRecentApps] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [workflows, users, applications] = await Promise.all([
          workflowAPI.getWorkflows(),
          userAPI.getUsers(),
          applicationAPI.getApplications(),
        ])
        setStats({
          workflows: workflows.length,
          users: users.length,
          applications: applications.length,
          completed: applications.filter((a) => a.status === 'completed').length,
        })
        setRecentApps(applications.slice(0, 5))
      } catch (err) {
        console.error('Failed to fetch data', err)
      }
    }
    fetchData()
  }, [])

  const statCards = [
    { label: '流程模板', value: stats.workflows, icon: Workflow, color: 'bg-blue-500' },
    { label: '系统用户', value: stats.users, icon: Users, color: 'bg-green-500' },
    { label: '申请总数', value: stats.applications, icon: FileText, color: 'bg-amber-500' },
    { label: '已完成', value: stats.completed, icon: CheckCircle, color: 'bg-emerald-500' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">管理员仪表盘</h1>
        <p className="text-gray-500 mt-1">系统概览和数据统计</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近申请</h2>
          <div className="space-y-4">
            {recentApps.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{app.title}</p>
                  <p className="text-sm text-gray-500">{app.applicantName}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    app.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : app.status === 'pending'
                      ? 'bg-amber-100 text-amber-700'
                      : app.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {app.status}
                </span>
              </div>
            ))}
            {recentApps.length === 0 && (
              <p className="text-gray-400 text-center py-4">暂无申请记录</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors text-left">
              <Workflow className="w-6 h-6 text-primary-600 mb-2" />
              <p className="font-medium text-primary-900">创建流程</p>
              <p className="text-xs text-primary-600">配置新的审批模板</p>
            </button>
            <button className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left">
              <Users className="w-6 h-6 text-green-600 mb-2" />
              <p className="font-medium text-green-900">添加用户</p>
              <p className="text-xs text-green-600">创建新的系统账号</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
