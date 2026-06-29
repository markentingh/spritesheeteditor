import { useState, useRef, useEffect } from 'react'
import Sidebar from '../../components/sheet-editor/Sidebar'
import Checkbox from '../../components/forms/Checkbox'
import PixelEditor from '../../components/pixel-editor/PixelEditor'
import MenuDropdown from '../../components/ui/MenuDropdown'

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
    spriteSize: null,
    resizeAlgo: 'nearest',
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

const getInitialState = () => {
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
  const [spriteSize, setSpriteSize] = useState(initialState.spriteSize || null)
  const [resizeAlgo, setResizeAlgo] = useState(initialState.resizeAlgo || 'nearest')
  const [showPaddingModal, setShowPaddingModal] = useState(false)
  const [paddingModalValues, setPaddingModalValues] = useState({ top: 0, right: 0, bottom: 0, left: 0 })
  const [paddingModalMode, setPaddingModalMode] = useState('add')
  const [imageScale, setImageScale] = useState(1)
  const [sheetPanOffset, setSheetPanOffset] = useState({ x: 0, y: 0 })
  const [isSheetPanning, setIsSheetPanning] = useState(false)
  const [sheetPanStart, setSheetPanStart] = useState({ x: 0, y: 0 })
  const [sheetZoom, setSheetZoom] = useState(100)
  const sheetDragRef = useRef({ dragged: false, startX: 0, startY: 0 })
  const [showResetModal, setShowResetModal] = useState(false)
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [showResizeModal, setShowResizeModal] = useState(false)
  const [pendingResizeSize, setPendingResizeSize] = useState(null)
  const [pixelEditorKey, setPixelEditorKey] = useState(0)
  const fileInputRef = useRef(null)
  const imgRef = useRef(null)
  const mainRef = useRef(null)

  const imgCallbackRef = (el) => {
    imgRef.current = el
    if (!el) return
    const update = () => {
      if (el.naturalWidth) setImageScale(el.clientWidth / el.naturalWidth)
    }
    if (el.complete) { update() } else { el.addEventListener('load', update, { once: true }) }
  }

  useEffect(() => {
    if (!localStorage.getItem('spriteSheetImage') && !localStorage.getItem('spriteSheetEditorState')) {
      initializeDemoImage((dataUrl) => {
        setImage(dataUrl)
        setSavedImage(dataUrl)
        setPixelEditorKey(k => k + 1)
      })
    }
  }, [])

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
        spriteSize,
        resizeAlgo,
      }
      localStorage.setItem('spriteSheetEditorState', JSON.stringify(state))
    } catch (error) {
      console.error('Error saving state to localStorage:', error)
    }
  }, [rows, columns, selectedFrames, fps, zoom, sidebarWidth, selectedFrameIndex, pixelEditorSettings, previewSettings, isAnimating, padding, spriteSize, resizeAlgo])

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

  const handleApplyPadding = () => {
    const p = paddingModalValues
    const srcDataUrl = image
    if (!srcDataUrl) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (paddingModalMode === 'add') {
        canvas.width = img.width + p.left + p.right
        canvas.height = img.height + p.top + p.bottom
        ctx.drawImage(img, p.left, p.top)
        const dataUrl = canvas.toDataURL('image/png')
        localStorage.setItem('spriteSheetImage', dataUrl)
        setImage(dataUrl)
        setSavedImage(dataUrl)
        setPadding(prev => ({
          top: (prev?.top || 0) + p.top,
          right: (prev?.right || 0) + p.right,
          bottom: (prev?.bottom || 0) + p.bottom,
          left: (prev?.left || 0) + p.left,
        }))
      } else {
        const innerW = img.width - p.left - p.right
        const innerH = img.height - p.top - p.bottom
        canvas.width = Math.max(1, innerW)
        canvas.height = Math.max(1, innerH)
        ctx.drawImage(img, p.left, p.top, innerW, innerH, 0, 0, innerW, innerH)
        const dataUrl = canvas.toDataURL('image/png')
        localStorage.setItem('spriteSheetImage', dataUrl)
        setImage(dataUrl)
        setSavedImage(dataUrl)
        setPadding(prev => ({
          top: Math.max(0, (prev?.top || 0) - p.top),
          right: Math.max(0, (prev?.right || 0) - p.right),
          bottom: Math.max(0, (prev?.bottom || 0) - p.bottom),
          left: Math.max(0, (prev?.left || 0) - p.left),
        }))
      }
      setPixelEditorKey(k => k + 1)
      setShowPaddingModal(false)
    }
    img.src = srcDataUrl
  }

  const scaleFrame = (srcCtx, srcX, srcY, srcW, srcH, dstW, dstH, algo) => {
    const srcData = srcCtx.getImageData(srcX, srcY, srcW, srcH)
    const dst = new ImageData(dstW, dstH)
    const s = srcData.data
    const d = dst.data
    const xRatio = srcW / dstW
    const yRatio = srcH / dstH
    if (algo === 'nearest') {
      for (let y = 0; y < dstH; y++) {
        for (let x = 0; x < dstW; x++) {
          const sx = Math.min(Math.floor(x * xRatio), srcW - 1)
          const sy = Math.min(Math.floor(y * yRatio), srcH - 1)
          const si = (sy * srcW + sx) * 4
          const di = (y * dstW + x) * 4
          d[di] = s[si]; d[di+1] = s[si+1]; d[di+2] = s[si+2]; d[di+3] = s[si+3]
        }
      }
    } else if (algo === 'bilinear') {
      for (let y = 0; y < dstH; y++) {
        for (let x = 0; x < dstW; x++) {
          const gx = x * xRatio; const gy = y * yRatio
          const x0 = Math.floor(gx); const y0 = Math.floor(gy)
          const x1 = Math.min(x0 + 1, srcW - 1); const y1 = Math.min(y0 + 1, srcH - 1)
          const fx = gx - x0; const fy = gy - y0
          const di = (y * dstW + x) * 4
          for (let c = 0; c < 4; c++) {
            const tl = s[(y0 * srcW + x0) * 4 + c]
            const tr = s[(y0 * srcW + x1) * 4 + c]
            const bl = s[(y1 * srcW + x0) * 4 + c]
            const br = s[(y1 * srcW + x1) * 4 + c]
            d[di + c] = tl*(1-fx)*(1-fy) + tr*fx*(1-fy) + bl*(1-fx)*fy + br*fx*fy
          }
        }
      }
    } else if (algo === 'bicubic') {
      const cubic = (t) => {
        const a = -0.5; const at = Math.abs(t)
        if (at <= 1) return (a+2)*at*at*at - (a+3)*at*at + 1
        if (at < 2) return a*at*at*at - 5*a*at*at + 8*a*at - 4*a
        return 0
      }
      for (let y = 0; y < dstH; y++) {
        for (let x = 0; x < dstW; x++) {
          const gx = x * xRatio; const gy = y * yRatio
          const di = (y * dstW + x) * 4
          for (let c = 0; c < 4; c++) {
            let val = 0
            for (let m = -1; m <= 2; m++) {
              for (let n = -1; n <= 2; n++) {
                const sx = Math.min(Math.max(Math.floor(gx) + n, 0), srcW - 1)
                const sy = Math.min(Math.max(Math.floor(gy) + m, 0), srcH - 1)
                val += s[(sy * srcW + sx) * 4 + c] * cubic(gx - (Math.floor(gx) + n)) * cubic(gy - (Math.floor(gy) + m))
              }
            }
            d[di + c] = Math.min(255, Math.max(0, val))
          }
        }
      }
    } else if (algo === 'hermite') {
      for (let y = 0; y < dstH; y++) {
        for (let x = 0; x < dstW; x++) {
          const gx = x * xRatio; const gy = y * yRatio
          const x0 = Math.floor(gx); const y0 = Math.floor(gy)
          const x1 = Math.min(x0 + 1, srcW - 1); const y1 = Math.min(y0 + 1, srcH - 1)
          const fx = gx - x0; const fy = gy - y0
          const h1 = (t) => 2*t*t*t - 3*t*t + 1
          const h2 = (t) => -2*t*t*t + 3*t*t
          const di = (y * dstW + x) * 4
          for (let c = 0; c < 4; c++) {
            const tl = s[(y0 * srcW + x0) * 4 + c]
            const tr = s[(y0 * srcW + x1) * 4 + c]
            const bl = s[(y1 * srcW + x0) * 4 + c]
            const br = s[(y1 * srcW + x1) * 4 + c]
            const top = h1(1-fx)*tl + h2(1-fx)*tr
            const bot = h1(1-fx)*bl + h2(1-fx)*br
            d[di + c] = Math.min(255, Math.max(0, h1(1-fy)*top + h2(1-fy)*bot))
          }
        }
      }
    } else if (algo === 'lanczos') {
      const a = 3
      const sinc = (x) => x === 0 ? 1 : Math.sin(Math.PI*x) / (Math.PI*x)
      const lanczosK = (x) => Math.abs(x) < a ? sinc(x) * sinc(x/a) : 0
      for (let y = 0; y < dstH; y++) {
        for (let x = 0; x < dstW; x++) {
          const gx = x * xRatio; const gy = y * yRatio
          const di = (y * dstW + x) * 4
          for (let c = 0; c < 4; c++) {
            let val = 0; let wSum = 0
            for (let m = Math.floor(gy) - a + 1; m <= Math.floor(gy) + a; m++) {
              for (let n = Math.floor(gx) - a + 1; n <= Math.floor(gx) + a; n++) {
                const sx = Math.min(Math.max(n, 0), srcW - 1)
                const sy = Math.min(Math.max(m, 0), srcH - 1)
                const w = lanczosK(gx - n) * lanczosK(gy - m)
                val += s[(sy * srcW + sx) * 4 + c] * w
                wSum += w
              }
            }
            d[di + c] = Math.min(255, Math.max(0, wSum ? val / wSum : 0))
          }
        }
      }
    }
    return dst
  }

  const handleResize = (frameWidth, algo) => {
    const srcDataUrl = localStorage.getItem('spriteSheetImageOriginal') || image
    const img = new Image()
    img.onload = () => {
      const pad = padding || { top: 0, right: 0, bottom: 0, left: 0 }
      const srcFrameW = Math.round((img.width - pad.left - pad.right) / columns)
      const srcFrameH = Math.round((img.height - pad.top - pad.bottom) / rows)
      const frameHeight = Math.round((frameWidth / srcFrameW) * srcFrameH)
      const newW = frameWidth * columns + pad.left + pad.right
      const newH = frameHeight * rows + pad.top + pad.bottom
      const srcCanvas = document.createElement('canvas')
      srcCanvas.width = img.width; srcCanvas.height = img.height
      const srcCtx = srcCanvas.getContext('2d')
      srcCtx.drawImage(img, 0, 0)
      const dstCanvas = document.createElement('canvas')
      dstCanvas.width = newW; dstCanvas.height = newH
      const dstCtx = dstCanvas.getContext('2d')
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
          const sx = pad.left + c * srcFrameW
          const sy = pad.top + r * srcFrameH
          const dx = pad.left + c * frameWidth
          const dy = pad.top + r * frameHeight
          const scaled = scaleFrame(srcCtx, sx, sy, srcFrameW, srcFrameH, frameWidth, frameHeight, algo)
          dstCtx.putImageData(scaled, dx, dy)
        }
      }
      const dataUrl = dstCanvas.toDataURL('image/png')
      if (!localStorage.getItem('spriteSheetImageOriginal')) {
        localStorage.setItem('spriteSheetImageOriginal', srcDataUrl)
      }
      localStorage.setItem('spriteSheetImage', dataUrl)
      setImage(dataUrl)
      setSavedImage(dataUrl)
      setSpriteSize(frameWidth)
      setPixelEditorKey(k => k + 1)
    }
    img.src = srcDataUrl
  }

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
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 shadow-lg flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Sprite Sheet Editor</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDemoModal(true)}
            className="px-3 py-1.5 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 hover:border-purple-600 rounded-lg text-sm font-medium text-purple-300 hover:text-purple-200 transition-colors"
          >
            View Demo
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            className="px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 hover:border-red-600 rounded-lg text-sm font-medium text-red-300 hover:text-red-200 transition-colors"
          >
            Reset Editor
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main
          ref={mainRef}
          className="flex-1 relative overflow-hidden bg-gray-950"
          onMouseDown={(e) => {
            if (!image) return
            sheetDragRef.current = { dragged: false, startX: e.clientX, startY: e.clientY }
            setIsSheetPanning(true)
            setSheetPanStart({ x: e.clientX - sheetPanOffset.x, y: e.clientY - sheetPanOffset.y })
          }}
          onMouseMove={(e) => {
            if (!isSheetPanning) return
            const dx = e.clientX - sheetDragRef.current.startX
            const dy = e.clientY - sheetDragRef.current.startY
            if (!sheetDragRef.current.dragged && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
              sheetDragRef.current.dragged = true
            }
            setSheetPanOffset({ x: e.clientX - sheetPanStart.x, y: e.clientY - sheetPanStart.y })
          }}
          onMouseUp={() => setIsSheetPanning(false)}
          onMouseLeave={() => setIsSheetPanning(false)}
          onWheel={(e) => { if (!image) return; setSheetZoom(z => Math.min(400, Math.max(10, z - Math.sign(e.deltaY) * 10))) }}
          style={{ cursor: image ? (isSheetPanning && sheetDragRef.current.dragged ? 'grabbing' : 'grab') : 'default' }}
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
            {image && (() => {
              const SIZES = [16, 32, 48, 64, 96, 128, 256, 512]
              const origW = imgRef.current?.naturalWidth || 0
              const pad2 = padding || { top: 0, right: 0, bottom: 0, left: 0 }
              const origFrameW = columns > 0 ? Math.round((origW - pad2.left - pad2.right) / columns) : 0
              const activeSize = spriteSize ?? (origFrameW > 0 ? origFrameW : null)
              const customDefault = origFrameW > 0 ? String(origFrameW) : ''
              return (
                <div className="absolute top-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800 px-4 py-2 flex items-center gap-1 z-30" onMouseDown={(e) => e.stopPropagation()}>
                  <MenuDropdown
                    label="Sprite Sheet"
                    variant="toolbar"
                    items={[
                      { label: 'Add / Remove Padding', onClick: () => { setPaddingModalValues({ top: 0, right: 0, bottom: 0, left: 0 }); setPaddingModalMode('add'); setShowPaddingModal(true) } },
                    ]}
                  />
                  <span className="text-xs text-gray-500 mr-2 shrink-0">Frame px:</span>
                  {SIZES.map(size => {
                    const active = activeSize === size
                    return (
                      <button
                        key={size}
                        onClick={() => { setPendingResizeSize(size); setShowResizeModal(true) }}
                        className={`px-2.5 py-1 border rounded text-xs font-medium transition-colors ${
                          active
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white'
                        }`}
                      >
                        {size}
                      </button>
                    )
                  })}
                  <div className="flex items-center gap-1 ml-1">
                    <input
                      type="number"
                      min="1"
                      defaultValue={customDefault}
                      placeholder="custom"
                      className={`w-20 px-2 py-1 border rounded text-xs font-medium bg-gray-800 text-gray-300 focus:outline-none focus:border-purple-500 transition-colors ${
                        activeSize !== null && !SIZES.includes(activeSize) ? 'border-purple-500 text-white' : 'border-gray-700'
                      }`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const v = parseInt(e.target.value)
                          if (v > 0) { setPendingResizeSize(v); setShowResizeModal(true) }
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.currentTarget.previousSibling
                        const v = parseInt(input.value)
                        if (v > 0) { setPendingResizeSize(v); setShowResizeModal(true) }
                      }}
                      className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded text-xs font-medium text-gray-300 hover:text-white transition-colors"
                    >
                      Go
                    </button>
                  </div>
                </div>
              )
            })()}
            {image && (() => {
              const nw = imgRef.current?.naturalWidth || 0
              const nh = imgRef.current?.naturalHeight || 0
              const pad = padding || { top: 0, right: 0, bottom: 0, left: 0 }
              const frameW = columns > 0 ? Math.round((nw - pad.left - pad.right) / columns) : 0
              const frameH = rows > 0 ? Math.round((nh - pad.top - pad.bottom) / rows) : 0
              const totalFrames = rows * columns
              const totalSelected = Object.values(selectedFrames).filter(Boolean).length
              const sep = <span className="text-gray-700 select-none mx-1">|</span>
              return (
                <div className="absolute bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm border-t border-gray-800 px-4 py-1.5 flex items-center gap-2 text-xs text-gray-400 z-30 pointer-events-none">
                  <span>Sheet: <span className="text-gray-200">{nw} × {nh}px</span></span>
                  {sep}
                  <span>Frame: <span className="text-gray-200">{frameW} × {frameH}px</span></span>
                  {sep}
                  <span>Grid: <span className="text-gray-200">{columns}c × {rows}r</span></span>
                  {sep}
                  <span>Frames: <span className="text-gray-200">{totalFrames}</span></span>
                  {sep}
                  <span>Selected: <span className="text-gray-200">{totalSelected}</span></span>
                  <div className="ml-auto flex items-center gap-3 pointer-events-auto">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Zoom</span>
                      <input
                        type="range"
                        min="10"
                        max="400"
                        value={sheetZoom}
                        onChange={(e) => setSheetZoom(parseInt(e.target.value))}
                        className="w-24 accent-purple-500"
                      />
                      <span className="text-gray-200 w-8 text-right">{sheetZoom}%</span>
                    </div>
                    <button
                      onClick={() => { setSheetPanOffset({ x: 0, y: 0 }); setSheetZoom(100) }}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 hover:border-gray-500 transition-colors text-gray-300 hover:text-white"
                      title="Reset pan and zoom"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset
                    </button>
                  </div>
                </div>
              )
            })()}
            <div
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${sheetPanOffset.x}px), calc(-50% + ${sheetPanOffset.y}px)) scale(${sheetZoom / 100})`,
                transformOrigin: 'center center',
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
                  ref={imgCallbackRef}
                  src={image}
                  alt="Sprite sheet"
                  className="block relative z-0"
                  style={{ maxWidth: 'none', imageRendering: 'pixelated' }}
                />
                {(() => {
                  const nw = imgRef.current?.naturalWidth || 1
                  const nh = imgRef.current?.naturalHeight || 1
                  const pl = (padding.left / nw) * 100
                  const pr = (padding.right / nw) * 100
                  const pt = (padding.top / nh) * 100
                  const pb = (padding.bottom / nh) * 100
                  const innerW = 100 - pl - pr
                  const innerH = 100 - pt - pb
                  return (
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {Array.from({ length: rows + 1 }).map((_, i) => {
                        const y = pt + (i / rows) * innerH
                        return <line key={`h-${i}`} x1={pl} y1={y} x2={100 - pr} y2={y} stroke="#ffffff" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="7,5" />
                      })}
                      {Array.from({ length: columns + 1 }).map((_, i) => {
                        const x = pl + (i / columns) * innerW
                        return <line key={`v-${i}`} x1={x} y1={pt} x2={x} y2={100 - pb} stroke="#ffffff" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="7,5" />
                      })}
                    </svg>
                  )
                })()}
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
                  {(() => {
                    let checkedCount = 0
                    return Array.from({ length: rows * columns }).map((_, index) => {
                      const checked = selectedFrames[index] || false
                      if (checked) checkedCount++
                      const frameNum = checkedCount
                      return (
                        <div
                          key={index}
                          className={`relative cursor-pointer transition-colors ${
                            selectedFrameIndex === index ? 'ring-4 ring-purple-500 ring-inset' : ''
                          } ${checked ? 'hover:bg-purple-500/10' : 'bg-black/50 hover:bg-black/40'}`}
                          onMouseUp={() => {
                            if (!sheetDragRef.current.dragged) setSelectedFrameIndex(index)
                          }}
                        >
                          <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={checked}
                              onChange={() => toggleFrame(index)}
                              size="md"
                            />
                          </div>
                          {checked && (
                            <div className="absolute bottom-1 right-1 text-white text-xs font-bold leading-none select-none pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                              {frameNum}
                            </div>
                          )}
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>
            </>
          )}
        </main>

        {selectedFrameIndex !== null && image && (
          <PixelEditor
            key={pixelEditorKey}
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
          onEditFrame={(frameIndex) => setSelectedFrameIndex(frameIndex)}
        />
      </div>

      {showPaddingModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowPaddingModal(false)}>
          <div className="bg-gray-800 rounded-xl p-6 w-[480px] border border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Add / Remove Padding</h3>
            <p className="text-gray-400 text-sm mb-5">Modify the pixel border around the sprite sheet canvas. Padding values in the sidebar will be updated accordingly.</p>
            <div className="grid grid-cols-6 gap-3 mb-5">
              {['top', 'right', 'bottom', 'left'].map(side => (
                <div key={side}>
                  <label className="block text-xs font-medium text-gray-400 mb-1 capitalize">{side.charAt(0).toUpperCase() + side.slice(1)}</label>
                  <input
                    type="number"
                    min="0"
                    value={paddingModalValues[side]}
                    onChange={(e) => setPaddingModalValues(prev => ({ ...prev, [side]: parseInt(e.target.value) || 0 }))}
                    className="w-full px-2 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">Mode</label>
                <select
                  value={paddingModalMode}
                  onChange={(e) => setPaddingModalMode(e.target.value)}
                  className="w-full px-2 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  <option value="add">Add</option>
                  <option value="remove">Remove</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleApplyPadding}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors text-white"
              >
                Apply
              </button>
              <button
                onClick={() => setShowPaddingModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showResizeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowResizeModal(false)}>
          <div className="bg-gray-800 rounded-xl p-6 w-96 border border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Resize Sprite Sheet</h3>
            <p className="text-gray-400 text-sm mb-4">Resizing will regenerate the sprite sheet at <span className="text-white font-medium">{pendingResizeSize}px</span> per frame. Any pixel edits you've made to the current sprite sheet will be lost.</p>
            <div className="mb-5">
              <label className="block text-xs text-gray-400 mb-1.5">Scaling Algorithm</label>
              <select
                value={resizeAlgo}
                onChange={(e) => setResizeAlgo(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
              >
                <option value="nearest">Nearest Neighbor</option>
                <option value="bilinear">Bilinear</option>
                <option value="bicubic">Bicubic</option>
                <option value="hermite">Hermite</option>
                <option value="lanczos">Lanczos-3</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowResizeModal(false); handleResize(pendingResizeSize, resizeAlgo) }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors text-white"
              >
                Resize
              </button>
              <button
                onClick={() => setShowResizeModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDemoModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowDemoModal(false)}>
          <div className="bg-gray-800 rounded-xl p-6 w-96 border border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">View Demo</h3>
            <p className="text-gray-400 text-sm mb-6">This will replace your current sprite sheet and all settings with the demo. Your existing work will be lost.</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  localStorage.clear()
                  window.location.reload()
                }}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors text-white"
              >
                Load Demo
              </button>
              <button
                onClick={() => setShowDemoModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowResetModal(false)}>
          <div className="bg-gray-800 rounded-xl p-6 w-96 border border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Reset Editor</h3>
            <p className="text-gray-400 text-sm mb-6">This will remove your sprite sheet and reset all settings to their defaults. This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  localStorage.removeItem('spriteSheetImage')
                  localStorage.setItem('spriteSheetEditorState', JSON.stringify(defaults))
                  window.location.reload()
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors text-white"
              >
                Reset
              </button>
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
