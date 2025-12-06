import { useState, useEffect, useCallback } from 'react'
import EventStream from './components/EventStream'
import CommandModal from './components/CommandModal'
import SampleBrowser from './components/SampleBrowser'
import Settings from './components/Settings'

function App() {
  const [patterns, setPatterns] = useState({})
  const [showSettings, setShowSettings] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize Strudel on mount
  useEffect(() => {
    const loadStrudel = async () => {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/@strudel/web@latest'
      script.onload = () => {
        window.initStrudel()
        setIsInitialized(true)
      }
      document.head.appendChild(script)
    }
    loadStrudel()
  }, [])

  const handlePatternUpdate = useCallback((slot, code) => {
    if (code === null) {
      // Remove pattern (silence)
      setPatterns(prev => {
        const next = { ...prev }
        delete next[slot]
        return next
      })
    } else {
      setPatterns(prev => ({ ...prev, [slot]: code }))
    }
  }, [])

  const handleHush = useCallback(() => {
    if (window.hush) {
      window.hush()
    }
    setPatterns({})
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
      <button 
        className="settings-toggle"
        onClick={() => setShowSettings(true)}
        title="Settings"
        aria-label="Open settings"
      >
        ⚙
      </button>
      
      <EventStream 
        patterns={patterns} 
        onPatternUpdate={handlePatternUpdate}
        isInitialized={isInitialized}
      />
      
      <CommandModal 
        patterns={patterns}
        onPatternUpdate={handlePatternUpdate}
        onHush={handleHush}
        isInitialized={isInitialized}
      />
      
      <SampleBrowser />
      
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}

export default App
