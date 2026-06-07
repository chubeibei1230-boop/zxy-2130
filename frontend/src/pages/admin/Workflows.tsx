import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Play, Pause, Workflow } from 'lucide-react'
import { workflowAPI } from '@/services/api'
import type { Workflow as WorkflowType } from '@/types'

const AdminWorkflows: React.FC = () => {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState<WorkflowType[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const fetchWorkflows = async () => {
    try {
      const data = await workflowAPI.getWorkflows()
      setWorkflows(data)
    } catch (err) {
      console.error('Failed to fetch workflows', err)
    }
  }

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await workflowAPI.createWorkflow({
        name: newName,
        type: newType,
        description: newDesc,
      })
      setShowCreate(false)
      setNewName('')
      setNewType('')
      setNewDesc('')
      fetchWorkflows()
    } catch (err) {
      console.error('Failed to create workflow', err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此流程模板吗？')) return
    try {
      await workflowAPI.deleteWorkflow(id)
      fetchWorkflows()
    } catch (err) {
      console.error('Failed to delete workflow', err)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">流程模板管理</h1>
          <p className="text-gray-500 mt-1">配置和管理审批流程模板</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          新建流程
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">创建新流程</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">流程名称</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">流程类型</label>
              <input
                type="text"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                placeholder="如：leave, expense"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="md:col-span-3 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                创建
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((wf) => (
          <div
            key={wf.id}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Workflow className="w-6 h-6 text-primary-600" />
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  wf.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {wf.isActive ? '启用' : '停用'}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900">{wf.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{wf.description}</p>
            <div className="text-xs text-gray-400 mt-2">
              节点数：{wf.nodes.length}
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => navigate(`/admin/workflows/${wf.id}`)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm"
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </button>
              <button
                onClick={() => handleDelete(wf.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {workflows.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Workflow className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>暂无流程模板，点击上方按钮创建</p>
        </div>
      )}
    </div>
  )
}

export default AdminWorkflows
