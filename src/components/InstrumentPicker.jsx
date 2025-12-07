import { useState, useRef, useEffect, useCallback } from 'react'
import { DEFAULT_SAMPLES } from './SampleBrowser'

function InstrumentPicker({ isOpen, onSelect, onClose, anchorRef, currentInstrument }) {
  const [filter, setFilter] = useState('')
  const pickerRef = useRef(null)
  const inputRef = useRef(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  // Position picker relative to anchor
  useEffect(() => {
    if (isOpen && anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      const eventStream = document.querySelector('.event-stream')
      const containerRect = eventStream?.getBoundingClientRect()
      
      // Position below the button
      let top = rect.bottom + 4
      let left = rect.left
      
      // Ensure it doesn't go off screen
      const pickerHeight = 280
      const pickerWidth = 200
      
      if (containerRect) {
        if (top + pickerHeight > containerRect.bottom) {
          top = rect.top - pickerHeight - 4
        }
        if (left + pickerWidth > containerRect.right) {
          left = containerRect.right - pickerWidth - 8
        }
      }
      
      setPosition({ top, left })
    }
  }, [isOpen, anchorRef])

  // Focus filter input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose()
      }
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, anchorRef])

  const filteredSamples = DEFAULT_SAMPLES.filter(s =>
    s.toLowerCase().includes(filter.toLowerCase())
  )

  const handleSelect = useCallback((sample) => {
    onSelect(sample)
    setFilter('')
  }, [onSelect])

  if (!isOpen) return null

  return (
    <div 
      ref={pickerRef}
      className="instrument-picker"
      style={{ top: position.top, left: position.left }}
      role="listbox"
      aria-label="Select instrument"
    >
      <input
        ref={inputRef}
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search..."
        className="instrument-picker-search"
      />
      <div className="instrument-picker-list">
        {filteredSamples.map(sample => (
          <div
            key={sample}
            className={`instrument-picker-item ${sample === currentInstrument ? 'selected' : ''}`}
            onClick={() => handleSelect(sample)}
            role="option"
            aria-selected={sample === currentInstrument}
          >
            {sample}
          </div>
        ))}
        {filteredSamples.length === 0 && (
          <div className="instrument-picker-empty">No instruments found</div>
        )}
      </div>
    </div>
  )
}

export default InstrumentPicker

