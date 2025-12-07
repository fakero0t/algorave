import { useEffect } from 'react'

function Settings({ onClose, settings, onSettingsChange, onRestoreDefaults }) {
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
          <h3>Audio</h3>
          <div className="settings-list">
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Maximum Polyphony</span>
                <span className="setting-desc">Limit simultaneous voices to reduce CPU usage</span>
              </div>
              <input
                type="number"
                className="setting-number-input"
                value={settings?.maxPolyphony ?? 64}
                onChange={(e) => onSettingsChange?.('maxPolyphony', parseInt(e.target.value) || 64)}
                min="1"
                max="128"
              />
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Multi-channel Orbits</span>
                <span className="setting-desc">Route orbits to separate audio channels</span>
              </div>
              <button
                className={`setting-toggle ${settings?.multiChannelOrbits ? 'active' : ''}`}
                onClick={() => onSettingsChange?.('multiChannelOrbits', !settings?.multiChannelOrbits)}
              >
                {settings?.multiChannelOrbits ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>Keyboard Shortcuts</h3>
          <div className="shortcuts-list">
            <div className="shortcut-row">
              <span className="shortcut-key">⌘.</span>
              <span className="shortcut-desc">Mute/Unmute all tracks</span>
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

        <div className="settings-section">
          <button className="restore-defaults-btn" onClick={onRestoreDefaults}>
            Restore Default Settings
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings
