import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, MessageSquare, Save, Send, Bell, AlertTriangle, Clock, X, RotateCcw, FileText, AlertCircle, Upload } from 'lucide-react'
import { applicationAPI } from '@/services/api'
import type { Application, ApprovalRecord, UrgeRecord, SupplementRecord } from '@/types'
import { cn } from '@/lib/utils'

const EmployeeApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [application, setApplication] = useState<Application | null>(null)
  const [records, setRecords] = useState<ApprovalRecord[]>([])
  const [urgeRecords, setUrgeRecords] = useState<UrgeRecord[]>([])
  const [supplementRecords, setSupplementRecords] = useState<SupplementRecord[]>([])
  const [content, setContent] = useState('')
  const [attachmentsText, setAttachmentsText] = useState('')
  const [supplementContent, setSupplementContent] = useState('')
  const [supplementAttachmentsText, setSupplementAttachmentsText] = useState('')
  const [saving, setSaving] = useState(false)
  const [submittingSupplement, setSubmittingSupplement] = useState(false)
  const [urging, setUrging] = useState(false)
  const [urgeMessage, setUrgeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [, setTick] = useState(0)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawReason, setWithdrawReason] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [resubmitting, setResubmitting] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(timer)
  }, [])

  const MIN_URGE_WAIT_HOURS = 2

  const getUrgeWaitInfo = () => {
    if (!application?.currentNodeEnteredAt) return { canUrge: false, waitText: '', hoursLeft: 0 }
    const enteredAt = new Date(application.currentNodeEnteredAt).getTime()
    const now = Date.now()
    const hoursPassed = (now - enteredAt) / (1000 * 60 * 60)
    const hoursLeft = MIN_URGE_WAIT_HOURS - hoursPassed
    
    if (hoursPassed >= MIN_URGE_WAIT_HOURS) {
      return { canUrge: true, waitText: '', hoursLeft: 0 }
    }
    
    const minutesLeft = Math.ceil(hoursLeft * 60)
    if (minutesLeft < 60) {
      return { canUrge: false, waitText: `${minutesLeft}分钟后可催办`, hoursLeft }
    }
    return { canUrge: false, waitText: `${Math.ceil(hoursLeft)}小时后可催办`, hoursLeft }
  }

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      try {
        const [app, recs, urgeRecs, suppRecs] = await Promise.all([
          applicationAPI.getApplication(parseInt(id)),
          applicationAPI.getApprovalRecords(parseInt(id)),
          applicationAPI.getUrgeRecords(parseInt(id)),
          applicationAPI.getSupplementRecords(parseInt(id)),
        ])
        setApplication(app)
        setContent(app.content || '')
        setAttachmentsText((app.attachments || []).join('\n'))
        setRecords(recs)
        setUrgeRecords(urgeRecs)
        setSupplementRecords(suppRecs)
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

  const handleWithdraw = async () => {
    if (!id || !withdrawReason.trim()) return
    setWithdrawing(true)
    setActionMessage(null)
    try {
      const app = await applicationAPI.withdrawApplication(parseInt(id), withdrawReason.trim())
      setApplication(app)
      setShowWithdrawModal(false)
      setWithdrawReason('')
      setActionMessage({ type: 'success', text: '申请已成功撤回' })
      const recs = await applicationAPI.getApprovalRecords(parseInt(id))
      setRecords(recs)
    } catch (err: any) {
      setActionMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || '撤回失败，请稍后重试' 
      })
    } finally {
      setWithdrawing(false)
    }
  }

  const handleResubmit = async () => {
    if (!id) return
    setResubmitting(true)
    setActionMessage(null)
    try {
      const newApp = await applicationAPI.resubmitApplication(parseInt(id))
      setActionMessage({ type: 'success', text: '已基于原申请内容创建新申请，正在跳转...' })
      setTimeout(() => {
        navigate(`/employee/applications/${newApp.id}`)
      }, 1500)
    } catch (err: any) {
      setActionMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || '再次发起失败，请稍后重试' 
      })
    } finally {
      setResubmitting(false)
    }
  }

  const handleSubmitSupplement = async () => {
    if (!id) return
    setSubmittingSupplement(true)
    setActionMessage(null)
    try {
      const app = await applicationAPI.submitSupplement(parseInt(id), {
        content: supplementContent.trim() || undefined,
        attachments: supplementAttachmentsText
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      })
      setApplication(app)
      setSupplementContent('')
      setSupplementAttachmentsText('')
      setActionMessage({ type: 'success', text: '补充材料已提交，正在等待审批人处理' })
      const [recs, suppRecs] = await Promise.all([
        applicationAPI.getApprovalRecords(parseInt(id)),
        applicationAPI.getSupplementRecords(parseInt(id)),
      ])
      setRecords(recs)
      setSupplementRecords(suppRecs)
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.detail || '提交补充材料失败，请稍后重试',
      })
    } finally {
      setSubmittingSupplement(false)
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
    withdrawn: 'bg-purple-100 text-purple-700',
  }

  const statusLabels: Record<string, string> = {
    draft: '草稿',
    pending: '审批中',
    completed: '已完成',
    rejected: '已退回',
    withdrawn: '已撤回',
  }

  const canSupplement = application.status === 'draft' || application.status === 'rejected'
  const needsSupplement = application.supplementStatus === 'requested'
  const canWithdraw = application.status === 'pending'
  const canResubmit = ['withdrawn', 'rejected', 'completed'].includes(application.status)

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
            <div className="flex flex-col items-end gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  statusColors[application.status] || 'bg-gray-100 text-gray-700'
                }`}
              >
                {statusLabels[application.status] || application.status}
              </span>
              {needsSupplement && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  待补充材料
                </span>
              )}
            </div>
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

          {application.originalApplicationId && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                基于原申请发起：
                <span className="text-primary-600 font-medium">
                  {application.originalApplicationTitle || `申请 #${application.originalApplicationId}`}
                </span>
              </p>
            </div>
          )}
        </div>

        {actionMessage && (
          <div className={cn(
            "mb-6 p-4 rounded-xl text-sm",
            actionMessage.type === 'success' 
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          )}>
            {actionMessage.text}
          </div>
        )}

        {needsSupplement && (
          <div className="bg-orange-50 rounded-xl p-6 shadow-sm border border-orange-200 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              待补充材料
            </h2>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 w-24">发起补件人：</span>
                <span className="text-sm font-medium text-gray-900">{application.supplementRequestedByName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 w-24">发起时间：</span>
                <span className="text-sm text-gray-900">
                  {application.supplementRequestedAt ? new Date(application.supplementRequestedAt).toLocaleString() : '-'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm text-gray-500 w-24 flex-shrink-0">补件要求：</span>
                <p className="text-sm text-gray-900 whitespace-pre-wrap bg-white p-3 rounded-lg border border-orange-200 flex-1">
                  {application.supplementRequestNote}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  补充说明
                </label>
                <textarea
                  value={supplementContent}
                  onChange={(e) => setSupplementContent(e.target.value)}
                  placeholder="请输入补充说明内容..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  补充附件/材料链接
                </label>
                <textarea
                  value={supplementAttachmentsText}
                  onChange={(e) => setSupplementAttachmentsText(e.target.value)}
                  placeholder="每行填写一个材料链接或文件说明"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none bg-white"
                />
              </div>
              <button
                onClick={handleSubmitSupplement}
                disabled={submittingSupplement}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
              >
                <Upload className="w-5 h-5" />
                {submittingSupplement ? '提交中...' : '提交补充材料'}
              </button>
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
                            于 {record.submittedAt ? new Date(record.submittedAt).toLocaleString() : '-'} 提交补充
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
                        待提交补充材料
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
              <X className="w-5 h-5 text-purple-600" />
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

        {canWithdraw && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <X className="w-5 h-5 text-red-500" />
                  撤回申请
                </h2>
                <p className="text-sm text-gray-500 mt-1">在审批人处理前可主动撤回申请</p>
              </div>
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              >
                <X className="w-4 h-4" />
                撤回申请
              </button>
            </div>
          </div>
        )}

        {canResubmit && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-blue-500" />
                  再次发起
                </h2>
                <p className="text-sm text-gray-500 mt-1">基于原申请内容快速创建新申请</p>
              </div>
              <button
                onClick={handleResubmit}
                disabled={resubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {resubmitting ? '处理中...' : '再次发起'}
              </button>
            </div>
          </div>
        )}

        {application.status === 'pending' && (() => {
          const urgeWait = getUrgeWaitInfo()
          return (
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

              {!urgeWait.canUrge && urgeWait.waitText && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      进入节点未满{MIN_URGE_WAIT_HOURS}小时，{urgeWait.waitText}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    为避免频繁打扰审批人，请耐心等待一段时间后再催办
                  </p>
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
                  disabled={urging || !urgeWait.canUrge}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                    urgeWait.canUrge
                      ? "bg-amber-500 text-white hover:bg-amber-600"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed",
                    "disabled:opacity-50"
                  )}
                >
                  <Bell className="w-4 h-4" />
                  {urging ? '催办中...' : urgeWait.canUrge ? '发起催办' : urgeWait.waitText}
                </button>
              </div>
            </div>
          )
        })()}

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
      </div>

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <X className="w-5 h-5 text-red-500" />
              撤回申请
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              撤回后申请将从审批人待办中移除，请填写撤回原因：
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                撤回原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder="请输入撤回原因..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWithdrawModal(false)
                  setWithdrawReason('')
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing || !withdrawReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {withdrawing ? '撤回中...' : '确认撤回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmployeeApplicationDetail
