import { useState, useRef, useCallback, useEffect } from 'react'

function Knob({ value, min, max, onChange, label, color, logarithmic = false }) {
  const knobRef = useRef(null)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startValue = useRef(0)
  const lastUpdate = useRef(0)

  // Convert between linear (0-1) and actual value scales
  const toLinear = useCallback((val) => {
    // Clamp input value
    const clampedVal = Math.max(min, Math.min(max, val))
    
    if (logarithmic && min > 0) {
      const minLog = Math.log(min)
      const maxLog = Math.log(max)
      return (Math.log(clampedVal) - minLog) / (maxLog - minLog)
    }
    
    if (max === min) return 0
    return (clampedVal - min) / (max - min)
  }, [min, max, logarithmic])

  const fromLinear = useCallback((linear) => {
    if (logarithmic) {
      const minLog = Math.log(min)
      const maxLog = Math.log(max)
      return Math.exp(minLog + linear * (maxLog - minLog))
    }
    return min + linear * (max - min)
  }, [min, max, logarithmic])

  // Calculate arc path for filled progress
  const getArcPath = useCallback((rawPercentage) => {
    // Handle invalid values
    if (!Number.isFinite(rawPercentage)) return ''
    
    // Clamp percentage to valid range
    const percentage = Math.max(0, Math.min(1, rawPercentage))
    
    if (percentage <= 0.005) return ''
    
    const size = 48
    const strokeWidth = 4
    const radius = (size - strokeWidth) / 2
    const center = size / 2
    
    // Arc goes from 135° to 405° (270° total sweep)
    const startAngle = 135
    const sweepAngle = percentage * 270
    const endAngle = startAngle + sweepAngle
    
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    
    // Round to avoid floating point precision issues
    const x1 = Math.round((center + radius * Math.cos(startRad)) * 100) / 100
    const y1 = Math.round((center + radius * Math.sin(startRad)) * 100) / 100
    const x2 = Math.round((center + radius * Math.cos(endRad)) * 100) / 100
    const y2 = Math.round((center + radius * Math.sin(endRad)) * 100) / 100
    
    // Large arc flag: 1 if sweep > 180°
    const largeArc = sweepAngle > 180 ? 1 : 0
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
  }, [])

  // Format value for display
  const formatValue = useCallback((val) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`
    if (val >= 100) return Math.round(val).toString()
    if (val >= 10) return val.toFixed(1)
    return val.toFixed(2)
  }, [])

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    isDragging.current = true
    startY.current = e.clientY
    startValue.current = toLinear(value)
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }, [value, toLinear])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return
    
    // Throttle to 60fps
    const now = Date.now()
    if (now - lastUpdate.current < 16) return
    lastUpdate.current = now

    const deltaY = startY.current - e.clientY
    const sensitivity = 0.005
    const newLinear = Math.max(0, Math.min(1, startValue.current + deltaY * sensitivity))
    const newValue = fromLinear(newLinear)
    
    onChange(newValue)
  }, [fromLinear, onChange])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const percentage = toLinear(value)
  const arcPath = getArcPath(percentage)

  return (
    <div className="knob" ref={knobRef}>
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        onMouseDown={handleMouseDown}
        style={{ cursor: 'ns-resize' }}
      >
        {/* Background track */}
        <path
          d={getArcPath(1)}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Active arc */}
        {arcPath && (
          <path
            d={arcPath}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />
        )}
        {/* Center dot */}
        <circle cx="24" cy="24" r="6" fill="rgba(255, 255, 255, 0.15)" />
      </svg>
      <span className="knob-value" style={{ color }}>{formatValue(value)}</span>
      <span className="knob-label">{label}</span>
    </div>
  )
}

export default Knob

