import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User as UserIcon, MessageSquare, Check, X, Forward, XCircle, FileText, AlertCircle } from 'lucide-react'
import { applicationAPI, approvalAPI } from '@/services/api'
import type { Application, ApprovalRecord, User, SupplementRecord } from '@/types'

const SupervisorApprovalDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [application, setApplication] = useState<Application | null>(null)
  const [records, setRecords] = useState<ApprovalRecord[]>([])
  const [supplementRecords, setSupplementRecords] = useState<SupplementRecord[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [comment, setComment] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [showTransfer, setShowTransfer] = useState(false)
  const [showSupplementModal, setShowSupplementModal] = useState(false)
  const [supplementNote, setSupplementNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      try {
        const [app, recs, usrs, suppRecs] = await Promise.all([
          applicationAPI.getApplication(parseInt(id)),
          applicationAPI.getApprovalRecords(parseInt(id)),
          approvalAPI.getTransferUsers(),
          applicationAPI.getSupplementRecords(parseInt(id)),
        ])
        setApplication(app)
        setRecords(recs)
        setUsers(usrs.filter((u) => u.role === 'supervisor' || u.role === 'admin'))
        setSupplementRecords(suppRecs)
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

  const handleRequestSupplement = async () => {
    if (!id || !supplementNote.trim()) return
    setLoading(true)
    try {
      await approvalAPI.requestSupplement(parseInt(id), supplementNote.trim())
      const [app, recs, suppRecs] = await Promise.all([
        applicationAPI.getApplication(parseInt(id)),
        applicationAPI.getApprovalRecords(parseInt(id)),
        applicationAPI.getSupplementRecords(parseInt(id)),
      ])
      setApplication(app)
      setRecords(recs)
      setSupplementRecords(suppRecs)
      setShowSupplementModal(false)
      setSupplementNote('')
    } catch (err) {
      console.error('Failed to request supplement', err)
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
            {application.status === 'withdrawn' ? (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                已撤回
              </span>
            ) : application.currentNodeName ? (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
                {application.currentNodeName}
              </span>
            ) : null}
          </div>
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{application.content}</p>
          </div>
          {application.supplementCount > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                补件次数：<span className="font-medium text-orange-600">{application.supplementCount}</span> 次
              </p>
            </div>
          )}
        </div>

        {application.supplementStatus === 'requested' && (
          <div className="bg-orange-50 rounded-xl p-6 shadow-sm border border-orange-200 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-orange-500" />
              <div>
                <h3 className="font-semibold text-orange-900">等待员工补充材料</h3>
                <p className="text-sm text-orange-700 mt-1">
                  已要求员工于 {application.supplementRequestedAt ? new Date(application.supplementRequestedAt).toLocaleString() : '-'} 补充材料
                </p>
                {application.supplementRequestNote && (
                  <p className="text-sm text-orange-800 mt-2 bg-orange-100 p-3 rounded-lg">
                    补件要求：{application.supplementRequestNote}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {supplementRecords.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" />
              补件记录
            </h2>
            <div className="space-y-4">
              {supplementRecords.map((record, idx) => (
                <div key={record.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-orange-600" />
                    </div>
                    {idx < supplementRecords.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {record.requestedByName}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                        要求补件
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(record.requestedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">补件要求：{record.requestNote}</p>
                    {record.status === 'submitted' && (
                      <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-cyan-700">
                            员工于 {record.submittedAt ? new Date(record.submittedAt).toLocaleString() : '-'} 提交补充
                          </span>
                        </div>
                        {record.submittedContent && (
                          <p className="text-sm text-gray-600">补充说明：{record.submittedContent}</p>
                        )}
                        {record.submittedAttachments.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">补充附件：</p>
                            {record.submittedAttachments.map((att, i) => (
                              <p key={i} className="text-sm text-primary-600 break-all">
                                {att}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {record.status === 'pending' && (
                      <p className="text-xs text-orange-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        等待员工提交补充材料
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {application.status === 'withdrawn' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-purple-600" />
              撤回信息
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 w-20">撤回人：</span>
                <span className="text-sm font-medium text-gray-900">{application.withdrawnByName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 w-20">撤回时间：</span>
                <span className="text-sm text-gray-900">
                  {application.withdrawnAt ? new Date(application.withdrawnAt).toLocaleString() : '-'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm text-gray-500 w-20 flex-shrink-0">撤回原因：</span>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{application.withdrawReason}</p>
              </div>
            </div>
          </div>
        )}

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
                          : record.action === 'withdraw'
                          ? 'bg-purple-100 text-purple-700'
                          : record.action === 'supplement'
                          ? 'bg-orange-100 text-orange-700'
                          : record.action === 'supplement_submit'
                          ? 'bg-cyan-100 text-cyan-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {record.action === 'approve'
                        ? '通过'
                        : record.action === 'reject'
                        ? '退回'
                        : record.action === 'withdraw'
                        ? '撤回'
                        : record.action === 'supplement'
                        ? '要求补充材料'
                        : record.action === 'supplement_submit'
                        ? '提交补充材料'
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

        {application.status !== 'withdrawn' && (
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
              disabled={loading || application.supplementStatus === 'requested'}
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
              disabled={loading || application.supplementStatus === 'requested'}
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
              disabled={loading || application.supplementStatus === 'requested'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              <Forward className="w-5 h-5" />
              转交
            </button>
            <button
              onClick={() => {
                setShowTransfer(false)
                setShowSupplementModal(true)
              }}
              disabled={loading || application.supplementStatus === 'requested'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
            >
              <FileText className="w-5 h-5" />
              补充材料
            </button>
          </div>
        </div>
        )}

        {application.status === 'withdrawn' && (
          <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-purple-500" />
              <div>
                <h3 className="font-semibold text-purple-900">此申请已被撤回</h3>
                <p className="text-sm text-purple-700 mt-1">申请人已主动撤回该申请，无需继续处理</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SupervisorApprovalDetail
