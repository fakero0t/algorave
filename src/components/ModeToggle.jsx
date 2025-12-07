function ModeToggle({ mode, onChange, disabled }) {
  const handleClick = () => {
    if (disabled) return
    
    if (mode === null || mode === undefined) {
      onChange('melodic')
    } else if (mode === 'melodic') {
      onChange('percussive')
    } else {
      onChange('melodic')
    }
  }

  const getIcon = () => {
    if (mode === 'melodic') return '🎹'
    if (mode === 'percussive') return '🥁'
    return '?'
  }

  const getTitle = () => {
    if (disabled) return 'Select an instrument first'
    if (mode === 'melodic') return 'Melodic mode - click to switch to percussive'
    if (mode === 'percussive') return 'Percussive mode - click to switch to melodic'
    return 'Click to select mode'
  }

  return (
    <button
      className={`track-mode-toggle ${mode || 'unset'} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      disabled={disabled}
      title={getTitle()}
      aria-label="Select mode: melodic or percussive"
    >
      {getIcon()}
    </button>
  )
}

export default ModeToggle

