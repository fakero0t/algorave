/**
 * Code Parser Utility
 * Converts Strudel pattern code back into track grid state
 */

/**
 * Parse a Strudel pattern string into track grid data
 * @param {string} code - Strudel pattern code like 'note("c3 ~ ~ ~ e3").s("piano")' or 's("bd ~ ~ ~ hh")'
 * @returns {Object|null} - { instrument, mode, melodicNotes?, percussiveNotes? } or null if invalid
 */
export function parsePattern(code) {
  if (!code || typeof code !== 'string') return null
  
  const trimmed = code.trim()
  if (!trimmed) return null

  // Extract FX chain (everything after the pattern)
  // For now, we'll ignore FX in parsing and just extract the core pattern
  // FX will be preserved separately in trackFx state
  
  // Pattern 1: Melodic - note("pattern").s("instrument")
  const melodicMatch = trimmed.match(/^note\s*\(\s*"([^"]+)"\s*\)\s*\.s\s*\(\s*"([^"]+)"\s*\)/)
  if (melodicMatch) {
    const pattern = melodicMatch[1]
    const instrument = melodicMatch[2]
    const notes = parsePatternString(pattern, 'melodic')
    if (notes && notes.length > 0) {
      return {
        instrument,
        mode: 'melodic',
        melodicNotes: notes,
        percussiveNotes: []
      }
    }
  }

  // Pattern 2: Percussive - s("pattern") or s("bd ~ ~ ~ hh")
  const percussiveMatch = trimmed.match(/^s\s*\(\s*"([^"]+)"\s*\)/)
  if (percussiveMatch) {
    const pattern = percussiveMatch[1]
    // Try to extract instrument from pattern (first non-rest token)
    const tokens = pattern.split(/\s+/).filter(t => t && t !== '~')
    if (tokens.length > 0) {
      // For percussive, the instrument is typically the first unique sample name
      // We'll use the first token as the instrument
      const instrument = tokens[0].replace(/[\[\]]/g, '') // Remove brackets if present
      const notes = parsePatternString(pattern, 'percussive', instrument)
      if (notes && notes.length > 0) {
        return {
          instrument,
          mode: 'percussive',
          melodicNotes: [],
          percussiveNotes: notes
        }
      }
    }
  }

  // Pattern 3: Simple pattern without wrapper - try to infer
  // If it looks like a pattern string, try to parse it
  if (trimmed.includes('~') || /^[a-z0-9\[\],\s]+$/i.test(trimmed)) {
    // Could be a raw pattern, but we need instrument and mode
    // For now, return null - user needs to provide full pattern
    return null
  }

  return null
}

/**
 * Parse a pattern string (the part inside quotes) into note array
 * @param {string} patternStr - Pattern string like "c3 ~ ~ ~ e3 ~ ~ ~ g3"
 * @param {string} mode - 'melodic' or 'percussive'
 * @param {string} instrument - Instrument name (for percussive mode)
 * @returns {Array} - Array of { step, note } objects
 */
function parsePatternString(patternStr, mode, instrument = null) {
  if (!patternStr) return []
  
  const tokens = patternStr.split(/\s+/).filter(t => t)
  const notes = []
  
  tokens.forEach((token, index) => {
    if (token === '~') return // Skip rests
    
    // Handle chords: [c3,e3] or [bd,hh]
    if (token.startsWith('[') && token.endsWith(']')) {
      const chordContent = token.slice(1, -1)
      const chordNotes = chordContent.split(',').map(n => n.trim()).filter(n => n)
      chordNotes.forEach(note => {
        if (mode === 'melodic') {
          notes.push({ step: index, note })
        } else {
          // For percussive, each sample in chord is a separate note
          notes.push({ step: index, note: note || instrument })
        }
      })
    } else {
      // Single note
      if (mode === 'melodic') {
        notes.push({ step: index, note: token })
      } else {
        // For percussive, use the token as the note (sample name)
        notes.push({ step: index, note: token || instrument })
      }
    }
  })
  
  return notes
}

/**
 * Extract FX chain from code (everything after the base pattern)
 * This is used to preserve FX when parsing
 * @param {string} code - Full Strudel code
 * @returns {string} - FX chain string like ".gain(0.8).lpf(2000)"
 */
export function extractFxChain(code) {
  if (!code || typeof code !== 'string') return ''
  
  // Find where the base pattern ends
  // For melodic: note("...").s("...")
  // For percussive: s("...")
  const melodicEnd = code.match(/^note\s*\([^)]+\)\s*\.s\s*\([^)]+\)/)
  const percussiveEnd = code.match(/^s\s*\([^)]+\)/)
  
  if (melodicEnd) {
    return code.slice(melodicEnd[0].length).trim()
  } else if (percussiveEnd) {
    return code.slice(percussiveEnd[0].length).trim()
  }
  
  return ''
}

