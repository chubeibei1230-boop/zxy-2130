import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Eye, Clock, AlertTriangle, Bell, Filter } from 'lucide-react'
import { approvalAPI } from '@/services/api'
import type { Application } from '@/types'
import { cn } from '@/lib/utils'

type FilterType = 'all' | 'near_timeout' | 'timeout' | 'urged'

const SupervisorPendingList: React.FC = () => {
  const navigate = useNavigate()
  const [applications, setApplications] = useState<Application[]>([])
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async (filter?: FilterType) => {
    setLoading(true)
    try {
      const data = await approvalAPI.getPendingApprovals(filter === 'all' ? undefined : filter)
      setApplications(data)
    } catch (err) {
      console.error('Failed to fetch data', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(activeFilter)
  }, [activeFilter, fetchData])

  const filters: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: '全部', icon: null },
    { key: 'near_timeout', label: '临近超时', icon: <Clock className="w-4 h-4" /> },
    { key: 'timeout', label: '已超时', icon: <AlertTriangle className="w-4 h-4" /> },
    { key: 'urged', label: '已催办', icon: <Bell className="w-4 h-4" /> },
  ]

  const formatTimeRemaining = (app: Application) => {
    const aging = app.agingInfo
    if (!aging) return null
    
    if (aging.isTimeout) {
      return {
        text: `已超时 ${Math.abs(aging.remainingHours || 0)} 小时`,
        color: 'text-red-600 bg-red-50',
        badgeColor: 'bg-red-100 text-red-700',
      }
    }
    if (aging.isNearTimeout) {
      return {
        text: `剩余 ${aging.remainingHours} 小时`,
        color: 'text-amber-600 bg-amber-50',
        badgeColor: 'bg-amber-100 text-amber-700',
      }
    }
    if (aging.remainingHours !== undefined && aging.remainingHours !== null) {
      return {
        text: `剩余 ${aging.remainingHours} 小时`,
        color: 'text-green-600 bg-green-50',
        badgeColor: 'bg-green-100 text-green-700',
      }
    }
    return null
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">待办审批</h1>
        <p className="text-gray-500 mt-1">处理待您审批的申请</p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-5 h-5 text-gray-400" />
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                activeFilter === f.key
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center text-gray-400">加载中...</div>
          ) : (
            applications.map((app) => {
              const timeInfo = formatTimeRemaining(app)
              return (
                <div
                  key={app.id}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/supervisor/approvals/${app.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        app.urgeInfo?.isUrged ? "bg-amber-100" :
                        app.agingInfo?.isTimeout ? "bg-red-100" :
                        app.agingInfo?.isNearTimeout ? "bg-orange-100" :
                        "bg-amber-100"
                      )}>
                        {app.urgeInfo?.isUrged ? (
                          <Bell className="w-5 h-5 text-amber-600" />
                        ) : app.agingInfo?.isTimeout ? (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        ) : (
                          <Clock className={cn(
                            "w-5 h-5",
                            app.agingInfo?.isNearTimeout ? "text-orange-600" : "text-amber-600"
                          )} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{app.title}</h3>
                          {app.urgeInfo?.isUrged && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                              <Bell className="w-3 h-3" />
                              已催办 {app.urgeInfo.urgeCount} 次
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          申请人：{app.applicantName} · {app.workflowName} ·{' '}
                          {new Date(app.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end gap-1">
                        {app.currentNodeName && (
                          <span className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            {app.currentNodeName}
                          </span>
                        )}
                        {timeInfo && (
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded",
                            timeInfo.badgeColor
                          )}>
                            {timeInfo.text}
                          </span>
                        )}
                      </div>
                      <Eye className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {!loading && applications.length === 0 && (
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
