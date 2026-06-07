import React, { useEffect, useState } from 'react'
import { Workflow, Users, FileText, CheckCircle, XCircle } from 'lucide-react'
import { workflowAPI, applicationAPI, userAPI } from '@/services/api'
import type { WithdrawnStats, WithdrawnRecord } from '@/types'

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    workflows: 0,
    users: 0,
    applications: 0,
    completed: 0,
    withdrawn: 0,
  })
  const [recentApps, setRecentApps] = useState<any[]>([])
  const [recentWithdrawn, setRecentWithdrawn] = useState<WithdrawnRecord[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [workflows, users, applications, withdrawnStats] = await Promise.all([
          workflowAPI.getWorkflows(),
          userAPI.getUsers(),
          applicationAPI.getApplications(),
          applicationAPI.getWithdrawnStats(),
        ])
        setStats({
          workflows: workflows.length,
          users: users.length,
          applications: applications.length,
          completed: applications.filter((a) => a.status === 'completed').length,
          withdrawn: withdrawnStats.totalWithdrawn,
        })
        setRecentApps(applications.slice(0, 5))
        setRecentWithdrawn(withdrawnStats.recentWithdrawn)
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
    { label: '已撤回', value: stats.withdrawn, icon: XCircle, color: 'bg-purple-500' },
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
                      : app.status === 'withdrawn'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {app.status === 'completed' ? '已完成' :
                   app.status === 'pending' ? '审批中' :
                   app.status === 'rejected' ? '已退回' :
                   app.status === 'withdrawn' ? '已撤回' : app.status}
                </span>
              </div>
            ))}
            {recentApps.length === 0 && (
              <p className="text-gray-400 text-center py-4">暂无申请记录</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-purple-500" />
            最近撤回记录
          </h2>
          <div className="space-y-3">
            {recentWithdrawn.map((record) => (
              <div
                key={record.id}
                className="p-3 bg-purple-50 rounded-lg border border-purple-100"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{record.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      申请人：{record.applicantName}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                    已撤回
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap line-clamp-2">
                  {record.withdrawReason}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  撤回时间：{new Date(record.withdrawnAt).toLocaleString()}
                </p>
              </div>
            ))}
            {recentWithdrawn.length === 0 && (
              <p className="text-gray-400 text-center py-8 text-sm">暂无撤回记录</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
