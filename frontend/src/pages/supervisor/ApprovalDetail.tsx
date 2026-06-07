import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User as UserIcon, MessageSquare, Check, X, Forward } from 'lucide-react'
import { applicationAPI, approvalAPI } from '@/services/api'
import type { Application, ApprovalRecord, User } from '@/types'

const SupervisorApprovalDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [application, setApplication] = useState<Application | null>(null)
  const [records, setRecords] = useState<ApprovalRecord[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [comment, setComment] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [showTransfer, setShowTransfer] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      try {
        const [app, recs, usrs] = await Promise.all([
          applicationAPI.getApplication(parseInt(id)),
          applicationAPI.getApprovalRecords(parseInt(id)),
          approvalAPI.getTransferUsers(),
        ])
        setApplication(app)
        setRecords(recs)
        setUsers(usrs.filter((u) => u.role === 'supervisor' || u.role === 'admin'))
      } catch (err) {
        console.error('Failed to fetch data', err)
      }
    }
    fetchData()
  }, [id])

  const handleApprove = async () => {
    if (!id) return
    setLoading(true)
    try {
      await approvalAPI.approve(parseInt(id), comment)
      navigate('/supervisor/pending')
    } catch (err) {
      console.error('Failed to approve', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!id) return
    setLoading(true)
    try {
      await approvalAPI.reject(parseInt(id), comment)
      navigate('/supervisor/pending')
    } catch (err) {
      console.error('Failed to reject', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = async () => {
    if (!id || !transferTo) return
    setLoading(true)
    try {
      await approvalAPI.transfer(parseInt(id), parseInt(transferTo), comment)
      navigate('/supervisor/pending')
    } catch (err) {
      console.error('Failed to transfer', err)
    } finally {
      setLoading(false)
    }
  }

  if (!application) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/supervisor/pending')}
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
                申请人：{application.applicantName} · {application.workflowName} ·{' '}
                {new Date(application.createdAt).toLocaleString()}
              </p>
            </div>
            {application.currentNodeName && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
                {application.currentNodeName}
              </span>
            )}
          </div>
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{application.content}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            审批记录
          </h2>
          <div className="space-y-4">
            {records.map((record, idx) => (
              <div key={record.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-primary-600" />
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

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">处理申请</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              处理意见
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="请输入审批意见..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
            />
          </div>

          {showTransfer && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                转交给
              </label>
              <select
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">请选择转交人</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.role === 'admin' ? '管理员' : '主管'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowTransfer(false)
                handleApprove()
              }}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
            >
              <Check className="w-5 h-5" />
              通过
            </button>
            <button
              onClick={() => {
                setShowTransfer(false)
                handleReject()
              }}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
            >
              <X className="w-5 h-5" />
              退回
            </button>
            <button
              onClick={() => {
                if (!showTransfer) {
                  setShowTransfer(true)
                  return
                }
                handleTransfer()
              }}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              <Forward className="w-5 h-5" />
              转交
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupervisorApprovalDetail
