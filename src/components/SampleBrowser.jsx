import { useState, useEffect, useRef, useCallback } from 'react'

// Common Strudel samples (since we can't scan filesystem in web)
export const DEFAULT_SAMPLES = [
  'bd', 'sd', 'hh', 'oh', 'cp', 'cb', 'cr', 'rs',
  'bass', 'bass3', 'casio', 'piano', 'superpiano',
  'sawtooth', 'square', 'triangle', 'sine',
  'arpy', 'pluck', 'gm_acoustic_bass', 'gm_electric_piano_1',
  'metal', 'industrial', 'jazz', 'east', 'world',
  'tabla', 'tabla2', 'hand', 'drum',
  'pad', 'strings', 'brass', 'wind',
  'birds', 'nature', 'breaks', 'house'
]

function SampleBrowser({ isOpen, onClose }) {
  const [samples] = useState(DEFAULT_SAMPLES)
  const [filter, setFilter] = useState('')
  const [position, setPosition] = useState({ x: 20, y: 80 }) // Will be adjusted on mount
  const [size, setSize] = useState({ width: 240, height: 350 })
  const [hasInitialized, setHasInitialized] = useState(false)
  
  // Initialize position within event-stream bounds on mount
  useEffect(() => {
    if (hasInitialized) return
    const eventStream = document.querySelector('.event-stream')
    if (eventStream) {
      const bounds = eventStream.getBoundingClientRect()
      setPosition({
        x: bounds.right - 260,
        y: bounds.top + 10
      })
      setHasInitialized(true)
    }
  }, [hasInitialized])
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 })
  const [zIndex, setZIndex] = useState(100)
  
  const modalRef = useRef(null)
  const filterRef = useRef(null)

  // Min/max size constraints
  const minWidth = 180
  const minHeight = 150
  const maxWidth = typeof window !== 'undefined' ? window.innerWidth / 2 : 400
  const maxHeight = typeof window !== 'undefined' ? window.innerHeight : 600

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true)
      setDragStartPos({ x: e.clientX, y: e.clientY })
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    }
  }, [position])

  const handleResizeMouseDown = useCallback((e) => {
    if (isCollapsed) return
    e.stopPropagation()
    setIsResizing(true)
  }, [isCollapsed])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && modalRef.current) {
        const modalRect = modalRef.current.getBoundingClientRect()
        const currentHeight = isCollapsed ? modalRect.height : size.height
        
        // Get the event-stream bounds (track list view)
        const eventStream = document.querySelector('.event-stream')
        const bounds = eventStream?.getBoundingClientRect() || { 
          left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight 
        }
        
        // Constrain to event-stream bounds
        const minX = bounds.left
        const maxX = bounds.right - size.width
        const minY = bounds.top
        const maxY = bounds.bottom - currentHeight
        
        const newX = Math.max(minX, Math.min(maxX, e.clientX - dragOffset.x))
        const newY = Math.max(minY, Math.min(maxY, e.clientY - dragOffset.y))
        setPosition({ x: newX, y: newY })
      }
      if (isResizing && modalRef.current && !isCollapsed) {
        const rect = modalRef.current.getBoundingClientRect()
        const newWidth = Math.min(maxWidth, Math.max(minWidth, e.clientX - rect.left))
        const newHeight = Math.min(maxHeight, Math.max(minHeight, e.clientY - rect.top))
        setSize({ width: newWidth, height: newHeight })
      }
    }

    const handleMouseUp = (e) => {
      if (isDragging) {
        const dx = Math.abs(e.clientX - dragStartPos.x)
        const dy = Math.abs(e.clientY - dragStartPos.y)
        if (dx < 5 && dy < 5) {
          // Click without drag = toggle collapse
          setIsCollapsed(prev => !prev)
        }
      }
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
  }, [isDragging, isResizing, isCollapsed, dragOffset, dragStartPos, size, maxWidth, maxHeight])

  const filteredSamples = samples.filter(s => 
    s.toLowerCase().includes(filter.toLowerCase())
  )

  const stopPropagation = useCallback((e) => {
    e.stopPropagation()
  }, [])

  const bringToFront = useCallback(() => {
    setZIndex(Date.now() % 10000 + 100)
  }, [])

  // Don't render if not open
  if (!isOpen) return null

  return (
    <div
      ref={modalRef}
      className={`sample-browser ${isCollapsed ? 'collapsed' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: isCollapsed ? 'auto' : size.height,
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
        <span className="modal-title">Samples</span>
        <div className="modal-header-actions">
          <span className="sample-count">{samples.length}</span>
          <span className="collapse-indicator">{isCollapsed ? '▼' : '▲'}</span>
          <button 
            className="sample-browser-close" 
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            aria-label="Close sample browser"
          >
            ×
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <>
          <input
            ref={filterRef}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter..."
            className="sample-filter"
          />
          <div className="sample-list">
            {filteredSamples.map(sample => (
              <div
                key={sample}
                className="sample-item"
              >
                {sample}
              </div>
            ))}
            {filteredSamples.length === 0 && (
              <div className="sample-empty">No samples found</div>
            )}
          </div>
          <div className="resize-handle" onMouseDown={handleResizeMouseDown} />
        </>
      )}
    </div>
  )
}

export default SampleBrowser

