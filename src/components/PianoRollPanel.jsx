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

// Play preview sound
function playPreview(instrument, note) {
  try {
    if (note) {
      eval(`note("${note}").s("${instrument}").play()`)
    } else {
      eval(`s("${instrument}").play()`)
    }
  } catch (e) {
    console.error('Preview error:', e)
  }
}

// Melodic Grid Component
function MelodicGrid({ instrument, notes, onNotesChange, color, currentOctave, onOctaveChange }) {
  const gridRef = useRef(null)
  const noteData = getNoteNames(currentOctave, 2)
  
  const debouncedPreview = useDebounce((inst, note) => {
    playPreview(inst, note)
  }, 50)
  
  const handleCellClick = useCallback((step, note) => {
    const existingIndex = notes.findIndex(n => n.step === step && n.note === note)
    
    if (existingIndex >= 0) {
      // Remove note
      onNotesChange(notes.filter((_, i) => i !== existingIndex))
    } else {
      // Add note and play preview
      debouncedPreview(instrument, note)
      onNotesChange([...notes, { step, note }])
    }
  }, [notes, onNotesChange, instrument, debouncedPreview])
  
  const isNoteActive = useCallback((step, note) => {
    return notes.some(n => n.step === step && n.note === note)
  }, [notes])
  
  // Handle wheel scroll for octave change
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    if (e.deltaY < 0 && currentOctave < 5) {
      onOctaveChange(currentOctave + 1)
    } else if (e.deltaY > 0 && currentOctave > 1) {
      onOctaveChange(currentOctave - 1)
    }
  }, [currentOctave, onOctaveChange])
  
  useEffect(() => {
    const grid = gridRef.current
    if (grid) {
      grid.addEventListener('wheel', handleWheel, { passive: false })
      return () => grid.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])
  
  return (
    <div ref={gridRef} className="piano-roll-grid melodic">
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
function PercussiveGrid({ instrument, notes, onNotesChange, color }) {
  const debouncedPreview = useDebounce((inst) => {
    playPreview(inst, null)
  }, 50)
  
  const handleCellClick = useCallback((step) => {
    const existingIndex = notes.findIndex(n => n.step === step)
    
    if (existingIndex >= 0) {
      // Remove note
      onNotesChange(notes.filter((_, i) => i !== existingIndex))
    } else {
      // Add note and play preview
      debouncedPreview(instrument)
      onNotesChange([...notes, { step }])
    }
  }, [notes, onNotesChange, instrument, debouncedPreview])
  
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

// Main Piano Roll Panel Component
function PianoRollPanel({ 
  trackNumber, 
  trackName, 
  color, 
  mode, 
  instrument, 
  notes = [], 
  onNotesChange, 
  onClose 
}) {
  const [currentOctave, setCurrentOctave] = useState(3)
  const panelRef = useRef(null)
  
  const handleClear = useCallback(() => {
    onNotesChange([])
  }, [onNotesChange])
  
  const displayName = trackName || `Track ${trackNumber}`
  const modeIcon = mode === 'melodic' ? '🎹' : '🥁'
  
  // Handle click outside to close (optional - can be removed if not desired)
  // useEffect(() => {
  //   const handleClickOutside = (e) => {
  //     if (panelRef.current && !panelRef.current.contains(e.target)) {
  //       onClose()
  //     }
  //   }
  //   document.addEventListener('mousedown', handleClickOutside)
  //   return () => document.removeEventListener('mousedown', handleClickOutside)
  // }, [onClose])
  
  return (
    <div 
      ref={panelRef}
      className="piano-roll-panel open"
      style={{ '--track-color': color }}
    >
      <div className="piano-roll-header">
        <span className="piano-roll-title">
          {displayName} - {modeIcon} {instrument}
        </span>
        <button 
          className="piano-roll-close"
          onClick={onClose}
          aria-label="Close piano roll"
        >
          ×
        </button>
      </div>
      
      <div className="piano-roll-content">
        {mode === 'melodic' ? (
          <MelodicGrid
            instrument={instrument}
            notes={notes}
            onNotesChange={onNotesChange}
            color={color}
            currentOctave={currentOctave}
            onOctaveChange={setCurrentOctave}
          />
        ) : (
          <PercussiveGrid
            instrument={instrument}
            notes={notes}
            onNotesChange={onNotesChange}
            color={color}
          />
        )}
      </div>
      
      <div className="piano-roll-toolbar">
        {mode === 'melodic' && (
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
          disabled={notes.length === 0}
        >
          Clear
        </button>
      </div>
      
      {/* Aria live region for announcements */}
      <div aria-live="polite" className="sr-only" />
    </div>
  )
}

export default PianoRollPanel

