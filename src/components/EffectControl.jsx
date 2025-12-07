import { useState, useCallback } from 'react'
import Knob from './Knob'

// Wave icon for signal mode toggle
const WaveIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12c2-3 4-6 6-6s4 6 6 6 4-6 6-6" />
  </svg>
)

// Waveform options
const WAVEFORMS = ['sine', 'saw', 'square', 'tri', 'rand', 'perlin']

// Default signal ranges per effect (musical defaults)
const SIGNAL_DEFAULTS = {
  gain: { min: 0.5, max: 1.5 },
  lpf: { min: 200, max: 2000 },
  room: { min: 0, max: 0.5 },
  delay: { min: 0, max: 0.5 },
  pan: { min: 0.3, max: 0.7 },
  distort: { min: 0, max: 3 },
}

function EffectControl({ 
  effect, 
  value, 
  onChange, 
  color, 
  config,
  signalValue,
  onSignalChange 
}) {
  const { min, max, logarithmic = false } = config
  
  // Determine if we're in signal mode from the signalValue prop
  const isSignalMode = signalValue !== null && signalValue !== undefined
  
  // Local state for signal controls when toggling to signal mode
  const [localSignal, setLocalSignal] = useState(() => ({
    waveform: 'sine',
    min: SIGNAL_DEFAULTS[effect]?.min ?? min,
    max: SIGNAL_DEFAULTS[effect]?.max ?? max,
    speed: 1
  }))

  // Get current signal state (from prop or local)
  const signal = isSignalMode ? signalValue : localSignal

  // Toggle between static and signal mode
  const handleModeToggle = useCallback(() => {
    if (isSignalMode) {
      // Switch to static mode - use the default value
      onSignalChange(null)
    } else {
      // Switch to signal mode - use local signal state
      onSignalChange(localSignal)
    }
  }, [isSignalMode, localSignal, onSignalChange])

  // Update signal parameter
  const handleSignalUpdate = useCallback((key, newValue) => {
    const updated = { ...signal, [key]: newValue }
    setLocalSignal(updated)
    if (isSignalMode) {
      onSignalChange(updated)
    }
  }, [signal, isSignalMode, onSignalChange])

  // Format speed display
  const formatSpeed = (speed) => {
    if (speed === 1) return '1×'
    if (speed < 1) return `${speed.toFixed(2)}×`
    return `${speed}×`
  }

  // Format range value
  const formatRangeValue = (val) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`
    if (val >= 100) return Math.round(val).toString()
    if (val >= 10) return val.toFixed(1)
    return val.toFixed(2)
  }

  return (
    <div className={`effect-control ${isSignalMode ? 'signal-mode' : ''}`}>
      {isSignalMode ? (
        // Signal mode controls
        <div className="signal-controls">
          <select 
            className="waveform-select"
            value={signal.waveform}
            onChange={(e) => handleSignalUpdate('waveform', e.target.value)}
            style={{ borderColor: color }}
          >
            {WAVEFORMS.map(wf => (
              <option key={wf} value={wf}>{wf}</option>
            ))}
          </select>
          
          <div className="range-sliders">
            <div className="range-slider-group">
              <input
                type="range"
                className="range-slider"
                min={min}
                max={max}
                step={logarithmic ? (max - min) / 100 : (max - min) / 100}
                value={signal.min}
                onChange={(e) => handleSignalUpdate('min', parseFloat(e.target.value))}
                orient="vertical"
                style={{ '--slider-color': color }}
              />
              <span className="range-label">{formatRangeValue(signal.min)}</span>
            </div>
            <div className="range-slider-group">
              <input
                type="range"
                className="range-slider"
                min={min}
                max={max}
                step={logarithmic ? (max - min) / 100 : (max - min) / 100}
                value={signal.max}
                onChange={(e) => handleSignalUpdate('max', parseFloat(e.target.value))}
                orient="vertical"
                style={{ '--slider-color': color }}
              />
              <span className="range-label">{formatRangeValue(signal.max)}</span>
            </div>
          </div>
          
          <div className="speed-control">
            <input
              type="range"
              className="speed-slider"
              min={0.25}
              max={4}
              step={0.25}
              value={signal.speed}
              onChange={(e) => handleSignalUpdate('speed', parseFloat(e.target.value))}
              style={{ '--slider-color': color }}
            />
            <span className="speed-label">{formatSpeed(signal.speed)}</span>
          </div>
          
          <span className="effect-label">{effect}</span>
        </div>
      ) : (
        // Static mode - show knob
        <Knob
          value={value}
          min={min}
          max={max}
          onChange={onChange}
          label={effect}
          color={color}
          logarithmic={logarithmic}
        />
      )}
      
      {/* Signal mode toggle */}
      <button 
        className={`mode-toggle ${isSignalMode ? 'active' : ''}`}
        onClick={handleModeToggle}
        title={isSignalMode ? 'Switch to static value' : 'Switch to signal modulation'}
        style={isSignalMode ? { borderColor: color, color } : {}}
      >
        <WaveIcon />
      </button>
    </div>
  )
}

export default EffectControl
