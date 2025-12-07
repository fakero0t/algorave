# Session Recording Feature Plan

## Overview

Add a record button to the header that captures all audio output as a downloadable file.

## Technical Approach

### Audio Capture

Monkey-patch `GainNode.prototype.connect` before Strudel initializes to capture the master output node. Connect it to a `MediaStreamDestination` for recording via `MediaRecorder` API.

```
[All Tracks] → [Superdough destinationGain] → [audioContext.destination] (speakers)
                                            ↘ [MediaStreamDestination] → [MediaRecorder]
```

### Files to Modify

- **src/App.jsx** - Add recording state, patch setup before Strudel loads
- **src/components/RecordButton.jsx** (new) - Record/stop button with timer display
- **src/hooks/useRecorder.js** (new) - Recording logic, MediaRecorder management
- **src/index.css** - Styles for record button (red dot, pulse animation while recording)

## UI Design

Header layout with record button:
```
[⌁ Algorave] [● Ready]  |  [🔴 REC] [▶ Play] [⏹ Stop] [BPM: 120] [Mute All]  |  [⚙]
```

- **Idle state**: Gray circle outline, "REC" label
- **Recording state**: Red pulsing dot, elapsed time display (00:00), "STOP" label
- Click toggles between states

## Decisions

- **Storage**: Direct browser download on stop
- **Format**: WebM/Opus (default MediaRecorder output, good compression)
- **Filename**: `algorave-YYYY-MM-DD-HH-MM.webm` (timestamp-based)
- **Refresh handling**: `beforeunload` warning if recording is active
- **Offline handling**: Auto-stop and save what was recorded
- **Max duration**: No hard limit (warn if approaching 1 hour due to memory)
- **Button visibility**: Always visible, disabled until Strudel initialized

## Edge Cases to Handle

- User refreshes/closes tab while recording
- Audio context suspended (tab backgrounded)
- No audio playing but recording started
- Very long recordings (memory pressure)
- Browser doesn't support MediaRecorder

## Implementation Steps

1. **Audio capture setup** - Patch `GainNode.connect` before Strudel loads to capture master output
2. **useRecorder hook** - MediaRecorder logic, start/stop, blob handling, download trigger
3. **RecordButton component** - UI with idle/recording states, elapsed timer
4. **Integration** - Add to header, wire up state
5. **Safety guards** - `beforeunload` warning, offline detection, audio context suspension handling
6. **Styling** - Red pulsing dot animation, recording state visuals

