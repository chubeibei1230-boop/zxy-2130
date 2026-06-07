import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { workflowAPI, nodeAPI } from '@/services/api'
import ContextMenu from '@/components/ContextMenu'
import type { Workflow, NodeHistory } from '@/types'

const AdminWorkflowEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    nodeId: number
  } | null>(null)
  const [showHistory, setShowHistory] = useState<number | null>(null)
  const [history, setHistory] = useState<NodeHistory[]>([])
  const [showAddNode, setShowAddNode] = useState(false)
  const [newNodeName, setNewNodeName] = useState('')
  const [newNodeType, setNewNodeType] = useState('approval')
  const [newAssigneeRole, setNewAssigneeRole] = useState('supervisor')
  const [newTimeoutHours, setNewTimeoutHours] = useState('24')

  const fetchWorkflow = useCallback(async () => {
    if (!id) return
    try {
      const data = await workflowAPI.getWorkflow(parseInt(id))
      setWorkflow(data)
    } catch (err) {
      console.error('Failed to fetch workflow', err)
    }
  }, [id])

  useEffect(() => {
    fetchWorkflow()
  }, [fetchWorkflow])

  const handleContextMenu = (e: React.MouseEvent, nodeId: number) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId })
  }

  const handleCopyNode = async () => {
    if (!contextMenu) return
    try {
      await nodeAPI.copyNode(contextMenu.nodeId)
      fetchWorkflow()
    } catch (err) {
      console.error('Failed to copy node', err)
    }
    setContextMenu(null)
  }

  const handleSetRequired = async () => {
    if (!contextMenu || !workflow) return
    const node = workflow.nodes.find((n) => n.id === contextMenu.nodeId)
    if (!node) return
    try {
      await nodeAPI.setRequired(contextMenu.nodeId, !node.isRequired)
      fetchWorkflow()
    } catch (err) {
      console.error('Failed to set required', err)
    }
    setContextMenu(null)
  }

  const handlePauseNode = async () => {
    if (!contextMenu || !workflow) return
    const node = workflow.nodes.find((n) => n.id === contextMenu.nodeId)
    if (!node) return
    try {
      await nodeAPI.pauseNode(contextMenu.nodeId, !node.isPaused)
      fetchWorkflow()
    } catch (err) {
      console.error('Failed to pause node', err)
    }
    setContextMenu(null)
  }

  const handleViewHistory = async () => {
    if (!contextMenu) return
    try {
      const data = await nodeAPI.getHistory(contextMenu.nodeId)
      setHistory(data)
      setShowHistory(contextMenu.nodeId)
    } catch (err) {
      console.error('Failed to get history', err)
    }
    setContextMenu(null)
  }

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    try {
      await workflowAPI.addNode(parseInt(id), {
        name: newNodeName,
        type: newNodeType as any,
        assigneeRole: newNodeType === 'approval' ? newAssigneeRole : undefined,
        timeoutHours: newNodeType === 'approval' && newTimeoutHours ? parseInt(newTimeoutHours) : undefined,
        positionX: 200,
        positionY: 150 + (workflow?.nodes.length || 0) * 80,
        isRequired: true,
        isPaused: false,
        connections: [],
      })
      setShowAddNode(false)
      setNewNodeName('')
      setNewAssigneeRole('supervisor')
      setNewTimeoutHours('24')
      fetchWorkflow()
    } catch (err) {
      console.error('Failed to add node', err)
    }
  }

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'start':
        return 'bg-green-500'
      case 'end':
        return 'bg-red-500'
      case 'approval':
        return 'bg-blue-500'
      case 'condition':
        return 'bg-amber-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (!workflow) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  const currentNode = contextMenu
    ? workflow.nodes.find((n) => n.id === contextMenu.nodeId)
    : null

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/workflows')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{workflow.name}</h1>
            <p className="text-sm text-gray-500">{workflow.description}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddNode(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          添加节点
        </button>
      </div>

      <div className="flex-1 p-8 overflow-auto bg-gray-50">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 min-h-full">
          <div className="flex flex-col items-center gap-6">
            {workflow.nodes.map((node) => (
              <React.Fragment key={node.id}>
                <div
                  onContextMenu={(e) => handleContextMenu(e, node.id)}
                  className={`w-48 p-4 rounded-xl cursor-move transition-all hover:shadow-lg ${
                    node.isPaused ? 'opacity-60' : ''
                  } ${getNodeColor(node.type)} text-white`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium opacity-80 uppercase">
                      {node.type}
                    </span>
                    <div className="flex gap-1">
                      {node.isRequired && (
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                          必填
                        </span>
                      )}
                      {node.isPaused && (
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                          暂停
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="font-semibold">{node.name}</p>
                  {node.timeoutHours && (
                    <p className="text-xs opacity-80 mt-1">
                      时限：{node.timeoutHours}小时
                    </p>
                  )}
                  {node.assigneeRole && (
                    <p className="text-xs opacity-80 mt-1">
                      处理角色：{node.assigneeRole === 'admin' ? '管理员' : '主管'}
                    </p>
                  )}
                </div>
                {node.type !== 'end' && (
                  <div className="w-0.5 h-8 bg-gray-300" />
                )}
              </React.Fragment>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            右键点击节点可打开操作菜单
          </p>
        </div>
      </div>

      {contextMenu && currentNode && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onCopy={handleCopyNode}
          onSetRequired={handleSetRequired}
          onPause={handlePauseNode}
          onViewHistory={handleViewHistory}
          onClose={() => setContextMenu(null)}
          isRequired={currentNode.isRequired}
          isPaused={currentNode.isPaused}
        />
      )}

      {showAddNode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">添加节点</h3>
              <button
                onClick={() => setShowAddNode(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddNode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  节点名称
                </label>
                <input
                  type="text"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  节点类型
                </label>
                <select
                  value={newNodeType}
                  onChange={(e) => setNewNodeType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="approval">审批节点</option>
                  <option value="condition">条件节点</option>
                </select>
              </div>
              {newNodeType === 'approval' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      处理角色
                    </label>
                    <select
                      value={newAssigneeRole}
                      onChange={(e) => setNewAssigneeRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="supervisor">主管</option>
                      <option value="admin">管理员</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      超时时限（小时）
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newTimeoutHours}
                      onChange={(e) => setNewTimeoutHours(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                </>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  添加
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddNode(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistory !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 max-h-96 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">节点操作历史</h3>
              <button
                onClick={() => setShowHistory(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {h.action}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(h.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{h.details}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    操作人：{h.operatorName}
                  </p>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-center text-gray-400 py-4">暂无历史记录</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminWorkflowEditor
