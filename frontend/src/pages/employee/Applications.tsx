import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Eye, Plus } from 'lucide-react'
import { applicationAPI } from '@/services/api'
import type { Application } from '@/types'

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700' },
  pending: { label: '审批中', color: 'bg-amber-100 text-amber-700' },
  approved: { label: '已通过', color: 'bg-green-100 text-green-700' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700' },
  rejected: { label: '已退回', color: 'bg-red-100 text-red-700' },
  withdrawn: { label: '已撤回', color: 'bg-purple-100 text-purple-700' },
}

const EmployeeApplications: React.FC = () => {
  const navigate = useNavigate()
  const [applications, setApplications] = useState<Application[]>([])
  const [filter, setFilter] = useState('')

  const fetchApplications = async () => {
    try {
      const data = await applicationAPI.getApplications(
        filter ? { status: filter } : undefined
      )
      setApplications(data)
    } catch (err) {
      console.error('Failed to fetch applications', err)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [filter])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的申请</h1>
          <p className="text-gray-500 mt-1">查看所有申请记录和状态</p>
        </div>
        <button
          onClick={() => navigate('/employee/applications/new')}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          新建申请
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === ''
              ? 'bg-primary-100 text-primary-700'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          全部
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          审批中
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-green-100 text-green-700'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          已完成
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'rejected'
              ? 'bg-red-100 text-red-700'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          已退回
        </button>
        <button
          onClick={() => setFilter('withdrawn')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'withdrawn'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          已撤回
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {applications.map((app) => (
            <div
              key={app.id}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => navigate(`/employee/applications/${app.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{app.title}</h3>
                    <p className="text-sm text-gray-500">
                      {app.workflowName} · {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {app.currentNodeName && app.status !== 'withdrawn' && app.status !== 'completed' && app.status !== 'rejected' && (
                    <span className="text-sm text-gray-500">
                      当前节点：{app.currentNodeName}
                    </span>
                  )}
                  {app.status === 'withdrawn' && app.withdrawReason && (
                    <span className="text-sm text-purple-600 max-w-xs truncate">
                      撤回原因：{app.withdrawReason}
                    </span>
                  )}
                  {app.supplementStatus === 'requested' && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                      待补充材料
                    </span>
                  )}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      statusLabels[app.status]?.color || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {statusLabels[app.status]?.label || app.status}
                  </span>
                  <Eye className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {applications.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>暂无申请记录</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default EmployeeApplications
