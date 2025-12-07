import { useState, useEffect, useCallback } from 'react'
import EventStream from './components/EventStream'
import SampleBrowser from './components/SampleBrowser'
import Settings from './components/Settings'
import { ToastProvider } from './components/Toast'

// Default settings
const DEFAULT_SETTINGS = {
  tempo: 120,
  maxPolyphony: 64,
  multiChannelOrbits: false
}

// LocalStorage keys
const STORAGE_KEYS = {
  patterns: 'algorave_patterns',
  tempo: 'algorave_tempo'
}

// Load saved state from localStorage
function loadSavedState() {
  try {
    const savedPatterns = localStorage.getItem(STORAGE_KEYS.patterns)
    const savedTempo = localStorage.getItem(STORAGE_KEYS.tempo)
    return {
      patterns: savedPatterns ? JSON.parse(savedPatterns) : {},
      tempo: savedTempo ? parseInt(savedTempo) : DEFAULT_SETTINGS.tempo
    }
  } catch (e) {
    console.error('Error loading saved state:', e)
    return { patterns: {}, tempo: DEFAULT_SETTINGS.tempo }
  }
}

function AppContent() {
  const savedState = loadSavedState()
  const [patterns, setPatterns] = useState(savedState.patterns)
  const [showSettings, setShowSettings] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [tempo, setTempo] = useState(savedState.tempo)
  const [tempoInput, setTempoInput] = useState(String(savedState.tempo))
  const [settings, setSettings] = useState({
    maxPolyphony: DEFAULT_SETTINGS.maxPolyphony,
    multiChannelOrbits: DEFAULT_SETTINGS.multiChannelOrbits
  })

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
  const playAllPatterns = useCallback((patternsToPlay) => {
    const activePatterns = Object.entries(patternsToPlay)
      .filter(([_, code]) => code)
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

  // Replay saved patterns after Strudel initializes
  useEffect(() => {
    if (!isInitialized) return
    playAllPatterns(patterns)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]) // Only run once when initialized

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

  const handlePatternUpdate = useCallback((slot, code, skipPlay = false) => {
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
      
      // Replay all patterns with the update (unless skipPlay is true)
      if (!skipPlay) {
        // Use setTimeout to ensure state is updated first
        setTimeout(() => playAllPatterns(next), 0)
      }
      
      return next
    })
  }, [playAllPatterns])

  const handleHush = useCallback(() => {
    // Stop current player
    if (window._currentPlayer) {
      try {
        window._currentPlayer.stop()
      } catch (e) {}
      window._currentPlayer = null
    }
    // Also call global hush as backup
    if (window.hush) {
      window.hush()
    }
    setPatterns({})
    // Clear saved patterns from localStorage
    localStorage.setItem(STORAGE_KEYS.patterns, JSON.stringify({}))
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + . = Hush (panic)
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        handleHush()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleHush])

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="app-logo">⌁</span>
          <span className="app-name">Algorave</span>
          <span className={`status-badge ${isInitialized ? 'ready' : 'loading'}`}>
            {isInitialized ? '● Ready' : '○ Loading...'}
          </span>
        </div>
        <div className="header-center">
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
            className="hush-btn"
            onClick={handleHush}
            title="Stop all (Cmd/Ctrl + .)"
            disabled={!isInitialized}
          >
            Silence All
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
        onHush={handleHush}
        isInitialized={isInitialized}
      />
      
      <SampleBrowser />
      
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
