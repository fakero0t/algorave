import { useState, useRef, useEffect, useCallback } from 'react'
import TrackEffects, { DEFAULT_FX_STATE } from './TrackEffects'
import InstrumentPicker from './InstrumentPicker'
import PianoRollPanel from './PianoRollPanel'
import { getSampleDisplayName } from './SampleBrowser'

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

function EventStream({ 
  patterns, 
  onPatternUpdate, 
  mutedChannels, 
  onToggleMute, 
  trackNames, 
  onTrackNameUpdate, 
  trackGrids,
  onTrackGridUpdate,
  trackFx,
  onTrackFxUpdate,
  isInitialized 
}) {
  const containerRef = useRef(null)
  // Track multiple open FX panels: { "d1": { x, y }, "d3": { x, y }, ... }
  const [openFxPanels, setOpenFxPanels] = useState({})
  // Track which slot has the instrument picker open
  const [instrumentPickerSlot, setInstrumentPickerSlot] = useState(null)
  // Track which slot has the piano roll open (only one at a time)
  const [pianoRollSlot, setPianoRollSlot] = useState(null)
  // Refs for instrument buttons to anchor the picker
  const instrumentButtonRefs = useRef({})

  // Handle clearing a track (reset everything)
  const handleClearTrack = useCallback((slot) => {
    // Clear grid state
    onTrackGridUpdate(slot, null)
    // Clear FX state
    onTrackFxUpdate(slot, null)
    // Close piano roll if it was open for this track
    if (pianoRollSlot === slot) {
      setPianoRollSlot(null)
    }
    // Close FX panel if it was open for this track
    setOpenFxPanels(prev => {
      const next = { ...prev }
      delete next[slot]
      return next
    })
  }, [onTrackGridUpdate, onTrackFxUpdate, pianoRollSlot])

  // Handle instrument selection
  const handleInstrumentSelect = useCallback((slot, instrument) => {
    const existingGrid = trackGrids[slot] || {}
    onTrackGridUpdate(slot, {
      ...existingGrid,
      instrument,
    })
    setInstrumentPickerSlot(null)
    // Auto-open piano roll when instrument is selected
    setPianoRollSlot(slot)
  }, [onTrackGridUpdate, trackGrids])

  // Handle full grid update (mode + notes) - prevents race conditions
  const handleGridUpdate = useCallback((slot, updates) => {
    onTrackGridUpdate(slot, {
      ...trackGrids[slot],
      ...updates,
    })
  }, [onTrackGridUpdate, trackGrids])

  // Open piano roll (closes any existing one)
  const handleOpenPianoRoll = useCallback((slot) => {
    setPianoRollSlot(slot)
  }, [])

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
        const isMuted = mutedChannels.has(slot)
        const isFxOpen = !!openFxPanels[slot]

        const trackGrid = trackGrids?.[slot] || {}
        const hasInstrument = !!trackGrid.instrument
        // Check if track has notes (melodic or percussive)
        const hasNotes = hasInstrument && (
          (trackGrid.melodicNotes && trackGrid.melodicNotes.length > 0) ||
          (trackGrid.percussiveNotes && trackGrid.percussiveNotes.length > 0)
        )
        // Track is active if it has a pattern OR has notes (even if pattern not synced yet)
        const isActive = !!pattern || hasNotes

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
            
            {/* Instrument Button */}
            <button
              ref={el => instrumentButtonRefs.current[slot] = el}
              className={`instrument-btn ${hasInstrument ? 'has-instrument' : ''}`}
              onClick={() => setInstrumentPickerSlot(instrumentPickerSlot === slot ? null : slot)}
              title={hasInstrument ? `Instrument: ${getSampleDisplayName(trackGrid.instrument)} (${trackGrid.instrument})` : 'Select instrument'}
              style={{ '--btn-color': color }}
            >
              {hasInstrument ? getSampleDisplayName(trackGrid.instrument) : '+'}
            </button>
            
            {/* Grid Button - opens piano roll / note selector */}
            <button
              className={`grid-btn ${pianoRollSlot === slot ? 'active' : ''}`}
              onClick={() => handleOpenPianoRoll(slot)}
              disabled={!hasInstrument}
              title={hasInstrument ? 'Edit notes' : 'Select instrument first'}
              style={{ '--btn-color': color }}
            >
              {trackGrid.mode === 'melodic' ? '🎹' : '🥁'}
            </button>

            <button
              className={`channel-mute-btn ${isMuted ? 'muted' : ''} ${!isActive ? 'disabled' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                if (isActive) onToggleMute(slot)
              }}
              disabled={!isActive}
              title={isActive ? (isMuted ? 'Unmute channel' : 'Mute channel') : 'No pattern to mute'}
              aria-label={isMuted ? 'Unmute channel' : 'Mute channel'}
            >
              <MuteIcon muted={isMuted} />
            </button>
            
            {/* FX Button - enabled when track has content */}
            <button
              className={`channel-fx-btn ${isFxOpen ? 'active' : ''} ${!isActive ? 'disabled' : ''}`}
              onClick={(e) => isActive && handleFxClick(e, slot)}
              disabled={!isActive}
              title={isActive ? 'Effects' : 'Add notes first'}
              aria-label="Effects"
              style={{ '--btn-color': color }}
            >
              <FxIcon />
            </button>
            
            {/* Clear Track Button - only visible when track has content */}
            {hasInstrument && (
              <button
                className="clear-track-btn"
                onClick={() => handleClearTrack(slot)}
                title="Reset track"
                aria-label="Reset track"
              >
                ↺
              </button>
            )}
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
              fxState={trackFx?.[slot] || DEFAULT_FX_STATE}
              onFxChange={(fx) => onTrackFxUpdate(slot, fx)}
              onClose={() => handleCloseFxPanel(slot)}
            />
          )
        })}
      
      {/* Instrument Picker - only one can be open at a time */}
      {instrumentPickerSlot && (
        <InstrumentPicker
          isOpen={true}
          onSelect={(instrument) => handleInstrumentSelect(instrumentPickerSlot, instrument)}
          onClose={() => setInstrumentPickerSlot(null)}
          anchorRef={{ current: instrumentButtonRefs.current[instrumentPickerSlot] }}
          currentInstrument={trackGrids?.[instrumentPickerSlot]?.instrument}
        />
      )}
      
      {/* Piano Roll Panel - only one can be open at a time */}
      {pianoRollSlot && trackGrids?.[pianoRollSlot] && (
        <PianoRollPanel
          trackNumber={getTrackNumber(pianoRollSlot)}
          trackName={trackNames?.[pianoRollSlot]}
          color={CHANNEL_COLORS[getTrackNumber(pianoRollSlot) - 1] || '#ffffff'}
          instrument={trackGrids[pianoRollSlot].instrument}
          activeMode={trackGrids[pianoRollSlot].mode}
          melodicNotes={trackGrids[pianoRollSlot].melodicNotes || []}
          percussiveNotes={trackGrids[pianoRollSlot].percussiveNotes || []}
          onGridUpdate={(updates) => handleGridUpdate(pianoRollSlot, updates)}
          onClose={() => setPianoRollSlot(null)}
        />
      )}
    </div>
  )
}

export default EventStream
