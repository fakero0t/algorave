# Interactive Tracks Plan

## Overview

Add visual instrument selection and piano roll editing to tracks, allowing users to build patterns without writing code directly.

---

## UI Components

### 1. Instrument Selector Button
- **Location**: Left side of each track row (after track label)
- **Appearance**: Text showing sample name (e.g., "piano") or "+" if none selected
- **Behavior**: Opens inline instrument picker dropdown
- **On Select**: Stores instrument, waits for mode selection before generating code

### 1b. Instrument Picker Dropdown (NEW)
- **Trigger**: Click instrument button in track row
- **Appearance**: Small dropdown/popover anchored to button
- **Contents**:
  - Search input at top (filter by name)
  - Full sample list (scrollable, no common/recent sections)
- **Selection**: Click sample name → dropdown closes, instrument set
- **Close**: Click outside, or select an instrument

### 2. Piano Roll Button
- **Location**: Next to mode toggle
- **Appearance**: Grid icon (▦)
- **Behavior**: Opens piano roll panel for that track
- **Disabled**: Until instrument AND mode are selected

### 3. Piano Roll Panel
- **Grid**: 1 bar × 16 steps (1/16 resolution, forced quantization)
- **Y-axis**: Notes, scrollable (show 2 octaves, full range C1-C7, default view C3-C5)
- **X-axis**: 16 steps per bar, snapped
- **Beat markers**: Lines every 4 steps (beats), lighter lines every 2 steps (half-beats)
- **Note visual**: Rounded rectangle (DAW-style) in track color
- **Interactions**:
  - Click cell to toggle note on/off (single clicks only, no drag)
  - **Preview on click** — plays the note/sample when toggled on
  - v1: Fixed note length (1 step)
  - v2: Drag to paint, drag note edge to adjust sustain

---

## Data Model

### Track State (per track)
```javascript
{
  slot: "d1",
  instrument: "piano",           // Selected sample/synth
  instrumentType: "melodic",     // "melodic" | "percussive"
  notes: [                       // Piano roll / step sequencer data
    { step: 0, note: "c3" },     // melodic: has note
    { step: 4, note: "e3" },
    // For drums: { step: 0 }, { step: 4 }, ... (no pitch)
  ],
  effects: { ... },              // Existing FX state (from FX panel)
}
```

### Grid → Strudel Mapping

**Question: Do we need AI for this mapping?**

**Answer: No** — it's deterministic. The mapping is straightforward:

| Piano Roll State | Strudel Code |
|------------------|--------------|
| Single note at step 0 | `note("c3 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~").s("piano")` |
| Notes at steps 0,4,8,12 | `note("c3 ~ ~ ~ e3 ~ ~ ~ g3 ~ ~ ~ b3 ~ ~ ~").s("piano")` |
| Rest at step 4 | `note("c3 ~ ~ ~ ~ ~ ~ ~ g3 ...").s("piano")` |
| Chord (two notes same step) | `note("[c3,e3] ~ ~ ~ g3 ...").s("piano")` |
| All 16 steps filled | `note("c3 d3 e3 f3 g3 a3 b3 c4 c4 b3 a3 g3 f3 e3 d3 c3").s("piano")` |

The conversion is algorithmic:
1. Group notes by step position
2. Identify rests (empty steps)
3. Handle subdivisions via bracket notation
4. Handle chords via comma notation
5. String together with instrument

---

## Code Generation Logic

### Input
```javascript
{
  instrument: "piano",
  steps: 16,  // Fixed 1/16 grid
  notes: [
    { step: 0, note: "c3" },
    { step: 4, note: "e3" },
    { step: 8, note: "g3" },
    { step: 12, note: "c4" },
  ]
}
```

### Output
```javascript
note("c3 ~ ~ ~ e3 ~ ~ ~ g3 ~ ~ ~ c4 ~ ~ ~").s("piano")
```

### Optimized Output (collapse groups of 4 rests)
```javascript
// Could simplify to: note("[c3 ~ ~ ~] [e3 ~ ~ ~] [g3 ~ ~ ~] [c4 ~ ~ ~]").s("piano")
// Or even: note("c3 e3 g3 c4").s("piano") if evenly spaced
```

### Algorithm (Pseudocode)
```
1. Create array of 16 slots (1/16 grid)
2. Fill with "~" (rest)
3. For each note, place note name at step index
4. If multiple notes at same step → wrap in brackets with commas: [c3,e3]
5. Simplify: collapse consecutive rests, optimize notation
6. Join array with spaces
7. Wrap: note("...").s("instrument")
```

### Code Generator Function
```javascript
// src/utils/codeGenerator.js

export function generatePattern(trackGrid, fxState = {}) {
  const { instrument, mode, notes } = trackGrid
  
  if (!instrument || !mode || notes.length === 0) {
    return null  // No code generated
  }
  
  // Build 16-slot array
  const slots = Array(16).fill('~')
  
  // Group notes by step (for chords)
  const notesByStep = {}
  notes.forEach(n => {
    if (!notesByStep[n.step]) notesByStep[n.step] = []
    notesByStep[n.step].push(n.note || instrument)
  })
  
  // Fill slots
  Object.entries(notesByStep).forEach(([step, stepNotes]) => {
    if (stepNotes.length === 1) {
      slots[step] = stepNotes[0]
    } else {
      slots[step] = `[${stepNotes.join(',')}]`  // Chord
    }
  })
  
  // Build pattern string
  const pattern = slots.join(' ')
  
  // Wrap based on mode
  let code
  if (mode === 'melodic') {
    code = `note("${pattern}").s("${instrument}")`
  } else {
    code = `s("${pattern}")`  // Drums: sample name IS the pattern
  }
  
  // Append FX chain
  Object.entries(fxState).forEach(([fx, value]) => {
    if (value !== null && value !== undefined) {
      code += `.${fx}(${value})`
    }
  })
  
  return code
}
```

---

## Open Questions

### Q1: Subdivision Granularity ✅ DECIDED
- **Resolution: 1/16 grid (16 steps per bar)**
- Forced quantization — notes snap to nearest step
- No finer subdivisions in v1 (keeps code generation simple)

### Q2: Drum vs Melodic Mode ✅ DECIDED
- **Percussive samples → Step sequencer** (16 steps, on/off, no pitch)
- **Melodic instruments → Piano roll** (16 steps, scrollable octaves)
- **Detection: User chooses** — After selecting sample, toggle to pick "melodic" or "percussive"

### Q3: Syncing with Text Input ✅ DECIDED
- **Code display is read-only**
- Users build patterns via visual tools only (piano roll / step sequencer)
- Code is generated and displayed but not editable
- Single source of truth = grid state
- Eliminates all sync complexity

### Q4: Pattern Length ✅ DECIDED
- **16 steps = 1 bar at 1/16 resolution**
- v1: Fixed 1-bar patterns
- v2: Allow multi-bar expansion

### Q5: Note Duration / Sustain ✅ DECIDED
- **v1: Fixed length — all notes are 1 step (1/16)**
- Simple click to toggle
- v2: Add drag-to-extend for variable sustain

### Q6: Velocity / Dynamics ✅ DECIDED
- **v1: Skip — all notes same volume**
- v2: Add accent (shift+click) or full velocity

---

## Implementation Phases

### Phase 1: Sample Browser + Instrument Selection
- [ ] Make SampleBrowser read-only (remove drag functionality)
- [ ] Add X close button to SampleBrowser
- [ ] Add "Samples" toggle button to app header
- [ ] Toggle shows/hides sample browser panel
- [ ] Create InstrumentPicker dropdown component
- [ ] Add instrument button to track row (opens picker)
- [ ] Save instrument choice to track state
- [ ] Display selected instrument name in button

### Phase 2: Basic Piano Roll (Melodic)
- [ ] Create PianoRoll component
- [ ] 16-step grid, 1/16 quantization
- [ ] Scrollable octave range (show 2 octaves, scroll for full range)
- [ ] Click to toggle notes (snap to grid)
- [ ] Generate Strudel code from grid state
- [ ] Update pattern on close/apply

### Phase 3: Drum Step Sequencer
- [ ] Show step sequencer when user selects "percussive" mode
- [ ] Same panel as piano roll, but collapsed to single row (no pitch axis)
- [ ] 16 steps, click to toggle on/off
- [ ] One sound per track (use multiple tracks for full kit)

### Phase 4: Advanced Features
- [ ] Note duration (sustain)
- [ ] Velocity/accent
- [ ] Pattern length adjustment (multiple bars)
- [ ] Copy/paste patterns
- [ ] Triplet mode (optional)

---

## Component Hierarchy

```
TrackRow (left to right order)
├── TrackLabel                (existing - editable name)
├── InstrumentButton          (NEW)
│   └── opens InstrumentPicker dropdown (inline, not sample browser)
├── ModeToggle                (NEW - icon toggle: 🎹 melodic ↔ 🥁 drum)
│   └── single button, click to toggle between modes
│   └── must pick before grid opens (starts unset/dimmed)
├── PianoRollButton           (NEW)
│   └── disabled until mode is set
│   └── opens PianoRollPanel (grid type based on mode)
│   └── one panel at a time (opening new closes previous)
├── CodeDisplay               (read-only input, shows generated code)
├── StopButton                (existing - removes pattern from playback)
├── ClearTrackButton          (NEW - ↺ icon, resets track fully: instrument, mode, notes, FX)
│   └── only visible when track has content
├── MuteButton                (existing)
└── FxButton                  (existing)

PianoRollPanel                (NEW - slide-out, like FX panel)
├── Header (track name, X button to close — only way to close)
├── PianoRollGrid
│   ├── NoteLabels (y-axis, scrollable, sharps: C, C#, D, D#...)
│   ├── StepGrid (clickable cells)
│   └── Black key rows have darker background (piano-style)
├── Toolbar
│   ├── OctaveScroll (up/down buttons + mouse wheel support, melodic only)
│   └── Clear tool (clears notes only, keeps instrument & mode)
└── (Auto-saves on every click, no Apply button needed)

Panel sizing:
- Responsive default (~40% screen width)
- User can drag left edge to resize

v1 simplifications:
- No playhead indicator
- No keyboard shortcuts (mouse/touch only)
```

---

## Sample Browser Changes

### Current Behavior (Remove)
- Browse and drag samples to text input

### New Behavior
- **Read-only reference panel** — browse samples for reference only, no drag/drop
- **Header toggle button** — button in app header to show/hide sample browser
- **Close methods**: X button in panel OR click header button again
- **Position**: Same as current — user can drag it around
- **No interaction with tracks** — purely for browsing/discovering sample names

```javascript
// Header button
<button onClick={() => setSampleBrowserOpen(!sampleBrowserOpen)}>
  Samples {sampleBrowserOpen ? '▼' : '▶'}
</button>

// Sample browser (simplified)
<SampleBrowser 
  isOpen={sampleBrowserOpen}
  onClose={() => setSampleBrowserOpen(false)}
  readOnly={true}  // No drag, no selection, just browse
/>
```

### Instrument Selection (Separate)
- Instrument button in track row opens **inline dropdown/picker**
- NOT the sample browser
- Quick list of common instruments OR search input
- See "Instrument Picker" section below

---

## State Management Considerations

### Where to store piano roll data? ✅ DECIDED
- **Separate `trackGrids` state in App.jsx**
- Grid is source of truth, code is generated from it
- Mirrors existing pattern: `patterns`, `trackNames`, `trackGrids`

### localStorage
```javascript
STORAGE_KEYS = {
  patterns: 'algorave_patterns',        // Generated Strudel code strings (derived, could skip saving)
  trackNames: 'algorave_track_names',   
  trackGrids: 'algorave_track_grids',   // NEW: piano roll data (source of truth for notes)
  trackFx: 'algorave_track_fx',         // NEW: effect values per track (source of truth for FX)
}
```

---

## Edge Cases to Handle

1. **Instrument change**: Keep notes ✅ (allows reusing patterns across sounds)
2. **Mode change (melodic ↔ percussive)**: Clear notes (pitches don't translate to drums)
3. **Empty grid**: Silent pattern, track stays active with instrument selected
4. **Pattern error**: Show toast notification (use existing toast system)
5. **Track activation**: Requires instrument + mode + at least one note to generate code
6. **Browser refresh**: Restore full state from localStorage (grids, instruments, modes)
7. **Clear track**: Resets everything (instrument, mode, notes, FX) — track becomes empty

## FX Integration ✅ DECIDED
- **Preserve FX** — Grid + FX state combined in one code generation step
- When grid changes, regenerate full code including current FX chain
- Single source: `generateCode(gridState, fxState)` → final pattern string

---

## File Structure

```
src/components/
├── App.jsx                  (modify - add sample browser toggle to header)
├── EventStream.jsx          (modify - add new buttons to TrackRow)
├── SampleBrowser.jsx        (modify - make read-only, add X close button)
├── PianoRollPanel.jsx       (NEW)
├── StepSequencer.jsx        (NEW - or combine with PianoRoll)
├── InstrumentButton.jsx     (NEW)
├── InstrumentPicker.jsx     (NEW - dropdown for selecting instruments)
├── ModeToggle.jsx           (NEW)
└── CodeDisplay.jsx          (NEW - read-only code input)

src/utils/
└── codeGenerator.js         (NEW - grid state → Strudel code)
```

## Header Changes

```
App Header (left to right)
├── Logo + App Name          (existing)
├── Status Badge             (existing)
├── SampleBrowserToggle      (NEW - button to show/hide sample browser)
├── Transport Controls       (existing - Play/Stop)
├── Tempo Control            (existing)
├── Mute All Button          (existing)
└── Settings Button          (existing)
```

---

## Detailed Code Generation

### Melodic Example
```javascript
// Input state
{
  instrument: "piano",
  mode: "melodic",
  notes: [
    { step: 0, note: "c3" },
    { step: 0, note: "e3" },  // chord on step 0
    { step: 4, note: "g3" },
    { step: 8, note: "c4" },
  ]
}

// Output
note("[c3,e3] ~ ~ ~ g3 ~ ~ ~ c4 ~ ~ ~ ~ ~ ~ ~").s("piano")
```

### Percussive Example
```javascript
// Input state
{
  instrument: "bd",
  mode: "percussive",
  notes: [
    { step: 0 },
    { step: 4 },
    { step: 8 },
    { step: 12 },
  ]
}

// Output — use instrument name where note exists, ~ for rests
s("bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~")

// Alternative: use struct for cleaner pattern
s("bd").struct("x ~ ~ ~ x ~ ~ ~ x ~ ~ ~ x ~ ~ ~")
```

### With FX
```javascript
// Grid state + FX state combined
generateCode(gridState, { lpf: 800, room: 0.3 })

// Output
note("c3 ~ ~ ~ e3 ~ ~ ~ g3 ~ ~ ~ c4 ~ ~ ~").s("piano").lpf(800).room(0.3)
```

---

## Preview Audio Implementation

```javascript
// Play a single note preview when clicking grid cell
const playPreview = (instrument, note, mode) => {
  if (mode === 'melodic') {
    // Play pitched note
    eval(`note("${note}").s("${instrument}").play()`)
  } else {
    // Play drum sample once
    eval(`s("${instrument}").play()`)
  }
}
```

---

## Data Interfaces

```javascript
// Track grid state
const TrackGrid = {
  slot: string,              // "d1", "d2", etc.
  instrument: string | null, // "piano", "bd", null
  mode: 'melodic' | 'percussive' | null,
  notes: Array<{
    step: number,            // 0-15
    note?: string,           // "c3", "d#4", etc. (melodic only)
  }>
}

// App state shape
const AppState = {
  patterns: { [slot]: string },        // Generated code strings (derived from grid + fx)
  trackNames: { [slot]: string },      // Custom names
  trackGrids: { [slot]: TrackGrid },   // NEW: grid data (source of truth for pattern)
  trackFx: { [slot]: TrackFxState },   // NEW: effect values (source of truth for FX)
  mutedChannels: Set<string>,
  // ... existing state
}

// Track FX state (moved from TrackEffects local state)
const TrackFxState = {
  gain: number,      // 0-2, default 1
  lpf: number,       // 20-20000, default 20000
  room: number,      // 0-1, default 0
  delay: number,     // 0-1, default 0
  pan: number,       // 0-1, default 0.5
  distort: number,   // 0-10, default 0
  // Signal effects (LFO modulation)
  signals: {
    [effectName]: {
      waveform: 'sine' | 'saw' | 'square' | 'tri' | 'rand' | 'perlin',
      min: number,
      max: number,
      speed: number
    }
  }
}
```

---

## CSS Design Tokens

```css
/* Piano roll specific */
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
--note-active-color: var(--channel-color);  /* Track's color */
--note-hover-color: rgba(255, 255, 255, 0.1);
```

---

## Animation Specs

```css
/* Panel slide-in */
.piano-roll-panel {
  transform: translateX(100%);
  transition: transform 0.2s ease-out;
}
.piano-roll-panel.open {
  transform: translateX(0);
}

/* Note toggle */
.grid-cell.active {
  animation: note-pop 0.1s ease-out;
}
@keyframes note-pop {
  0% { transform: scale(0.8); }
  100% { transform: scale(1); }
}
```

---

## Accessibility

- **ARIA labels**: Grid cells have `aria-label="Step 1, C3, empty"` or `"Step 1, C3, note on"`
- **Focus indicators**: Visible focus ring on cells, buttons
- **Screen reader**: Announce note toggles "Note added at step 1, C3"
- **Color contrast**: Note rectangles have sufficient contrast against grid background
- **Reduced motion**: Respect `prefers-reduced-motion` for animations

---

## Testing Scenarios

### Happy Path
1. Click instrument button → sample browser opens
2. Click sample → browser closes, instrument shown
3. Click mode toggle → set melodic/drum
4. Click grid button → panel opens
5. Click cells → notes appear, preview plays
6. Code display updates in real-time
7. Close panel → pattern plays with other tracks

### Edge Cases
- Switch instrument mid-pattern → notes preserved
- Clear all notes → track stays active but silent
- Change mode with notes → notes cleared (or transposed?)
- Open grid for track 2 while track 1 panel open → track 1 closes
- Mute track with piano roll open → works independently
- Add FX via FX panel → code updates with FX chain

---

## Performance Notes

- **Grid rendering**: Use CSS Grid, avoid re-rendering entire grid on single note change
- **Code generation**: Memoize with `useMemo`, only regenerate when notes/instrument/fx change
- **Audio preview**: Debounce rapid clicks (50ms) to prevent audio pile-up
- **localStorage**: Debounce saves (100ms) to prevent excessive writes

---

## Mobile Considerations

- **Touch targets**: Grid cells minimum 44px on mobile
- **Panel width**: Full width on screens < 768px
- **Scroll**: Horizontal scroll for 16 steps if needed
- **No resize**: Hide resize handle on mobile (full width only)

---

## Risks & Breaking Changes

### High Risk

1. **localStorage Migration**
   - Current: `patterns` stores raw Strudel code strings
   - New: `trackGrids` stores structured grid data, code is generated
   - **Risk**: Existing saved patterns will NOT work with new system
   - **Mitigation**: 
     - Clear localStorage on upgrade, OR
     - Add migration script that attempts to parse old patterns, OR
     - Keep both systems initially (legacy mode)

2. **TrackInput Removal**
   - Current: Users type Strudel code directly
   - New: Code display is read-only, patterns built via visual tools
   - **Risk**: Power users lose ability to type custom patterns
   - **Mitigation**: 
     - Accept this is a different UX (visual-first)
     - Could add "advanced mode" later that restores text input

3. **SampleBrowser Drag/Drop Removal**
   - Current: Drag samples from browser to track input
   - New: Browser is read-only reference only
   - **Risk**: Existing workflow breaks
   - **Mitigation**: New workflow (instrument picker) replaces it

### Medium Risk

4. **FX Panel Integration** ⚠️ SIGNIFICANT REFACTOR
   - Current: FX panel parses pattern string to extract `basePattern` + effects, then rebuilds string on change
   - New: FX state must be tracked separately at App level, code generator merges grid + FX
   - **Current flow**: `pattern string → parsePattern() → local state → buildEffectChain() → new pattern string`
   - **New flow**: `gridState + fxState → generateCode() → pattern string`
   - **Risk**: FX panel logic needs significant refactoring
   - **Changes needed**:
     - Move FX state from `TrackEffects` local state to `App.jsx` (new `trackFx` state)
     - FX panel reads/writes to this state instead of parsing pattern
     - Code generator takes `(gridState, fxState)` and outputs final pattern
     - Remove pattern parsing from `TrackEffects.jsx`

5. **Pattern Playback Timing**
   - Current: Pattern updates immediately on Enter key
   - New: Pattern updates on every grid click (auto-save)
   - **Risk**: More frequent updates could cause audio glitches
   - **Mitigation**: Debounce code regeneration (already planned)

### Low Risk

6. **Track Row Layout Changes**
   - Adding 4 new elements (instrument, mode, grid button, clear)
   - **Risk**: May not fit on narrow screens
   - **Mitigation**: Responsive design, icons-only on mobile

7. **State Complexity Increase**
   - Adding `trackGrids` alongside existing state
   - **Risk**: More state to keep in sync
   - **Mitigation**: Single source of truth (grid), code is derived

---

## Backward Compatibility Options

### Option A: Clean Break
- Remove all legacy code
- Clear localStorage on first load
- Users start fresh

### Option B: Migration
- Detect old `patterns` format
- Attempt to parse into grid format (may fail for complex patterns)
- Fall back to clearing if parse fails

### Option C: Dual Mode (Not Recommended)
- Keep text input as "advanced mode"
- Visual grid as "simple mode"
- Toggle between them
- Increases complexity significantly

**Recommendation**: Option A (clean break) for v1. This is a fundamentally different UX and mixing modes adds complexity.

---

## Files That Will Change

| File | Change Type | Risk |
|------|-------------|------|
| `App.jsx` | Major refactor | High |
| `EventStream.jsx` | Major refactor (TrackRow) | High |
| `SampleBrowser.jsx` | Moderate (remove drag, add toggle) | Medium |
| `TrackEffects.jsx` | Moderate (FX state extraction) | Medium |
| `index.css` | Add new styles | Low |
| NEW: `PianoRollPanel.jsx` | New component | N/A |
| NEW: `InstrumentPicker.jsx` | New component | N/A |
| NEW: `codeGenerator.js` | New utility | N/A |

---

## Dependencies

No new npm packages required. Uses existing:
- React (useState, useEffect, useCallback, useMemo, useRef)
- Existing CSS architecture
- Strudel Web API (already loaded)

---

## Definition of Done

### Phase 1 Complete When:
- [ ] Sample browser toggle in header works
- [ ] Sample browser is read-only (no drag)
- [ ] Instrument picker dropdown works
- [ ] Instrument selection persists to localStorage

### Phase 2 Complete When:
- [ ] Piano roll panel opens/closes
- [ ] Notes can be toggled on 16-step grid
- [ ] Octave scrolling works
- [ ] Preview plays on note click
- [ ] Code generates correctly from grid
- [ ] Pattern plays in Strudel

### Phase 3 Complete When:
- [ ] Mode toggle switches between melodic/percussive
- [ ] Step sequencer shows for percussive mode
- [ ] Drums generate correct `s("sample")` pattern

### Phase 4 Complete When:
- [ ] FX panel works with new state architecture
- [ ] FX values persist and merge into generated code
- [ ] Clear track resets everything
- [ ] All state persists across refresh

---

## Rollback Plan

If issues arise post-implementation:
1. Git revert to pre-implementation commit
2. localStorage keys are namespaced — old `algorave_patterns` still exists
3. Can restore old TrackInput component from git history

---

## Next Steps

1. Review and discuss this plan
2. Clarify open questions
3. Decide on Phase 1 scope
4. Begin implementation

