import React, { useEffect, useState } from 'react'
import {
  Clock,
  AlertTriangle,
  Bell,
  TrendingUp,
  Workflow,
  BarChart3,
  AlertCircle,
} from 'lucide-react'
import { applicationAPI } from '@/services/api'
import type { AgingDashboardData, WorkflowAgingStat, NodeBottleneck } from '@/types'
import { cn } from '@/lib/utils'

const AdminAgingDashboard: React.FC = () => {
  const [data, setData] = useState<AgingDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await applicationAPI.getAgingDashboard()
        setData(result)
      } catch (err) {
        console.error('Failed to fetch aging dashboard data', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-gray-500">暂无数据</p>
      </div>
    )
  }

  const statCards = [
    {
      label: '待处理申请',
      value: data.summary.totalPending,
      icon: Clock,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      label: '已超时',
      value: data.summary.totalTimeout,
      icon: AlertTriangle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
    },
    {
      label: '临近超时',
      value: data.summary.totalNearTimeout,
      icon: AlertCircle,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
    },
    {
      label: '已催办',
      value: data.summary.totalUrged,
      icon: Bell,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
    },
  ]

  const getProgressBarColor = (pending: number, timeout: number) => {
    if (timeout > 0) return 'bg-red-500'
    if (pending > 3) return 'bg-amber-500'
    return 'bg-green-500'
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">处理时效看板</h1>
        <p className="text-gray-500 mt-1">监控审批流程时效，发现瓶颈并及时跟进</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Workflow className="w-5 h-5" />
            各流程时效统计
          </h2>
          <div className="space-y-4">
            {data.workflowStats.length === 0 ? (
              <p className="text-gray-400 text-center py-4">暂无流程数据</p>
            ) : (
              data.workflowStats.map((stat: WorkflowAgingStat) => (
                <div key={stat.workflowId} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900">{stat.workflowName}</p>
                      <p className="text-xs text-gray-500">{stat.workflowType}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <TrendingUp className="w-3 h-3" />
                        平均 {stat.avgElapsedHours} 小时
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          getProgressBarColor(stat.pendingCount, stat.timeoutCount)
                        )}
                        style={{ width: `${Math.min((stat.pendingCount / 10) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600">
                        待处理 <span className="font-medium text-gray-900">{stat.pendingCount}</span>
                      </span>
                      {stat.timeoutCount > 0 && (
                        <span className="text-red-600">
                          超时 <span className="font-medium">{stat.timeoutCount}</span>
                        </span>
                      )}
                      {stat.urgedCount > 0 && (
                        <span className="text-orange-600 flex items-center gap-0.5">
                          <Bell className="w-3 h-3" />
                          {stat.urgedCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            审批瓶颈节点
          </h2>
          <div className="space-y-3">
            {data.nodeBottlenecks.length === 0 ? (
              <p className="text-gray-400 text-center py-4">暂无节点数据</p>
            ) : (
              data.nodeBottlenecks.slice(0, 6).map((node: NodeBottleneck) => (
                <div
                  key={node.nodeId}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    node.timeoutCount > 0
                      ? "bg-red-50 border-red-200"
                      : node.pendingCount > 3
                      ? "bg-amber-50 border-amber-200"
                      : "bg-gray-50 border-gray-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{node.nodeName}</p>
                      <p className="text-xs text-gray-500">{node.workflowName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-gray-500">待处理</span>
                          <span className={cn(
                            "font-bold",
                            node.pendingCount > 3 ? "text-amber-600" : "text-gray-900"
                          )}>
                            {node.pendingCount}
                          </span>
                        </div>
                        {node.timeoutCount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-red-600">
                            <AlertTriangle className="w-3 h-3" />
                            超时 {node.timeoutCount}
                          </div>
                        )}
                      </div>
                      {node.avgElapsedHours > 0 && (
                        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                          平均 {node.avgElapsedHours}h
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          处理耗时说明
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="font-medium text-green-700">正常处理</span>
            </div>
            <p className="text-sm text-green-600">
              剩余时间大于24小时，审批处理在时效范围内
            </p>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="font-medium text-amber-700">临近超时</span>
            </div>
            <p className="text-sm text-amber-600">
              剩余时间小于等于24小时，需要尽快处理
            </p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="font-medium text-red-700">已超时</span>
            </div>
            <p className="text-sm text-red-600">
              超出节点处理时限，需优先处理并关注催办
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminAgingDashboard
