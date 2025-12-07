# Track Effects Panel Implementation

## Summary

Add an FX button to each track row that opens a floating panel with rotary knobs for core effects. Each effect supports both static values (knob) and signal modulation (waveform controls). Effects are appended to the pattern code in real-time.

## Files to Create/Modify

- **src/components/Knob.jsx** (new) - Rotary knob with drag-to-rotate interaction
- **src/components/EffectControl.jsx** (new) - Wrapper that toggles between static knob and signal modulation controls
- **src/components/TrackEffects.jsx** (new) - Floating effects panel
- **src/components/EventStream.jsx** - Add FX button to each track row
- **src/index.css** - Styles for all new components

---

## Implementation Details

### Knob Component

- **Size:** 48px diameter (small/compact)
- **Style:** Filled arc that grows from start position (progress bar style)
- **Drag interaction:** Drag up = increase, drag down = decrease
- **Value display:** Below the knob, above the label
- **Accent color:** From track color
- **LPF scale:** Logarithmic (for better control in audible range)
- **Update throttling:** 60fps (~16ms) for smooth performance
- Props: `value`, `min`, `max`, `onChange`, `label`, `color`

### EffectControl Component

Toggle between two modes per effect:

**Static Mode (default):**
- Shows the knob
- Value is a simple number

**Signal Mode:**
- Knob is **replaced entirely** with waveform controls
- Dropdown to select waveform: sine, saw, square, tri, rand, perlin
- **Default waveform:** sine
- Two **vertical sliders** for min/max range
- **Default range:** Sensible musical range (e.g., lpf: 200-2000, not full 20-20000)
- Speed slider: 0.25x to 4x range (default: 1x)
- Generates code like: `sine.range(200, 2000).slow(4)`

**Mode toggle:** Small wave icon button next to the knob

**Layout:** When in signal mode, the effect control **expands** (grows wider/taller) to accommodate controls

### TrackEffects Panel

**Position & Behavior:**
- Floating, draggable panel (header only is draggable)
- Positioned **below and to the right** of the FX button
- Position **resets to default** each time panel is opened (no memory)
- Only one panel open at a time

**Appearance:**
- Dark modal style matching existing modals
- Closes on: X button click, Escape key (NOT click outside)
- Header displays: "Track X Effects" (e.g., "Track 1 Effects")

**Header elements:**
- Track title
- Reset All button (next to close button) - **immediately updates pattern** (removes all effects)
- Close button (X)

**Effects grid:** 3 columns × 2 rows
| gain | lpf | room |
| delay | pan | distort |

**Effect defaults:**
- **gain** (0-2, default 1)
- **lpf** (20-20000, default 20000, logarithmic)
- **room** (0-1, default 0)
- **delay** (0-1, default 0)
- **pan** (0-1, default 0.5)
- **distort** (0-10, default 0)

**Unsupported effects:** Show as read-only text at the bottom of the panel

### FX Button on Track Row

- **Position:** Far right of each track row
- **Icon:** Sliders/mixer icon
- **Visibility:** Visible on all tracks, but **disabled** (grayed out/dimmed) when track has no pattern
- **Styling:** Uses track color when active

### Effect Parsing (when panel opens)

- Parse pattern string to extract existing effect values
- Detect signal modulation patterns (e.g., `sine.range(...)`)
- Set control mode accordingly (static vs signal)
- **Base pattern extraction:** Simple approach - strip known effects from the end, keep everything else as base

### Effect Application

- **Fixed order:** gain → lpf → room → delay → pan → distort
- Strip existing effects, rebuild with new values
- Only append effects with non-default values
- Real-time updates via eval (throttled to 60fps)

---

## Constraints

- Desktop only (no touch support)
- No double-click to reset knob
- No shift key for fine control

---

## Todos

- [ ] Create Knob.jsx - rotary knob with drag interaction and arc visualization
- [ ] Create EffectControl.jsx - toggle between static knob and signal modulation controls
- [ ] Create TrackEffects.jsx - floating draggable panel with 6 effect controls
- [ ] Add FX button to EventStream tracks, manage panel state, handle effect changes
- [ ] Implement pattern parsing to extract effect values (static and signal modes)
- [ ] Add CSS for knob, effect control, and effects panel
