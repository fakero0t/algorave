/**
 * Code Generator Utility
 * Converts track grid state into Strudel pattern code
 */

/**
 * Generate a Strudel pattern string from track grid data
 * @param {Object} trackGrid - { instrument, mode, melodicNotes?, percussiveNotes? }
 * @param {Object} trackFx - { gain, lpf, room, delay, pan, distort, signals }
 * @returns {string|null} - Strudel pattern code or null if invalid
 */
export function generatePattern(trackGrid, trackFx = {}) {
  if (!trackGrid) return null
  
  const { instrument, mode, melodicNotes = [], percussiveNotes = [] } = trackGrid
  
  // Use the appropriate notes based on active mode
  const notes = mode === 'melodic' ? melodicNotes : percussiveNotes
  
  if (!instrument || !mode || notes.length === 0) {
    return null
  }
  
  // Build 16-slot array
  const slots = Array(16).fill('~')
  
  // Group notes by step (for chords in melodic mode)
  // Handle note durations using Strudel's elongation operator @
  const notesByStep = {}
  notes.forEach(n => {
    const startStep = n.step
    const duration = n.duration || 1
    
    // Only place the note at its start step, with duration specified using @
    if (!notesByStep[startStep]) notesByStep[startStep] = []
    
    if (mode === 'melodic') {
      // For melodic notes, use @ operator for duration > 1
      const noteValue = duration > 1 ? `${n.note}@${duration}` : n.note
      notesByStep[startStep].push(noteValue)
    } else {
      // For percussive notes, use @ operator for duration > 1
      const noteValue = duration > 1 ? `${instrument}@${duration}` : instrument
      notesByStep[startStep].push(noteValue)
    }
  })
  
  // Fill slots
  Object.entries(notesByStep).forEach(([step, stepNotes]) => {
    const stepNum = parseInt(step)
    if (stepNum >= 0 && stepNum < 16) {
      if (stepNotes.length === 1) {
        slots[stepNum] = stepNotes[0]
      } else {
        // Multiple notes = chord (each note can have its own duration)
        slots[stepNum] = `[${stepNotes.join(',')}]`
      }
    }
  })
  
  // Build pattern string
  const pattern = slots.join(' ')
  
  // Wrap based on mode
  let code
  if (mode === 'melodic') {
    code = `note("${pattern}").s("${instrument}")`
  } else {
    code = `s("${pattern}")`
  }
  
  // Append FX chain
  code += buildFxChain(trackFx)
  
  return code
}

/**
 * Build FX chain string from effect state
 * @param {Object} fx - Effect state object
 * @returns {string} - FX chain string like ".gain(0.8).lpf(2000)"
 */
function buildFxChain(fx) {
  if (!fx) return ''
  
  let chain = ''
  
  // Default values - only add effect if different from default
  const defaults = {
    gain: 1,
    lpf: 20000,
    room: 0,
    delay: 0,
    pan: 0.5,
    distort: 0
  }
  
  // Static effects
  for (const [effect, defaultVal] of Object.entries(defaults)) {
    const value = fx[effect]
    if (value !== undefined && Math.abs(value - defaultVal) > 0.001) {
      // Round appropriately based on effect type
      const rounded = effect === 'lpf' 
        ? Math.round(value) 
        : Math.round(value * 100) / 100
      chain += `.${effect}(${rounded})`
    }
  }
  
  // Signal effects (LFO modulation)
  if (fx.signals) {
    for (const [effect, signal] of Object.entries(fx.signals)) {
      if (!signal || !signal.waveform) continue
      
      let sigCode = `${signal.waveform}.range(${signal.min}, ${signal.max})`
      
      // Speed modifiers
      if (signal.speed < 1) {
        const slowAmount = Math.round(1 / signal.speed)
        sigCode += `.slow(${slowAmount})`
      } else if (signal.speed > 1) {
        sigCode += `.fast(${signal.speed})`
      }
      
      chain += `.${effect}(${sigCode})`
    }
  }
  
  return chain
}

/**
 * Get all note names for a given octave range
 * @param {number} startOctave - Starting octave (e.g., 3)
 * @param {number} numOctaves - Number of octaves to generate (e.g., 2)
 * @returns {Array} - Array of note objects { note: 'c3', label: 'C3', isBlack: false }
 */
export function getNoteNames(startOctave, numOctaves = 2) {
  const noteNames = ['c', 'cs', 'd', 'ds', 'e', 'f', 'fs', 'g', 'gs', 'a', 'as', 'b']
  const noteLabels = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const blackKeys = [1, 3, 6, 8, 10] // Indices of black keys (sharps)
  
  const notes = []
  
  for (let octave = startOctave + numOctaves - 1; octave >= startOctave; octave--) {
    for (let i = noteNames.length - 1; i >= 0; i--) {
      notes.push({
        note: `${noteNames[i]}${octave}`,
        label: `${noteLabels[i]}${octave}`,
        isBlack: blackKeys.includes(i)
      })
    }
  }
  
  return notes
}

