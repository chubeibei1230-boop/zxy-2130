import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Clock, FileText, PlusSquare, RotateCcw } from 'lucide-react'
import { applicationAPI } from '@/services/api'
import type { Application } from '@/types'

const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [applications, setApplications] = useState<Application[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await applicationAPI.getApplications()
        setApplications(data)
      } catch (err) {
        console.error('Failed to fetch applications', err)
      }
    }
    fetchData()
  }, [])

  const stats = [
    {
      label: '申请总数',
      value: applications.length,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      label: '审批中',
      value: applications.filter((a) => a.status === 'pending').length,
      icon: Clock,
      color: 'bg-amber-500',
    },
    {
      label: '已完成',
      value: applications.filter((a) => a.status === 'completed' || a.status === 'approved').length,
      icon: CheckCircle,
      color: 'bg-green-500',
    },
    {
      label: '已退回',
      value: applications.filter((a) => a.status === 'rejected').length,
      icon: RotateCcw,
      color: 'bg-red-500',
    },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">员工工作台</h1>
          <p className="text-gray-500 mt-1">提交申请、查看进度和补充材料</p>
        </div>
        <button
          onClick={() => navigate('/employee/applications/new')}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusSquare className="w-5 h-5" />
          新建申请
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((item) => (
          <div key={item.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{item.value}</p>
              </div>
              <div className={`${item.color} p-3 rounded-lg`}>
                <item.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">最近申请</h2>
          <button
            onClick={() => navigate('/employee/applications')}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            查看全部
          </button>
        </div>
        <div className="space-y-3">
          {applications.slice(0, 5).map((app) => (
            <button
              key={app.id}
              onClick={() => navigate(`/employee/applications/${app.id}`)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
            >
              <div>
                <p className="font-medium text-gray-900">{app.title}</p>
                <p className="text-sm text-gray-500">{app.workflowName}</p>
              </div>
              <span className="text-sm text-gray-500">{app.currentNodeName || app.status}</span>
            </button>
          ))}
          {applications.length === 0 && (
            <p className="text-gray-400 text-center py-8">暂无申请，点击右上角新建申请</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmployeeDashboard
