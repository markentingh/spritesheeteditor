import { useState, useRef, useEffect } from 'react'
import MenuDropdown from '../ui/MenuDropdown'
import Slider from '../forms/Slider'
import Checkbox from '../forms/Checkbox'
import ColorPicker from './ColorPicker'
import ReplaceColor from './ReplaceColor'

function PixelEditor({ image, frameIndex, rows, columns, padding, onClose, onSave, initialSettings, onSettingsChange }) {
  const [zoom, setZoom] = useState(initialSettings?.zoom || 100)
  const [tool, setTool] = useState('pencil')
  const [color, setColorState] = useState(initialSettings?.color || { hex: '#FF0000', r: 255, g: 0, b: 0, a: 255 })
  const [pencilWidth, setPencilWidth] = useState(initialSettings?.pencilWidth || 1)
  const [pencilAntiAlias, setPencilAntiAlias] = useState(initialSettings?.pencilAntiAlias || false)
  const [pencilSpread, setPencilSpread] = useState(initialSettings?.pencilSpread ?? 7)
  const [eraserWidth, setEraserWidth] = useState(initialSettings?.eraserWidth || 1)
  const [eraserAlpha, setEraserAlpha] = useState(initialSettings?.eraserAlpha ?? 255)
  const [eraserAntiAlias, setEraserAntiAlias] = useState(initialSettings?.eraserAntiAlias || false)
  const [eraserSpread, setEraserSpread] = useState(initialSettings?.eraserSpread ?? 7)
  const [fillTolerance, setFillTolerance] = useState(initialSettings?.fillTolerance || 0)
  const [fillAntiAlias, setFillAntiAlias] = useState(initialSettings?.fillAntiAlias || false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const [frameData, setFrameData] = useState(null)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [panOffset, setPanOffset] = useState(initialSettings?.panOffset || { x: 0, y: 0 })
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [hasChanges, setHasChanges] = useState(false)
  const [selection, setSelection] = useState(initialSettings?.selection || null)
  const [cursorPos, setCursorPos] = useState(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState(null)
  const [width, setWidth] = useState(initialSettings?.width || 600)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState({ x: 0, width: 0 })
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [showReplaceColorModal, setShowReplaceColorModal] = useState(false)
  const [toolsDisabled, setToolsDisabled] = useState(false)
  const isRestoringRef = useRef(false)
  const originalImageRef = useRef(null)
  const maskCanvasRef = useRef(null)
  const strokeStartCanvasRef = useRef(null)
  const colorRef = useRef(initialSettings?.color || { hex: '#FF0000', r: 255, g: 0, b: 0, a: 255 })
  const wheelContainerRef = useRef(null)

  // Update colorRef when color state changes
  useEffect(() => {
    colorRef.current = color
  }, [color])
  
  // Sync settings when anti-alias checkboxes change
  useEffect(() => {
    syncSettings()
  }, [pencilAntiAlias, eraserAntiAlias, fillAntiAlias])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {}
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sync settings to parent (only called when interactions complete)
  const syncSettings = () => {
    if (onSettingsChange) {
      onSettingsChange({
        zoom,
        panOffset,
        selection,
        width,
        color,
        pencilWidth,
        pencilAntiAlias,
        pencilSpread,
        eraserWidth,
        eraserAlpha,
        eraserAntiAlias,
        eraserSpread,
        fillTolerance,
        fillAntiAlias,
      })
    }
  }

  // Wrapper to update both state and ref
  const setColor = (newColor) => {
    colorRef.current = newColor
    setColorState(newColor)
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      const deltaX = e.clientX - resizeStart.x
      const newWidth = resizeStart.width - deltaX
      if (newWidth >= 400 && newWidth <= 1200) {
        setWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false)
        syncSettings()
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, resizeStart, width])

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height })
      originalImageRef.current = img
      extractFrame(img)
    }
    img.src = image
  }, [frameIndex, rows, columns])

  const extractFrame = (img) => {
    const pad = padding || { top: 0, right: 0, bottom: 0, left: 0 }
    const frameWidth = Math.floor((img.width - pad.left - pad.right) / columns)
    const frameHeight = Math.floor((img.height - pad.top - pad.bottom) / rows)
    const col = frameIndex % columns
    const row = Math.floor(frameIndex / columns)

    const canvas = document.createElement('canvas')
    canvas.width = frameWidth
    canvas.height = frameHeight
    const ctx = canvas.getContext('2d')
    
    ctx.drawImage(
      img,
      pad.left + col * frameWidth,
      pad.top + row * frameHeight,
      frameWidth,
      frameHeight,
      0,
      0,
      frameWidth,
      frameHeight
    )

    setFrameData(canvas)
  }

  useEffect(() => {
    if (!frameData || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    
    canvas.width = frameData.width
    canvas.height = frameData.height
    
    // Use 'copy' to replace all pixels including alpha
    ctx.globalCompositeOperation = 'copy'
    ctx.drawImage(frameData, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    
    // Save initial state to history
    saveToHistory()
  }, [frameData])

  const saveToHistory = (spriteSheetData = null) => {
    if (!canvasRef.current || isRestoringRef.current) return
    // Save the sprite sheet state - use provided data or current image prop
    const dataToSave = spriteSheetData || image
    
    // Don't save if it's the same as the last entry
    if (history.length > 0 && history[historyIndex] === dataToSave) {
      return
    }
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(dataToSave)
      return newHistory.slice(-50)
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }

  const undo = () => {
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    setHistoryIndex(newIndex)
    restoreFromHistory(history[newIndex])
  }

  const redo = () => {
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    setHistoryIndex(newIndex)
    restoreFromHistory(history[newIndex])
  }

  const restoreFromHistory = (spriteSheetData) => {
    if (!canvasRef.current) return
    isRestoringRef.current = true
    
    // Restore the entire sprite sheet
    onSave(spriteSheetData)
    
    // Extract the frame from the restored sprite sheet
    const img = new Image()
    img.onload = () => {
      originalImageRef.current = img
      extractFrame(img)
      setHasChanges(true)
      isRestoringRef.current = false
    }
    img.src = spriteSheetData
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        undo()
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [historyIndex, history])

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    return {
      x: Math.floor((e.clientX - rect.left) * scaleX),
      y: Math.floor((e.clientY - rect.top) * scaleY)
    }
  }

  const drawPixel = (x, y) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Enable anti-aliasing based on tool settings
    const antiAlias = tool === 'pencil' ? pencilAntiAlias : (tool === 'eraser' ? eraserAntiAlias : false)
    ctx.imageSmoothingEnabled = antiAlias
    
    // Get spread and calculate spacing threshold
    const spread = tool === 'pencil' ? pencilSpread : eraserSpread
    const brushWidth = tool === 'eraser' ? eraserWidth : pencilWidth
    const radius = brushWidth / 2
    // 100% spread = radius spacing
    const spacingThreshold = radius * (spread * 10 / 100)
    
    // Check if we should draw based on distance from last drawn position
    if (window.lastDrawnPos) {
      const dx = x - window.lastDrawnPos.x
      const dy = y - window.lastDrawnPos.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < spacingThreshold) {
        return
      }
    }
    
    // Update last drawn position
    window.lastDrawnPos = { x, y }
    
    // Create or get mask canvas
    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement('canvas')
      maskCanvasRef.current.width = canvas.width
      maskCanvasRef.current.height = canvas.height
    }
    const maskCanvas = maskCanvasRef.current
    const maskCtx = maskCanvas.getContext('2d')
    
    maskCtx.fillStyle = '#FFFFFF'
    
    if (antiAlias) {
      // Use arc for smooth anti-aliased circles
      maskCtx.imageSmoothingEnabled = true
      maskCtx.imageSmoothingQuality = 'high'
      maskCtx.beginPath()
      maskCtx.arc(x + 0.5, y + 0.5, radius, 0, Math.PI * 2)
      maskCtx.fill()
    } else if (brushWidth === 1) {
      // Optimize 1-pixel drawing - just draw a single pixel
      maskCtx.imageSmoothingEnabled = false
      maskCtx.fillRect(x, y, 1, 1)
    } else {
      // Use pixel-perfect circle algorithm (only 100% white pixels)
      // Only draw pixels that are FULLY covered by the circle
      maskCtx.imageSmoothingEnabled = false
      const radiusSquared = radius * radius
      
      for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy++) {
        for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
          const px = x + dx
          const py = y + dy
          
          if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
            // Check if all 4 corners of the pixel are inside the circle
            const corners = [
              { x: dx - 0.5, y: dy - 0.5 }, // top-left
              { x: dx + 0.5, y: dy - 0.5 }, // top-right
              { x: dx - 0.5, y: dy + 0.5 }, // bottom-left
              { x: dx + 0.5, y: dy + 0.5 }  // bottom-right
            ]
            
            const allCornersInside = corners.every(corner => {
              const distSquared = corner.x * corner.x + corner.y * corner.y
              return distSquared <= radiusSquared
            })
            
            // Only draw if ALL corners are inside the circle
            if (allCornersInside) {
              maskCtx.fillRect(px, py, 1, 1)
            }
          }
        }
      }
    }
    
    // Restore original canvas state
    if (strokeStartCanvasRef.current) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'copy'
      ctx.drawImage(strokeStartCanvasRef.current, 0, 0)
    }
    
    if (tool === 'eraser') {
      // For eraser: use mask as alpha channel for erasing
      
      // Create temporary canvas for eraser mask with alpha
      const eraserMaskCanvas = document.createElement('canvas')
      eraserMaskCanvas.width = canvas.width
      eraserMaskCanvas.height = canvas.height
      const eraserMaskCtx = eraserMaskCanvas.getContext('2d')
      
      // Fill with white at eraserAlpha opacity
      eraserMaskCtx.fillStyle = `rgba(255, 255, 255, ${eraserAlpha / 255})`
      eraserMaskCtx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Use mask as alpha channel (destination-in keeps only where mask exists)
      eraserMaskCtx.imageSmoothingEnabled = false
      eraserMaskCtx.globalCompositeOperation = 'destination-in'
      eraserMaskCtx.drawImage(maskCanvas, 0, 0)
      
      // Use destination-out to erase pixels where mask has alpha
      ctx.imageSmoothingEnabled = false
      ctx.globalCompositeOperation = 'destination-out'
      ctx.drawImage(eraserMaskCanvas, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
    } else {
      // For pencil: use mask as alpha channel with color
      const currentColor = colorRef.current
      
      // Create temporary canvas for colored shape
      const coloredCanvas = document.createElement('canvas')
      coloredCanvas.width = canvas.width
      coloredCanvas.height = canvas.height
      const coloredCtx = coloredCanvas.getContext('2d')
      
      // Fill with the desired color
      coloredCtx.fillStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${currentColor.a / 255})`
      coloredCtx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Use mask as alpha channel (destination-in keeps only where mask exists)
      coloredCtx.imageSmoothingEnabled = false
      coloredCtx.globalCompositeOperation = 'destination-in'
      coloredCtx.drawImage(maskCanvas, 0, 0)
      
      // Composite colored result to main canvas
      ctx.imageSmoothingEnabled = false
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(coloredCanvas, 0, 0)
    }
    
    setHasChanges(true)
  }

  const updateSpriteSheetPreview = () => {
    if (!canvasRef.current || !originalImageRef.current) return
    // Don't update sprite sheet during undo/redo restore
    if (isRestoringRef.current) return

    // Create a new canvas with the full sprite sheet
    const fullCanvas = document.createElement('canvas')
    fullCanvas.width = imageDimensions.width
    fullCanvas.height = imageDimensions.height
    const fullCtx = fullCanvas.getContext('2d')

    // Draw the current sprite sheet from originalImageRef
    fullCtx.drawImage(originalImageRef.current, 0, 0)

    // Calculate frame position
    const pad = padding || { top: 0, right: 0, bottom: 0, left: 0 }
    const frameWidth = Math.floor((imageDimensions.width - pad.left - pad.right) / columns)
    const frameHeight = Math.floor((imageDimensions.height - pad.top - pad.bottom) / rows)
    const col = frameIndex % columns
    const row = Math.floor(frameIndex / columns)

    // Clear the frame area to prevent layering of semi-transparent pixels
    fullCtx.clearRect(
      pad.left + col * frameWidth,
      pad.top + row * frameHeight,
      frameWidth,
      frameHeight
    )

    // Draw the modified frame
    fullCtx.drawImage(
      canvasRef.current,
      pad.left + col * frameWidth,
      pad.top + row * frameHeight,
      frameWidth,
      frameHeight
    )

    // Convert to data URL and update parent (preview only, never persists)
    const newImageData = fullCanvas.toDataURL('image/png')
    onSave(newImageData)
    
    // Save to history with the NEW sprite sheet data
    if (!isRestoringRef.current) {
      saveToHistory(newImageData)
    }
    
    // Update originalImageRef with the NEW sprite sheet
    const newImg = new Image()
    newImg.onload = () => {
      originalImageRef.current = newImg
    }
    newImg.src = newImageData
    
    return newImageData
  }

  const finishDrawing = () => {
    if (hasChanges) {
      updateSpriteSheetPreview()
    }
    // Clear the mask canvas for reuse
    if (maskCanvasRef.current) {
      const maskCtx = maskCanvasRef.current.getContext('2d')
      maskCtx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height)
    }
  }

  const floodFill = (startX, startY, fillColor) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data
    
    // Get target color at start position
    const startPos = (startY * canvas.width + startX) * 4
    const targetR = pixels[startPos]
    const targetG = pixels[startPos + 1]
    const targetB = pixels[startPos + 2]
    const targetA = pixels[startPos + 3]
    
    // Parse fill color
    const fillRGBA = typeof fillColor === 'string' ? { ...hexToRGB(fillColor), a: 255 } : fillColor
    
    // Don't fill if target color is same as fill color
    if (targetR === fillRGBA.r && targetG === fillRGBA.g && targetB === fillRGBA.b && targetA === fillRGBA.a) {
      return
    }
    
    const stack = [[startX, startY]]
    const visited = new Set()
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()
      
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue
      
      const key = `${x},${y}`
      if (visited.has(key)) continue
      visited.add(key)
      
      const pos = (y * canvas.width + x) * 4
      const r = pixels[pos]
      const g = pixels[pos + 1]
      const b = pixels[pos + 2]
      const a = pixels[pos + 3]
      
      // Check if pixel matches target color
      if (r === targetR && g === targetG && b === targetB && a === targetA) {
        // Fill this pixel
        pixels[pos] = fillRGBA.r
        pixels[pos + 1] = fillRGBA.g
        pixels[pos + 2] = fillRGBA.b
        pixels[pos + 3] = fillRGBA.a
        
        // Add neighbors to stack
        stack.push([x + 1, y])
        stack.push([x - 1, y])
        stack.push([x, y + 1])
        stack.push([x, y - 1])
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
    setHasChanges(true)
    updateSpriteSheetPreview()
  }

  const hexToRGB = (hex) => {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16)
    }
  }

  const handleMouseDown = (e) => {
    // Disable all pixel editor tools when external tool is active
    if (toolsDisabled) return
    
    if (tool === 'hand') {
      setIsPanning(true)
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
      return
    }

    const { x, y } = getCanvasCoordinates(e)
    
    if (tool === 'fill') {
      floodFill(x, y, color)
      return
    }

    if (tool === 'select') {
      setIsSelecting(true)
      setSelectionStart({ x, y })
      setSelection({ x, y, width: 0, height: 0 })
      return
    }
    
    setIsDrawing(true)
    
    if (tool === 'pencil' || tool === 'eraser') {
      // Reset last drawn position for new stroke
      window.lastDrawnPos = null
      
      // Save canvas state at stroke start
      const canvas = canvasRef.current
      if (!strokeStartCanvasRef.current) {
        strokeStartCanvasRef.current = document.createElement('canvas')
        strokeStartCanvasRef.current.width = canvas.width
        strokeStartCanvasRef.current.height = canvas.height
      }
      const strokeStartCtx = strokeStartCanvasRef.current.getContext('2d')
      strokeStartCtx.clearRect(0, 0, canvas.width, canvas.height)
      strokeStartCtx.drawImage(canvas, 0, 0)
      
      drawPixel(x, y)
    } else if (tool === 'eyedropper') {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const pixel = ctx.getImageData(x, y, 1, 1).data
      const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(x => {
        const hex = x.toString(16)
        return hex.length === 1 ? '0' + hex : hex
      }).join('')
      setColor(hex)
      setTool('pencil')
    }
  }

  const handleMouseMove = (e) => {
    // Disable all pixel editor tools when external tool is active
    if (toolsDisabled) return
    
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
      return
    }

    if (isSelecting && selectionStart) {
      const { x, y } = getCanvasCoordinates(e)
      const width = x - selectionStart.x
      const height = y - selectionStart.y
      setSelection({
        x: width < 0 ? x : selectionStart.x,
        y: height < 0 ? y : selectionStart.y,
        width: Math.abs(width),
        height: Math.abs(height)
      })
      return
    }

    if (!isDrawing || (tool !== 'pencil' && tool !== 'eraser')) return
    const { x, y } = getCanvasCoordinates(e)
    drawPixel(x, y)
  }

  const handleMouseUp = () => {
    if (isDrawing && (tool === 'pencil' || tool === 'eraser')) {
      finishDrawing()
    }
    setIsDrawing(false)
    if (isPanning) {
      setIsPanning(false)
      // Sync pan offset to localStorage when panning stops
      syncSettings()
    }
    if (isSelecting) {
      setIsSelecting(false)
      setSelectionStart(null)
      // Sync selection to localStorage when selection is complete
      syncSettings()
    }
  }

  const handleDownloadFrame = () => {
    if (!canvasRef.current) return
    
    setShowFileMenu(false)
    
    // Create download link
    canvasRef.current.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `frame-${String(frameIndex + 1).padStart(2, '0')}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 'image/png')
  }



  const handleSave = () => {
    if (!hasChanges || !canvasRef.current || !originalImageRef.current) return
    const newImageData = updateSpriteSheetPreview()
    if (newImageData) onSave(newImageData, true)
    setHasChanges(false)
  }

  const handleCancel = () => {
    if (hasChanges) {
      // Reload the original frame
      if (originalImageRef.current) {
        extractFrame(originalImageRef.current)
      }
      setHasChanges(false)
    } else {
      onClose()
    }
  }

  const tools = [
    { id: 'hand', name: 'Hand Tool', icon: <span className="material-symbols-outlined">pan_tool</span> },
    { id: 'pencil', name: 'Pencil', icon: <span className="material-symbols-outlined">edit</span> },
    { id: 'eraser', name: 'Eraser', icon: <span className="material-symbols-outlined">ink_eraser</span> },
    { id: 'fill', name: 'Fill', icon: <span className="material-symbols-outlined">format_color_fill</span> },
    { id: 'select', name: 'Box Select', icon: <span className="material-symbols-outlined">select_all</span> },
    { id: 'eyedropper', name: 'Eyedropper', icon: <span className="material-symbols-outlined">colorize</span> },
  ]

  if (!frameData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <p className="text-gray-500">Loading frame...</p>
      </div>
    )
  }

  const frameWidth = imageDimensions.width / columns
  const frameHeight = imageDimensions.height / rows
  const displayWidth = frameWidth * (zoom / 100)
  const displayHeight = frameHeight * (zoom / 100)

  return (
    <div className="flex flex-col bg-gray-950 border-l border-gray-800 relative" style={{ width: `${width}px` }}>
      <div
        className="absolute left-0 top-0 bottom-0 w-1 bg-gray-700 hover:bg-purple-500 cursor-ew-resize transition-colors z-50"
        onMouseDown={(e) => {
          setResizeStart({ x: e.clientX, width })
          setIsResizing(true)
        }}
        title="Drag to resize"
      />
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-4">
        {/* Menu Bar */}
        <div className="flex items-center gap-2">
          <MenuDropdown
            label="File"
            variant="pixel-editor"
            items={[
              { label: 'Download', onClick: handleDownloadFrame },
            ]}
          />
          <MenuDropdown
            label="Image"
            variant="pixel-editor"
            items={[
              { label: 'Replace Color', onClick: () => setShowReplaceColorModal(true) },
            ]}
          />
        </div>
        
        <span className="text-gray-400">|</span>
        <span className="text-white font-semibold whitespace-nowrap">Frame {frameIndex + 1}</span>
        <span className="text-gray-400">|</span>
        <span className="text-white font-bold">{tools.find(t => t.id === tool)?.name || 'Tool'}</span>
        
        {tool === 'pencil' && (
          <>
            <span className="text-gray-400">|</span>
            <div className="flex items-center gap-2 w-[300px]">
              <span className="text-gray-300 text-sm font-medium whitespace-nowrap">Width</span>
              <Slider
                min={1}
                max={100}
                value={Math.floor(pencilWidth)}
                onChange={(e) => setPencilWidth(parseInt(e.target.value))}
                onMouseUp={syncSettings}
                onTouchEnd={syncSettings}
                className="flex-1"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  value={pencilWidth}
                  onChange={(e) => setPencilWidth(parseFloat(e.target.value) || 1)}
                  onBlur={syncSettings}
                  className="w-14 px-1 py-0.5 bg-gray-800 text-gray-300 text-sm rounded border border-gray-700 focus:border-purple-500 focus:outline-none"
                />
                <span className="text-gray-400 text-sm">px</span>
              </div>
            </div>
            <div className="flex items-center gap-2 max-w-[200px]">
              <span className="text-gray-300 text-sm font-medium whitespace-nowrap">Spread</span>
              <Slider
                min={1}
                max={20}
                value={pencilSpread}
                onChange={(e) => setPencilSpread(parseInt(e.target.value))}
                onMouseUp={syncSettings}
                onTouchEnd={syncSettings}
                className="flex-1"
              />
              <span className="text-gray-400 text-sm whitespace-nowrap">{pencilSpread * 10}%</span>
            </div>
            <Checkbox
              label="Anti-alias"
              checked={pencilAntiAlias}
              onChange={(e) => setPencilAntiAlias(e.target.checked)}
            />
          </>
        )}
        
        {tool === 'eraser' && (
          <>
            <span className="text-gray-400">|</span>
            <div className="flex items-center gap-2 w-[300px]">
              <span className="text-gray-300 text-sm font-medium whitespace-nowrap">Width</span>
              <Slider
                min={1}
                max={100}
                value={Math.floor(eraserWidth)}
                onChange={(e) => setEraserWidth(parseInt(e.target.value))}
                onMouseUp={syncSettings}
                onTouchEnd={syncSettings}
                className="flex-1"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  value={eraserWidth}
                  onChange={(e) => setEraserWidth(parseFloat(e.target.value) || 1)}
                  onBlur={syncSettings}
                  className="w-14 px-1 py-0.5 bg-gray-800 text-gray-300 text-sm rounded border border-gray-700 focus:border-purple-500 focus:outline-none"
                />
                <span className="text-gray-400 text-sm">px</span>
              </div>
            </div>
            <div className="flex items-center gap-2 max-w-[200px]">
              <span className="text-gray-300 text-sm font-medium whitespace-nowrap">Alpha</span>
              <Slider
                min={0}
                max={255}
                value={eraserAlpha}
                onChange={(e) => setEraserAlpha(parseInt(e.target.value))}
                onMouseUp={syncSettings}
                onTouchEnd={syncSettings}
                className="flex-1"
              />
              <span className="text-gray-400 text-sm whitespace-nowrap">{Math.round((eraserAlpha / 255) * 100)}%</span>
            </div>
            <div className="flex items-center gap-2 max-w-[200px]">
              <span className="text-gray-300 text-sm font-medium whitespace-nowrap">Spread</span>
              <Slider
                min={1}
                max={20}
                value={eraserSpread}
                onChange={(e) => setEraserSpread(parseInt(e.target.value))}
                onMouseUp={syncSettings}
                onTouchEnd={syncSettings}
                className="flex-1"
              />
              <span className="text-gray-400 text-sm whitespace-nowrap">{eraserSpread * 10}%</span>
            </div>
            <Checkbox
              label="Anti-alias"
              checked={eraserAntiAlias}
              onChange={(e) => setEraserAntiAlias(e.target.checked)}
            />
          </>
        )}
        
        {tool === 'fill' && (
          <>
            <span className="text-gray-400">|</span>
            <div className="flex items-center gap-2 max-w-[200px]">
              <span className="text-gray-300 text-sm font-medium whitespace-nowrap">Tolerance</span>
              <Slider
                min={0}
                max={255}
                value={fillTolerance}
                onChange={(e) => setFillTolerance(parseInt(e.target.value))}
                onMouseUp={syncSettings}
                onTouchEnd={syncSettings}
                className="flex-1"
              />
              <span className="text-gray-400 text-sm whitespace-nowrap">{fillTolerance}</span>
            </div>
            <Checkbox
              label="Anti-alias"
              checked={fillAntiAlias}
              onChange={(e) => setFillAntiAlias(e.target.checked)}
            />
          </>
        )}
        
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded transition-colors text-gray-300 hover:text-white ml-auto"
          title="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 gap-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className={`w-12 h-12 rounded flex items-center justify-center transition-colors ${
              historyIndex <= 0
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-gray-800 hover:bg-gray-700 text-white'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className={`w-12 h-12 rounded flex items-center justify-center transition-colors ${
              historyIndex >= history.length - 1
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-gray-800 hover:bg-gray-700 text-white'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
          <div className="w-full h-px bg-gray-700 my-2" />
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`w-12 h-12 rounded flex items-center justify-center text-2xl transition-colors ${
                tool === t.id
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title={t.name}
            >
              {t.icon}
            </button>
          ))}
          
          <div className="mt-4">
            <button
              onClick={() => setShowColorPicker(true)}
              className="w-12 h-12 rounded border-2 border-gray-700 hover:border-purple-500 transition-colors relative overflow-hidden"
              style={{ 
                backgroundImage: `url(/checkerboard.png)`,
                backgroundSize: '32px 32px'
              }}
              title="Color Picker"
            >
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{ 
                  backgroundColor: typeof color === 'string' 
                    ? color 
                    : `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`
                }}
              />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div 
            ref={containerRef}
            className="flex-1 overflow-hidden bg-gray-950 p-8 flex items-center justify-center"
          >
            <div 
              className="relative overflow-hidden"
              style={{
                width: '100%',
                height: '100%',
                backgroundImage: 'repeating-conic-gradient(#1f2937 0% 25%, #111827 0% 50%) 50% / 20px 20px',
              }}
              onWheel={(e) => setZoom(z => Math.min(1500, Math.max(100, z - Math.sign(e.deltaY) * 50)))}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${panOffset.x}px), calc(-50% + ${panOffset.y}px))`,
                  padding: '2px',
                }}
              >
                <div
                  style={{
                    width: `${displayWidth}px`,
                    height: `${displayHeight}px`,
                    backgroundImage: 'url(/checkerboard.png)',
                    backgroundSize: '32px 32px',
                    position: 'relative',
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    className={tool === 'hand' ? 'cursor-grab' : ''}
                    style={{
                      width: `${displayWidth}px`,
                      height: `${displayHeight}px`,
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      imageRendering: 'pixelated',
                      cursor: isPanning ? 'grabbing' : (tool === 'pencil' || tool === 'eraser' ? 'none' : 'crosshair'),
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={(e) => {
                      handleMouseMove(e)
                      if ((tool === 'pencil' || tool === 'eraser') && !toolsDisabled) {
                        const rect = canvasRef.current.getBoundingClientRect()
                        setCursorPos({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top
                        })
                      }
                    }}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={(e) => {
                      handleMouseUp(e)
                      setCursorPos(null)
                    }}
                  />
                  {(tool === 'pencil' || tool === 'eraser') && cursorPos && !toolsDisabled && (
                    <div
                      style={{
                        position: 'absolute',
                        left: cursorPos.x,
                        top: cursorPos.y,
                        width: `${(tool === 'eraser' ? eraserWidth : pencilWidth) * (zoom / 100)}px`,
                        height: `${(tool === 'eraser' ? eraserWidth : pencilWidth) * (zoom / 100)}px`,
                        border: '1px solid white',
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none',
                        boxShadow: '0 0 0 1px black',
                      }}
                    />
                  )}
                {selection && selection.width > 0 && selection.height > 0 && (
                  <div
                    className="marching-ants"
                    style={{
                      position: 'absolute',
                      left: `${(selection.x / frameWidth) * displayWidth}px`,
                      top: `${(selection.y / frameHeight) * displayHeight}px`,
                      width: `${(selection.width / frameWidth) * displayWidth}px`,
                      height: `${(selection.height / frameHeight) * displayHeight}px`,
                      border: '1px dashed white',
                      pointerEvents: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                )}
                </div>
              </div>
              <style>{`
                @keyframes marching-ants {
                  0% {
                    stroke-dashoffset: 0;
                  }
                  100% {
                    stroke-dashoffset: 8;
                  }
                }
                .marching-ants {
                  animation: marching-ants 0.5s linear infinite;
                  background: transparent;
                }
              `}</style>
            </div>
          </div>

          <div className="bg-gray-900 border-t border-gray-800 px-4 py-3 flex items-center gap-4">
            <Slider
              label="Zoom"
              min={100}
              max={1500}
              value={zoom}
              onChange={(e) => setZoom(parseInt(e.target.value))}
              onMouseUp={syncSettings}
              onTouchEnd={syncSettings}
              className="flex-1"
            />
            <div className="flex gap-2 shrink-0 ml-auto">
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                  hasChanges
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-700 cursor-not-allowed opacity-50'
                }`}
              >
                Save Changes
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {showReplaceColorModal && (
        <ReplaceColor
          onClose={() => setShowReplaceColorModal(false)}
          onApply={(newSheetData) => {
            if (newSheetData) {
              const newImg = new Image()
              newImg.onload = () => {
                originalImageRef.current = newImg
                updateSpriteSheetPreview()
              }
              newImg.src = newSheetData
            } else {
              updateSpriteSheetPreview()
            }
            setHasChanges(true)
          }}
          onSaveSheet={(newSheetData) => {
            onSave(newSheetData, true)
          }}
          onApplyToSheet={(processSheet) => {
            // First get the up-to-date full sprite sheet with the modified frame
            if (!canvasRef.current || !originalImageRef.current) return
            const fullCanvas = document.createElement('canvas')
            fullCanvas.width = imageDimensions.width
            fullCanvas.height = imageDimensions.height
            const fullCtx = fullCanvas.getContext('2d')
            fullCtx.drawImage(originalImageRef.current, 0, 0)
            const fw = imageDimensions.width / columns
            const fh = imageDimensions.height / rows
            const col = frameIndex % columns
            const row = Math.floor(frameIndex / columns)
            fullCtx.clearRect(col * fw, row * fh, fw, fh)
            fullCtx.drawImage(canvasRef.current, col * fw, row * fh, fw, fh)
            // Pass the up-to-date sheet to ReplaceColor for whole-sheet processing
            processSheet(fullCanvas.toDataURL('image/png'))
          }}
          canvasRef={canvasRef}
          image={image}
          rows={rows}
          columns={columns}
          frameIndex={frameIndex}
          setTool={setTool}
          onPickingChange={setToolsDisabled}
        />
      )}

      {showColorPicker && (
        <ColorPicker
          color={color}
          h={0}
          s={100}
          l={50}
          onChange={(newColor) => {
            setColor(newColor)
          }}
          onClose={() => {
            setShowColorPicker(false)
            syncSettings()
          }}
        />
      )}
    </div>
  )
}

export default PixelEditor
