import { useState, useRef, useEffect, useCallback } from 'react'
import EffectControl from './EffectControl'

// Effect configurations
const EFFECT_CONFIGS = {
  gain: { min: 0, max: 2, default: 1 },
  lpf: { min: 20, max: 20000, default: 20000, logarithmic: true },
  room: { min: 0, max: 1, default: 0 },
  delay: { min: 0, max: 1, default: 0 },
  pan: { min: 0, max: 1, default: 0.5 },
  distort: { min: 0, max: 10, default: 0 },
}

// Fixed effect order
const EFFECT_ORDER = ['gain', 'lpf', 'room', 'delay', 'pan', 'distort']

// Default FX state for reuse
export const DEFAULT_FX_STATE = {
  gain: 1,
  lpf: 20000,
  room: 0,
  delay: 0,
  pan: 0.5,
  distort: 0,
  signals: {}
}

function TrackEffects({ 
  trackNumber,
  trackName,
  color, 
  position, 
  fxState = DEFAULT_FX_STATE,
  onClose, 
  onFxChange 
}) {
  const displayName = trackName || `Track ${trackNumber}`
  const panelRef = useRef(null)
  const headerRef = useRef(null)
  const isDragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  
  const [panelPosition, setPanelPosition] = useState(position)

  // Get effect value from state (with fallback to default)
  const getEffectValue = (effect) => {
    return fxState[effect] !== undefined ? fxState[effect] : EFFECT_CONFIGS[effect].default
  }

  // Get signal value from state
  const getSignalValue = (effect) => {
    return fxState.signals?.[effect] || null
  }

  // Handle static effect change
  const handleEffectChange = useCallback((effect, value) => {
    onFxChange({
      ...fxState,
      [effect]: value
    })
  }, [fxState, onFxChange])

  // Handle signal effect change
  const handleSignalChange = useCallback((effect, signalValue) => {
    const newSignals = { ...(fxState.signals || {}) }
    if (signalValue === null) {
      delete newSignals[effect]
    } else {
      newSignals[effect] = signalValue
    }
    onFxChange({
      ...fxState,
      signals: newSignals
    })
  }, [fxState, onFxChange])

  // Reset all effects to defaults
  const handleResetAll = useCallback(() => {
    onFxChange({ ...DEFAULT_FX_STATE })
  }, [onFxChange])

  // Dragging handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('button')) return
    isDragging.current = true
    const rect = panelRef.current.getBoundingClientRect()
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current || !panelRef.current) return
    
    const panelRect = panelRef.current.getBoundingClientRect()
    
    // Get the event-stream bounds (track list view)
    const eventStream = document.querySelector('.event-stream')
    const bounds = eventStream?.getBoundingClientRect() || { 
      left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight 
    }
    
    // Constrain to event-stream bounds
    const minX = bounds.left
    const maxX = bounds.right - panelRect.width
    const minY = bounds.top
    const maxY = bounds.bottom - panelRect.height
    
    const newX = Math.max(minX, Math.min(maxX, e.clientX - dragOffset.current.x))
    const newY = Math.max(minY, Math.min(maxY, e.clientY - dragOffset.current.y))
    
    setPanelPosition({ x: newX, y: newY })
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  // Escape key to close - only if this panel has focus/was last interacted with
  const [hasFocus, setHasFocus] = useState(false)
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only close on Escape if this panel is focused
      if (e.key === 'Escape' && hasFocus) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, hasFocus])

  // Mouse event listeners for dragging
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  // Z-index for stacking
  const [zIndex, setZIndex] = useState(1000)
  
  const bringToFront = useCallback(() => {
    setZIndex(Date.now() % 10000 + 1000)
    setHasFocus(true)
  }, [])

  return (
    <div
      ref={panelRef}
      className="track-effects-panel"
      style={{
        left: panelPosition.x,
        top: panelPosition.y,
        zIndex,
        '--track-color': color
      }}
      onMouseDown={bringToFront}
      onFocus={() => setHasFocus(true)}
      onBlur={() => setHasFocus(false)}
      tabIndex={-1}
    >
      <div 
        ref={headerRef}
        className="track-effects-header"
        onMouseDown={handleMouseDown}
      >
        <span className="track-effects-title">{displayName} Effects</span>
        <div className="track-effects-actions">
          <button 
            className="track-effects-reset" 
            onClick={handleResetAll}
            title="Reset all effects"
          >
            Reset
          </button>
          <button 
            className="track-effects-close" 
            onClick={onClose}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>
      <div className="track-effects-grid">
        {EFFECT_ORDER.map(effect => (
          <EffectControl
            key={effect}
            effect={effect}
            value={getEffectValue(effect)}
            onChange={(val) => handleEffectChange(effect, val)}
            color={color}
            config={EFFECT_CONFIGS[effect]}
            signalValue={getSignalValue(effect)}
            onSignalChange={(sig) => handleSignalChange(effect, sig)}
          />
        ))}
      </div>
    </div>
  )
}

export default TrackEffects
