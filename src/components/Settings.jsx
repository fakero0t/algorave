import { useEffect } from 'react'

function Settings({ onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="settings-section">
          <h3>Keyboard Shortcuts</h3>
          <div className="shortcuts-list">
            <div className="shortcut-row">
              <span className="shortcut-key">⌘.</span>
              <span className="shortcut-desc">Silence all (hush)</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">Enter</span>
              <span className="shortcut-desc">Execute pattern</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">⇧Enter</span>
              <span className="shortcut-desc">New line</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">Esc</span>
              <span className="shortcut-desc">Clear input / Close</span>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>About</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Algorave Strudel is a web-based live coding environment powered by{' '}
            <a href="https://strudel.cc" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--orange)' }}>
              Strudel
            </a>
            , a JavaScript port of TidalCycles.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Settings

