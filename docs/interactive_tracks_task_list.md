# Interactive Tracks - Implementation Task List

This document breaks the Interactive Tracks PRD into three sequential pull requests.

---

## PR 1: Foundation & Instrument Selection

### Overview
Set up the new state architecture, modify sample browser to be read-only with header toggle, and implement instrument/mode selection in track rows.

### Files to Create
- `src/components/InstrumentPicker.jsx`
- `src/components/ModeToggle.jsx`

### Files to Modify
- `src/App.jsx`
- `src/components/SampleBrowser.jsx`
- `src/components/EventStream.jsx`
- `src/index.css`

---

### Tasks

#### 1.1 New State Architecture in App.jsx
- [ ] Add `trackGrids` state: `useState({})`
- [ ] Add `trackFx` state: `useState({})`
- [ ] Add `sampleBrowserOpen` state: `useState(false)`
- [ ] Add new localStorage keys:
  ```javascript
  STORAGE_KEYS = {
    ...existing,
    trackGrids: 'algorave_track_grids',
    trackFx: 'algorave_track_fx',
  }
  ```
- [ ] Load `trackGrids` and `trackFx` from localStorage in `loadSavedState()`
- [ ] Create `handleTrackGridUpdate(slot, gridData)` callback
- [ ] Create `handleTrackFxUpdate(slot, fxData)` callback
- [ ] Pass new state/callbacks to EventStream

#### 1.2 Sample Browser - Read Only Mode
- [ ] Remove drag functionality from sample items:
  - Remove `draggable` attribute
  - Remove `onDragStart` handler
- [ ] Add X close button to header:
  ```jsx
  <button className="sample-browser-close" onClick={onClose}>×</button>
  ```
- [ ] Accept `isOpen` and `onClose` props
- [ ] Conditionally render based on `isOpen`
- [ ] Keep existing drag/resize for the panel itself
- [ ] Keep filter functionality

#### 1.3 Header Toggle Button
- [ ] Add "Samples" toggle button to header (in `header-left` after status badge):
  ```jsx
  <button 
    className="samples-toggle-btn"
    onClick={() => setSampleBrowserOpen(!sampleBrowserOpen)}
  >
    Samples {sampleBrowserOpen ? '▼' : '▶'}
  </button>
  ```
- [ ] Pass `isOpen` and `onClose` to SampleBrowser component
- [ ] Style the toggle button to match header aesthetic

#### 1.4 Create InstrumentPicker Component
- [ ] Create `src/components/InstrumentPicker.jsx`
- [ ] Props: `isOpen`, `onSelect`, `onClose`, `anchorRef`, `currentInstrument`
- [ ] Render dropdown anchored to button position
- [ ] Include search/filter input at top
- [ ] Show full sample list (use same `DEFAULT_SAMPLES` from SampleBrowser)
- [ ] Click sample → call `onSelect(sampleName)` → close dropdown
- [ ] Click outside → close dropdown
- [ ] Style as floating dropdown with scroll

```jsx
function InstrumentPicker({ isOpen, onSelect, onClose, anchorRef, currentInstrument }) {
  const [filter, setFilter] = useState('')
  const pickerRef = useRef(null)
  
  // Position relative to anchor
  // Filter samples
  // Render list
  // Handle click outside
}
```

#### 1.5 Create ModeToggle Component
- [ ] Create `src/components/ModeToggle.jsx`
- [ ] Props: `mode`, `onChange`, `disabled`
- [ ] Render single button that toggles between states:
  - `null` (unset) → dimmed, shows "?" or both icons
  - `'melodic'` → shows 🎹 icon
  - `'percussive'` → shows 🥁 icon
- [ ] Click cycles: null → melodic → percussive → melodic...
- [ ] Disabled when no instrument selected

```jsx
function ModeToggle({ mode, onChange, disabled }) {
  const handleClick = () => {
    if (mode === null) onChange('melodic')
    else if (mode === 'melodic') onChange('percussive')
    else onChange('melodic')
  }
  // Render icon based on mode
}
```

#### 1.6 Update Track Row in EventStream.jsx
- [ ] Import `InstrumentPicker` and `ModeToggle`
- [ ] Add state for open instrument picker: `const [instrumentPickerSlot, setInstrumentPickerSlot] = useState(null)`
- [ ] Track row element order (left to right):
  1. TrackLabel (existing - editable name)
  2. InstrumentButton (NEW)
  3. ModeToggle (NEW)
  4. [Grid button - PR2]
  5. [CodeDisplay - PR3]
  6. [StopButton - existing]
  7. [ClearTrackButton - PR3]
  8. MuteButton (existing)
  9. FxButton (existing)
- [ ] Render new elements in track row (after TrackLabel):
  ```jsx
  <InstrumentButton 
    instrument={trackGrids[slot]?.instrument}
    onClick={() => setInstrumentPickerSlot(slot)}
  />
  <ModeToggle
    mode={trackGrids[slot]?.mode}
    onChange={(mode) => handleModeChange(slot, mode)}
    disabled={!trackGrids[slot]?.instrument}
  />
  ```
- [ ] Create `InstrumentButton` inline component:
  - Shows instrument name or "+" if none
  - Opens instrument picker on click
- [ ] Handle instrument selection:
  ```javascript
  const handleInstrumentSelect = (slot, instrument) => {
    onTrackGridUpdate(slot, { 
      ...trackGrids[slot], 
      instrument,
      // Keep existing notes if any
    })
    setInstrumentPickerSlot(null)
  }
  ```
- [ ] Handle mode change:
  ```javascript
  const handleModeChange = (slot, mode) => {
    onTrackGridUpdate(slot, {
      ...trackGrids[slot],
      mode,
      notes: [] // Clear notes on mode change
    })
  }
  ```

#### 1.7 CSS Styles
- [ ] `.samples-toggle-btn` - Header button style
- [ ] `.sample-browser-close` - X button in sample browser
- [ ] `.instrument-picker` - Dropdown container
  - Position: absolute, anchored to button
  - Max-height with overflow scroll
  - Z-index above other elements
- [ ] `.instrument-picker-search` - Filter input
- [ ] `.instrument-picker-list` - Scrollable list
- [ ] `.instrument-picker-item` - Individual sample row
  - Hover state
  - Padding for click targets
- [ ] `.instrument-btn` - Track row instrument button
  - Shows "+" when empty
  - Shows instrument name when selected
  - Truncate long names with ellipsis
- [ ] `.mode-toggle` - Mode toggle button
- [ ] `.mode-toggle.unset` - Dimmed/grayed state, shows "?" or both icons
- [ ] `.mode-toggle.melodic` - Shows 🎹 icon
- [ ] `.mode-toggle.percussive` - Shows 🥁 icon

#### 1.8 Accessibility (PR1)
- [ ] Instrument picker: `role="listbox"`, items have `role="option"`
- [ ] Mode toggle: `aria-label="Select mode: melodic or percussive"`
- [ ] Focus visible on all interactive elements

#### 1.9 Testing Checklist
- [ ] Sample browser opens/closes via header button
- [ ] Sample browser X button closes it
- [ ] Clicking header button again closes sample browser
- [ ] Samples are NOT draggable (no drag cursor, no drag events)
- [ ] Filter still works in sample browser
- [ ] Sample browser can be dragged to new position
- [ ] Sample browser can be resized
- [ ] Sample browser can be collapsed/expanded
- [ ] Instrument picker opens when clicking "+" on track
- [ ] Instrument picker anchored to button position
- [ ] Instrument picker filter works
- [ ] Selecting instrument shows name in button (truncated if long)
- [ ] Clicking outside instrument picker closes it
- [ ] Mode toggle is disabled until instrument selected
- [ ] Mode toggle cycles: unset → melodic → percussive → melodic
- [ ] Mode toggle shows correct icon for each state
- [ ] Instrument/mode persist to localStorage
- [ ] Refresh restores instrument/mode state
- [ ] Multiple tracks can have different instruments/modes

---

## PR 2: Piano Roll & Step Sequencer

### Overview
Implement the piano roll panel for melodic instruments and step sequencer for percussive, including code generation and playback integration.

### Files to Create
- `src/components/PianoRollPanel.jsx`
- `src/utils/codeGenerator.js`

### Files to Modify
- `src/App.jsx`
- `src/components/EventStream.jsx`
- `src/index.css`

---

### Tasks

#### 2.1 Create Code Generator Utility
- [ ] Create `src/utils/codeGenerator.js`
- [ ] Export `generatePattern(trackGrid, trackFx)` function:
  ```javascript
  export function generatePattern(trackGrid, trackFx = {}) {
    const { instrument, mode, notes } = trackGrid
    
    if (!instrument || !mode || !notes || notes.length === 0) {
      return null
    }
    
    // Build 16-slot array
    const slots = Array(16).fill('~')
    
    // Group notes by step (for chords)
    const notesByStep = {}
    notes.forEach(n => {
      if (!notesByStep[n.step]) notesByStep[n.step] = []
      if (mode === 'melodic') {
        notesByStep[n.step].push(n.note)
      } else {
        notesByStep[n.step].push(instrument)
      }
    })
    
    // Fill slots
    Object.entries(notesByStep).forEach(([step, stepNotes]) => {
      if (stepNotes.length === 1) {
        slots[step] = stepNotes[0]
      } else {
        slots[step] = `[${stepNotes.join(',')}]`
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
  
  function buildFxChain(fx) {
    // ... build .gain().lpf().room() etc from fx state
  }
  ```

#### 2.2 Create PianoRollPanel Component
- [ ] Create `src/components/PianoRollPanel.jsx`
- [ ] Props:
  ```javascript
  {
    trackNumber,
    trackName,
    color,
    mode,           // 'melodic' | 'percussive'
    instrument,
    notes,          // Array of { step, note? }
    onNotesChange,  // (newNotes) => void
    onClose,
  }
  ```

#### 2.3 Piano Roll Panel - Structure
- [ ] Slide-out panel from right side
- [ ] Header with track name and X close button
- [ ] Grid area (scrollable for melodic)
- [ ] Toolbar with octave scroll buttons and clear button
- [ ] Responsive width (~40% screen), resizable via drag

```jsx
<div className="piano-roll-panel" style={{ '--track-color': color }}>
  <div className="piano-roll-header">
    <span>{trackName} - {mode === 'melodic' ? '🎹' : '🥁'}</span>
    <button onClick={onClose}>×</button>
  </div>
  
  {mode === 'melodic' ? (
    <MelodicGrid ... />
  ) : (
    <PercussiveGrid ... />
  )}
  
  <div className="piano-roll-toolbar">
    {mode === 'melodic' && <OctaveScroller ... />}
    <button onClick={handleClear}>Clear</button>
  </div>
</div>
```

#### 2.4 Melodic Grid Implementation
- [ ] State: `currentOctaveStart` (default 3 for C3-C5 view)
- [ ] Render 2 octaves of notes (24 rows)
- [ ] Note labels on left (C3, C#3, D3... using sharps)
- [ ] 16 columns for steps
- [ ] Beat markers: darker line every 4 steps, lighter every 2
- [ ] Black key rows have darker background
- [ ] Cell click handler:
  ```javascript
  const handleCellClick = (step, note) => {
    // Play preview
    playPreview(instrument, note)
    
    // Toggle note
    const existingIndex = notes.findIndex(n => n.step === step && n.note === note)
    if (existingIndex >= 0) {
      // Remove note
      onNotesChange(notes.filter((_, i) => i !== existingIndex))
    } else {
      // Add note
      onNotesChange([...notes, { step, note }])
    }
  }
  ```
- [ ] Active notes shown as rounded rectangles in track color

#### 2.5 Percussive Grid Implementation
- [ ] Single row of 16 steps
- [ ] Same beat markers as melodic
- [ ] Cell click handler:
  ```javascript
  const handleCellClick = (step) => {
    // Play preview
    playPreview(instrument, null)
    
    // Toggle step
    const existingIndex = notes.findIndex(n => n.step === step)
    if (existingIndex >= 0) {
      onNotesChange(notes.filter((_, i) => i !== existingIndex))
    } else {
      onNotesChange([...notes, { step }])
    }
  }
  ```

#### 2.6 Octave Scrolling
- [ ] Up/Down buttons in toolbar
- [ ] Mouse wheel on grid area scrolls octaves
- [ ] Range: C1 to C7 (scroll `currentOctaveStart` from 1 to 5)
- [ ] Show current range label (e.g., "C3-C5")

#### 2.7 Note Preview Audio
- [ ] Create preview function:
  ```javascript
  const playPreview = (instrument, note) => {
    try {
      if (note) {
        eval(`note("${note}").s("${instrument}").play()`)
      } else {
        eval(`s("${instrument}").play()`)
      }
    } catch (e) {
      console.error('Preview error:', e)
    }
  }
  ```
- [ ] Call on note toggle (only when adding, not removing)

#### 2.8 Panel Open/Close in EventStream
- [ ] Add state: `const [pianoRollSlot, setPianoRollSlot] = useState(null)`
- [ ] Add grid button to track row (after mode toggle):
  ```jsx
  <button
    className="grid-btn"
    onClick={() => setPianoRollSlot(slot)}
    disabled={!trackGrids[slot]?.instrument || !trackGrids[slot]?.mode}
    title={!trackGrids[slot]?.mode ? 'Select mode first' : 'Open grid'}
  >
    ▦
  </button>
  ```
- [ ] Opening new panel closes previous (one at a time)
- [ ] Render PianoRollPanel when `pianoRollSlot` is set

#### 2.9 Connect to Code Generation & Playback
- [ ] In App.jsx, when `trackGrids` changes:
  ```javascript
  useEffect(() => {
    // Regenerate patterns from grids
    const newPatterns = {}
    Object.entries(trackGrids).forEach(([slot, grid]) => {
      const fx = trackFx[slot] || {}
      const code = generatePattern(grid, fx)
      if (code) {
        newPatterns[slot] = code
      }
    })
    setPatterns(newPatterns)
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.trackGrids, JSON.stringify(trackGrids))
    
    // Replay if playing
    if (isPlaying) {
      playAllPatterns(newPatterns, mutedChannels)
    }
  }, [trackGrids, trackFx])
  ```

#### 2.10 CSS Styles & Design Tokens
- [ ] Add CSS variables:
  ```css
  --piano-roll-width: 40vw;
  --piano-roll-min-width: 300px;
  --piano-roll-max-width: 600px;
  --grid-cell-size: 24px;
  --grid-cell-gap: 1px;
  --note-label-width: 40px;
  --beat-line-color: rgba(255, 255, 255, 0.3);
  --half-beat-line-color: rgba(255, 255, 255, 0.1);
  --white-key-bg: var(--gray-800);
  --black-key-bg: var(--gray-900);
  ```
- [ ] `.piano-roll-panel` - Slide-out container, position fixed right
  - Default width: 40vw
  - Min-width: 300px, Max-width: 600px
- [ ] `.piano-roll-panel.open` - Visible state with slide animation:
  ```css
  transform: translateX(100%);
  transition: transform 0.2s ease-out;
  &.open { transform: translateX(0); }
  ```
- [ ] `.piano-roll-header` - Header bar (draggable for reposition)
- [ ] `.piano-roll-grid` - CSS Grid container
- [ ] `.piano-roll-grid.melodic` - Scrollable Y, 24 rows (2 octaves)
- [ ] `.piano-roll-grid.percussive` - Single row variant
- [ ] `.note-label` - Y-axis note labels, width: 40px
- [ ] `.note-label.black-key` - Darker background (`--black-key-bg`)
- [ ] `.grid-cell` - Individual clickable cell
  - Size: 24px × 24px
  - Border: 1px gap
- [ ] `.grid-cell.active` - Rounded rectangle in track color:
  ```css
  animation: note-pop 0.1s ease-out;
  @keyframes note-pop {
    0% { transform: scale(0.8); }
    100% { transform: scale(1); }
  }
  ```
- [ ] `.grid-cell:hover` - Subtle highlight (`--note-hover-color`)
- [ ] `.beat-marker.quarter` - Every 4 steps, color: `--beat-line-color`
- [ ] `.beat-marker.eighth` - Every 2 steps, color: `--half-beat-line-color`
- [ ] `.piano-roll-toolbar` - Bottom toolbar
- [ ] `.octave-scroller` - Up/down buttons container
- [ ] `.grid-btn` - Track row grid button (▦ icon)
- [ ] `.resize-handle-left` - Panel resize drag handle

#### 2.11 Accessibility (PR2)
- [ ] Grid cells: `aria-label="Step {n}, {note}, {empty|note on}"`
- [ ] Announce on toggle: "Note added at step 1, C3" (aria-live region)
- [ ] Focus ring visible on cells
- [ ] Respect `prefers-reduced-motion`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .grid-cell.active { animation: none; }
    .piano-roll-panel { transition: none; }
  }
  ```

#### 2.12 Performance Optimizations
- [ ] Memoize code generation with `useMemo`:
  ```javascript
  const generatedCode = useMemo(() => 
    generatePattern(trackGrid, trackFx),
    [trackGrid, trackFx]
  )
  ```
- [ ] Debounce audio preview (50ms) to prevent pile-up on rapid clicks
- [ ] Debounce localStorage saves (100ms)
- [ ] Use CSS Grid layout (avoid re-rendering entire grid on note change)

#### 2.13 Mobile Considerations
- [ ] Grid cells minimum 44px touch targets on mobile
- [ ] Panel full width on screens < 768px:
  ```css
  @media (max-width: 768px) {
    .piano-roll-panel { width: 100vw; }
  }
  ```
- [ ] Hide resize handle on mobile
- [ ] Horizontal scroll for 16 steps if needed

#### 2.11 Testing Checklist
- [ ] Grid button disabled until instrument + mode selected
- [ ] Grid button opens piano roll panel
- [ ] Piano roll shows correct grid type based on mode
- [ ] Clicking cells toggles notes on/off
- [ ] Preview audio plays when adding notes
- [ ] Notes appear as rounded rectangles
- [ ] Octave scroll works (buttons + wheel) for melodic
- [ ] Beat markers visible at correct intervals
- [ ] Black key rows have different background
- [ ] Clear button removes all notes
- [ ] Code generates correctly in pattern display
- [ ] Pattern plays when Play button pressed
- [ ] Changes auto-save to localStorage
- [ ] Opening new panel closes previous
- [ ] X button closes panel

---

## PR 3: FX Integration & Polish

### Overview
Refactor FX panel to use lifted state, implement clear track functionality, finalize code display, and handle all edge cases.

### Files to Modify
- `src/App.jsx`
- `src/components/EventStream.jsx`
- `src/components/TrackEffects.jsx`
- `src/components/TrackInput.jsx` → rename to `CodeDisplay.jsx`
- `src/utils/codeGenerator.js`
- `src/index.css`

---

### Tasks

#### 3.1 Refactor TrackEffects to Use Lifted State
- [ ] Change props from `pattern` to `fxState`:
  ```javascript
  // Old props
  { pattern, onEffectChange }
  
  // New props
  { fxState, onFxChange }
  ```
- [ ] Remove `parsePattern()` function (no longer needed)
- [ ] Remove local `effects` and `signalEffects` state
- [ ] Read values directly from `fxState` prop
- [ ] Call `onFxChange(newFxState)` instead of `onEffectChange(patternString)`
- [ ] Update `handleEffectChange`:
  ```javascript
  const handleEffectChange = (effect, value) => {
    onFxChange({
      ...fxState,
      [effect]: value
    })
  }
  ```
- [ ] Update `handleSignalChange` similarly
- [ ] Update `handleResetAll` to reset to defaults:
  ```javascript
  const handleResetAll = () => {
    onFxChange({
      gain: 1,
      lpf: 20000,
      room: 0,
      delay: 0,
      pan: 0.5,
      distort: 0,
      signals: {}
    })
  }
  ```

#### 3.2 Update App.jsx FX Handling
- [ ] Add `handleTrackFxUpdate(slot, fxState)`:
  ```javascript
  const handleTrackFxUpdate = useCallback((slot, fxState) => {
    setTrackFx(prev => {
      const next = { ...prev, [slot]: fxState }
      localStorage.setItem(STORAGE_KEYS.trackFx, JSON.stringify(next))
      return next
    })
  }, [])
  ```
- [ ] Pass `trackFx` and `onTrackFxUpdate` to EventStream

#### 3.3 Update EventStream FX Panel Rendering
- [ ] Pass new props to TrackEffects:
  ```jsx
  <TrackEffects
    trackNumber={trackNum}
    trackName={trackNames[slot]}
    color={color}
    position={position}
    fxState={trackFx[slot] || DEFAULT_FX_STATE}
    onFxChange={(fx) => onTrackFxUpdate(slot, fx)}
    onClose={() => handleCloseFxPanel(slot)}
  />
  ```

#### 3.4 Update Code Generator for FX
- [ ] Ensure `buildFxChain(fx)` handles all effect types:
  ```javascript
  function buildFxChain(fx) {
    if (!fx) return ''
    
    let chain = ''
    const defaults = { gain: 1, lpf: 20000, room: 0, delay: 0, pan: 0.5, distort: 0 }
    
    // Static effects
    for (const [effect, defaultVal] of Object.entries(defaults)) {
      const value = fx[effect]
      if (value !== undefined && Math.abs(value - defaultVal) > 0.001) {
        const rounded = effect === 'lpf' ? Math.round(value) : 
          Math.round(value * 100) / 100
        chain += `.${effect}(${rounded})`
      }
    }
    
    // Signal effects (LFO)
    if (fx.signals) {
      for (const [effect, signal] of Object.entries(fx.signals)) {
        let sigCode = `${signal.waveform}.range(${signal.min}, ${signal.max})`
        if (signal.speed < 1) {
          sigCode += `.slow(${Math.round(1 / signal.speed)})`
        } else if (signal.speed > 1) {
          sigCode += `.fast(${signal.speed})`
        }
        chain += `.${effect}(${sigCode})`
      }
    }
    
    return chain
  }
  ```

#### 3.5 Convert TrackInput to CodeDisplay
- [ ] Rename `TrackInput.jsx` to `CodeDisplay.jsx` (or modify in place)
- [ ] Make input read-only:
  ```jsx
  <input
    type="text"
    value={pattern || ''}
    readOnly
    className="code-display"
    placeholder="Pattern will appear here..."
  />
  ```
- [ ] Remove all editing-related code:
  - Remove `handleKeyDown`
  - Remove `handleDragOver`, `handleDragLeave`, `handleDrop`
  - Remove `isFocused` state
  - Remove `onSubmit` prop
- [ ] Keep stop button functionality (for removing pattern from playback)
- [ ] Update styling to indicate read-only state

#### 3.6 Implement Clear Track Button
- [ ] Add clear track button to track row (after code display):
  ```jsx
  {isActive && (
    <button
      className="clear-track-btn"
      onClick={() => handleClearTrack(slot)}
      title="Reset track"
    >
      ↺
    </button>
  )}
  ```
- [ ] Implement `handleClearTrack`:
  ```javascript
  const handleClearTrack = (slot) => {
    // Clear grid state
    onTrackGridUpdate(slot, null)
    // Clear FX state
    onTrackFxUpdate(slot, null)
    // Close any open panels
    if (pianoRollSlot === slot) setPianoRollSlot(null)
    if (openFxPanels[slot]) {
      setOpenFxPanels(prev => {
        const next = { ...prev }
        delete next[slot]
        return next
      })
    }
  }
  ```
- [ ] Only show when track has content (instrument selected)

#### 3.7 Clean Break - Remove Legacy Code
- [ ] Remove old localStorage migration (clean slate)
- [ ] On first load with new version, clear old `algorave_patterns` if `trackGrids` doesn't exist:
  ```javascript
  function loadSavedState() {
    const savedGrids = localStorage.getItem(STORAGE_KEYS.trackGrids)
    
    if (!savedGrids) {
      // Clean break - clear old patterns
      localStorage.removeItem(STORAGE_KEYS.patterns)
    }
    
    // ... load new state
  }
  ```
- [ ] Remove any remaining drag/drop code from TrackInput/CodeDisplay

#### 3.8 Edge Cases
- [ ] Mode change clears notes:
  ```javascript
  const handleModeChange = (slot, mode) => {
    onTrackGridUpdate(slot, {
      ...trackGrids[slot],
      mode,
      notes: [] // Clear notes when switching modes
    })
  }
  ```
- [ ] Empty grid generates null pattern (track inactive)
- [ ] FX-only track (no notes) doesn't generate pattern
- [ ] Instrument change keeps notes
- [ ] Pattern error shows toast

#### 3.9 State Persistence
- [ ] Verify all state saves to localStorage:
  - `trackGrids` - on every grid change
  - `trackFx` - on every FX change
  - `trackNames` - already working
  - `patterns` - derived, optional to save
- [ ] Verify state restores on refresh
- [ ] Verify mute state works with new architecture

#### 3.10 CSS Updates
- [ ] `.code-display` - Read-only input styling:
  - Muted background color
  - `cursor: default` (no text cursor)
  - Slightly reduced opacity to indicate non-editable
- [ ] `.clear-track-btn` - Reset button (↺ icon)
  - Only visible when track has content
  - Confirm-style hover (slightly red tint?)
- [ ] Update any remaining TrackInput references to CodeDisplay

#### 3.11 Default FX State Constant
- [ ] Create default FX state for reuse:
  ```javascript
  const DEFAULT_FX_STATE = {
    gain: 1,
    lpf: 20000,
    room: 0,
    delay: 0,
    pan: 0.5,
    distort: 0,
    signals: {}
  }
  ```

#### 3.12 Final Testing Checklist

**Happy Path Flow:**
- [ ] Click instrument button → picker opens
- [ ] Select sample → picker closes, name shows in button
- [ ] Click mode toggle → mode set (icon changes)
- [ ] Click grid button → piano roll panel opens
- [ ] Click cells → notes appear as rounded rectangles
- [ ] Preview audio plays when adding notes
- [ ] Code display updates in real-time
- [ ] Press Play → pattern plays
- [ ] Open FX panel → adjust effects → sound changes
- [ ] Close panel → pattern continues playing
- [ ] Stop → silence

**Edge Cases:**
- [ ] Switch instrument mid-pattern → notes preserved
- [ ] Clear all notes in piano roll → track silent but active
- [ ] Change mode (melodic → percussive) → notes cleared
- [ ] Open grid for track 2 while track 1 panel open → track 1 closes
- [ ] Mute track with piano roll open → mute works independently
- [ ] Clear track → everything reset (instrument, mode, notes, FX)
- [ ] Add FX, then add notes → FX preserved in generated code
- [ ] Multiple tracks playing simultaneously
- [ ] Chords (same step, multiple notes) → generate correctly

**Persistence:**
- [ ] All state persists across browser refresh
- [ ] trackGrids saved to localStorage
- [ ] trackFx saved to localStorage
- [ ] trackNames saved to localStorage

**UI/UX:**
- [ ] Code display is read-only (cannot type)
- [ ] Stop button removes pattern from playback
- [ ] Play/Stop transport works
- [ ] Sample browser is reference-only (no drag)
- [ ] No console errors
- [ ] Mobile layout acceptable (touch targets, full-width panel)

**Performance:**
- [ ] No audio glitches on rapid note toggling
- [ ] No lag when switching between tracks
- [ ] localStorage saves don't cause UI freeze

---

## Summary

| PR | Focus | New Components | Key Changes |
|----|-------|----------------|-------------|
| PR 1 | Foundation | InstrumentPicker, ModeToggle | State architecture, sample browser read-only, instrument/mode selection |
| PR 2 | Core Feature | PianoRollPanel, codeGenerator | Piano roll grid, step sequencer, code generation, playback |
| PR 3 | Integration | (refactors only) | FX panel refactor, clear track, code display, polish |

### Dependencies
- PR 2 depends on PR 1 (needs state architecture and instrument/mode)
- PR 3 depends on PR 2 (needs code generator for FX integration)

### Estimated Complexity
- PR 1: Medium (new components, state setup)
- PR 2: High (grid UI, code generation, audio preview)
- PR 3: Medium (refactoring, edge cases)

### Notes on Incremental Delivery

**During PR 1:**
- Existing TrackInput remains functional (users can still type patterns)
- New instrument/mode selection is additive
- App works in hybrid state

**During PR 2:**
- TrackInput still exists but grid can also generate patterns
- If user has instrument+mode+notes, code generates from grid
- If user types in TrackInput, that pattern is used (legacy mode)

**After PR 3:**
- TrackInput converted to read-only CodeDisplay
- All pattern creation via visual tools only
- Clean break from text-input workflow

