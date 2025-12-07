import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
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

// Waveform types for parsing
const WAVEFORM_TYPES = ['sine', 'saw', 'square', 'tri', 'rand', 'perlin']

// Parse pattern to extract base pattern, effects, and unsupported effects
function parsePattern(pattern) {
  const result = {
    basePattern: pattern,
    effects: {},
    signalEffects: {},
    unsupportedEffects: [],
  }

  // Initialize defaults
  for (const effect of EFFECT_ORDER) {
    result.effects[effect] = EFFECT_CONFIGS[effect].default
  }

  // Regex for signal effects: .effect(waveform.range(min, max).slow(x)) or .fast(x)
  const signalRegex = /\.(gain|lpf|room|delay|pan|distort)\((sine|saw|square|tri|rand|perlin)\.range\((\d+\.?\d*),\s*(\d+\.?\d*)\)(?:\.slow\((\d+\.?\d*)\)|\.fast\((\d+\.?\d*)\))?\)/g

  // Regex for static effects: .effect(number)
  const staticRegex = /\.(gain|lpf|room|delay|pan|distort)\((\d+\.?\d*)\)/g

  // Regex for any method call (to find unsupported effects)
  const anyMethodRegex = /\.(\w+)\([^)]*\)/g

  // Find all signal effects first
  let signalMatch
  const signalMatches = []
  while ((signalMatch = signalRegex.exec(pattern)) !== null) {
    const [fullMatch, effectName, waveform, minVal, maxVal, slowVal, fastVal] = signalMatch
    signalMatches.push({ fullMatch, index: signalMatch.index })
    
    let speed = 1
    if (slowVal) speed = 1 / parseFloat(slowVal)
    if (fastVal) speed = parseFloat(fastVal)
    
    result.signalEffects[effectName] = {
      waveform,
      min: parseFloat(minVal),
      max: parseFloat(maxVal),
      speed
    }
  }

  // Find all static effects
  let staticMatch
  const staticMatches = []
  while ((staticMatch = staticRegex.exec(pattern)) !== null) {
    const [fullMatch, effectName, value] = staticMatch
    // Only count as static if not part of a signal effect
    const isPartOfSignal = signalMatches.some(sm => 
      staticMatch.index >= sm.index && staticMatch.index < sm.index + sm.fullMatch.length
    )
    if (!isPartOfSignal && EFFECT_ORDER.includes(effectName)) {
      staticMatches.push({ fullMatch, index: staticMatch.index })
      result.effects[effectName] = parseFloat(value)
    }
  }

  // Find unsupported effects
  let anyMatch
  while ((anyMatch = anyMethodRegex.exec(pattern)) !== null) {
    const methodName = anyMatch[1]
    // Check if it's a supported effect or common Strudel methods
    const supportedMethods = [...EFFECT_ORDER, 'range', 'slow', 'fast', 'play', ...WAVEFORM_TYPES]
    const isKnownMethod = supportedMethods.includes(methodName) || 
      methodName.startsWith('s') || // s(), sound(), etc.
      methodName === 'note' ||
      methodName === 'n' ||
      methodName === 'speed' ||
      methodName === 'cut' ||
      methodName === 'hush'
    
    // Check if this match is part of a signal effect
    const isPartOfSignal = signalMatches.some(sm => 
      anyMatch.index >= sm.index && anyMatch.index < sm.index + sm.fullMatch.length
    )
    
    if (!isKnownMethod && !isPartOfSignal) {
      // Check if we already have this effect
      const existingIndex = result.unsupportedEffects.findIndex(e => e.startsWith(`.${methodName}(`))
      if (existingIndex === -1) {
        result.unsupportedEffects.push(anyMatch[0])
      }
    }
  }

  // Extract base pattern by removing all known effects from the end
  let basePattern = pattern
  
  // Remove signal effects
  for (const sm of signalMatches) {
    basePattern = basePattern.replace(sm.fullMatch, '')
  }
  
  // Remove static effects for supported types
  for (const sm of staticMatches) {
    basePattern = basePattern.replace(sm.fullMatch, '')
  }
  
  // Remove unsupported effects (they'll be added back)
  for (const ue of result.unsupportedEffects) {
    basePattern = basePattern.replace(ue, '')
  }
  
  result.basePattern = basePattern.trim()

  return result
}

// Build signal code from signal object
function buildSignalCode(signal) {
  let code = `${signal.waveform}.range(${signal.min}, ${signal.max})`
  if (signal.speed < 1) {
    code += `.slow(${Math.round(1 / signal.speed)})`
  } else if (signal.speed > 1) {
    code += `.fast(${signal.speed})`
  }
  return code
}

function TrackEffects({ 
  trackNumber, 
  color, 
  position, 
  pattern, 
  onClose, 
  onEffectChange 
}) {
  const panelRef = useRef(null)
  const headerRef = useRef(null)
  const isDragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  
  const [panelPosition, setPanelPosition] = useState(position)
  const lastUpdate = useRef(0)

  // Parse the pattern on mount
  const parsed = useMemo(() => parsePattern(pattern), [pattern])
  
  // State for static effect values
  const [effects, setEffects] = useState(parsed.effects)
  
  // State for signal effects (null = static mode, object = signal mode)
  const [signalEffects, setSignalEffects] = useState(parsed.signalEffects)

  // Build effect chain string
  const buildEffectChain = useCallback((effectValues, signalValues) => {
    let chain = ''
    
    // Add unsupported effects first (preserve them)
    for (const ue of parsed.unsupportedEffects) {
      chain += ue
    }
    
    // Add supported effects in fixed order
    for (const effect of EFFECT_ORDER) {
      const signalVal = signalValues[effect]
      const staticVal = effectValues[effect]
      const defaultVal = EFFECT_CONFIGS[effect].default
      
      if (signalVal) {
        // Signal mode
        chain += `.${effect}(${buildSignalCode(signalVal)})`
      } else if (Math.abs(staticVal - defaultVal) > 0.001) {
        // Static mode with non-default value
        const rounded = effect === 'lpf' ? Math.round(staticVal) : 
          staticVal >= 100 ? Math.round(staticVal) :
          staticVal >= 10 ? Math.round(staticVal * 10) / 10 :
          Math.round(staticVal * 100) / 100
        chain += `.${effect}(${rounded})`
      }
    }
    return chain
  }, [parsed.unsupportedEffects])

  // Apply effects to pattern
  const applyEffects = useCallback((effectValues, signalValues) => {
    const now = Date.now()
    if (now - lastUpdate.current < 100) return // Throttle to 10fps for smooth transitions
    lastUpdate.current = now

    const effectChain = buildEffectChain(effectValues, signalValues)
    const fullPattern = `${parsed.basePattern}${effectChain}`
    
    try {
      // Validate syntax
      eval(`(${fullPattern})`)
      // Update pattern - App.jsx will replay all patterns
      onEffectChange(fullPattern)
    } catch (err) {
      console.error('Error applying effects:', err)
    }
  }, [parsed.basePattern, buildEffectChain, onEffectChange])

  // Handle static effect change
  const handleEffectChange = useCallback((effect, value) => {
    setEffects(prev => {
      const next = { ...prev, [effect]: value }
      applyEffects(next, signalEffects)
      return next
    })
  }, [applyEffects, signalEffects])

  // Handle signal effect change
  const handleSignalChange = useCallback((effect, signalValue) => {
    setSignalEffects(prev => {
      const next = { ...prev }
      if (signalValue === null) {
        delete next[effect]
      } else {
        next[effect] = signalValue
      }
      applyEffects(effects, next)
      return next
    })
  }, [applyEffects, effects])

  // Reset all effects to defaults
  const handleResetAll = useCallback(() => {
    const defaults = {}
    for (const effect of EFFECT_ORDER) {
      defaults[effect] = EFFECT_CONFIGS[effect].default
    }
    setEffects(defaults)
    setSignalEffects({})
    
    // Apply base pattern only (with unsupported effects)
    const unsupportedChain = parsed.unsupportedEffects.join('')
    const resetPattern = `${parsed.basePattern}${unsupportedChain}`
    
    try {
      // Validate syntax
      eval(`(${resetPattern})`)
      // Update pattern - App.jsx will replay all patterns
      onEffectChange(resetPattern)
    } catch (err) {
      console.error('Error resetting effects:', err)
    }
  }, [parsed.basePattern, parsed.unsupportedEffects, onEffectChange])

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
    if (!isDragging.current) return
    setPanelPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Mouse event listeners for dragging
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  return (
    <div
      ref={panelRef}
      className="track-effects-panel"
      style={{
        left: panelPosition.x,
        top: panelPosition.y,
        '--track-color': color
      }}
    >
      <div 
        ref={headerRef}
        className="track-effects-header"
        onMouseDown={handleMouseDown}
      >
        <span className="track-effects-title">Track {trackNumber} Effects</span>
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
            value={effects[effect]}
            onChange={(val) => handleEffectChange(effect, val)}
            color={color}
            config={EFFECT_CONFIGS[effect]}
            signalValue={signalEffects[effect] || null}
            onSignalChange={(sig) => handleSignalChange(effect, sig)}
          />
        ))}
      </div>
      {parsed.unsupportedEffects.length > 0 && (
        <div className="unsupported-effects">
          <span className="unsupported-label">Other effects:</span>
          <code className="unsupported-code">
            {parsed.unsupportedEffects.join('')}
          </code>
        </div>
      )}
    </div>
  )
}

export default TrackEffects
