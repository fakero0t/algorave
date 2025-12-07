# BrainLift: Algorave Strudel Development

## Owners
Arial Gardner

## Purpose

The purpose of this BrainLift is to document the development journey of Algorave Strudel—a web-based live coding environment for music that bridges the gap between text-based pattern languages (like TidalCycles) and visual, accessible music production tools. This project explores how to make algorithmic music composition accessible to non-coders while preserving the creative power of live coding.

**In Scope:**
- Technical decisions and their rationale
- Learning breakthroughs from working with Strudel/audio engines
- Development methodology and planning approach
- Challenges encountered and solutions implemented
- Evolution of the project from research to implementation

**Out of Scope:**
- General music production theory
- Comparison with other DAWs (unless directly relevant to decisions)
- Future feature speculation beyond what was planned

---

## AI Prompts

### Research Phase
- "What are some assumptions about DAWs?"
- "What are the players in the DAW space?"
- "What tools and languages are DAWs usually written in?"
- "Find a port/language variant of superdirt or tidal to use"
- "Multiple variants of the tidalcycles pattern music coding"

**Outcome:** Discovered Strudel (JavaScript/web-based) as alternative to TidalCycles (Haskell-based), enabling web deployment without bundling Haskell toolchain.

### Architecture & Planning
- "How to structure state for 16-channel track system with visual piano roll?"
- "How to migrate from text-input patterns to visual grid without breaking existing data?"
- "Pattern parsing: extract effects from Strudel code string to populate UI controls"

**Outcome:** Developed migration strategy for localStorage data format changes, pattern parsing approach for bidirectional code ↔ UI sync.

### Implementation Challenges
- "How to capture master audio output from Web Audio API for recording?"
- "Real-time pattern generation: throttle updates to prevent audio glitches"
- "Piano roll grid: CSS Grid vs canvas for performance with 16 steps × 24 notes"

**Outcome:** Monkey-patch `GainNode.connect` for audio capture, 60fps throttling for smooth updates, CSS Grid for maintainable DOM-based rendering.

### Component Design
- "Rotary knob component: drag interaction with logarithmic scale for LPF"
- "Effect control: toggle between static value and signal modulation (LFO)"
- "Floating panel positioning: anchor to button, reset on open, draggable header"

**Outcome:** Reusable `Knob` component with logarithmic scaling, `EffectControl` wrapper for static/signal modes, positioned panels with reset behavior.

---

## Learning Breakthroughs

### 1. Pattern Language Architecture
**Discovery:** Tidal/Strudel uses a pattern map that queries events at specific time points, rather than generating a fixed sequence upfront. The stream holds a pattern map, and on each clock tick, it queries "what events occur at time X?" This enables live modification—patterns update in real-time without stopping playback.

**Implication:** This architecture made it possible to update patterns from visual UI (piano roll, effects) and have changes reflect immediately in playback, without needing to stop/restart the audio engine.

### 2. State as Source of Truth vs. Code as Source of Truth
**Discovery:** Initially considered storing generated Strudel code as the source of truth. Realized that storing structured state (instrument, mode, notes, effects) and generating code on-demand is more maintainable and enables better UX (undo, clear, mode switching).

**Implication:** Shifted from `patterns` (code strings) to `trackGrids` (structured data) + `codeGenerator.js` utility. This enabled:
- Clean separation of data model from presentation
- Easier migration when data format changes
- Ability to parse existing code back into UI state (for FX panel)

### 3. Migration Strategy for Breaking Changes
**Discovery:** When changing from `notes` array to `melodicNotes`/`percussiveNotes` separation, needed migration logic to preserve user data. Learned to detect old format and transform it, rather than forcing users to start fresh.

**Implementation:**
```javascript
function migrateTrackGrids(grids) {
  // Detect old format, transform to new format
  // Preserve user's existing patterns
}
```

**Implication:** Users don't lose work when data model evolves. Migration functions become part of the codebase permanently.

### 4. Audio Engine vs. Game Engine Mental Models
**Discovery:** Audio engines model signal graphs (nodes connected in a DAG), while game engines model scenes/worlds. Audio engines often use external controllers (like Strudel), while game engines control everything internally.

**Implication:** Strudel is the "controller" that sends patterns to Superdough (audio engine). The web app is a "controller for the controller"—generating Strudel code that Strudel then converts to audio events. This layered architecture required understanding where state lives at each level.

### 5. Real-Time Updates Require Throttling
**Discovery:** Updating patterns on every knob drag or note toggle caused audio glitches. Pattern evaluation needs to be throttled to ~60fps (16ms intervals) to maintain smooth audio.

**Implication:** Added throttling to `handleTrackGridUpdate` and `handleTrackFxUpdate` callbacks. UI can update instantly (visual feedback), but audio updates are debounced.

### 6. Pattern Parsing for Bidirectional Sync
**Discovery:** FX panel needs to read existing effects from pattern code to populate controls. Simple approach: strip known effects from the end of the pattern string, keep everything else as "base pattern."

**Challenge:** Signal modulation like `sine.range(200, 2000).slow(4)` is more complex than static values.

**Solution:** Regex patterns to detect signal modulation, extract waveform/range/speed, populate signal mode controls accordingly.

---

## Technical Decisions

### 1. Web-Based Over Desktop App
**Decision:** Build as web app (Vite + React) rather than desktop app (Electron/Tauri).

**Rationale:**
- Strudel is JavaScript/web-based, natural fit
- No need to bundle Supercollider/Haskell toolchain
- Easier deployment and updates
- Cross-platform without platform-specific builds

**Trade-off:** Requires internet for initial load (Strudel CDN), but works offline once loaded.

### 2. Visual-First Over Code-First
**Decision:** Shift from text input (typing Strudel code) to visual tools (piano roll, knobs) as primary interface.

**Rationale:**
- Target user (Tom) needs "no code experience"
- Visual tools are more accessible
- Can still show generated code (read-only) for learning

**Trade-off:** Power users lose ability to type custom patterns. Accepted as intentional UX shift.

### 3. Structured State Over Code Strings
**Decision:** Store `trackGrids` (structured: instrument, mode, notes array) instead of `patterns` (code strings).

**Rationale:**
- Enables undo/redo, clear operations
- Easier to migrate when data model changes
- Can regenerate code with different formatting
- Supports mode switching (melodic ↔ percussive) without losing data

**Implementation:** `codeGenerator.js` utility converts state → code. Pattern parsing (for FX) converts code → state when needed.

### 4. Separate Melodic and Percussive Notes
**Decision:** Store `melodicNotes` and `percussiveNotes` separately, even though only one mode is active at a time.

**Rationale:**
- User can switch modes without losing work
- Clear separation of concerns
- Easier to implement "clear current mode" vs "clear all"

**Migration:** Added `migrateTrackGrids()` to convert old `notes` array to new format based on current mode.

### 5. localStorage Over Database
**Decision:** Use browser localStorage for persistence, not Firebase/database.

**Rationale:**
- Simpler setup, no backend required
- Works offline
- Fast reads/writes
- Sufficient for single-user tool

**Trade-off:** No cloud sync, but aligns with "desktop app feel" goal.

### 6. CSS Grid Over Canvas for Piano Roll
**Decision:** Render piano roll grid with CSS Grid + DOM elements, not HTML5 Canvas.

**Rationale:**
- Easier to style and maintain
- Built-in accessibility (screen readers, keyboard nav)
- React state updates work naturally
- Performance sufficient for 16 steps × 24 notes (384 cells)

**Trade-off:** Canvas would be faster for 1000+ cells, but overkill for this use case.

### 7. Throttled Real-Time Updates
**Decision:** Throttle pattern updates to 60fps (~16ms) instead of updating on every UI change.

**Rationale:**
- Prevents audio glitches from rapid updates
- UI can update instantly (visual feedback)
- Audio updates are debounced separately

**Implementation:** `useCallback` with throttling in `App.jsx` for `handleTrackGridUpdate` and `handleTrackFxUpdate`.

### 8. FX Panel: Pattern Parsing Over Separate State
**Decision:** FX panel parses pattern code to extract effect values, rather than maintaining separate FX state.

**Rationale:**
- Pattern code is source of truth
- No sync issues between FX state and code
- Simpler data model (one less thing to persist)

**Trade-off:** Parsing is more complex, but ensures consistency.

---

## What Changed + Why

### Phase 1: Research → Scope Down
**What:** Started with broad vision (desktop app, LLM chatbot, stem timeline, 3D visualization).

**Why Changed:** Bundle inefficiencies with audio engine and interpreter. Talked with potential user and wanted one link to use.

**Outcome:** Web app with 16-channel tracks, piano roll, effects panel.

### Phase 2: Text Input → Visual Tools
**What:** Initially had `TrackInput` component where users typed Strudel code directly.

**Why Changed:** Target user (Tom) needs no-code experience. Visual tools are more accessible.

**Outcome:** `TrackInput` → `CodeDisplay` (read-only). Patterns created via piano roll + instrument picker.

### Phase 3: Single Notes Array → Separate Melodic/Percussive
**What:** Initially stored `notes` array, with `mode` determining how to interpret them.

**Why Changed:** User should be able to switch modes without losing work. Melodic and percussive patterns are fundamentally different.

**Outcome:** `melodicNotes` and `percussiveNotes` stored separately. Migration function handles old format.

### Phase 4: Sample Browser Drag/Drop → Read-Only Reference
**What:** Sample browser allowed dragging samples onto tracks.

**Why Changed:** New workflow: select instrument via dropdown in track row, not drag from browser.

**Outcome:** Sample browser becomes reference-only with header toggle. `InstrumentPicker` component for selection.

### Phase 5: FX State in Pattern → FX State Separate
**What:** Initially considered storing FX as part of pattern string only.

**Why Changed:** Need to parse FX from code to populate UI controls. Also, FX can be modified independently of notes.

**Outcome:** `trackFx` state separate from `trackGrids`, but merged into generated code via `codeGenerator.js`.

### Phase 6: Static Effects Only → Signal Modulation
**What:** Initially planned only static effect values (knob → number).

**Why Changed:** Strudel supports signal modulation (LFO) like `sine.range(200, 2000).slow(4)`. This is powerful and should be accessible.

**Outcome:** `EffectControl` component toggles between static (knob) and signal (waveform controls) modes.

### Phase 7: Single Panel Open → One Panel at a Time
**What:** Initially considered allowing multiple piano roll/FX panels open simultaneously.

**Why Changed:** Reduces UI clutter, prevents confusion about which panel affects which track.

**Outcome:** Opening a panel for track X closes any open panel for track Y.

### Phase 8: Pattern Code as Source of Truth → Structured State
**What:** Initially stored generated Strudel code strings in `patterns` state.

**Why Changed:** Need to support operations like "clear track," "switch mode," "undo." Structured state enables these.

**Outcome:** `trackGrids` (structured) + `codeGenerator.js` (state → code). Pattern parsing (code → state) for FX panel only.

---

## Challenges & Solutions

### Challenge 1: Audio Glitches on Rapid Updates
**Problem:** Updating pattern on every knob drag or note toggle caused audio stuttering.

**Solution:** Throttle pattern updates to 60fps (~16ms intervals). UI updates instantly for visual feedback, but audio evaluation is debounced.

**Implementation:**
```javascript
const throttledUpdate = useMemo(
  () => throttle((slot, gridData) => {
    // Update pattern
  }, 16),
  []
)
```

### Challenge 2: Parsing Pattern Code to Extract Effects
**Problem:** FX panel needs to read existing effects from pattern code to populate controls. Pattern strings like `s("bd sn").lpf(500).gain(0.8).room(0.3)` need to be parsed.

**Solution:** Simple approach: strip known effects from the end of pattern string. More complex: detect signal modulation like `sine.range(200, 2000).slow(4)` with regex.

**Implementation:** Pattern parsing in `TrackEffects.jsx` that:
1. Extracts base pattern (everything before first effect)
2. Extracts static effects (`.effect(value)`)
3. Extracts signal effects (`.effect(waveform.range(...))`)
4. Populates UI controls accordingly

### Challenge 3: Real-Time Code Generation Performance
**Problem:** Generating Strudel code from grid state on every note toggle could be slow for complex patterns.

**Solution:** Memoize code generation with `useMemo`, only regenerate when dependencies change (instrument, mode, notes, FX).

**Implementation:**
```javascript
const patternCode = useMemo(
  () => generatePattern(trackGrids[slot], trackFx[slot]),
  [trackGrids[slot], trackFx[slot]]
)
```

### Challenge 4: Piano Roll Grid Rendering Performance
**Problem:** 16 steps × 24 notes = 384 cells. Re-rendering entire grid on single note toggle could be slow.

**Solution:** Use CSS Grid layout (not flexbox), React keys for efficient reconciliation, avoid re-rendering unchanged cells.

**Implementation:** Each cell is a separate DOM element with stable keys. React only updates cells that changed.

### Challenge 5: Audio Preview on Note Click
**Problem:** Playing preview audio on every note toggle (especially rapid clicks) causes audio pile-up.

**Solution:** Debounce preview calls to 50ms, so rapid clicks only play the last note.

**Implementation:**
```javascript
const debouncedPreview = useDebounce((inst, note) => {
  playPreview(inst, note)
}, 50)
```

### Challenge 6: Mode Switching Without Losing Data
**Problem:** User switches from melodic to percussive mode. Should notes be cleared or preserved?

**Solution:** Store notes separately by mode. Switching modes shows/hides different note sets. User can switch back and forth without losing work.

**Implementation:** `melodicNotes` and `percussiveNotes` arrays. Mode toggle switches which array is displayed/used for playback.

### Challenge 7: Effect Signal Modulation UI
**Problem:** Signal modulation like `sine.range(200, 2000).slow(4)` is complex. How to represent in UI?

**Solution:** Toggle between static mode (knob) and signal mode (waveform dropdown + min/max sliders + speed slider). Effect control expands when in signal mode.

**Implementation:** `EffectControl` component with mode toggle. Signal mode replaces knob with waveform controls.

### Challenge 8: Panel Positioning and State
**Problem:** FX panel and piano roll panel need to be positioned relative to buttons, but also draggable. Should position persist?

**Solution:** Position resets to default (below and to the right of button) each time panel opens. Once open, user can drag it. Position not persisted (simpler UX).

**Implementation:** Get button `getBoundingClientRect()` on open, set panel position. Draggable header for repositioning.

### Challenge 9: localStorage Write Performance
**Problem:** Saving to localStorage on every state change (note toggle, knob drag) could cause UI freeze.

**Solution:** Debounce localStorage writes to 100ms. UI updates instantly, but persistence is debounced.

**Implementation:** Separate debounced save function called after state updates.

### Challenge 10: Pattern Code Display Updates
**Problem:** Code display should update in real-time as user edits piano roll or adjusts effects.

**Solution:** Code is memoized and regenerates when dependencies change. Display updates automatically via React re-render.

**Implementation:** `CodeDisplay` component reads from `patterns` state, which is updated via `generatePattern()` when grid/FX change.

### Challenge 11: Clear Track Operation
**Problem:** "Clear track" should reset instrument, mode, notes, and FX. But what if user wants to clear only notes?

**Solution:** Clear button in piano roll clears notes for current mode only. Full track clear (future) would reset everything.

**Implementation:** Clear button calls `onGridUpdate({ melodicNotes: [] })` or `onGridUpdate({ percussiveNotes: [] })` based on current mode.

---

## DOK 3 - Insights

### Insight 1: Visual Tools Don't Replace Code, They Generate It
The shift from text input to visual tools isn't about hiding code—it's about making code generation accessible. The code display (read-only) shows users what's being generated, enabling learning. This bridges the gap between "no code" and "learning to code."

### Insight 2: State Architecture Determines UX Capabilities
Storing structured state (instrument, mode, notes, FX) instead of code strings enables operations like undo, clear, mode switching. The data model directly determines what UX is possible.

### Insight 3: Real-Time Audio Requires Throttling, Not Just Debouncing
Audio evaluation needs consistent timing (60fps) to prevent glitches. This is different from debouncing (wait for pause)—throttling ensures updates happen at regular intervals even during rapid changes.

### Insight 4: Pattern Languages Enable Live Modification
The pattern map architecture (query events at time X) enables live modification without stopping playback. This is fundamentally different from fixed sequences and enables the real-time visual editing experience.

---

## DOK 4 - Spiky Points of View (SPOVs)

### SPOV 1: Visual Tools Should Generate Code, Not Hide It
**Assertion:** The future of accessible music production tools isn't about hiding code—it's about generating code from visual interactions while showing users what's being created.

**Elaboration:** Most "no-code" tools hide the underlying representation, making users dependent on the tool. By generating code (Strudel patterns) and displaying it read-only, users can learn the language while benefiting from visual tools. This creates a bridge: start visual, learn code, eventually type code directly. The code display becomes a learning tool, not just a technical detail.

**Evidence:** Users can see generated patterns, copy them, learn Strudel syntax. Visual tools don't lock users into a proprietary format—they generate standard Strudel code that works anywhere.

### SPOV 2: State Architecture Is UX Architecture
**Assertion:** How you structure application state directly determines what user experiences are possible. Choosing the right data model enables or prevents features like undo, mode switching, and real-time collaboration.

**Elaboration:** Storing code strings vs. structured state isn't just a technical choice—it's a UX choice. Code strings enable copy/paste and direct editing but prevent operations like "clear track" or "switch mode without losing work." Structured state enables these operations but requires code generation. The data model is the foundation of UX capabilities.

**Evidence:** Migration from `notes` array to `melodicNotes`/`percussiveNotes` enabled mode switching without data loss. Separate `trackFx` state enabled independent effect editing. These architectural decisions directly enabled UX features.

---

## DOK 2 - Knowledge Tree

### Category 1: Pattern Language Architecture
**Subcategory 1.1: Tidal/Strudel Pattern System**
- **Source:** Research notes, TidalCycles documentation
- **DOK 1 - Facts:**
  - Pattern map holds active patterns
  - Clock ticks query events for time X
  - Patterns are functions, not fixed sequences
  - OSC messages sent to audio engine (Superdough)
- **DOK 2 - Summary:**
  - Pattern languages use time-based queries, not pre-rendered sequences
  - This enables live modification without stopping playback
  - Architecture separates pattern logic (Tidal/Strudel) from audio engine (Supercollider/Superdough)
- **Link to source:** https://strudel.cc/

**Subcategory 1.2: Strudel vs. TidalCycles**
- **Source:** Research notes, uzu.lurk.org
- **DOK 1 - Facts:**
  - TidalCycles: Haskell-based, most popular
  - Strudel: JavaScript/web-based, same pattern language
  - Strudel runs in browser, no Haskell toolchain needed
- **DOK 2 - Summary:**
  - Strudel enables web deployment without bundling Haskell
  - Same pattern syntax, different runtime
  - Web-based enables easier distribution and updates

### Category 2: Audio Engine Architecture
**Subcategory 2.1: Signal Graph Model**
- **Source:** Research notes
- **DOK 1 - Facts:**
  - Audio engines model signal graphs (DAG of nodes)
  - Game engines model scenes/worlds
  - Audio engines often use external controllers
- **DOK 2 - Summary:**
  - Audio processing is fundamentally different from game rendering
  - Signal graphs require precise timing (DSP)
  - External controllers (like Strudel) send commands to audio engine

**Subcategory 2.2: Web Audio API**
- **Source:** Implementation experience
- **DOK 1 - Facts:**
  - `AudioContext` manages audio graph
  - `GainNode` can be monkey-patched for recording
  - `MediaRecorder` captures audio streams
- **DOK 2 - Summary:**
  - Web Audio API enables browser-based audio processing
  - Monkey-patching `GainNode.connect` allows capturing master output
  - MediaRecorder API enables session recording

### Category 3: State Management Patterns
**Subcategory 3.1: Source of Truth Architecture**
- **Source:** Implementation experience
- **DOK 1 - Facts:**
  - Code strings as source of truth: simple, but limits operations
  - Structured state as source of truth: complex, but enables UX features
  - Bidirectional sync requires parsing
- **DOK 2 - Summary:**
  - Choosing source of truth determines what operations are possible
  - Migration between formats requires transformation functions
  - Parsing code back to state is more complex than generating code from state

### Category 4: Performance Optimization
**Subcategory 4.1: Real-Time Audio Updates**
- **Source:** Implementation experience
- **DOK 1 - Facts:**
  - Audio evaluation needs consistent timing (60fps)
  - Throttling prevents audio glitches
  - UI updates can be instant (visual feedback)
- **DOK 2 - Summary:**
  - Separate throttling for audio vs. UI updates
  - 16ms intervals (60fps) for smooth audio
  - Debouncing is different from throttling

**Subcategory 4.2: DOM Rendering Performance**
- **Source:** Implementation experience
- **DOK 1 - Facts:**
  - CSS Grid more efficient than flexbox for grids
  - React keys enable efficient reconciliation
  - Memoization prevents unnecessary re-renders
- **DOK 2 - Summary:**
  - DOM-based rendering sufficient for 384 cells (16×24)
  - Canvas would be overkill for this use case
  - React optimization patterns (memo, useMemo) prevent performance issues

---

## Experts

### Expert 1: TidalCycles Community
**Who:** Community of live coders using TidalCycles/Strudel
**Focus:** Pattern-based music composition, live coding practices
**Why Follow:** Source of pattern language knowledge, best practices for live coding workflows
**Where:** https://strudel.cc/, https://tidalcycles.org/

### Expert 2: Web Audio API Documentation
**Who:** W3C Web Audio API specification and browser implementations
**Focus:** Browser-based audio processing, signal graph architecture
**Why Follow:** Technical foundation for audio capture, recording, real-time processing
**Where:** https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

---

## Summary

This BrainLift documents the development of Algorave Strudel from initial research through implementation. Key themes:

1. **Planning-first approach:** Detailed PRDs and task lists before implementation
2. **Incremental delivery:** Features broken into sequential PRs
3. **State architecture enables UX:** Structured state (not code strings) enables operations like undo, mode switching
4. **Migration as infrastructure:** Data format changes require permanent migration functions
5. **Real-time audio requires throttling:** 60fps updates prevent glitches
6. **Visual tools generate code:** Code display enables learning while benefiting from visual tools

The project evolved from a broad vision (desktop app, LLM chatbot) to a focused web app that makes Strudel pattern creation accessible through visual tools while preserving the power of the underlying pattern language.
