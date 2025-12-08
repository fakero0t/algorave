import { useState, useCallback, useRef, useEffect } from 'react'
import { getNoteNames } from '../utils/codeGenerator'

// Debounce helper
function useDebounce(callback, delay) {
  const timeoutRef = useRef(null)
  
  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay])
}

// Preview sound disabled - pattern updates in real-time instead
function playPreview(instrument, note) {
  // Disabled to avoid interference with main playback
  // The pattern will update and replay automatically
}

// Mode Toggle Component (inside panel)
function InlineModeToggle({ mode, onModeChange }) {
  return (
    <div className="inline-mode-toggle">
      <button
        className={`mode-btn ${mode === 'melodic' ? 'active' : ''}`}
        onClick={() => onModeChange('melodic')}
        title="Keyboard / Melodic mode"
      >
        🎹
      </button>
      <button
        className={`mode-btn ${mode === 'percussive' ? 'active' : ''}`}
        onClick={() => onModeChange('percussive')}
        title="Drum / Percussive mode"
      >
        🥁
      </button>
    </div>
  )
}

// Melodic Grid Component
function MelodicGrid({ instrument, notes, onNoteAdd, onNoteRemove, color, currentOctave, onOctaveChange }) {
  const scrollContainerRef = useRef(null)
  const isProgrammaticScrollRef = useRef(false)
  const lastScrollTopRef = useRef(0)
  // Show 5 octaves for smooth scrolling (from octave 1 to 5)
  const noteData = getNoteNames(1, 5)
  
  const debouncedPreview = useDebounce((inst, note) => {
    playPreview(inst, note)
  }, 50)
  
  const handleCellClick = useCallback((step, note) => {
    const existingIndex = notes.findIndex(n => n.step === step && n.note === note)
    
    if (existingIndex >= 0) {
      // Remove note
      onNoteRemove(step, note)
    } else {
      // Add note and play preview
      debouncedPreview(instrument, note)
      onNoteAdd(step, note)
    }
  }, [notes, onNoteAdd, onNoteRemove, instrument, debouncedPreview])
  
  const isNoteActive = useCallback((step, note) => {
    return notes.some(n => n.step === step && n.note === note)
  }, [notes])
  
  // Scroll to current octave when it changes externally (via buttons)
  useEffect(() => {
    const container = scrollContainerRef.current
    if (container) {
      // Calculate scroll position to center the current octave
      // Each octave has 12 notes, each note row is ~28px (grid-cell-size)
      const noteHeight = 28 + 1 // cell size + gap
      const octaveHeight = 12 * noteHeight
      // Center the current octave (octaves are 1-5, but we show 1-5, so currentOctave is 1-indexed)
      const targetScroll = (currentOctave - 1) * octaveHeight - (container.clientHeight / 2) + (octaveHeight / 2)
      
      // Mark as programmatic scroll to prevent feedback loop
      isProgrammaticScrollRef.current = true
      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      })
      
      // Reset flag after scroll completes
      setTimeout(() => {
        isProgrammaticScrollRef.current = false
      }, 500)
    }
  }, [currentOctave])
  
  // Update displayed octave based on scroll position (for smooth feedback)
  const handleScroll = useCallback(() => {
    // Skip if this is a programmatic scroll
    if (isProgrammaticScrollRef.current) return
    
    const container = scrollContainerRef.current
    if (!container) return
    
    const scrollTop = container.scrollTop
    
    // Debounce: only update if scroll position changed significantly
    if (Math.abs(scrollTop - lastScrollTopRef.current) < 10) return
    lastScrollTopRef.current = scrollTop
    
    const noteHeight = 28 + 1
    const octaveHeight = 12 * noteHeight
    const visibleOctave = Math.round((scrollTop + container.clientHeight / 2) / octaveHeight) + 1
    const clampedOctave = Math.max(1, Math.min(5, visibleOctave))
    
    // Only update if it's different to avoid unnecessary re-renders
    if (clampedOctave !== currentOctave && clampedOctave >= 1 && clampedOctave <= 5) {
      onOctaveChange(clampedOctave)
    }
  }, [currentOctave, onOctaveChange])
  
  return (
    <div ref={scrollContainerRef} className="piano-roll-grid melodic" onScroll={handleScroll}>
      {noteData.map(({ note, label, isBlack }) => (
          <div key={note} className={`grid-row ${isBlack ? 'black-key' : 'white-key'}`}>
            <div className={`note-label ${isBlack ? 'black-key' : ''}`}>
              {label}
            </div>
            {Array.from({ length: 16 }, (_, step) => {
              const active = isNoteActive(step, note)
              const isBeatMarker = step % 4 === 0
              const isHalfBeat = step % 2 === 0 && !isBeatMarker
              
              return (
                <div
                  key={step}
                  className={`grid-cell ${active ? 'active' : ''} ${isBeatMarker ? 'beat-marker quarter' : ''} ${isHalfBeat ? 'beat-marker eighth' : ''}`}
                  style={{ '--track-color': color }}
                  onClick={() => handleCellClick(step, note)}
                  aria-label={`Step ${step + 1}, ${label}, ${active ? 'note on' : 'empty'}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleCellClick(step, note)
                    }
                  }}
                />
              )
            })}
          </div>
        ))}
    </div>
  )
}

// Percussive Grid Component (single row step sequencer)
function PercussiveGrid({ instrument, notes, onNoteAdd, onNoteRemove, color }) {
  const debouncedPreview = useDebounce((inst) => {
    playPreview(inst, null)
  }, 50)
  
  const handleCellClick = useCallback((step) => {
    const existingIndex = notes.findIndex(n => n.step === step)
    
    if (existingIndex >= 0) {
      // Remove note
      onNoteRemove(step)
    } else {
      // Add note and play preview
      debouncedPreview(instrument)
      onNoteAdd(step)
    }
  }, [notes, onNoteAdd, onNoteRemove, instrument, debouncedPreview])
  
  const isStepActive = useCallback((step) => {
    return notes.some(n => n.step === step)
  }, [notes])
  
  return (
    <div className="piano-roll-grid percussive">
      <div className="grid-row">
        <div className="note-label drum-label">
          {instrument}
        </div>
        {Array.from({ length: 16 }, (_, step) => {
          const active = isStepActive(step)
          const isBeatMarker = step % 4 === 0
          const isHalfBeat = step % 2 === 0 && !isBeatMarker
          
          return (
            <div
              key={step}
              className={`grid-cell ${active ? 'active' : ''} ${isBeatMarker ? 'beat-marker quarter' : ''} ${isHalfBeat ? 'beat-marker eighth' : ''}`}
              style={{ '--track-color': color }}
              onClick={() => handleCellClick(step)}
              aria-label={`Step ${step + 1}, ${active ? 'note on' : 'empty'}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleCellClick(step)
                }
              }}
            />
          )
        })}
      </div>
      {/* Step numbers */}
      <div className="step-numbers">
        <div className="note-label" />
        {Array.from({ length: 16 }, (_, step) => (
          <div key={step} className="step-number">
            {step + 1}
          </div>
        ))}
      </div>
    </div>
  )
}

// Calculate optimal starting octave based on existing notes
function getOptimalOctave(notes) {
  if (!notes || notes.length === 0) return 3 // Default
  
  // Extract octaves from note names (e.g., "c3", "e4", "b5")
  const octaves = notes
    .filter(n => n.note)
    .map(n => {
      const match = n.note.match(/\d+$/)
      return match ? parseInt(match[0]) : null
    })
    .filter(o => o !== null)
  
  if (octaves.length === 0) return 3
  
  // Find the median octave to center the view
  const sorted = [...octaves].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  
  // Clamp to valid range (1-5)
  return Math.max(1, Math.min(5, median - 1))
}

// Main Piano Roll Panel Component
function PianoRollPanel({ 
  trackNumber, 
  trackName, 
  color, 
  instrument, 
  // Current active mode (determines which notes are used for playback)
  activeMode,
  // Notes stored separately by mode
  melodicNotes = [],
  percussiveNotes = [],
  // Single callback for all grid updates
  onGridUpdate,
  onClose 
}) {
  // View mode - which grid is currently shown (can differ from activeMode)
  // Default to percussive (drum) mode
  const [viewMode, setViewMode] = useState(activeMode || 'percussive')
  // Initialize octave based on existing melodic notes
  const [currentOctave, setCurrentOctave] = useState(() => getOptimalOctave(melodicNotes))
  const panelRef = useRef(null)
  
  const displayName = trackName || `Track ${trackNumber}`
  
  // Get notes for current view
  const currentNotes = viewMode === 'melodic' ? melodicNotes : percussiveNotes
  
  // Handle adding a melodic note - clears drum notes (mutually exclusive)
  const handleMelodicNoteAdd = useCallback((step, note) => {
    // Single atomic update: set mode, clear other notes, add this note
    onGridUpdate({
      mode: 'melodic',
      melodicNotes: [...melodicNotes, { step, note }],
      percussiveNotes: [], // Clear drum notes
    })
  }, [melodicNotes, onGridUpdate])
  
  const handleMelodicNoteRemove = useCallback((step, note) => {
    onGridUpdate({
      melodicNotes: melodicNotes.filter(n => !(n.step === step && n.note === note)),
    })
  }, [melodicNotes, onGridUpdate])
  
  // Handle adding a percussive note - clears melodic notes (mutually exclusive)
  const handlePercussiveNoteAdd = useCallback((step) => {
    // Single atomic update: set mode, clear other notes, add this note
    onGridUpdate({
      mode: 'percussive',
      percussiveNotes: [...percussiveNotes, { step }],
      melodicNotes: [], // Clear melodic notes
    })
  }, [percussiveNotes, onGridUpdate])
  
  const handlePercussiveNoteRemove = useCallback((step) => {
    onGridUpdate({
      percussiveNotes: percussiveNotes.filter(n => n.step !== step),
    })
  }, [percussiveNotes, onGridUpdate])
  
  // Clear notes for current view
  const handleClear = useCallback(() => {
    if (viewMode === 'melodic') {
      onGridUpdate({ melodicNotes: [] })
    } else {
      onGridUpdate({ percussiveNotes: [] })
    }
  }, [viewMode, onGridUpdate])
  
  return (
    <div 
      ref={panelRef}
      className="piano-roll-panel open"
      style={{ '--track-color': color }}
    >
      <div className="piano-roll-header">
        <span className="piano-roll-title">
          {displayName} - {instrument}
        </span>
        <InlineModeToggle 
          mode={viewMode} 
          onModeChange={setViewMode}
        />
        <button 
          className="piano-roll-close"
          onClick={onClose}
          aria-label="Close piano roll"
        >
          ×
        </button>
      </div>
      
      <div className="piano-roll-content">
        {viewMode === 'melodic' ? (
          <MelodicGrid
            instrument={instrument}
            notes={melodicNotes}
            onNoteAdd={handleMelodicNoteAdd}
            onNoteRemove={handleMelodicNoteRemove}
            color={color}
            currentOctave={currentOctave}
            onOctaveChange={setCurrentOctave}
          />
        ) : (
          <PercussiveGrid
            instrument={instrument}
            notes={percussiveNotes}
            onNoteAdd={handlePercussiveNoteAdd}
            onNoteRemove={handlePercussiveNoteRemove}
            color={color}
          />
        )}
      </div>
      
      <div className="piano-roll-toolbar">
        {viewMode === 'melodic' && (
          <div className="octave-scroller">
            <button 
              className="octave-btn"
              onClick={() => setCurrentOctave(o => Math.min(5, o + 1))}
              disabled={currentOctave >= 5}
              title="Octave up"
            >
              ▲
            </button>
            <span className="octave-label">
              C{currentOctave}-C{currentOctave + 2}
            </span>
            <button 
              className="octave-btn"
              onClick={() => setCurrentOctave(o => Math.max(1, o - 1))}
              disabled={currentOctave <= 1}
              title="Octave down"
            >
              ▼
            </button>
          </div>
        )}
        <div className="toolbar-spacer" />
        <button 
          className="clear-btn"
          onClick={handleClear}
          disabled={currentNotes.length === 0}
        >
          Clear ({currentNotes.length})
        </button>
      </div>
      
      {/* Aria live region for announcements */}
      <div aria-live="polite" className="sr-only" />
    </div>
  )
}

export default PianoRollPanel

