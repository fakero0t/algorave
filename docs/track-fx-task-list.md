# Track Effects Panel - Task List

## Constraints

- Desktop only (no touch support)
- No double-click to reset knob
- No shift key for fine control

## Pattern Examples

```javascript
// Base pattern
s("bd sn")

// With static effects
s("bd sn").lpf(500).gain(0.8)

// With signal modulation
s("bd sn").lpf(sine.range(200, 2000).slow(4))
```

## State Management

Effect state is derived entirely from parsing the pattern string. No separate effect state storage - the pattern string is the source of truth.

---

## PR 1: Core Components & Static Effects

Foundation layer with knob controls and basic effect application.

### Files to Create/Modify

- `src/components/Knob.jsx` (new)
- `src/components/EffectControl.jsx` (new) - static mode only
- `src/components/TrackEffects.jsx` (new)
- `src/components/EventStream.jsx` (modify)
- `src/index.css` (modify)

### Tasks

#### 1. Knob Component (`Knob.jsx`)

- 48px diameter rotary knob
- Filled arc visualization (progress bar style, grows from start position)
- Drag interaction: up = increase, down = decrease
- Value display below knob, label below value
- Accent color passed via `color` prop
- Logarithmic scale support for LPF (pass `logarithmic` prop)
- Throttle updates to 60fps (~16ms)
- Props: `value`, `min`, `max`, `onChange`, `label`, `color`, `logarithmic`

#### 2. EffectControl Component (`EffectControl.jsx`) - Static Mode Only

- Wrapper around Knob for each effect
- Small wave icon button next to knob (placeholder for PR 2, disabled/hidden for now)
- Props: `effect`, `value`, `onChange`, `color`, `config` (min/max/default/logarithmic)

#### 3. TrackEffects Panel (`TrackEffects.jsx`)

**Structure:**
- Floating panel, draggable by header only
- Position below and to the right of FX button
- Position resets to default each time panel opens
- Dark modal style matching existing modals
- Closes on: X button, Escape key (NOT click outside)

**Header:**
- Title: "Track X Effects" (X = track number)
- Reset All button (next to close) - resets all effects to defaults and updates pattern
- Close button (X)

**Effects Grid:** 3 columns × 2 rows
| gain | lpf | room |
| delay | pan | distort |

**Effect Configs:**
- gain: min=0, max=2, default=1
- lpf: min=20, max=20000, default=20000, logarithmic=true
- room: min=0, max=1, default=0
- delay: min=0, max=1, default=0
- pan: min=0, max=1, default=0.5
- distort: min=0, max=10, default=0

#### 4. FX Button in EventStream

- Add FX button to far right of each track row (after mute button in `.channel-row`)
- Sliders/mixer icon
- Visible on all tracks, disabled (grayed out) when track has no pattern
- Uses track color from `CHANNEL_COLORS` when active
- Only one panel open at a time (clicking another track's FX closes current)
- State: `fxPanelTrack` (null or slot like "d1") - which track's panel is open
- State: `fxPanelPosition` - {x, y} from button's `getBoundingClientRect()`

**Panel positioning:**
- On FX button click, get button rect via `getBoundingClientRect()`
- Position panel at `{ x: rect.right + 8, y: rect.bottom + 8 }`

**When pattern is cleared:**
- If user clears pattern via inline edit, close FX panel if open for that track

#### 5. Effect Application (Static Values)

- Fixed effect order: gain → lpf → room → delay → pan → distort
- Only append effects with non-default values
- Base pattern = full pattern string (no parsing in PR 1)
- Apply effects by appending: `.gain(val).lpf(val)...`
- Real-time updates via eval (throttled to 60fps)

**Eval mechanism:**
```javascript
const fullPattern = `${basePattern}${effectChain}`
eval(`(${fullPattern}).play()`)
onPatternUpdate(slot, fullPattern)
```

**On knob change:**
1. Build effect chain from current effect values
2. Combine base pattern + effect chain
3. Eval to play updated pattern
4. Update pattern state via `onPatternUpdate`

#### 6. CSS Additions

- `.knob` - container, arc SVG styling
- `.knob-value`, `.knob-label` - text styling
- `.effect-control` - wrapper layout
- `.track-effects-panel` - floating panel, dark modal style
- `.track-effects-header` - flex layout, title, buttons
- `.track-effects-grid` - 3-column grid
- `.fx-button` - track row button, disabled state
- Draggable header cursor styling

---

## PR 2: Signal Modulation & Effect Parsing

Adds waveform-based modulation and parses existing effects from patterns.

### Files to Modify

- `src/components/EffectControl.jsx` (expand)
- `src/components/TrackEffects.jsx` (expand)
- `src/index.css` (expand)

### Tasks

#### 1. Signal Mode in EffectControl

**Mode Toggle:**
- Wave icon button toggles between static and signal mode
- Active state styling when in signal mode

**Signal Mode Controls (replaces knob entirely):**
- Waveform dropdown: sine, saw, square, tri, rand, perlin
- Default waveform: sine
- Two vertical sliders for min/max range
- Default ranges (musical defaults, not full range):
  - gain: 0.5-1.5
  - lpf: 200-2000
  - room: 0-0.5
  - delay: 0-0.5
  - pan: 0.3-0.7
  - distort: 0-3
- Speed slider: 0.25x to 4x (default 1x)
- Layout expands when in signal mode

**Code Generation:**
- Generates: `sine.range(min, max)` with optional speed modifier

**Speed ↔ slow/fast mapping:**
- speed < 1 → `.slow(1/speed)` e.g., 0.25x → `.slow(4)`
- speed = 1 → no modifier
- speed > 1 → `.fast(speed)` e.g., 4x → `.fast(4)`

**Examples:**
- `sine.range(200, 2000)` (speed 1x)
- `sine.range(200, 2000).slow(4)` (speed 0.25x)
- `saw.range(0.5, 1.5).fast(2)` (speed 2x)

#### 2. Effect Parsing (Panel Open)

**When panel opens, parse pattern string:**
- Extract existing effect values (static numbers)
- Detect signal modulation patterns: `sine.range(...)`, `saw.range(...)`, etc.
- Set control mode accordingly (static vs signal)
- Extract waveform type, min, max, speed from signal patterns

**Base Pattern Extraction:**
- Strip known effects from end of pattern string
- Keep everything else as base pattern

**Regex patterns:**
```javascript
// Static effect: .gain(0.8), .lpf(500)
/\.(gain|lpf|room|delay|pan|distort)\((\d+\.?\d*)\)/g

// Signal effect: .lpf(sine.range(200, 2000).slow(4))
/\.(gain|lpf|room|delay|pan|distort)\((sine|saw|square|tri|rand|perlin)\.range\((\d+\.?\d*),\s*(\d+\.?\d*)\)(\.slow\((\d+\.?\d*)\)|\.fast\((\d+\.?\d*)\))?\)/g
```

#### 3. Unsupported Effects Display

- Parse any effects not in the 6 supported
- Show as read-only text at bottom of panel
- These are preserved in the pattern but not editable

#### 4. Enhanced Effect Application

- Preserve unsupported effects in output
- Handle both static and signal values
- Rebuild pattern: base + unsupported effects + supported effects (in fixed order)

#### 5. Additional CSS

- `.effect-control.signal-mode` - expanded layout
- `.waveform-select` - dropdown styling
- `.range-sliders` - vertical slider container
- `.range-slider` - individual vertical slider
- `.speed-slider` - horizontal slider
- `.mode-toggle` - wave icon button states
- `.unsupported-effects` - read-only display at panel bottom

