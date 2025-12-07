import { useState, useEffect, useCallback, useMemo } from 'react'
import EventStream from './components/EventStream'
import SampleBrowser from './components/SampleBrowser'
import Settings from './components/Settings'
import { ToastProvider } from './components/Toast'
import { generatePattern } from './utils/codeGenerator'

// Default settings
const DEFAULT_SETTINGS = {
  tempo: 120,
  maxPolyphony: 64,
  multiChannelOrbits: false
}

// LocalStorage keys
const STORAGE_KEYS = {
  patterns: 'algorave_patterns',
  tempo: 'algorave_tempo',
  trackNames: 'algorave_track_names',
  trackGrids: 'algorave_track_grids',
  trackFx: 'algorave_track_fx'
}

// Load saved state from localStorage
function loadSavedState() {
  try {
    const savedPatterns = localStorage.getItem(STORAGE_KEYS.patterns)
    const savedTempo = localStorage.getItem(STORAGE_KEYS.tempo)
    const savedTrackNames = localStorage.getItem(STORAGE_KEYS.trackNames)
    const savedTrackGrids = localStorage.getItem(STORAGE_KEYS.trackGrids)
    const savedTrackFx = localStorage.getItem(STORAGE_KEYS.trackFx)
    return {
      patterns: savedPatterns ? JSON.parse(savedPatterns) : {},
      tempo: savedTempo ? parseInt(savedTempo) : DEFAULT_SETTINGS.tempo,
      trackNames: savedTrackNames ? JSON.parse(savedTrackNames) : {},
      trackGrids: savedTrackGrids ? JSON.parse(savedTrackGrids) : {},
      trackFx: savedTrackFx ? JSON.parse(savedTrackFx) : {}
    }
  } catch (e) {
    console.error('Error loading saved state:', e)
    return { patterns: {}, tempo: DEFAULT_SETTINGS.tempo, trackNames: {}, trackGrids: {}, trackFx: {} }
  }
}

function AppContent() {
  const savedState = loadSavedState()
  const [patterns, setPatterns] = useState(savedState.patterns)
  const [trackNames, setTrackNames] = useState(savedState.trackNames)
  const [trackGrids, setTrackGrids] = useState(savedState.trackGrids)
  const [trackFx, setTrackFx] = useState(savedState.trackFx)
  const [sampleBrowserOpen, setSampleBrowserOpen] = useState(false)
  const [mutedChannels, setMutedChannels] = useState(new Set())
  const [isPlaying, setIsPlaying] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [tempo, setTempo] = useState(savedState.tempo)
  const [tempoInput, setTempoInput] = useState(String(savedState.tempo))
  const [settings, setSettings] = useState({
    maxPolyphony: DEFAULT_SETTINGS.maxPolyphony,
    multiChannelOrbits: DEFAULT_SETTINGS.multiChannelOrbits
  })

  // Handle track name update
  const handleTrackNameUpdate = useCallback((slot, name) => {
    setTrackNames(prev => {
      const next = { ...prev }
      if (name && name.trim()) {
        next[slot] = name.trim()
      } else {
        delete next[slot] // Remove to use default
      }
      localStorage.setItem(STORAGE_KEYS.trackNames, JSON.stringify(next))
      return next
    })
  }, [])

  // Handle track grid update (instrument, mode, notes)
  const handleTrackGridUpdate = useCallback((slot, gridData) => {
    setTrackGrids(prev => {
      const next = { ...prev }
      if (gridData === null) {
        delete next[slot]
      } else {
        next[slot] = gridData
      }
      localStorage.setItem(STORAGE_KEYS.trackGrids, JSON.stringify(next))
      return next
    })
  }, [])

  // Handle track FX update
  const handleTrackFxUpdate = useCallback((slot, fxData) => {
    setTrackFx(prev => {
      const next = { ...prev }
      if (fxData === null) {
        delete next[slot]
      } else {
        next[slot] = fxData
      }
      localStorage.setItem(STORAGE_KEYS.trackFx, JSON.stringify(next))
      return next
    })
  }, [])

  // Generate patterns from track grids
  const generatedPatterns = useMemo(() => {
    const newPatterns = {}
    Object.entries(trackGrids).forEach(([slot, grid]) => {
      const fx = trackFx[slot] || {}
      const code = generatePattern(grid, fx)
      if (code) {
        newPatterns[slot] = code
      }
    })
    return newPatterns
  }, [trackGrids, trackFx])

  // Sync generated patterns to state and replay if playing
  useEffect(() => {
    setPatterns(prev => {
      const next = { ...prev }
      
      // Remove patterns for slots that no longer have trackGrids
      // (track was cleared/reset)
      Object.keys(next).forEach(slot => {
        if (!trackGrids[slot]) {
          delete next[slot]
        }
      })
      
      // Update patterns from grids
      Object.keys(generatedPatterns).forEach(slot => {
        next[slot] = generatedPatterns[slot]
      })
      
      // Remove patterns for slots with grids but no notes
      Object.keys(trackGrids).forEach(slot => {
        if (!generatedPatterns[slot]) {
          delete next[slot]
        }
      })
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.patterns, JSON.stringify(next))
      
      return next
    })
    
    // Replay if currently playing
    if (isPlaying) {
      setTimeout(() => {
        playAllPatterns(generatedPatterns, mutedChannels)
      }, 0)
    }
  }, [generatedPatterns, trackGrids]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize Strudel on mount
  useEffect(() => {
    const loadStrudel = async () => {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/@strudel/web@latest'
      script.onload = async () => {
        const strudelApi = await window.initStrudel()
        console.log('Strudel API:', strudelApi)
        console.log('Window repl:', window.repl)
        
        // Load default drum samples after init
        await window.samples('github:tidalcycles/dirt-samples')
        // Set saved tempo
        if (window.setcps) {
          const saved = loadSavedState()
          window.setcps(saved.tempo / 60 / 2)
        }
        
        // Store the repl reference for pattern management
        window._strudelRepl = strudelApi?.repl || window.repl
        
        // Create a registry to store playing pattern references
        // This allows us to stop specific patterns without affecting others
        window._patternPlayers = {}
        
        setIsInitialized(true)
      }
      document.head.appendChild(script)
    }
    loadStrudel()
  }, [])

  // Function to play all active patterns as a stacked pattern
  const playAllPatterns = useCallback((patternsToPlay, muted = new Set()) => {
    const activePatterns = Object.entries(patternsToPlay)
      .filter(([slot, code]) => code && !muted.has(slot))
      .map(([slot, code]) => {
        const orbitNum = parseInt(slot.replace('d', '')) - 1
        return `(${code}).orbit(${orbitNum})`
      })
    
    if (activePatterns.length === 0) {
      // Nothing to play, stop current
      if (window._currentPlayer) {
        try { window._currentPlayer.stop() } catch (e) {}
        window._currentPlayer = null
      }
      return
    }
    
    // Stop current player before starting new one
    if (window._currentPlayer) {
      try { window._currentPlayer.stop() } catch (e) {}
    }
    
    // Stack all patterns and play
    const stackedCode = activePatterns.length === 1 
      ? activePatterns[0]
      : `stack(${activePatterns.join(', ')})`
    
    try {
      window._currentPlayer = eval(`(${stackedCode}).play()`)
    } catch (err) {
      console.error('Error playing stacked patterns:', err)
    }
  }, [])

  // Don't auto-play on init - wait for user to press Play
  // (Patterns are loaded from localStorage but not played until Play is pressed)

  // Handle Play button
  const handlePlay = useCallback(() => {
    if (!isInitialized) return
    playAllPatterns(patterns, mutedChannels)
    setIsPlaying(true)
  }, [isInitialized, patterns, mutedChannels, playAllPatterns])

  // Handle Stop button
  const handleStop = useCallback(() => {
    if (window._currentPlayer) {
      try {
        window._currentPlayer.stop()
      } catch (e) {}
      window._currentPlayer = null
    }
    if (window.hush) {
      window.hush()
    }
    setIsPlaying(false)
  }, [])

  // Update tempo when it changes
  const applyTempo = useCallback((newTempo) => {
    const bpm = Math.max(20, Math.min(300, newTempo))
    setTempo(bpm)
    setTempoInput(String(bpm))
    const cps = bpm / 60 / 2
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.tempo, String(bpm))
    
    // Set tempo via scheduler's cps property
    const scheduler = window._strudelScheduler
    if (scheduler) {
      scheduler.cps = cps
    }
  }, [])

  // Handle tempo input change (allow free typing)
  const handleTempoInputChange = useCallback((e) => {
    setTempoInput(e.target.value)
  }, [])

  // Apply tempo on blur or Enter
  const handleTempoInputBlur = useCallback(() => {
    const parsed = parseInt(tempoInput)
    if (!isNaN(parsed) && parsed >= 20 && parsed <= 300) {
      applyTempo(parsed)
    } else {
      // Reset to current tempo if invalid
      setTempoInput(String(tempo))
    }
  }, [tempoInput, tempo, applyTempo])

  const handleTempoInputKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    }
  }, [])

  // Update settings
  const handleSettingsChange = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    // Apply settings to Strudel if needed
    if (key === 'maxPolyphony' && window.superdough) {
      // Strudel's superdough can limit polyphony
    }
  }, [])

  // Restore default settings
  const handleRestoreDefaults = useCallback(() => {
    applyTempo(DEFAULT_SETTINGS.tempo)
    setSettings({
      maxPolyphony: DEFAULT_SETTINGS.maxPolyphony,
      multiChannelOrbits: DEFAULT_SETTINGS.multiChannelOrbits
    })
  }, [applyTempo])

  const handlePatternUpdate = useCallback((slot, code) => {
    // Clear mute state for this slot when updating
    setMutedChannels(prev => {
      const next = new Set(prev)
      next.delete(slot)
      return next
    })
    
    setPatterns(prev => {
      let next
      if (code === null) {
        // Remove pattern (silence)
        next = { ...prev }
        delete next[slot]
      } else {
        next = { ...prev, [slot]: code }
      }
      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.patterns, JSON.stringify(next))
      
      // Only replay if currently playing
      if (isPlaying) {
        // Get updated muted set (with this slot removed)
        const updatedMuted = new Set(mutedChannels)
        updatedMuted.delete(slot)
        // Use setTimeout to ensure state is updated first
        setTimeout(() => playAllPatterns(next, updatedMuted), 0)
      }
      
      return next
    })
  }, [playAllPatterns, mutedChannels, isPlaying])

  // Toggle mute for a single channel
  const handleToggleMute = useCallback((slot) => {
    setMutedChannels(prev => {
      const next = new Set(prev)
      if (next.has(slot)) {
        next.delete(slot)
      } else {
        next.add(slot)
      }
      // Replay patterns with updated mute state (only if playing)
      if (isPlaying) {
        setTimeout(() => playAllPatterns(patterns, next), 0)
      }
      return next
    })
  }, [patterns, playAllPatterns, isPlaying])

  // Mute all active tracks (Silence All)
  const handleMuteAll = useCallback(() => {
    const activeSlots = Object.keys(patterns).filter(slot => patterns[slot])
    if (activeSlots.length === 0) return
    
    // Check if all are already muted
    const allMuted = activeSlots.every(slot => mutedChannels.has(slot))
    
    if (allMuted) {
      // Unmute all
      setMutedChannels(new Set())
      if (isPlaying) {
        playAllPatterns(patterns, new Set())
      }
    } else {
      // Mute all active tracks
      const allMutedSet = new Set(activeSlots)
      setMutedChannels(allMutedSet)
      // Stop audio if playing
      if (isPlaying) {
        if (window._currentPlayer) {
          try { window._currentPlayer.stop() } catch (e) {}
          window._currentPlayer = null
        }
        if (window.hush) {
          window.hush()
        }
      }
    }
  }, [patterns, mutedChannels, playAllPatterns, isPlaying])


  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + . = Mute all (toggle)
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        handleMuteAll()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleMuteAll])

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="app-logo">⌁</span>
          <span className="app-name">Algorave</span>
          <span className={`status-badge ${isInitialized ? 'ready' : 'loading'}`}>
            {isInitialized ? '● Ready' : '○ Loading...'}
          </span>
          <button 
            className={`samples-toggle-btn ${sampleBrowserOpen ? 'active' : ''}`}
            onClick={() => setSampleBrowserOpen(!sampleBrowserOpen)}
          >
            Samples {sampleBrowserOpen ? '▼' : '▶'}
          </button>
        </div>
        <div className="header-center">
          <div className="transport-controls">
            <button 
              className={`transport-btn play-btn ${isPlaying ? 'active' : ''}`}
              onClick={handlePlay}
              title="Play all patterns"
              disabled={!isInitialized || Object.keys(patterns).filter(k => patterns[k]).length === 0}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Play
            </button>
            <button 
              className={`transport-btn stop-btn ${!isPlaying ? 'active' : ''}`}
              onClick={handleStop}
              title="Stop all patterns"
              disabled={!isInitialized || !isPlaying}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
              Stop
            </button>
          </div>
          <div className="tempo-control">
            <label className="tempo-label">BPM</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="tempo-input"
              value={tempoInput}
              onChange={handleTempoInputChange}
              onBlur={handleTempoInputBlur}
              onKeyDown={handleTempoInputKeyDown}
              disabled={!isInitialized}
            />
          </div>
          <button 
            className="mute-all-btn"
            onClick={handleMuteAll}
            title="Mute/Unmute all tracks"
            disabled={!isInitialized || Object.keys(patterns).filter(k => patterns[k]).length === 0}
          >
            {Object.keys(patterns).length > 0 && 
             Object.keys(patterns).every(slot => mutedChannels.has(slot)) 
              ? 'Unmute All' 
              : 'Mute All'}
          </button>
        </div>
        <div className="header-right">
          <button 
            className="header-settings-btn"
            onClick={() => setShowSettings(true)}
            title="Settings"
            aria-label="Open settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
          </button>
        </div>
      </header>
      
      <EventStream 
        patterns={patterns} 
        onPatternUpdate={handlePatternUpdate}
        mutedChannels={mutedChannels}
        onToggleMute={handleToggleMute}
        trackNames={trackNames}
        onTrackNameUpdate={handleTrackNameUpdate}
        trackGrids={trackGrids}
        onTrackGridUpdate={handleTrackGridUpdate}
        trackFx={trackFx}
        onTrackFxUpdate={handleTrackFxUpdate}
        isInitialized={isInitialized}
      />
      
      <SampleBrowser 
        isOpen={sampleBrowserOpen}
        onClose={() => setSampleBrowserOpen(false)}
      />
      
      {showSettings && (
        <Settings 
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onRestoreDefaults={handleRestoreDefaults}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

export default App
