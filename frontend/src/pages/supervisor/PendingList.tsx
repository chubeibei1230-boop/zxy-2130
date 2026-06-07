import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Eye, Clock } from 'lucide-react'
import { approvalAPI } from '@/services/api'
import type { Application } from '@/types'

const SupervisorPendingList: React.FC = () => {
  const navigate = useNavigate()
  const [applications, setApplications] = useState<Application[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await approvalAPI.getPendingApprovals()
        setApplications(data)
      } catch (err) {
        console.error('Failed to fetch data', err)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">待办审批</h1>
        <p className="text-gray-500 mt-1">处理待您审批的申请</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {applications.map((app) => (
            <div
              key={app.id}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => navigate(`/supervisor/approvals/${app.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{app.title}</h3>
                    <p className="text-sm text-gray-500">
                      申请人：{app.applicantName} · {app.workflowName} ·{' '}
                      {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {app.currentNodeName && (
                    <span className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      {app.currentNodeName}
                    </span>
                  )}
                  <Eye className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {applications.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>暂无待办审批</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SupervisorPendingList
