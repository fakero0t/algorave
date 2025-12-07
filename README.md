# Algorave Strudel

A web-based live coding environment for music. Built on [Strudel](https://strudel.cc/).

## Stack

- **Vite + React** - fast dev server and build
- **@strudel/web** - programmatic control over Strudel audio engine

## Features

- **16-Channel Track System** - Visual grid with d1-d16 slots for patterns
- **Piano Roll Editor** - Draw notes with melodic and percussive modes
- **Track Effects** - Filter, reverb, delay, distortion per track
- **Instrument Picker** - Synths and Dirt samples
- **Sample Browser** - Browse and preview Dirt sample library
- **Transport Controls** - Play/Stop, BPM, global mute
- **Pattern Persistence** - Auto-saves patterns, names, grids, and FX to localStorage
- **Live Updates** - Patterns update in real-time while playing
- **Keyboard Shortcuts** - ⌘. to mute/unmute all

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Usage

1. Type a Strudel pattern in the command modal
2. Press **Enter** to execute
3. Use **⌘.** (Cmd+Period) to silence all

## Example Patterns

```javascript
// Simple note sequence
note("<c3 e3 g3 b3>").s("piano")

// Drum pattern
s("bd sd [~ bd] sd")

// With effects
note("<c4 e4 g4>*4")
  .s("sawtooth")
  .lpf(sine.range(200, 2000).slow(4))
  .room(0.5)
```
