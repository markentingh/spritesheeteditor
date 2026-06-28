import { useState, useRef, useEffect } from 'react'
import Sidebar from '../../components/sheet-editor/Sidebar'
import Checkbox from '../../components/forms/Checkbox'
import PixelEditor from '../../components/pixel-editor/PixelEditor'

// Helper function to load initial state from localStorage
const getInitialState = () => {
  const defaults = {
    rows: 4,
    columns: 4,
    selectedFrames: {},
    fps: 10,
    zoom: 100,
    sidebarWidth: 320,
    selectedFrameIndex: null,
    pixelEditor: {
      zoom: 100,
      panOffset: { x: 0, y: 0 },
      selection: null,
      width: 600,
      color: { hex: '#000000', r: 0, g: 0, b: 0, a: 255, h: 0, s: 0, l: 0 },
      pencilWidth: 1,
      pencilAntiAlias: false,
      pencilSpread: 7,
      eraserWidth: 1,
      eraserAlpha: 255,
      eraserAntiAlias: false,
      eraserSpread: 7,
      fillTolerance: 0,
      fillAntiAlias: false,
    },
    preview: {
      panOffset: { x: 0, y: 0 },
      height: 200,
      backgroundColor: { hex: '#2D304D', r: 45, g: 48, b: 77, a: 255, h: 234, s: 26, l: 24 },
      backgroundMode: 'color',
      backgroundImage: null,
    },
    isAnimating: false,
    currentFrame: 0,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
  }

  const defaultDemo = {
    "rows": 5,
    "columns": 6,
    "selectedFrames": {
        "0": false,
        "1": false,
        "2": false,
        "3": false,
        "4": false,
        "5": true,
        "6": false,
        "7": true,
        "8": true,
        "9": false,
        "10": true,
        "11": true,
        "12": false,
        "13": true,
        "14": true,
        "15": false,
        "16": true,
        "17": true,
        "18": false,
        "19": true,
        "20": true,
        "21": false,
        "22": true,
        "23": true,
        "24": false,
        "25": false,
        "26": false,
        "27": false,
        "28": false,
        "29": false
    },
    "fps": 10,
    "zoom": 268,
    "sidebarWidth": 530,
    "selectedFrameIndex": 16,
    "pixelEditor": {
        "zoom": 896,
        "panOffset": {
            "x": 0,
            "y": 0
        },
        "selection": null,
        "width": 1199,
        "color": {
            "hex": "#FFA600",
            "r": 255,
            "g": 166,
            "b": 0,
            "a": 255,
            "h": 39,
            "s": 100,
            "l": 50
        },
        "pencilWidth": 6,
        "pencilAntiAlias": true,
        "pencilSpread": 7,
        "eraserWidth": 1,
        "eraserAlpha": 255,
        "eraserAntiAlias": false,
        "eraserSpread": 7,
        "fillTolerance": 0,
        "fillAntiAlias": false
    },
    "preview": {
        "panOffset": {
            "x": -22,
            "y": 62
        },
        "height": 463,
        "backgroundColor": {
            "hex": "#2D304D",
            "r": 45,
            "g": 48,
            "b": 77,
            "a": 255,
            "h": 234,
            "s": 26,
            "l": 24
        },
        "backgroundMode": "image",
        "backgroundImage": "/preview-bg-06.png"
    },
    "isAnimating": true,
    "padding": {
        "top": 5,
        "right": 5,
        "bottom": 5,
        "left": 5
    }
}

  try {
    const savedState = localStorage.getItem('spriteSheetEditorState')
    if (savedState) {
      const parsed = JSON.parse(savedState)
      return { ...defaults, ...parsed }
    }
  } catch (error) {
    console.error('Error loading state from localStorage:', error)
  }
  
  return { ...defaults, ...defaultDemo }
}

const getSavedImage = () => {
  try {
    return localStorage.getItem('spriteSheetImage') || null
  } catch (error) {
    console.error('Error loading image from localStorage:', error)
    return null
  }
}

export const initializeDemoImage = (onLoad) => {
  const existing = localStorage.getItem('spriteSheetImage')
  if (existing) { onLoad(existing); return }
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    canvas.getContext('2d').drawImage(img, 0, 0)
    const dataUrl = canvas.toDataURL('image/png')
    try {
      localStorage.setItem('spriteSheetImage', dataUrl)
      localStorage.setItem('spriteSheetEditorState', JSON.stringify(defaultDemo))
    } catch (e) {}
    onLoad(dataUrl)
  }
  img.src = '/demo-spritesheet.png'
}

function SheetEditor() {
  const initialState = getInitialState()
  const initialImage = getSavedImage()
  
  const [image, setImage] = useState(initialImage)
  const [savedImage, setSavedImage] = useState(initialImage)
  const [rows, setRows] = useState(initialState.rows)
  const [columns, setColumns] = useState(initialState.columns)
  const [selectedFrames, setSelectedFrames] = useState(initialState.selectedFrames)
  const [fps, setFps] = useState(initialState.fps)
  const [zoom, setZoom] = useState(initialState.zoom)
  const [isAnimating, setIsAnimating] = useState(initialState.isAnimating)
  const [currentFrame, setCurrentFrame] = useState(initialState.currentFrame)
  const [isDragging, setIsDragging] = useState(false)
  const [isGlobalDragging, setIsGlobalDragging] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(initialState.sidebarWidth)
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(initialState.selectedFrameIndex)
  const [pixelEditorSettings, setPixelEditorSettings] = useState(initialState.pixelEditor)
  const [previewSettings, setPreviewSettings] = useState(initialState.preview)
  const [padding, setPadding] = useState(initialState.padding || { top: 0, right: 0, bottom: 0, left: 0 })
  const [imageScale, setImageScale] = useState(1)
  const [sheetPanOffset, setSheetPanOffset] = useState({ x: 0, y: 0 })
  const [isSheetPanning, setIsSheetPanning] = useState(false)
  const [sheetPanStart, setSheetPanStart] = useState({ x: 0, y: 0 })
  const fileInputRef = useRef(null)
  const imgRef = useRef(null)

  useEffect(() => {
    const updateScale = () => {
      if (imgRef.current && imgRef.current.naturalWidth) {
        setImageScale(imgRef.current.clientWidth / imgRef.current.naturalWidth)
      }
    }
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  // Global drag and drop handlers
  useEffect(() => {
    const handleGlobalDragEnter = (e) => {
      e.preventDefault()
      setIsGlobalDragging(true)
    }

    const handleGlobalDragOver = (e) => {
      e.preventDefault()
    }

    const handleGlobalDragLeave = (e) => {
      // Only hide if leaving the window entirely
      if (e.clientX === 0 && e.clientY === 0) {
        setIsGlobalDragging(false)
      }
    }

    const handleGlobalDrop = (e) => {
      e.preventDefault()
      setIsGlobalDragging(false)
      
      const file = e.dataTransfer.files[0]
      if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
        const reader = new FileReader()
        reader.onload = (event) => {
          setImage(event.target.result)
          setSavedImage(event.target.result)
          // Don't call initializeFrames - preserve existing frame selection
        }
        reader.readAsDataURL(file)
      }
    }

    window.addEventListener('dragenter', handleGlobalDragEnter)
    window.addEventListener('dragover', handleGlobalDragOver)
    window.addEventListener('dragleave', handleGlobalDragLeave)
    window.addEventListener('drop', handleGlobalDrop)

    return () => {
      window.removeEventListener('dragenter', handleGlobalDragEnter)
      window.removeEventListener('dragover', handleGlobalDragOver)
      window.removeEventListener('dragleave', handleGlobalDragLeave)
      window.removeEventListener('drop', handleGlobalDrop)
    }
  }, [rows, columns])

  // Save UI state to localStorage (no image)
  useEffect(() => {
    try {
      const state = {
        rows,
        columns,
        selectedFrames,
        fps,
        zoom,
        sidebarWidth,
        selectedFrameIndex,
        pixelEditor: pixelEditorSettings,
        preview: previewSettings,
        isAnimating,
        padding,
      }
      localStorage.setItem('spriteSheetEditorState', JSON.stringify(state))
    } catch (error) {
      console.error('Error saving state to localStorage:', error)
    }
  }, [rows, columns, selectedFrames, fps, zoom, sidebarWidth, selectedFrameIndex, pixelEditorSettings, previewSettings, isAnimating, padding])

  // Save currentFrame only when paused (not on every animation tick)
  useEffect(() => {
    if (isAnimating) return
    try {
      const savedState = localStorage.getItem('spriteSheetEditorState')
      const parsed = savedState ? JSON.parse(savedState) : {}
      localStorage.setItem('spriteSheetEditorState', JSON.stringify({ ...parsed, currentFrame }))
    } catch (error) {
      console.error('Error saving currentFrame to localStorage:', error)
    }
  }, [isAnimating, currentFrame])

  // Save sprite sheet image separately
  useEffect(() => {
    try {
      if (savedImage) {
        localStorage.setItem('spriteSheetImage', savedImage)
      } else {
        localStorage.removeItem('spriteSheetImage')
      }
    } catch (error) {
      console.error('Error saving image to localStorage:', error)
    }
  }, [savedImage])

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target.result)
        setSavedImage(event.target.result)
        initializeFrames(rows, columns)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target.result)
        setSavedImage(event.target.result)
        initializeFrames(rows, columns)
      }
      reader.readAsDataURL(file)
    }
  }

  const initializeFrames = (r, c) => {
    const frames = {}
    for (let i = 0; i < r * c; i++) {
      frames[i] = true
    }
    setSelectedFrames(frames)
  }

  const toggleFrame = (index) => {
    setSelectedFrames(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const handleRowsChange = (newRows) => {
    setRows(newRows)
    if (image) initializeFrames(newRows, columns)
  }

  const handleColumnsChange = (newCols) => {
    setColumns(newCols)
    if (image) initializeFrames(rows, newCols)
  }

  useEffect(() => {
    if (!isAnimating) return

    const activeFrames = Object.entries(selectedFrames)
      .filter(([_, isSelected]) => isSelected)
      .map(([index]) => parseInt(index))

    if (activeFrames.length === 0) {
      setIsAnimating(false)
      return
    }

    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        const currentIndex = activeFrames.indexOf(prev)
        const nextIndex = (currentIndex + 1) % activeFrames.length
        return activeFrames[nextIndex]
      })
    }, 1000 / fps)

    return () => clearInterval(interval)
  }, [isAnimating, fps, selectedFrames])

  const handleSaveFrame = (newImageData, saveToLocalStorage = false) => {
    // Update image in memory for real-time preview
    setImage(newImageData)
    
    // Only update savedImage (which triggers localStorage save) when explicitly requested
    if (saveToLocalStorage) {
      setSavedImage(newImageData)
    }
  }

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col relative select-none">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 shadow-lg">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Sprite Sheet Editor</h1>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main
          className="flex-1 relative overflow-hidden bg-gray-950"
          onMouseDown={(e) => {
            if (!image) return
            setIsSheetPanning(true)
            setSheetPanStart({ x: e.clientX - sheetPanOffset.x, y: e.clientY - sheetPanOffset.y })
          }}
          onMouseMove={(e) => {
            if (!isSheetPanning) return
            setSheetPanOffset({ x: e.clientX - sheetPanStart.x, y: e.clientY - sheetPanStart.y })
          }}
          onMouseUp={() => setIsSheetPanning(false)}
          onMouseLeave={() => setIsSheetPanning(false)}
          style={{ cursor: image ? (isSheetPanning ? 'grabbing' : 'grab') : 'default' }}
        >
          {!image ? (
            <div className="absolute inset-0 flex items-center justify-center p-8">
            <div
              className={`w-full max-w-2xl h-96 border-[3px] rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                isDragging 
                  ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20 scale-[1.02]' 
                  : 'border-gray-700 bg-gray-900/50 hover:border-purple-400 hover:bg-gray-900/70'
              }`}
              style={{
                borderStyle: 'dashed',
                borderSpacing: '10px'
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="p-8 rounded-full bg-gray-800/50 mb-6">
                <svg className="w-16 h-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-xl text-gray-200 mb-2 font-medium">Drop sprite sheet here</p>
              <p className="text-sm text-gray-400">or click to browse (PNG or JPG)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
            </div>
          ) : (
            <>
            <div
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${sheetPanOffset.x}px), calc(-50% + ${sheetPanOffset.y}px))`,
              }}
            >
              <div 
                className="relative inline-block rounded-lg overflow-hidden shadow-2xl border border-gray-800"
                style={{
                  backgroundImage: 'url(/checkerboard.png)',
                  backgroundSize: '32px 32px'
                }}
              >
                <img
                  ref={imgRef}
                  src={image}
                  alt="Sprite sheet"
                  className="block relative z-0"
                  style={{ maxWidth: 'none' }}
                  onLoad={(e) => setImageScale(e.target.clientWidth / e.target.naturalWidth)}
                />
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
                  {Array.from({ length: rows + 1 }).map((_, i) => (
                    <line
                      key={`h-${i}`}
                      x1={`${padding.left * imageScale}px`}
                      y1={`calc(${padding.top * imageScale}px + ${(i * 100) / rows}% - ${(i * (padding.top + padding.bottom) * imageScale) / rows}px)`}
                      x2={`calc(100% - ${padding.right * imageScale}px)`}
                      y2={`calc(${padding.top * imageScale}px + ${(i * 100) / rows}% - ${(i * (padding.top + padding.bottom) * imageScale) / rows}px)`}
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="8,4"
                    />
                  ))}
                  {Array.from({ length: columns + 1 }).map((_, i) => (
                    <line
                      key={`v-${i}`}
                      x1={`calc(${padding.left * imageScale}px + ${(i * 100) / columns}% - ${(i * (padding.left + padding.right) * imageScale) / columns}px)`}
                      y1={`${padding.top * imageScale}px`}
                      x2={`calc(${padding.left * imageScale}px + ${(i * 100) / columns}% - ${(i * (padding.left + padding.right) * imageScale) / columns}px)`}
                      y2={`calc(100% - ${padding.bottom * imageScale}px)`}
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="8,4"
                    />
                  ))}
                </svg>
                <div
                  className="absolute z-20"
                  style={{
                    top: `${padding.top * imageScale}px`,
                    right: `${padding.right * imageScale}px`,
                    bottom: `${padding.bottom * imageScale}px`,
                    left: `${padding.left * imageScale}px`,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                  }}
                >
                  {Array.from({ length: rows * columns }).map((_, index) => (
                    <div 
                      key={index} 
                      className={`relative cursor-pointer hover:bg-purple-500/10 transition-colors ${
                        selectedFrameIndex === index ? 'ring-4 ring-purple-500 ring-inset' : ''
                      }`}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => setSelectedFrameIndex(index)}
                    >
                      <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedFrames[index] || false}
                          onChange={() => toggleFrame(index)}
                          size="md"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSheetPanOffset({ x: 0, y: 0 })}
              className="absolute bottom-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors z-30"
              title="Reset position"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            </>
          )}
        </main>

        {selectedFrameIndex !== null && image && (
          <PixelEditor
            image={image}
            frameIndex={selectedFrameIndex}
            rows={rows}
            columns={columns}
            padding={padding}
            onClose={() => setSelectedFrameIndex(null)}
            onSave={handleSaveFrame}
            initialSettings={pixelEditorSettings}
            onSettingsChange={setPixelEditorSettings}
          />
        )}

        <Sidebar
          rows={rows}
          columns={columns}
          onRowsChange={handleRowsChange}
          onColumnsChange={handleColumnsChange}
          image={image}
          isAnimating={isAnimating}
          setIsAnimating={setIsAnimating}
          currentFrame={currentFrame}
          setCurrentFrame={setCurrentFrame}
          fps={fps}
          zoom={zoom}
          setFps={setFps}
          setZoom={setZoom}
          width={sidebarWidth}
          onWidthChange={setSidebarWidth}
          previewSettings={previewSettings}
          onPreviewSettingsChange={setPreviewSettings}
          selectedFrames={selectedFrames}
          padding={padding}
          onPaddingChange={setPadding}
        />
      </div>

      {isGlobalDragging && (
        <div className="fixed inset-0 bg-purple-600/20 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-dashed border-purple-500 pointer-events-none">
          <div className="bg-gray-900/90 rounded-2xl p-12 border-2 border-purple-500 shadow-2xl">
            <div className="text-center">
              <svg className="w-24 h-24 mx-auto mb-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <h2 className="text-3xl font-bold text-white mb-2">Drop Image Here</h2>
              <p className="text-gray-400 text-lg">Release to replace sprite sheet</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SheetEditor
