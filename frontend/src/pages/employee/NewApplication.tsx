import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { applicationAPI, workflowAPI } from '@/services/api'
import type { Workflow } from '@/types'

const EmployeeNewApplication: React.FC = () => {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [attachmentsText, setAttachmentsText] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const data = await workflowAPI.getWorkflows()
        setWorkflows(data.filter((w) => w.isActive))
      } catch (err) {
        console.error('Failed to fetch workflows', err)
      }
    }
    fetchWorkflows()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWorkflow || !title) return

    setLoading(true)
    try {
      const app = await applicationAPI.createApplication({
        workflowId: parseInt(selectedWorkflow),
        title,
        content,
        attachments: attachmentsText
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      })
      await applicationAPI.submitApplication(app.id)
      navigate('/employee/applications')
    } catch (err) {
      console.error('Failed to create application', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/employee/applications')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </button>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h1 className="text-xl font-bold text-gray-900 mb-6">新建申请</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                申请类型
              </label>
              <select
                value={selectedWorkflow}
                onChange={(e) => setSelectedWorkflow(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                required
              >
                <option value="">请选择申请类型</option>
                {workflows.map((wf) => (
                  <option key={wf.id} value={wf.id}>
                    {wf.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                申请标题
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入申请标题"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                申请内容
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请详细描述申请内容..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                附件/补充材料链接
              </label>
              <textarea
                value={attachmentsText}
                onChange={(e) => setAttachmentsText(e.target.value)}
                placeholder="每行填写一个材料链接或文件说明"
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/employee/applications')}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
                {loading ? '提交中...' : '提交申请'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EmployeeNewApplication
