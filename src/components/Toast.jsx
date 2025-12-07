import { useState, useEffect, useCallback, createContext, useContext } from 'react'

// Toast context for global access
const ToastContext = createContext(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Toast item component
function ToastItem({ id, message, type, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id)
    }, 5000)
    return () => clearTimeout(timer)
  }, [id, onDismiss])

  return (
    <div 
      className={`toast-item toast-${type}`}
      onClick={() => onDismiss(id)}
    >
      <span className="toast-icon">
        {type === 'error' ? '⚠' : type === 'success' ? '✓' : 'ℹ'}
      </span>
      <span className="toast-message">{message}</span>
    </div>
  )
}

// Toast container component
function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          {...toast}
          onDismiss={removeToast}
        />
      ))}
    </div>
  )
}

// Toast provider
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showError = useCallback((message) => addToast(message, 'error'), [addToast])
  const showSuccess = useCallback((message) => addToast(message, 'success'), [addToast])
  const showInfo = useCallback((message) => addToast(message, 'info'), [addToast])

  return (
    <ToastContext.Provider value={{ showError, showSuccess, showInfo, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export default ToastProvider

