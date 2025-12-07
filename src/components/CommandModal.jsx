import { useState, useEffect, useRef, useCallback } from 'react'

function CommandModal({ patterns, onPatternUpdate, onHush, isInitialized }) {
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [size, setSize] = useState({ width: 350, height: 120 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragOver, setIsDragOver] = useState(false)
  const [zIndex, setZIndex] = useState(100)
  const [error, setError] = useState(null)
  
  const inputRef = useRef(null)
  const modalRef = useRef(null)
  const errorTimeoutRef = useRef(null)

  // Min/max size constraints
  const minWidth = 200
  const minHeight = 100
  const maxWidth = typeof window !== 'undefined' ? window.innerWidth / 2 : 600
  const maxHeight = typeof window !== 'undefined' ? window.innerHeight : 800

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.classList.contains('drag-handle') || e.target.closest('.drag-handle')) {
      setIsDragging(true)
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    }
  }, [position])

  const handleResizeMouseDown = useCallback((e) => {
    e.stopPropagation()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragOffset.x))
        const newY = Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragOffset.y))
        setPosition({ x: newX, y: newY })
      }
      if (isResizing && modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect()
        const newWidth = Math.min(maxWidth, Math.max(minWidth, e.clientX - rect.left))
        const newHeight = Math.min(maxHeight, Math.max(minHeight, e.clientY - rect.top))
        setSize({ width: newWidth, height: newHeight })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, dragOffset, size, maxWidth, maxHeight])

  const handleKeyDown = async (e) => {
    // Use the DOM value directly since React state may not have updated yet
    const currentValue = e.target.value
    // Shift+Enter = new line
    // Enter alone = submit
    if (e.key === 'Enter' && !e.shiftKey && currentValue.trim() && !isProcessing) {
      e.preventDefault()
      // Set input from DOM value before submitting
      setInput(currentValue)
      await handleSubmitWithCode(currentValue.trim())
    }
    if (e.key === 'Escape') {
      setInput('')
    }
  }

  const bringToFront = useCallback(() => {
    setZIndex(Date.now() % 10000 + 100)
  }, [])

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const sample = e.dataTransfer.getData('application/x-sample') || e.dataTransfer.getData('text/plain')
    if (sample) {
      const cursorPos = inputRef.current?.selectionStart ?? input.length
      const before = input.slice(0, cursorPos)
      const after = input.slice(cursorPos)
      setInput(`${before}${sample}${after}`)
      inputRef.current?.focus()
    }
  }

  // Clear error after timeout
  const showError = useCallback((message) => {
    setError(message)
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current)
    }
    errorTimeoutRef.current = setTimeout(() => {
      setError(null)
    }, 5000)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }
    }
  }, [])

  const handleSubmitWithCode = async (code) => {
    if (!code || isProcessing || !isInitialized) return

    setIsProcessing(true)
    setError(null)

    try {
      // Check for hush command
      if (code === 'hush' || code === 'hush()') {
        onHush()
        setInput('')
      } else {
        // Parse slot from code if it follows d1-d16 pattern
        const slotMatch = code.match(/^(d\d+)\s*=/)
        
        // Evaluate and play the pattern using global eval
        // The strudel functions are on window after initStrudel()
        const playCode = `(${code}).play()`
        eval(playCode)
        
        // Success - clear input and update slot
        setInput('')
        
        // If we detected a slot assignment, update that slot
        if (slotMatch) {
          const slot = slotMatch[1]
          const patternCode = code.replace(/^d\d+\s*=\s*/, '')
          onPatternUpdate(slot, patternCode)
        } else {
          // Default to d1 if no slot specified
          onPatternUpdate('d1', code)
        }
      }
    } catch (err) {
      console.error('Strudel error:', err)
      // Keep input for editing and show error
      setInput(code)
      const errorMessage = err.message || 'Error processing pattern'
      showError(errorMessage)
    } finally {
      setIsProcessing(false)
      inputRef.current?.focus()
    }
  }

  const stopPropagation = useCallback((e) => {
    e.stopPropagation()
  }, [])

  return (
    <div
      ref={modalRef}
      className="command-modal"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex,
      }}
      onMouseDown={(e) => {
        bringToFront()
        handleMouseDown(e)
      }}
      onWheel={stopPropagation}
      onScroll={stopPropagation}
      onPointerDown={stopPropagation}
    >
      <div className="drag-handle">
        <span className="modal-title">Strudel Input</span>
        <div className="modal-header-actions">
          <span className={`status-indicator ${isInitialized ? 'ready' : 'loading'}`}>
            {isInitialized ? '● Ready' : '○ Loading...'}
          </span>
        </div>
      </div>
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        placeholder='note("<c3 e3 g3>").s("piano")'
        className={`command-input ${isDragOver ? 'drag-over' : ''} ${error ? 'has-error' : ''}`}
        disabled={isProcessing || !isInitialized}
        autoFocus
      />
      {error ? (
        <div className="error-toast" onClick={() => setError(null)}>
          <span className="error-icon">⚠</span>
          <span className="error-message">{error}</span>
        </div>
      ) : null}
      <div className="resize-handle" onMouseDown={handleResizeMouseDown} />
    </div>
  )
}

export default CommandModal

