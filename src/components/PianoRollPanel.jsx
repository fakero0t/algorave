import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
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

// Timeline Piano Roll Component
function TimelinePianoRoll({ instrument, notes, onNoteAdd, onNoteRemove, onNoteUpdate, color, currentOctave, onOctaveChange }) {
  const scrollContainerRef = useRef(null)
  const timelineRef = useRef(null)
  const isProgrammaticScrollRef = useRef(false)
  const lastScrollTopRef = useRef(0)
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState(null)
  const [currentMousePos, setCurrentMousePos] = useState(null)
  const [draggingNoteId, setDraggingNoteId] = useState(null)
  const [dragStartPos, setDragStartPos] = useState(null)
  const [noteWasMoved, setNoteWasMoved] = useState(false)
  const [resizingNoteId, setResizingNoteId] = useState(null)
  const [resizeStartX, setResizeStartX] = useState(null)
  const [resizeStartStep, setResizeStartStep] = useState(null)
  const [resizeStartDuration, setResizeStartDuration] = useState(null)
  const [resizeSide, setResizeSide] = useState(null) // 'left' or 'right'
  const [resizePreview, setResizePreview] = useState(null)
  
  // Show 5 octaves for smooth scrolling (from octave 1 to 5)
  const noteData = getNoteNames(1, 5)
  
  // Constants
  const STEP_WIDTH = 28 // Same as grid-cell-size
  const NOTE_HEIGHT = 28
  const NOTE_GAP = 1
  const TOTAL_STEPS = 16
  const MIN_NOTE_DURATION = 0.25 // Minimum 1/4 step
  const MAX_NOTE_DURATION = 16 // Maximum 16 steps
  
  // Normalize notes: ensure all notes have duration (default to 1 for backward compatibility)
  const normalizedNotes = notes.map((n, idx) => ({
    ...n,
    duration: n.duration || 1,
    id: n.id || `note-${idx}` // Add unique ID for tracking
  }))
  
  // Get note position and dimensions (relative to its row)
  const getNotePosition = useCallback((note) => {
    const x = note.step * STEP_WIDTH
    const width = (note.duration || 1) * STEP_WIDTH
    
    return { x, width, height: NOTE_HEIGHT }
  }, [STEP_WIDTH, NOTE_HEIGHT])
  
  // Convert pixel coordinates to step and note
  const pixelToStepAndNote = useCallback((x, y) => {
    if (!timelineRef.current || !scrollContainerRef.current) return null
    
    // Get the scroll container rect (this accounts for padding)
    const scrollRect = scrollContainerRef.current.getBoundingClientRect()
    
    // Calculate position relative to the scroll container's content area (inside padding)
    const relativeX = x - scrollRect.left
    const relativeY = y - scrollRect.top
    
    // Account for scroll position and padding
    const scrollTop = scrollContainerRef.current.scrollTop
    const scrollPaddingTop = parseInt(getComputedStyle(scrollContainerRef.current).paddingTop) || 0
    const adjustedY = relativeY + scrollTop - scrollPaddingTop
    
    // Find note row - each row is NOTE_HEIGHT + NOTE_GAP tall
    // Use Math.round to snap to the nearest row for better accuracy
    const noteIndex = Math.round(adjustedY / (NOTE_HEIGHT + NOTE_GAP))
    if (noteIndex < 0 || noteIndex >= noteData.length) return null
    
    // Get actual note label width from CSS or computed style
    const firstLabel = timelineRef.current?.querySelector('.note-label')
    const noteLabelWidth = firstLabel ? firstLabel.getBoundingClientRect().width : 48
    
    // Find step (account for note label width and padding)
    const scrollPaddingLeft = parseInt(getComputedStyle(scrollContainerRef.current).paddingLeft) || 0
    const adjustedX = relativeX - noteLabelWidth - scrollPaddingLeft
    if (adjustedX < 0) return null
    
    // Calculate which step the click is in (round to nearest step for better UX)
    const step = Math.round(adjustedX / STEP_WIDTH)
    if (step < 0 || step >= TOTAL_STEPS) return null
    
    return {
      step: Math.max(0, Math.min(TOTAL_STEPS - 1, step)),
      note: noteData[noteIndex].note
    }
  }, [noteData, STEP_WIDTH, NOTE_HEIGHT, NOTE_GAP, TOTAL_STEPS])
  
  // Find note at position - check all notes to see if click is within any note's bounds
  const findNoteAtPosition = useCallback((x, y) => {
    if (!timelineRef.current || !scrollContainerRef.current) return null
    
    const rect = timelineRef.current.getBoundingClientRect()
    const scrollRect = scrollContainerRef.current.getBoundingClientRect()
    
    // Get actual note label width
    const firstLabel = timelineRef.current.querySelector('.note-label')
    const noteLabelWidth = firstLabel ? firstLabel.getBoundingClientRect().width : 48
    
    // Calculate position relative to timeline content
    const relativeX = x - scrollRect.left - noteLabelWidth
    const scrollPaddingLeft = parseInt(getComputedStyle(scrollContainerRef.current).paddingLeft) || 0
    const adjustedX = relativeX - scrollPaddingLeft
    
    const relativeY = y - scrollRect.top
    const scrollTop = scrollContainerRef.current.scrollTop
    const scrollPaddingTop = parseInt(getComputedStyle(scrollContainerRef.current).paddingTop) || 0
    const adjustedY = relativeY + scrollTop - scrollPaddingTop
    
    // Check all notes to see if click is within any note's bounds
    for (const note of normalizedNotes) {
      const notePos = getNotePosition(note)
      if (!notePos) continue
      
      // Find which row this note is on
      const noteIndex = noteData.findIndex(n => n.note === note.note)
      if (noteIndex === -1) continue
      
      const rowTop = noteIndex * (NOTE_HEIGHT + NOTE_GAP)
      const rowBottom = rowTop + NOTE_HEIGHT
      
      // Check if click is within this note's bounds (entire note area)
      const inX = adjustedX >= notePos.x && adjustedX <= notePos.x + notePos.width
      const inY = adjustedY >= rowTop && adjustedY <= rowBottom
      
      if (inX && inY) {
        return note
      }
    }
    
    return null
  }, [normalizedNotes, getNotePosition, noteData, NOTE_HEIGHT, NOTE_GAP])
  
  // Check if click is on note resize handle (left or right edge)
  const getResizeHandle = useCallback((note, x, y) => {
    if (!timelineRef.current || !scrollContainerRef.current) return null
    
    const notePos = getNotePosition(note)
    if (!notePos) return null
    
    const scrollRect = scrollContainerRef.current.getBoundingClientRect()
    
    // Get actual note label width
    const firstLabel = timelineRef.current.querySelector('.note-label')
    const noteLabelWidth = firstLabel ? firstLabel.getBoundingClientRect().width : 48
    
    // Calculate position relative to timeline content (same as findNoteAtPosition)
    const relativeX = x - scrollRect.left - noteLabelWidth
    const scrollPaddingLeft = parseInt(getComputedStyle(scrollContainerRef.current).paddingLeft) || 0
    const adjustedX = relativeX - scrollPaddingLeft
    
    const relativeY = y - scrollRect.top
    const scrollTop = scrollContainerRef.current.scrollTop
    const scrollPaddingTop = parseInt(getComputedStyle(scrollContainerRef.current).paddingTop) || 0
    const adjustedY = relativeY + scrollTop - scrollPaddingTop
    
    // Check if Y is in the note's row
    const noteIndex = noteData.findIndex(n => n.note === note.note)
    if (noteIndex === -1) return null
    
    const rowTop = noteIndex * (NOTE_HEIGHT + NOTE_GAP)
    const rowBottom = rowTop + NOTE_HEIGHT
    
    if (adjustedY < rowTop || adjustedY > rowBottom) return null
    
    const handleWidth = 8 // Resize handle width in pixels (increased for easier grabbing)
    const noteLeftEdge = notePos.x
    const noteRightEdge = notePos.x + notePos.width
    
    // Check left edge - click must be within handleWidth pixels of the left edge
    if (adjustedX >= noteLeftEdge - handleWidth && adjustedX <= noteLeftEdge + handleWidth) {
      return 'left'
    }
    
    // Check right edge - click must be within handleWidth pixels of the right edge
    if (adjustedX >= noteRightEdge - handleWidth && adjustedX <= noteRightEdge + handleWidth) {
      return 'right'
    }
    
    return null
  }, [getNotePosition, noteData, NOTE_HEIGHT, NOTE_GAP])
  
  // Handle mouse down
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return // Only left mouse button
    
    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX
    const y = e.clientY
    
    // Check if clicking on existing note's resize handle
    for (const note of normalizedNotes) {
      const handleSide = getResizeHandle(note, x, y)
      if (handleSide) {
        setResizingNoteId(note.id)
        setResizeSide(handleSide)
        setResizeStartX(x)
        setResizeStartStep(note.step)
        setResizeStartDuration(note.duration || 1)
        e.preventDefault()
        return
      }
    }
    
    // Check if clicking on existing note (to drag or delete)
    const noteAtPos = findNoteAtPosition(x, y)
    if (noteAtPos) {
      // Get the actual note object to get its current step
      const actualNote = normalizedNotes.find(n => n.id === noteAtPos.id)
      if (actualNote) {
        // Start dragging the note - store original position
        setDraggingNoteId(actualNote.id)
        const pos = pixelToStepAndNote(x, y)
        setDragStartPos({ 
          x, 
          y, 
          step: pos ? pos.step : actualNote.step, 
          note: pos ? pos.note : actualNote.note,
          originalStep: actualNote.step, // Store original step for delta calculation
          originalNote: actualNote.note,
          noteToDelete: actualNote // Store the note for potential deletion
        })
        setNoteWasMoved(false) // Reset move flag when starting drag
        setDrawStart({ x, y, note: noteAtPos })
        setIsDrawing(false)
        e.preventDefault()
        return
      }
    }
    
    // Start drawing new note
    const pos = pixelToStepAndNote(x, y)
    if (pos) {
      setIsDrawing(true)
      setDrawStart({ x, y, step: pos.step, note: pos.note })
      e.preventDefault()
    }
  }, [normalizedNotes, getResizeHandle, findNoteAtPosition, pixelToStepAndNote])
  
  // Handle mouse move
  const handleMouseMove = useCallback((e) => {
    setCurrentMousePos({ x: e.clientX, y: e.clientY })
    
    if (draggingNoteId && dragStartPos) {
      // Dragging a note
      const note = normalizedNotes.find(n => n.id === draggingNoteId)
      if (!note) return
      
      const pos = pixelToStepAndNote(e.clientX, e.clientY)
      if (pos) {
        // Check if note position actually changed
        const deltaSteps = pos.step - dragStartPos.step
        const originalStep = dragStartPos.originalStep
        const noteDuration = note.duration || 1
        
        // Calculate the maximum allowed step to keep note within bounds
        // Note end step = newStep + duration - 1, must be <= TOTAL_STEPS - 1
        // So: newStep + duration - 1 <= TOTAL_STEPS - 1
        // So: newStep <= TOTAL_STEPS - duration
        const maxStep = Math.max(0, TOTAL_STEPS - noteDuration)
        const minStep = 0
        
        // Clamp the new step to ensure note stays within bounds
        const newStep = Math.max(minStep, Math.min(maxStep, originalStep + deltaSteps))
        
        // Mark that note was moved if position or pitch changed
        if (newStep !== note.step || pos.note !== note.note) {
          setNoteWasMoved(true)
        }
        
        // Update note position if it changed
        if (newStep !== note.step || pos.note !== note.note) {
          if (onNoteUpdate) {
            onNoteUpdate(note, { step: newStep, note: pos.note })
          }
        }
      }
    } else if (resizingNoteId && resizeSide) {
      const note = normalizedNotes.find(n => n.id === resizingNoteId)
      if (!note) return
      
      const rect = timelineRef.current?.getBoundingClientRect()
      if (!rect) return
      
      // Get actual note label width
      const firstLabel = timelineRef.current?.querySelector('.note-label')
      const noteLabelWidth = firstLabel ? firstLabel.getBoundingClientRect().width : 48
      
      const currentX = e.clientX
      const relativeX = currentX - rect.left - noteLabelWidth
      const currentStep = Math.max(0, Math.min(TOTAL_STEPS - 1, Math.round(relativeX / STEP_WIDTH)))
      
      if (resizeSide === 'right') {
        // Resizing right edge - adjust duration
        const deltaX = currentX - resizeStartX
        const deltaSteps = deltaX / STEP_WIDTH
        let newDuration = Math.max(MIN_NOTE_DURATION, Math.min(MAX_NOTE_DURATION, resizeStartDuration + deltaSteps))
        
        // Ensure note doesn't extend past the end of the pattern
        const noteEndStep = note.step + newDuration - 1
        if (noteEndStep >= TOTAL_STEPS) {
          newDuration = TOTAL_STEPS - note.step
        }
        
        // Update preview
        const noteIndex = noteData.findIndex(n => n.note === note.note)
        if (noteIndex !== -1) {
          setResizePreview({
            step: note.step,
            note: note.note,
            duration: newDuration,
            x: note.step * STEP_WIDTH,
            width: newDuration * STEP_WIDTH
          })
        }
        
        if (onNoteUpdate) {
          onNoteUpdate(note, { duration: newDuration })
        }
      } else if (resizeSide === 'left') {
        // Resizing left edge - adjust start step and duration
        const newStep = Math.max(0, Math.min(TOTAL_STEPS - 1, currentStep))
        
        // Calculate the original end step (right edge stays fixed)
        const originalEndStep = resizeStartStep + resizeStartDuration - 1
        
        // New step must be before or equal to the original end step
        const clampedStep = Math.max(0, Math.min(originalEndStep, newStep))
        
        // Duration = distance from new start to original end
        let newDuration = Math.max(MIN_NOTE_DURATION, originalEndStep - clampedStep + 1)
        
        // Ensure note doesn't extend past the end of the pattern
        const noteEndStep = clampedStep + newDuration - 1
        if (noteEndStep >= TOTAL_STEPS) {
          newDuration = TOTAL_STEPS - clampedStep
        }
        
        // Update preview
        const noteIndex = noteData.findIndex(n => n.note === note.note)
        if (noteIndex !== -1) {
          setResizePreview({
            step: clampedStep,
            note: note.note,
            duration: newDuration,
            x: clampedStep * STEP_WIDTH,
            width: newDuration * STEP_WIDTH
          })
        }
        
        if (onNoteUpdate) {
          onNoteUpdate(note, { step: clampedStep, duration: newDuration })
        }
      }
    }
  }, [draggingNoteId, dragStartPos, resizingNoteId, resizeSide, resizeStartX, resizeStartStep, resizeStartDuration, normalizedNotes, onNoteUpdate, pixelToStepAndNote, STEP_WIDTH, MIN_NOTE_DURATION, MAX_NOTE_DURATION, TOTAL_STEPS, noteData])
  
  // Handle mouse up
  const handleMouseUp = useCallback((e) => {
    if (resizingNoteId) {
      setResizingNoteId(null)
      setResizeSide(null)
      setResizeStartX(null)
      setResizeStartStep(null)
      setResizeStartDuration(null)
      setResizePreview(null)
      return
    }
    
    if (draggingNoteId && dragStartPos) {
      // Finished dragging - check if it was just a click (no movement)
      const moved = Math.abs(e.clientX - dragStartPos.x) > 5 || Math.abs(e.clientY - dragStartPos.y) > 5
      // Only delete if there was minimal movement AND the note position didn't actually change
      if (!moved && !noteWasMoved && dragStartPos.noteToDelete) {
        // It was just a click - delete the note
        onNoteRemove(dragStartPos.noteToDelete.step, dragStartPos.noteToDelete.note)
      }
      setDraggingNoteId(null)
      setDragStartPos(null)
      setDrawStart(null)
      setNoteWasMoved(false)
      return
    }
    
    if (isDrawing && drawStart) {
      const endPos = pixelToStepAndNote(e.clientX, e.clientY)
      if (endPos && endPos.note === drawStart.note) {
        const startStep = drawStart.step
        const endStep = endPos.step
        const minStep = Math.min(startStep, endStep)
        const maxStep = Math.max(startStep, endStep)
        const duration = maxStep - minStep + 1
        
        // Check if note already exists at this position
        const existingNote = normalizedNotes.find(n => 
          n.note === drawStart.note && 
          n.step === minStep
        )
        
        if (existingNote) {
          // Update existing note duration
          if (onNoteUpdate) {
            onNoteUpdate(existingNote, { duration })
          }
        } else {
          // Add new note
          onNoteAdd(minStep, drawStart.note, duration)
        }
      }
      setIsDrawing(false)
      setDrawStart(null)
    } else if (drawStart && drawStart.note && !isDrawing) {
      // Clicked on existing note without dragging - remove it
      const noteAtPos = findNoteAtPosition(e.clientX, e.clientY)
      if (noteAtPos) {
        // Check if it's the same note (by id or by step+note)
        const isSameNote = noteAtPos.id === drawStart.note.id || 
          (noteAtPos.step === drawStart.note.step && noteAtPos.note === drawStart.note.note)
        if (isSameNote) {
          onNoteRemove(noteAtPos.step, noteAtPos.note)
        }
      }
      setDrawStart(null)
    }
    setCurrentMousePos(null)
  }, [isDrawing, drawStart, resizingNoteId, draggingNoteId, pixelToStepAndNote, normalizedNotes, onNoteAdd, onNoteRemove, onNoteUpdate, findNoteAtPosition])
  
  // Scroll to current octave when it changes externally (via buttons)
  useEffect(() => {
    const container = scrollContainerRef.current
    if (container) {
      const noteHeight = NOTE_HEIGHT + NOTE_GAP
      const octaveHeight = 12 * noteHeight
      const targetScroll = (currentOctave - 1) * octaveHeight - (container.clientHeight / 2) + (octaveHeight / 2)
      
      isProgrammaticScrollRef.current = true
      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      })
      
      setTimeout(() => {
        isProgrammaticScrollRef.current = false
      }, 500)
    }
  }, [currentOctave, NOTE_HEIGHT, NOTE_GAP])
  
  // Update displayed octave based on scroll position
  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return
    
    const container = scrollContainerRef.current
    if (!container) return
    
    const scrollTop = container.scrollTop
    if (Math.abs(scrollTop - lastScrollTopRef.current) < 10) return
    lastScrollTopRef.current = scrollTop
    
    const noteHeight = NOTE_HEIGHT + NOTE_GAP
    const octaveHeight = 12 * noteHeight
    const visibleOctave = Math.round((scrollTop + container.clientHeight / 2) / octaveHeight) + 1
    const clampedOctave = Math.max(1, Math.min(5, visibleOctave))
    
    if (clampedOctave !== currentOctave && clampedOctave >= 1 && clampedOctave <= 5) {
      onOctaveChange(clampedOctave)
    }
  }, [currentOctave, onOctaveChange, NOTE_HEIGHT, NOTE_GAP])
  
  // Global mouse event handlers
  useEffect(() => {
    if (isDrawing || resizingNoteId || draggingNoteId) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDrawing, resizingNoteId, draggingNoteId, handleMouseMove, handleMouseUp])
  
  // Calculate drawing preview
  const drawingPreview = useMemo(() => {
    if (!isDrawing || !drawStart || !currentMousePos) return null
    
    const currentPos = pixelToStepAndNote(currentMousePos.x, currentMousePos.y)
    if (!currentPos || currentPos.note !== drawStart.note) return null
    
    const startStep = drawStart.step
    const endStep = currentPos.step
    const minStep = Math.min(startStep, endStep)
    const maxStep = Math.max(startStep, endStep)
    const duration = maxStep - minStep + 1
    
    return {
      step: minStep,
      note: drawStart.note,
      duration,
      x: minStep * STEP_WIDTH,
      width: duration * STEP_WIDTH
    }
  }, [isDrawing, drawStart, currentMousePos, pixelToStepAndNote, STEP_WIDTH])
  
  return (
    <div 
      ref={scrollContainerRef} 
      className="piano-roll-timeline melodic" 
      onScroll={handleScroll}
    >
      <div 
        ref={timelineRef}
        className="timeline-content"
        onMouseDown={handleMouseDown}
        style={{ position: 'relative', minHeight: '100%' }}
      >
        {/* Note rows */}
        {noteData.map(({ note, label, isBlack }) => {
          const rowNotes = normalizedNotes.filter(n => n.note === note)
          
          return (
            <div key={note} className={`timeline-row ${isBlack ? 'black-key' : 'white-key'}`}>
            <div className={`note-label ${isBlack ? 'black-key' : ''}`}>
              {label}
            </div>
              <div className="timeline-steps">
                {/* Beat markers */}
                {Array.from({ length: TOTAL_STEPS }, (_, step) => {
              const isBeatMarker = step % 4 === 0
              const isHalfBeat = step % 2 === 0 && !isBeatMarker
              return (
                <div
                  key={step}
                      className={`step-marker ${isBeatMarker ? 'beat-marker quarter' : ''} ${isHalfBeat ? 'beat-marker eighth' : ''}`}
                      style={{ left: `${step * STEP_WIDTH}px` }}
                />
              )
            })}
                
                {/* Rendered notes */}
                {rowNotes.map((noteObj) => {
                  const pos = getNotePosition(noteObj)
                  if (!pos) return null
                  
                  // Hide note if it's being resized (show preview instead)
                  const isResizing = resizingNoteId === noteObj.id
                  
                  return (
                    <div
                      key={noteObj.id}
                      className={`timeline-note ${isResizing ? 'resizing' : ''}`}
                      style={{
                        left: `${pos.x}px`,
                        top: '0px',
                        width: `${pos.width}px`,
                        height: `${pos.height}px`,
                        '--track-color': color,
                        opacity: isResizing ? 0.3 : 1
                      }}
                    >
                      <div className="note-resize-handle note-resize-handle-left" />
                      <div className="note-resize-handle note-resize-handle-right" />
                    </div>
                  )
                })}
                
                {/* Resize preview */}
                {resizePreview && resizePreview.note === note && (
                  <div
                    className="timeline-note preview resize-preview"
                    style={{
                      left: `${resizePreview.x}px`,
                      top: '0px',
                      width: `${resizePreview.width}px`,
                      height: `${resizePreview.height}px`,
                      '--track-color': color
                    }}
                  />
                )}
                
                {/* Drawing preview */}
                {drawingPreview && drawingPreview.note === note && !resizePreview && (
                  <div
                    className="timeline-note preview"
                    style={{
                      left: `${drawingPreview.x}px`,
                      top: '0px',
                      width: `${drawingPreview.width}px`,
                      height: `${drawingPreview.height}px`,
                      '--track-color': color
                    }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Step numbers */}
      <div className="step-numbers">
        <div className="note-label" />
        {Array.from({ length: TOTAL_STEPS }, (_, step) => (
          <div key={step} className="step-number">
            {step + 1}
          </div>
        ))}
      </div>
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
  onClose,
  position,
  onPositionChange
}) {
  // View mode - which grid is currently shown (can differ from activeMode)
  // Default to percussive (drum) mode
  const [viewMode, setViewMode] = useState(activeMode || 'percussive')
  // Initialize octave based on existing melodic notes
  const [currentOctave, setCurrentOctave] = useState(() => getOptimalOctave(melodicNotes))
  const panelRef = useRef(null)
  const headerRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({ width: 600, height: 500 })
  const [zIndex, setZIndex] = useState(1000)
  const [hasInitialized, setHasInitialized] = useState(false)
  
  const displayName = trackName || `Track ${trackNumber}`
  
  // Initialize position within event-stream bounds on mount
  useEffect(() => {
    if (hasInitialized || !position) return
    const eventStream = document.querySelector('.event-stream')
    if (eventStream) {
      const bounds = eventStream.getBoundingClientRect()
      const initialPos = {
        x: bounds.left + 20,
        y: bounds.top + 20
      }
      onPositionChange(initialPos)
      setHasInitialized(true)
    }
  }, [hasInitialized, position, onPositionChange])
  
  // Min/max size constraints
  const minWidth = 400
  const minHeight = 300
  const maxWidth = typeof window !== 'undefined' ? window.innerWidth * 0.9 : 1200
  const maxHeight = typeof window !== 'undefined' ? window.innerHeight * 0.9 : 800
  
  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true)
      setDragOffset({
        x: e.clientX - (position?.x || 0),
        y: e.clientY - (position?.y || 0)
      })
    }
  }, [position])
  
  const handleResizeMouseDown = useCallback((e) => {
    e.stopPropagation()
    setIsResizing(true)
  }, [])
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && panelRef.current && position) {
        const eventStream = document.querySelector('.event-stream')
        const bounds = eventStream?.getBoundingClientRect() || { 
          left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight 
        }
        
        const minX = bounds.left
        const maxX = bounds.right - size.width
        const minY = bounds.top
        const maxY = bounds.bottom - size.height
        
        const newX = Math.max(minX, Math.min(maxX, e.clientX - dragOffset.x))
        const newY = Math.max(minY, Math.min(maxY, e.clientY - dragOffset.y))
        onPositionChange({ x: newX, y: newY })
      }
      if (isResizing && panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect()
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
  }, [isDragging, isResizing, dragOffset, position, size, maxWidth, maxHeight, minWidth, minHeight, onPositionChange])
  
  const bringToFront = useCallback(() => {
    setZIndex(Date.now() % 10000 + 1000)
  }, [])
  
  const stopPropagation = useCallback((e) => {
    e.stopPropagation()
  }, [])
  
  // Get notes for current view
  const currentNotes = viewMode === 'melodic' ? melodicNotes : percussiveNotes
  
  // Handle adding a melodic note - clears drum notes (mutually exclusive)
  const handleMelodicNoteAdd = useCallback((step, note, duration = 1) => {
    // Single atomic update: set mode, clear other notes, add this note
    const newNote = { step, note, duration, id: `note-${Date.now()}-${Math.random()}` }
    onGridUpdate({
      mode: 'melodic',
      melodicNotes: [...melodicNotes, newNote],
      percussiveNotes: [], // Clear drum notes
    })
  }, [melodicNotes, onGridUpdate])
  
  const handleMelodicNoteRemove = useCallback((step, note) => {
    onGridUpdate({
      melodicNotes: melodicNotes.filter(n => !(n.step === step && n.note === note)),
    })
  }, [melodicNotes, onGridUpdate])
  
  const handleMelodicNoteUpdate = useCallback((note, updates) => {
    const updatedNotes = melodicNotes.map(n => {
      if (n.id === note.id || (n.step === note.step && n.note === note.note && !n.id)) {
        return { ...n, ...updates }
      }
      return n
    })
    onGridUpdate({
      melodicNotes: updatedNotes
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
  
  if (!position) return null
  
  return (
    <div 
      ref={panelRef}
      className="piano-roll-panel floating-modal"
      style={{ 
        '--track-color': color,
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex
      }}
      onMouseDown={bringToFront}
      onWheel={stopPropagation}
      onScroll={stopPropagation}
      onPointerDown={stopPropagation}
    >
      <div 
        ref={headerRef}
        className="piano-roll-header drag-handle"
        onMouseDown={handleMouseDown}
      >
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
          <TimelinePianoRoll
            instrument={instrument}
            notes={melodicNotes}
            onNoteAdd={handleMelodicNoteAdd}
            onNoteRemove={handleMelodicNoteRemove}
            onNoteUpdate={handleMelodicNoteUpdate}
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
              onClick={() => setCurrentOctave(o => Math.max(1, o - 1))}
              disabled={currentOctave <= 1}
              title="Octave up (higher notes)"
            >
              ▲
            </button>
            <span className="octave-label">
              C{currentOctave}-C{currentOctave + 2}
            </span>
            <button 
              className="octave-btn"
              onClick={() => setCurrentOctave(o => Math.min(5, o + 1))}
              disabled={currentOctave >= 5}
              title="Octave down (lower notes)"
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
      <div className="resize-handle" onMouseDown={handleResizeMouseDown} />
    </div>
  )
}

export default PianoRollPanel

