import { useState, useRef, useEffect, useCallback } from 'react'
import TrackEffects from './TrackEffects'
import { useToast } from './Toast'

// Color palette for different channels (matching desktop app)
const CHANNEL_COLORS = {
  0: '#ff6b35',  // d1 - orange
  1: '#3366ff',  // d2 - blue
  2: '#c4e34c',  // d3 - lime green
  3: '#4400cc',  // d4 - indigo
  4: '#ff4466',  // d5 - coral
  5: '#00ccaa',  // d6 - teal
  6: '#ffcc00',  // d7 - gold
  7: '#ff44aa',  // d8 - pink
  8: '#44ff88',  // d9 - mint
  9: '#aa66ff',  // d10 - violet
  10: '#ff8844', // d11 - tangerine
  11: '#44ccff', // d12 - sky
  12: '#ff5577', // d13 - rose
  13: '#88ff44', // d14 - chartreuse
  14: '#cc44ff', // d15 - magenta
  15: '#44ffcc', // d16 - aqua
}

// Mute icon SVG
const MuteIcon = ({ muted }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {muted ? (
      <>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </>
    ) : (
      <>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </>
    )}
  </svg>
)

// FX/Sliders icon SVG
const FxIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
)

// Play icon SVG
const PlayIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
)

// Stop icon SVG
const StopIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
)

// Track input component with drag/drop support
function TrackInput({ 
  slot, 
  pattern, 
  color, 
  isActive, 
  isMuted,
  isInitialized,
  onSubmit,
  onMute,
  onStop
}) {
  const [inputValue, setInputValue] = useState(pattern || '')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef(null)
  const toast = useToast()

  // Sync input with external pattern changes
  useEffect(() => {
    if (!isFocused) {
      setInputValue(pattern || '')
    }
  }, [pattern, isFocused])

  const handleKeyDown = async (e) => {
    // Shift+Enter = new line (if we switch to textarea)
    // Enter alone = submit
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const code = inputValue.trim()
      
      if (!code) return
      if (!isInitialized) {
        toast.showError('Strudel is still loading...')
        return
      }

      // Check for hush command
      if (code === 'hush' || code === 'hush()') {
        if (window.hush) {
          window.hush()
        }
        setInputValue('')
        return
      }

      try {
        // Validate the pattern syntax by trying to parse it
        // (but don't play - App.jsx will handle playing all patterns)
        eval(`(${code})`) // Just validate syntax
        
        // Update pattern - App.jsx will replay all patterns
        onSubmit(slot, code)
        toast.showSuccess(`Track ${slot.replace('d', '')} updated`)
      } catch (err) {
        console.error('Strudel error:', err)
        toast.showError(err.message || 'Error processing pattern')
      }
    }
    
    if (e.key === 'Escape') {
      setInputValue(pattern || '')
      inputRef.current?.blur()
    }
  }

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
      const cursorPos = inputRef.current?.selectionStart ?? inputValue.length
      const before = inputValue.slice(0, cursorPos)
      const after = inputValue.slice(cursorPos)
      setInputValue(`${before}${sample}${after}`)
      inputRef.current?.focus()
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  const handleStop = (e) => {
    e.stopPropagation()
    onStop(slot)
    setInputValue('')
  }

  return (
    <div className={`track-input-wrapper ${isDragOver ? 'drag-over' : ''}`}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={`s("bd sn") or note("c3 e3 g3").s("piano")`}
        className={`track-input ${isActive ? 'active' : ''} ${isMuted ? 'muted' : ''}`}
        style={{ '--track-color': color }}
        disabled={!isInitialized}
      />
      {isActive && (
        <button
          className="track-stop-btn"
          onClick={handleStop}
          title="Stop pattern"
          aria-label="Stop pattern"
        >
          <StopIcon />
        </button>
      )}
    </div>
  )
}

// Editable track label component
function TrackLabel({ slot, channelNum, customName, onNameChange, color }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)

  const displayName = customName || `Track ${channelNum}`

  const handleDoubleClick = () => {
    setEditValue(customName || '')
    setIsEditing(true)
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onNameChange(slot, editValue)
      setIsEditing(false)
    }
    if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  const handleBlur = () => {
    onNameChange(slot, editValue)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="channel-label-input"
        style={{ '--channel-color': color }}
        placeholder={`Track ${channelNum}`}
      />
    )
  }

  return (
    <span 
      className="channel-label" 
      style={{ '--channel-color': color }}
      onDoubleClick={handleDoubleClick}
      title="Double-click to rename"
    >
      {displayName}
    </span>
  )
}

function EventStream({ patterns, onPatternUpdate, mutedChannels, onToggleMute, trackNames, onTrackNameUpdate, isInitialized }) {
  const containerRef = useRef(null)
  // Track multiple open FX panels: { "d1": { x, y }, "d3": { x, y }, ... }
  const [openFxPanels, setOpenFxPanels] = useState({})

  // Handle pattern submission from track input
  const handlePatternSubmit = useCallback((slot, code) => {
    onPatternUpdate(slot, code)
  }, [onPatternUpdate])

  // Handle stopping a pattern
  const handleStopPattern = useCallback((slot) => {
    // Update pattern to null - App.jsx will replay all remaining patterns
    onPatternUpdate(slot, null)
    // Close FX panel if it was open for this track
    setOpenFxPanels(prev => {
      const next = { ...prev }
      delete next[slot]
      return next
    })
  }, [onPatternUpdate])

  // Handle FX button click - toggle panel for this track
  const handleFxClick = useCallback((e, slot) => {
    e.stopPropagation()
    
    // Capture rect BEFORE setState (event gets recycled)
    const buttonRect = e.currentTarget?.getBoundingClientRect()
    
    // Get viewport/container bounds
    const eventStream = containerRef.current
    const containerRect = eventStream?.getBoundingClientRect()
    
    setOpenFxPanels(prev => {
      const next = { ...prev }
      if (next[slot]) {
        // Close if already open
        delete next[slot]
      } else if (buttonRect && containerRect) {
        // Open panel for this track
        // Offset each new panel slightly to prevent overlap
        const offset = Object.keys(next).length * 30
        
        // Estimate panel size (width ~300, height ~350)
        const panelWidth = 300
        const panelHeight = 350
        
        // Calculate position, ensuring it stays within viewport
        let x = buttonRect.right + 8 + offset
        let y = buttonRect.top + offset
        
        // Clamp to stay within container bounds
        const maxX = containerRect.right - panelWidth - 10
        const maxY = containerRect.bottom - panelHeight - 10
        const minX = containerRect.left + 10
        const minY = containerRect.top + 10
        
        x = Math.max(minX, Math.min(maxX, x))
        y = Math.max(minY, Math.min(maxY, y))
        
        next[slot] = { x, y }
      }
      return next
    })
  }, [])

  // Handle effect change from panel
  const handleEffectChange = useCallback((slot, newPattern) => {
    onPatternUpdate(slot, newPattern)
  }, [onPatternUpdate])

  // Close specific FX panel
  const handleCloseFxPanel = useCallback((slot) => {
    setOpenFxPanels(prev => {
      const next = { ...prev }
      delete next[slot]
      return next
    })
  }, [])

  // Get track number from slot
  const getTrackNumber = (slot) => parseInt(slot.replace('d', ''), 10)

  return (
    <div ref={containerRef} className="event-stream">
      {Array.from({ length: 16 }, (_, i) => {
        const channelNum = i + 1
        const slot = `d${channelNum}`
        const pattern = patterns[slot]
        const color = CHANNEL_COLORS[i]
        const isActive = !!pattern
        const isMuted = mutedChannels.has(slot)
        const isFxOpen = !!openFxPanels[slot]

        return (
          <div
            key={slot}
            className={`channel-row ${isActive ? 'active' : ''} ${isMuted ? 'muted' : ''}`}
            style={{ '--channel-color': color }}
          >
            <TrackLabel
              slot={slot}
              channelNum={channelNum}
              customName={trackNames?.[slot]}
              onNameChange={onTrackNameUpdate}
              color={color}
            />
            
            <TrackInput
              slot={slot}
              pattern={pattern}
              color={color}
              isActive={isActive}
              isMuted={isMuted}
              isInitialized={isInitialized}
              onSubmit={handlePatternSubmit}
              onMute={() => onToggleMute(slot)}
              onStop={handleStopPattern}
            />

            {isActive && (
              <button
                className={`channel-mute-btn ${isMuted ? 'muted' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleMute(slot)
                }}
                title={isMuted ? 'Unmute channel' : 'Mute channel'}
                aria-label={isMuted ? 'Unmute channel' : 'Mute channel'}
              >
                <MuteIcon muted={isMuted} />
              </button>
            )}
            
            {/* FX Button - always visible, disabled when no pattern */}
            <button
              className={`channel-fx-btn ${isFxOpen ? 'active' : ''} ${!isActive ? 'disabled' : ''}`}
              onClick={(e) => isActive && handleFxClick(e, slot)}
              disabled={!isActive}
              title={isActive ? 'Effects' : 'Add a pattern first'}
              aria-label="Effects"
              style={{ '--btn-color': color }}
            >
              <FxIcon />
            </button>
          </div>
        )
      })}
      
      {/* Effects Panels - multiple can be open */}
      {Object.entries(openFxPanels)
        .filter(([slot]) => patterns[slot]) // Only render if pattern exists
        .map(([slot, position]) => {
          const trackNum = getTrackNumber(slot)
          return (
            <TrackEffects
              key={slot}
              trackNumber={trackNum}
              trackName={trackNames ? trackNames[slot] : undefined}
              color={CHANNEL_COLORS[trackNum - 1] || '#ffffff'}
              position={position}
              pattern={patterns[slot]}
              onClose={() => handleCloseFxPanel(slot)}
              onEffectChange={(newPattern) => handleEffectChange(slot, newPattern)}
            />
          )
        })}
    </div>
  )
}

export default EventStream
