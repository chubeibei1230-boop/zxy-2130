import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, CheckCircle, XCircle, Eye } from 'lucide-react'
import { approvalAPI } from '@/services/api'
import type { Application } from '@/types'

const SupervisorApprovedList: React.FC = () => {
  const navigate = useNavigate()
  const [applications, setApplications] = useState<Application[]>([])
  const [filter, setFilter] = useState<'approved' | 'rejected' | ''>('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await approvalAPI.getHandledApprovals()
        setApplications(data)
      } catch (err) {
        console.error('Failed to fetch data', err)
      }
    }
    fetchData()
  }, [])

  const filteredApps = filter
    ? applications.filter((a) => a.status === filter)
    : applications

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">已办记录</h1>
        <p className="text-gray-500 mt-1">查看您处理过的申请</p>
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
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'approved'
              ? 'bg-green-100 text-green-700'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          已通过
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
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => navigate(`/supervisor/approvals/${app.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      app.status === 'approved' ? 'bg-green-100' : 'bg-red-100'
                    }`}
                  >
                    {app.status === 'approved' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{app.title}</h3>
                    <p className="text-sm text-gray-500">
                      申请人：{app.applicantName} · {app.workflowName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      app.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {app.status === 'approved' ? '已通过' : '已退回'}
                  </span>
                  <Eye className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredApps.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>暂无记录</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SupervisorApprovedList
