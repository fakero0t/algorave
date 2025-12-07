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

function EventStream({ patterns, onPatternUpdate, onHush, isInitialized }) {
  const containerRef = useRef(null)
  const [mutedChannels, setMutedChannels] = useState(new Set())
  const [fxPanelTrack, setFxPanelTrack] = useState(null) // slot like "d1" or null
  const [fxPanelPosition, setFxPanelPosition] = useState({ x: 0, y: 0 })

  // Toggle mute for a channel
  // Note: Mute is currently visual only - the pattern still plays
  // TODO: Implement proper mute by excluding from stack
  const handleToggleMute = useCallback((slot, pattern) => {
    setMutedChannels(prev => {
      const next = new Set(prev)
      if (next.has(slot)) {
        next.delete(slot)
      } else {
        next.add(slot)
      }
      return next
    })
  }, [])

  // Handle pattern submission from track input
  const handlePatternSubmit = useCallback((slot, code) => {
    onPatternUpdate(slot, code)
    // Clear muted state when pattern is updated
    setMutedChannels(prev => {
      const next = new Set(prev)
      next.delete(slot)
      return next
    })
  }, [onPatternUpdate])

  // Handle stopping a pattern
  const handleStopPattern = useCallback((slot) => {
    // Update pattern to null - App.jsx will replay all remaining patterns
    onPatternUpdate(slot, null)
    setMutedChannels(prev => {
      const next = new Set(prev)
      next.delete(slot)
      return next
    })
    // Close FX panel if it was open for this track
    if (fxPanelTrack === slot) {
      setFxPanelTrack(null)
    }
  }, [onPatternUpdate, fxPanelTrack])

  // Handle FX button click
  const handleFxClick = useCallback((e, slot) => {
    e.stopPropagation()
    
    if (fxPanelTrack === slot) {
      // Close if clicking same track's FX button
      setFxPanelTrack(null)
    } else {
      // Open panel for this track
      const rect = e.currentTarget.getBoundingClientRect()
      setFxPanelPosition({
        x: rect.right + 8,
        y: rect.bottom + 8
      })
      setFxPanelTrack(slot)
    }
  }, [fxPanelTrack])

  // Handle effect change from panel
  const handleEffectChange = useCallback((slot, newPattern) => {
    onPatternUpdate(slot, newPattern)
  }, [onPatternUpdate])

  // Close FX panel
  const handleCloseFxPanel = useCallback(() => {
    setFxPanelTrack(null)
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
        const isFxOpen = fxPanelTrack === slot

        return (
          <div
            key={slot}
            className={`channel-row ${isActive ? 'active' : ''} ${isMuted ? 'muted' : ''}`}
            style={{ '--channel-color': color }}
          >
            <span className="channel-label">Track {channelNum}</span>
            
            <TrackInput
              slot={slot}
              pattern={pattern}
              color={color}
              isActive={isActive}
              isMuted={isMuted}
              isInitialized={isInitialized}
              onSubmit={handlePatternSubmit}
              onMute={() => handleToggleMute(slot, pattern)}
              onStop={handleStopPattern}
            />

            {isActive && (
              <button
                className={`channel-mute-btn ${isMuted ? 'muted' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleMute(slot, pattern)
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
      
      {/* Effects Panel */}
      {fxPanelTrack && patterns[fxPanelTrack] && (
        <TrackEffects
          trackNumber={getTrackNumber(fxPanelTrack)}
          color={CHANNEL_COLORS[getTrackNumber(fxPanelTrack) - 1]}
          position={fxPanelPosition}
          pattern={patterns[fxPanelTrack]}
          onClose={handleCloseFxPanel}
          onEffectChange={(newPattern) => handleEffectChange(fxPanelTrack, newPattern)}
        />
      )}
    </div>
  )
}

export default EventStream
