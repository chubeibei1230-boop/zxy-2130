import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, MessageSquare, Save, Send, Bell, AlertTriangle, Clock } from 'lucide-react'
import { applicationAPI } from '@/services/api'
import type { Application, ApprovalRecord, UrgeRecord } from '@/types'
import { cn } from '@/lib/utils'

const EmployeeApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [application, setApplication] = useState<Application | null>(null)
  const [records, setRecords] = useState<ApprovalRecord[]>([])
  const [urgeRecords, setUrgeRecords] = useState<UrgeRecord[]>([])
  const [content, setContent] = useState('')
  const [attachmentsText, setAttachmentsText] = useState('')
  const [saving, setSaving] = useState(false)
  const [urging, setUrging] = useState(false)
  const [urgeMessage, setUrgeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      try {
        const [app, recs, urgeRecs] = await Promise.all([
          applicationAPI.getApplication(parseInt(id)),
          applicationAPI.getApprovalRecords(parseInt(id)),
          applicationAPI.getUrgeRecords(parseInt(id)),
        ])
        setApplication(app)
        setContent(app.content || '')
        setAttachmentsText((app.attachments || []).join('\n'))
        setRecords(recs)
        setUrgeRecords(urgeRecs)
      } catch (err) {
        console.error('Failed to fetch data', err)
      }
    }
    fetchData()
  }, [id])

  const handleUrge = async () => {
    if (!id || !application) return
    setUrging(true)
    setUrgeMessage(null)
    try {
      await applicationAPI.urgeApplication(parseInt(id))
      const [app, urgeRecs] = await Promise.all([
        applicationAPI.getApplication(parseInt(id)),
        applicationAPI.getUrgeRecords(parseInt(id)),
      ])
      setApplication(app)
      setUrgeRecords(urgeRecs)
      setUrgeMessage({ type: 'success', text: '催办成功！已通知审批人尽快处理' })
    } catch (err: any) {
      setUrgeMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || '催办失败，请稍后重试' 
      })
    } finally {
      setUrging(false)
    }
  }

  if (!application) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  const canSupplement = application.status === 'draft' || application.status === 'rejected'

  const handleSaveSupplement = async (submitAfterSave = false) => {
    if (!id) return
    setSaving(true)
    try {
      await applicationAPI.updateApplication(parseInt(id), {
        content,
        attachments: attachmentsText
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      })
      if (submitAfterSave) {
        await applicationAPI.submitApplication(parseInt(id))
        navigate('/employee/applications')
        return
      }
      const app = await applicationAPI.getApplication(parseInt(id))
      setApplication(app)
    } catch (err) {
      console.error('Failed to save supplement', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/employee/applications')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </button>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{application.title}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {application.workflowName} · 提交于{' '}
                {new Date(application.createdAt).toLocaleString()}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                statusColors[application.status] || 'bg-gray-100 text-gray-700'
              }`}
            >
              {application.status}
            </span>
          </div>
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{application.content}</p>
          </div>
          {application.attachments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">附件/补充材料</p>
              <div className="space-y-1">
                {application.attachments.map((item) => (
                  <p key={item} className="text-sm text-primary-600 break-all">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {application.status === 'pending' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              审批催办
            </h2>
            
            {application.urgeInfo?.isUrged && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    已发起 {application.urgeInfo.urgeCount} 次催办
                  </span>
                </div>
                {application.urgeInfo.latestUrgeAt && (
                  <p className="text-xs text-amber-600 mt-1">
                    最近催办：{new Date(application.urgeInfo.latestUrgeAt).toLocaleString()}
                    <span className="ml-2 px-1.5 py-0.5 bg-amber-100 rounded text-xs">
                      {application.urgeInfo.latestUrgeStatus === 'pending' ? '待处理' : '已处理'}
                    </span>
                  </p>
                )}
              </div>
            )}

            {urgeMessage && (
              <div className={cn(
                "mb-4 p-3 rounded-lg text-sm",
                urgeMessage.type === 'success' 
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              )}>
                {urgeMessage.text}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  当前节点：<span className="font-medium text-gray-900">{application.currentNodeName}</span>
                </p>
                {application.currentNodeEnteredAt && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    进入节点时间：{new Date(application.currentNodeEnteredAt).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={handleUrge}
                disabled={urging}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Bell className="w-4 h-4" />
                {urging ? '催办中...' : '发起催办'}
              </button>
            </div>
          </div>
        )}

        {urgeRecords.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              催办记录
            </h2>
            <div className="space-y-3">
              {urgeRecords.map((record) => (
                <div key={record.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{record.nodeName}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        record.status === 'pending'
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      )}>
                        {record.status === 'pending' ? '待处理' : '已处理'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      催办时间：{new Date(record.createdAt).toLocaleString()}
                    </p>
                    {record.handledAt && (
                      <p className="text-xs text-gray-500">
                        处理时间：{new Date(record.handledAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {canSupplement && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">补充材料</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">申请内容</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
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
              <div className="flex gap-3">
                <button
                  onClick={() => handleSaveSupplement(false)}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  保存材料
                </button>
                <button
                  onClick={() => handleSaveSupplement(true)}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  保存并提交
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            审批记录
          </h2>
          <div className="space-y-4">
            {records.map((record, idx) => (
              <div key={record.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-600" />
                  </div>
                  {idx < records.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 mt-2" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {record.approverName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        record.action === 'approve'
                          ? 'bg-green-100 text-green-700'
                          : record.action === 'reject'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {record.action === 'approve'
                        ? '通过'
                        : record.action === 'reject'
                        ? '退回'
                        : '转交'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(record.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {record.comment && (
                    <p className="text-sm text-gray-600">{record.comment}</p>
                  )}
                  {record.transferToUserName && (
                    <p className="text-sm text-blue-600 mt-1">
                      转交给：{record.transferToUserName}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {records.length === 0 && (
              <p className="text-gray-400 text-center py-4">暂无审批记录</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmployeeApplicationDetail
