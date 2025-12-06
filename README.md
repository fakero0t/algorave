# Algorave Strudel

A web-based live coding environment for music, inspired by the Algorave desktop app. Built on [Strudel](https://strudel.cc/).

## Stack

- **Vite + React** - fast dev server and build
- **@strudel/web** - programmatic control over Strudel audio engine
- **MassiveMusic-inspired design** - lime-to-orange gradient, draggable modals, 16-channel event stream

## Features

- **16 Channel Event Stream** - Visual display of active patterns (d1-d16)
- **Draggable Command Modal** - Write and execute Strudel patterns
- **Sample Browser** - Draggable, collapsible panel with common samples
- **Drag & Drop** - Drag samples into the command input
- **Keyboard Shortcuts** - Quick access to common actions

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
