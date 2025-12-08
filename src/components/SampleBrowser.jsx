import { useState, useEffect, useRef, useCallback } from 'react'

// User-friendly display names for samples
const SAMPLE_DISPLAY_NAMES = {
  // Drums
  'bd': 'Bass Drum',
  'sd': 'Snare Drum',
  'hh': 'Hi-Hat',
  'oh': 'Open Hi-Hat',
  'cp': 'Clap',
  'cb': 'Cowbell',
  'cr': 'Crash',
  'rs': 'Rimshot',
  'rm': 'Rim',
  'sn': 'Snare',
  'hc': 'Hi-Hat Closed',
  'ho': 'Hi-Hat Open',
  'ht': 'Hi-Hat',
  'lt': 'Low Tom',
  'mt': 'Mid Tom',
  
  // 808/909
  '808': '808',
  '808bd': '808 Bass Drum',
  '808sd': '808 Snare',
  '808cy': '808 Cymbal',
  '808hc': '808 Hi-Hat Closed',
  '808ht': '808 Hi-Hat',
  '808lc': '808 Low Conga',
  '808lt': '808 Low Tom',
  '808mc': '808 Mid Conga',
  '808mt': '808 Mid Tom',
  '808oh': '808 Open Hi-Hat',
  '909': '909',
  
  // Bass
  'bass': 'Bass',
  'bass0': 'Bass 0',
  'bass1': 'Bass 1',
  'bass2': 'Bass 2',
  'bass3': 'Bass 3',
  'bassdm': 'Bass DM',
  'bassfoo': 'Bass Foo',
  'jungbass': 'Jungle Bass',
  'jvbass': 'JV Bass',
  
  // Instruments
  'casio': 'Casio',
  'arpy': 'Arpeggio',
  'arp': 'Arp',
  'pluck': 'Pluck',
  'metal': 'Metal',
  'jazz': 'Jazz',
  'east': 'East',
  'world': 'World',
  'tabla': 'Tabla',
  'tabla2': 'Tabla 2',
  'hand': 'Hand',
  'drum': 'Drum',
  'pad': 'Pad',
  'padlong': 'Pad Long',
  'wind': 'Wind',
  'birds': 'Birds',
  'birds3': 'Birds 3',
  'nature': 'Nature',
  'breaks': 'Breaks',
  'house': 'House',
  'industrial': 'Industrial',
  'sitar': 'Sitar',
  'sax': 'Saxophone',
  'trump': 'Trumpet',
  'moog': 'Moog',
  'juno': 'Juno',
  'gtr': 'Guitar',
  
  // Percussion
  'perc': 'Percussion',
  'peri': 'Percussion',
  'drumtraks': 'Drum Traks',
  'sequential': 'Sequential',
  'incoming': 'Incoming',
  'odx': 'ODX',
  'dr': 'DR',
  'dr2': 'DR 2',
  'dr55': 'DR-55',
  'dr_few': 'DR Few',
  
  // Effects & FX
  'glitch': 'Glitch',
  'glitch2': 'Glitch 2',
  'click': 'Click',
  'bleep': 'Bleep',
  'blip': 'Blip',
  'hit': 'Hit',
  'stab': 'Stab',
  'hoover': 'Hoover',
  'wobble': 'Wobble',
  'noise': 'Noise',
  'noise2': 'Noise 2',
  'breath': 'Breath',
  'fire': 'Fire',
  'wind': 'Wind',
  'bubble': 'Bubble',
  'coins': 'Coins',
  'pebbles': 'Pebbles',
  
  // Genres & Styles
  'techno': 'Techno',
  'tech': 'Tech',
  'rave': 'Rave',
  'rave2': 'Rave 2',
  'ravemono': 'Rave Mono',
  'gabba': 'Gabba',
  'gabbaloud': 'Gabba Loud',
  'gabbalouder': 'Gabba Louder',
  'hardcore': 'Hardcore',
  'jungle': 'Jungle',
  'future': 'Future',
  
  // Breaks
  'breaks125': 'Breaks 125',
  'breaks152': 'Breaks 152',
  'breaks157': 'Breaks 157',
  'breaks165': 'Breaks 165',
  'amencutup': 'Amen Cutup',
  'foo': 'Foo',
  
  // Special
  'alphabet': 'Alphabet',
  'numbers': 'Numbers',
  'num': 'Numbers',
  'speech': 'Speech',
  'speakspell': 'Speak & Spell',
  'speechless': 'Speechless',
  'toys': 'Toys',
  'xmas': 'Christmas',
  
  // Other
  'hh27': 'Hi-Hat 27',
  'clubkick': 'Club Kick',
  'popkick': 'Pop Kick',
  'hardkick': 'Hard Kick',
  'reverbkick': 'Reverb Kick',
  'kicklinn': 'Linn Kick',
  'realclaps': 'Real Claps',
  'linnhats': 'Linn Hi-Hats',
  'gretsch': 'Gretsch',
  'electro1': 'Electro 1',
  'auto': 'Auto',
  'feel': 'Feel',
  'feelfx': 'Feel FX',
  'less': 'Less',
  'made': 'Made',
  'made2': 'Made 2',
  'mash': 'Mash',
  'mash2': 'Mash 2',
  'miniyeah': 'Mini Yeah',
  'yeah': 'Yeah',
  'monsterb': 'Monster Bass',
  'cosmicg': 'Cosmic G',
  'control': 'Control',
  'dorkbot': 'Dorkbot',
  'dork2': 'Dork 2',
  'glasstap': 'Glass Tap',
  'lighter': 'Lighter',
  'space': 'Space',
  'invaders': 'Invaders',
  'tacscan': 'Tacscan',
  'seawolf': 'Seawolf',
  'battles': 'Battles',
  'armora': 'Armora',
  'sundance': 'Sundance',
  'sugar': 'Sugar',
  'stomp': 'Stomp',
  'tink': 'Tink',
  'tok': 'Tok',
  'chin': 'Chin',
  'clak': 'Clak',
  'circus': 'Circus',
  'can': 'Can',
  'bottle': 'Bottle',
  'co': 'Co',
  'oc': 'OC',
  'crow': 'Crow',
  'insect': 'Insect',
  'sheffield': 'Sheffield',
  'outdoor': 'Outdoor',
  'hmm': 'Hmm',
  'erk': 'Erk',
  'fest': 'Fest',
  'off': 'Off',
  'led': 'LED',
  'uxay': 'Uxay',
  'v': 'V',
  'voodoo': 'Voodoo',
  'ul': 'UL',
  'ulgab': 'UL Gab',
  'haw': 'Hawaiian',
  'koy': 'Koy',
  'kurt': 'Kurt',
  'latibro': 'Latibro',
  'blue': 'Blue',
  'alex': 'Alex',
  'ade': 'Ade',
  'ades2': 'Ade S2',
  'ades3': 'Ade S3',
  'ades4': 'Ade S4',
  'ab': 'AB',
  'db': 'DB',
  'fm': 'FM',
  'sf': 'SF',
  'psr': 'PSR',
  'sid': 'SID',
  'em2': 'EM2',
  'mp3': 'MP3',
  'msg': 'MSG',
  'mute': 'Mute',
  'newnotes': 'New Notes',
  'notes': 'Notes',
  'print': 'Print',
  'proc': 'Proc',
  'procshort': 'Proc Short',
  'subroc3d': 'Subroc 3D',
  'speedupdown': 'Speed Up/Down',
  'tablex': 'Tablex',
  'bin': 'Bin',
  'bev': 'Bev',
  'bend': 'Bend',
  'diphone': 'Diphone',
  'diphone2': 'Diphone 2',
  'dist': 'Distortion',
  'flick': 'Flick',
  'gab': 'Gab',
  'h': 'H',
  'if': 'IF',
  'ifdrums': 'IF Drums',
  'jvbass': 'JV Bass',
  'mouth': 'Mouth',
  'd': 'D',
  'e': 'E',
  'f': 'F',
}

// Helper function to get display name for a sample
export function getSampleDisplayName(sample) {
  return SAMPLE_DISPLAY_NAMES[sample] || sample
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .replace(/\d+$/, ' $&') // Add space before trailing numbers
    .trim()
}

// Actual samples from github:tidalcycles/dirt-samples
export const DEFAULT_SAMPLES = [
  '808', '808bd', '808cy', '808hc', '808ht', '808lc', '808lt', '808mc', '808mt', '808oh', '808sd',
  '909', 'ab', 'ade', 'ades2', 'ades3', 'ades4', 'alex', 'alphabet', 'amencutup', 'armora', 'arp', 'arpy',
  'auto', 'baa', 'baa2', 'bass', 'bass0', 'bass1', 'bass2', 'bass3', 'bassdm', 'bassfoo', 'battles',
  'bd', 'bend', 'bev', 'bin', 'birds', 'birds3', 'bleep', 'blip', 'blue', 'bottle',
  'breaks125', 'breaks152', 'breaks157', 'breaks165', 'breath', 'bubble',
  'can', 'casio', 'cb', 'cc', 'chin', 'circus', 'clak', 'click', 'clubkick', 'co', 'coins', 'control', 'cosmicg', 'cp', 'cr', 'crow',
  'd', 'db', 'diphone', 'diphone2', 'dist', 'dork2', 'dorkbot', 'dr', 'dr2', 'dr55', 'dr_few', 'drum', 'drumtraks',
  'e', 'east', 'electro1', 'em2', 'erk',
  'f', 'feel', 'feelfx', 'fest', 'fire', 'flick', 'fm', 'foo', 'future',
  'gab', 'gabba', 'gabbaloud', 'gabbalouder', 'glasstap', 'glitch', 'glitch2', 'gretsch', 'gtr',
  'h', 'hand', 'hardcore', 'hardkick', 'haw', 'hc', 'hh', 'hh27', 'hit', 'hmm', 'ho', 'hoover', 'house', 'ht',
  'if', 'ifdrums', 'incoming', 'industrial', 'insect', 'invaders',
  'jazz', 'jungbass', 'jungle', 'juno', 'jvbass',
  'kicklinn', 'koy', 'kurt',
  'latibro', 'led', 'less', 'lighter', 'linnhats', 'lt',
  'made', 'made2', 'mash', 'mash2', 'metal', 'miniyeah', 'monsterb', 'moog', 'mouth', 'mp3', 'msg', 'mt', 'mute',
  'newnotes', 'noise', 'noise2', 'notes', 'num', 'numbers',
  'oc', 'odx', 'off', 'outdoor',
  'pad', 'padlong', 'pebbles', 'perc', 'peri', 'pluck', 'popkick', 'print', 'proc', 'procshort', 'psr',
  'rave', 'rave2', 'ravemono', 'realclaps', 'reverbkick', 'rm', 'rs',
  'sax', 'sd', 'seawolf', 'sequential', 'sf', 'sheffield', 'short', 'sid', 'simplesine', 'sitar', 'sn', 'space',
  'speakspell', 'speech', 'speechless', 'speedupdown', 'stab', 'stomp', 'subroc3d', 'sugar', 'sundance',
  'tabla', 'tabla2', 'tablex', 'tacscan', 'tech', 'techno', 'tink', 'tok', 'toys', 'trump',
  'ul', 'ulgab', 'uxay',
  'v', 'voodoo',
  'wind', 'wobble', 'world',
  'xmas',
  'yeah'
]

function SampleBrowser({ isOpen, onClose }) {
  const [samples] = useState(DEFAULT_SAMPLES)
  const [filter, setFilter] = useState('')
  const [position, setPosition] = useState({ x: 20, y: 80 }) // Will be adjusted on mount
  const [size, setSize] = useState({ width: 240, height: 350 })
  const [hasInitialized, setHasInitialized] = useState(false)
  
  // Initialize position within event-stream bounds on mount
  useEffect(() => {
    if (hasInitialized) return
    const eventStream = document.querySelector('.event-stream')
    if (eventStream) {
      const bounds = eventStream.getBoundingClientRect()
      setPosition({
        x: bounds.right - 260,
        y: bounds.top + 10
      })
      setHasInitialized(true)
    }
  }, [hasInitialized])
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 })
  const [zIndex, setZIndex] = useState(100)
  
  const modalRef = useRef(null)
  const filterRef = useRef(null)

  // Min/max size constraints
  const minWidth = 180
  const minHeight = 150
  const maxWidth = typeof window !== 'undefined' ? window.innerWidth / 2 : 400
  const maxHeight = typeof window !== 'undefined' ? window.innerHeight : 600

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true)
      setDragStartPos({ x: e.clientX, y: e.clientY })
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    }
  }, [position])

  const handleResizeMouseDown = useCallback((e) => {
    if (isCollapsed) return
    e.stopPropagation()
    setIsResizing(true)
  }, [isCollapsed])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && modalRef.current) {
        const modalRect = modalRef.current.getBoundingClientRect()
        const currentHeight = isCollapsed ? modalRect.height : size.height
        
        // Get the event-stream bounds (track list view)
        const eventStream = document.querySelector('.event-stream')
        const bounds = eventStream?.getBoundingClientRect() || { 
          left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight 
        }
        
        // Constrain to event-stream bounds
        const minX = bounds.left
        const maxX = bounds.right - size.width
        const minY = bounds.top
        const maxY = bounds.bottom - currentHeight
        
        const newX = Math.max(minX, Math.min(maxX, e.clientX - dragOffset.x))
        const newY = Math.max(minY, Math.min(maxY, e.clientY - dragOffset.y))
        setPosition({ x: newX, y: newY })
      }
      if (isResizing && modalRef.current && !isCollapsed) {
        const rect = modalRef.current.getBoundingClientRect()
        const newWidth = Math.min(maxWidth, Math.max(minWidth, e.clientX - rect.left))
        const newHeight = Math.min(maxHeight, Math.max(minHeight, e.clientY - rect.top))
        setSize({ width: newWidth, height: newHeight })
      }
    }

    const handleMouseUp = (e) => {
      if (isDragging) {
        const dx = Math.abs(e.clientX - dragStartPos.x)
        const dy = Math.abs(e.clientY - dragStartPos.y)
        if (dx < 5 && dy < 5) {
          // Click without drag = toggle collapse
          setIsCollapsed(prev => !prev)
        }
      }
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, isCollapsed, dragOffset, dragStartPos, size, maxWidth, maxHeight])

  const filteredSamples = samples.filter(s => {
    const searchTerm = filter.toLowerCase()
    const sampleName = s.toLowerCase()
    const displayName = getSampleDisplayName(s).toLowerCase()
    return sampleName.includes(searchTerm) || displayName.includes(searchTerm)
  })

  const stopPropagation = useCallback((e) => {
    e.stopPropagation()
  }, [])

  const bringToFront = useCallback(() => {
    setZIndex(Date.now() % 10000 + 100)
  }, [])

  // Don't render if not open
  if (!isOpen) return null

  return (
    <div
      ref={modalRef}
      className={`sample-browser ${isCollapsed ? 'collapsed' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: isCollapsed ? 'auto' : size.height,
        zIndex,
      }}
      onMouseDown={(e) => {
        bringToFront()
        handleMouseDown(e)
      }}
      onWheel={stopPropagation}
      onScroll={stopPropagation}
      onPointerDown={stopPropagation}
    >
      <div className="drag-handle">
        <span className="modal-title">Samples</span>
        <div className="modal-header-actions">
          <span className="sample-count">{samples.length}</span>
          <span className="collapse-indicator">{isCollapsed ? '▼' : '▲'}</span>
          <button 
            className="sample-browser-close" 
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            aria-label="Close sample browser"
          >
            ×
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <>
          <input
            ref={filterRef}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter..."
            className="sample-filter"
          />
          <div className="sample-list">
            {filteredSamples.map(sample => (
              <div
                key={sample}
                className="sample-item"
                title={sample}
              >
                {getSampleDisplayName(sample)}
              </div>
            ))}
            {filteredSamples.length === 0 && (
              <div className="sample-empty">No samples found</div>
            )}
          </div>
          <div className="resize-handle" onMouseDown={handleResizeMouseDown} />
        </>
      )}
    </div>
  )
}

export default SampleBrowser

