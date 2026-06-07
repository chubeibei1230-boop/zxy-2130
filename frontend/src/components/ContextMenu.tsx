import React, { useEffect, useRef } from 'react'
import { Copy, Asterisk, Pause, History } from 'lucide-react'

interface ContextMenuProps {
  x: number
  y: number
  onCopy: () => void
  onSetRequired: () => void
  onPause: () => void
  onViewHistory: () => void
  onClose: () => void
  isRequired?: boolean
  isPaused?: boolean
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onCopy,
  onSetRequired,
  onPause,
  onViewHistory,
  onClose,
  isRequired = true,
  isPaused = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  const adjustedX = Math.min(x, window.innerWidth - 200)
  const adjustedY = Math.min(y, window.innerHeight - 200)

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="context-menu-item" onClick={onCopy}>
        <Copy size={16} />
        <span>复制节点</span>
      </div>
      <div className="context-menu-item" onClick={onSetRequired}>
        <Asterisk size={16} />
        <span>{isRequired ? '取消必填' : '设为必填'}</span>
      </div>
      <div className="context-menu-item" onClick={onPause}>
        <Pause size={16} />
        <span>{isPaused ? '恢复节点' : '暂停节点'}</span>
      </div>
      <div className="context-menu-item" onClick={onViewHistory}>
        <History size={16} />
        <span>查看历史</span>
      </div>
    </div>
  )
}

export default ContextMenu
