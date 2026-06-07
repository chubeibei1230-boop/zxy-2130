import React, { useEffect, useState } from 'react'
import { Clock, CheckCircle, XCircle, Inbox, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { approvalAPI } from '@/services/api'

const SupervisorDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await approvalAPI.getPendingApprovals()
        setStats((prev) => ({ ...prev, pending: data.length }))
      } catch (err) {
        console.error('Failed to fetch data', err)
      }
    }
    fetchData()
  }, [])

  const statCards = [
    { label: '待审批', value: stats.pending, icon: Inbox, color: 'bg-amber-500', action: '/supervisor/pending' },
    { label: '已通过', value: stats.approved, icon: CheckCircle, color: 'bg-green-500', action: '/supervisor/approved' },
    { label: '已退回', value: stats.rejected, icon: XCircle, color: 'bg-red-500', action: '/supervisor/rejected' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">主管工作台</h1>
        <p className="text-gray-500 mt-1">审批和管理待处理申请</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            onClick={() => navigate(card.action)}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
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
            <div className="mt-4 flex items-center text-sm text-primary-600">
              查看详情 <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/supervisor/pending')}
            className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors text-left"
          >
            <Clock className="w-6 h-6 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">待办审批</p>
              <p className="text-sm text-amber-600">处理待您审批的申请</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/supervisor/approved')}
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
          >
            <CheckCircle className="w-6 h-6 text-gray-600" />
            <div>
              <p className="font-medium text-gray-900">已办记录</p>
              <p className="text-sm text-gray-500">查看您处理过的申请</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default SupervisorDashboard
