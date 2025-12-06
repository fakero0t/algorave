import { useState, useRef, useEffect } from 'react'

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

function EventStream({ patterns, onPatternUpdate, isInitialized }) {
  const containerRef = useRef(null)
  const [editingSlot, setEditingSlot] = useState(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)

  // Focus input when editing starts
  useEffect(() => {
    if (editingSlot && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingSlot])

  const handlePatternClick = (slot, pattern) => {
    setEditingSlot(slot)
    setEditValue(pattern)
  }

  const handleKeyDown = async (e, slot) => {
    if (e.key === 'Enter' && editValue.trim()) {
      const code = editValue.trim()
      
      try {
        // Execute the pattern in Strudel
        await eval(`(async () => { ${code}.play() })()`)
        onPatternUpdate(slot, code)
      } catch (err) {
        console.error('Strudel error:', err)
      }
      
      setEditingSlot(null)
      setEditValue('')
    }
    
    if (e.key === 'Escape') {
      setEditingSlot(null)
      setEditValue('')
    }
  }

  const handleBlur = () => {
    setEditingSlot(null)
    setEditValue('')
  }

  return (
    <div ref={containerRef} className="event-stream">
      {Array.from({ length: 16 }, (_, i) => {
        const channelNum = i + 1
        const slot = `d${channelNum}`
        const pattern = patterns[slot]
        const color = CHANNEL_COLORS[i]
        const isActive = !!pattern
        const isEditing = editingSlot === slot

        return (
          <div
            key={slot}
            className={`channel-row ${isActive ? 'active' : ''} ${isEditing ? 'editing' : ''}`}
            style={{ '--channel-color': color }}
          >
            <span className="channel-label">{slot.toUpperCase()}</span>
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, slot)}
                onBlur={handleBlur}
                className="channel-edit-input"
                placeholder='s("bd sn")'
              />
            ) : pattern ? (
              <span 
                className="channel-pattern"
                onClick={() => handlePatternClick(slot, pattern)}
                title="Click to edit"
              >
                {pattern}
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default EventStream

