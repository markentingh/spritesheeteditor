import { useState, useEffect, useRef, useCallback } from 'react'
import Slider from '../forms/Slider'
import ColorPicker from '../pixel-editor/ColorPicker'
import { useSheetEditor } from '../../context/SheetEditorContext'

function Preview({ hideControls = false, image: imageProp, selectedFrames: selectedFramesProp }) {
  const { image: imageCtx, rows, title, columns, padding, previewSettings, setPreviewSettings, animFrame, previewHeight, setPreviewHeight, selectedFrames: selectedFramesCtx, setSelectedFrameIndex, spriteSheets, setSpriteSheets, activeIndex, setActiveIndex } = useSheetEditor()
  const image = imageProp ?? imageCtx
  const selectedFrames = selectedFramesProp ?? selectedFramesCtx
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panOffset, setPanOffset] = useState(previewSettings?.panOffset || { x: 0, y: 0 })
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState({ y: 0, height: 0 })
  const [backgroundColor, setBackgroundColor] = useState(previewSettings?.backgroundColor || { hex: '#FF0000', r: 255, g: 0, b: 0, a: 255 })
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showBgDropdown, setShowBgDropdown] = useState(false)
  const [backgroundMode, setBackgroundMode] = useState(previewSettings?.backgroundMode || 'color')
  const [backgroundImage, setBackgroundImage] = useState(previewSettings?.backgroundImage || null)
  const [isTimelineDragging, setIsTimelineDragging] = useState(false)
  const bgButtonRef = useRef(null)
  const timelineRef = useRef(null)

  const { isAnimating, fps, zoom } = previewSettings || {}
  const currentFrame = isAnimating ? animFrame : (previewSettings?.currentFrame ?? 0)

  const updatePreview = useCallback((updates) => {
    setPreviewSettings(prev => ({ ...prev, ...updates }))
  }, [setPreviewSettings])

  useEffect(() => {
    /* eslint-disable */
    setImageDimensions({ width: 0, height: 0 })
    /* eslint-enable */
    const img = new Image()
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height })
    }
    img.src = image
  }, [image])

  useEffect(() => {
    /* eslint-disable */
    setPanOffset(previewSettings?.panOffset || { x: 0, y: 0 })
    /* eslint-enable */
  }, [previewSettings?.panOffset])

  useEffect(() => {
    /* eslint-disable */
    setBackgroundColor(previewSettings?.backgroundColor || { hex: '#FF0000', r: 255, g: 0, b: 0, a: 255 })
    setBackgroundMode(previewSettings?.backgroundMode || 'color')
    setBackgroundImage(previewSettings?.backgroundImage || null)
    /* eslint-enable */
  }, [previewSettings?.backgroundColor, previewSettings?.backgroundMode, previewSettings?.backgroundImage])

  const syncSettings = () => {
    setPreviewSettings(prev => ({
      ...prev,
      panOffset,
      backgroundColor,
      backgroundMode,
      backgroundImage,
    }))
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      const deltaY = resizeStart.y - e.clientY
      const newHeight = resizeStart.height + deltaY
      if (newHeight >= 150 && newHeight <= 600) {
        setPreviewHeight(newHeight)
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
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, resizeStart])

  const handleMouseDown = (e) => {
    setIsPanning(true)
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
  }

  const handleMouseMove = (e) => {
    if (!isPanning) return
    setPanOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    })
  }

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false)
      syncSettings()
    }
  }

  const handleReset = (e) => {
    e.stopPropagation()
    setPanOffset({ x: 0, y: 0 })
    updatePreview({ zoom: 100 })
    syncSettings()
  }

  const handleCopyPreviewSettings = (e) => {
    e.stopPropagation()
    if (!previewSettings) return
    const fullPreview = {
      ...previewSettings,
      panOffset,
      backgroundColor,
      backgroundMode,
      backgroundImage,
    }
    setPreviewSettings(fullPreview)
    setSpriteSheets(prev => prev.map(sheet => ({
      ...sheet,
      preview: { ...fullPreview }
    })))
  }

  const handleTimelineMouseDown = (e, selectedFrameIndices) => {
    setIsTimelineDragging(true)
    handleTimelineDrag(e, selectedFrameIndices)
  }

  const handleTimelineDrag = (e, selectedFrameIndices) => {
    if (!timelineRef.current) return
    
    const rect = timelineRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const percent = x / rect.width
    const frameIndex = Math.floor(percent * selectedFrameIndices.length)
    const clampedIndex = Math.max(0, Math.min(frameIndex, selectedFrameIndices.length - 1))
    
    if (selectedFrameIndices[clampedIndex] !== undefined) {
      updatePreview({ currentFrame: selectedFrameIndices[clampedIndex] })
    }
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isTimelineDragging) return
      
      const selectedFrameIndices = Object.keys(selectedFrames || {})
        .filter(key => selectedFrames[key])
        .map(Number)
        .sort((a, b) => a - b)
      
      handleTimelineDrag(e, selectedFrameIndices)
    }

    const handleMouseUp = () => {
      setIsTimelineDragging(false)
    }

    if (isTimelineDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isTimelineDragging, selectedFrames])

  const pad = padding || { top: 0, right: 0, bottom: 0, left: 0 }
  const frameWidth = Math.floor((imageDimensions.width - pad.left - pad.right) / columns)
  const frameHeight = Math.floor((imageDimensions.height - pad.top - pad.bottom) / rows)
  const displayWidth = frameWidth * (zoom / 100)
  const displayHeight = frameHeight * (zoom / 100)
  const col = currentFrame % columns
  const row = Math.floor(currentFrame / columns)

  const hasImageDimensions = imageDimensions.width > 0 && imageDimensions.height > 0

  return (
    <div className={hideControls ? "h-full flex flex-col" : "mt-auto pt-6"}>
      {!hideControls && (
        <div
          className="h-1 w-full bg-gray-700 hover:bg-purple-500 cursor-ns-resize transition-colors rounded mb-4"
          onMouseDown={(e) => {
            setResizeStart({ y: e.clientY, height: previewHeight })
            setIsResizing(true)
          }}
          title="Drag to resize"
        />
      )}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Animation Preview - {title}</h3>
        {!hideControls && spriteSheets.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveIndex(prev => (prev - 1 + spriteSheets.length) % spriteSheets.length)}
              className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 transition-colors"
              title="Previous sprite sheet"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm text-gray-300 min-w-[3rem] text-center">
              {activeIndex + 1} / {spriteSheets.length}
            </span>
            <button
              onClick={() => setActiveIndex(prev => (prev + 1) % spriteSheets.length)}
              className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 transition-colors"
              title="Next sprite sheet"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      <div 
        className={hideControls ? "flex-1 rounded-lg p-4 border border-gray-800 overflow-hidden cursor-grab relative" : "mb-6 rounded-lg p-4 border border-gray-800 overflow-hidden cursor-grab relative"}
        style={{ 
          height: hideControls ? undefined : `${previewHeight}px`,
          ...(backgroundMode === 'color' ? {
            backgroundImage: `url(/checkerboard.png)`,
            backgroundSize: '32px 32px'
          } : {
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'repeat'
          })
        }}
        onWheel={(e) => updatePreview({ zoom: Math.min(500, Math.max(50, (previewSettings?.zoom || 100) - Math.sign(e.deltaY) * 10)) })}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {!hasImageDimensions ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : (
          <>
            {backgroundMode === 'color' && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ backgroundColor: `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a / 255})` }}
              />
            )}
            <div
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${panOffset.x}px), calc(-50% + ${panOffset.y}px))`,
              }}
            >
              <div
                style={{
                  width: `${displayWidth}px`,
                  height: `${displayHeight}px`,
                  backgroundImage: `url(${image})`,
                  backgroundSize: `${imageDimensions.width * (zoom / 100)}px ${imageDimensions.height * (zoom / 100)}px`,
                  backgroundPosition: `${-(pad.left * (zoom / 100) + col * displayWidth)}px ${-(pad.top * (zoom / 100) + row * displayHeight)}px`,
                  backgroundRepeat: 'no-repeat',
                  imageRendering: 'pixelated',
                  cursor: isPanning ? 'grabbing' : 'grab',
                }}
              />
            </div>
          </>
        )}
        {!hideControls && (
          <div className="absolute bottom-2 right-2 flex gap-1.5 z-10">
            {!isAnimating && (
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedFrameIndex(currentFrame) }}
                className="p-2 bg-gray-800 hover:bg-purple-700 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer"
                title="Edit current frame in pixel editor"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            <button
              onClick={handleReset}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors cursor-pointer"
              title="Reset zoom and position"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={handleCopyPreviewSettings}
              className="p-2 bg-gray-800 hover:bg-purple-700 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer"
              title="Copy preview settings to all sheets"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Timeline Controls */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => updatePreview({ isAnimating: !isAnimating })}
            className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded transition-colors"
            title={isAnimating ? "Pause" : "Play"}
          >
            {isAnimating ? (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V4zM11 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            )}
          </button>
          
          <div className="flex-1 flex items-center gap-2">
            {(() => {
              // Get selected frames as array of indices
              const selectedFrameIndices = Object.keys(selectedFrames || {})
                .filter(key => selectedFrames[key])
                .map(Number)
                .sort((a, b) => a - b)
              
              const totalSelectedFrames = selectedFrameIndices.length
              const currentSelectedIndex = selectedFrameIndices.indexOf(currentFrame)
              const progress = totalSelectedFrames > 0 ? (currentSelectedIndex / Math.max(1, totalSelectedFrames - 1)) * 100 : 0
              
              return (
                <>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    Frame {currentSelectedIndex + 1}/{totalSelectedFrames}
                  </span>
                  <div 
                    ref={timelineRef}
                    className="flex-1 h-2 bg-gray-800 rounded-full relative cursor-pointer"
                    onMouseDown={(e) => handleTimelineMouseDown(e, selectedFrameIndices)}
                  >
                    <div 
                      className="absolute top-0 left-0 h-full bg-purple-600 rounded-full opacity-10"
                      style={{ width: `${progress}%` }}
                    />
                    <div 
                      className="absolute w-3 h-3 bg-white rounded-full shadow-lg cursor-grab active:cursor-grabbing opacity-10"
                      style={{ 
                        left: `${progress}%`, 
                        top: '50%',
                        transform: 'translate(-50%, -50%)'
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        handleTimelineMouseDown(e, selectedFrameIndices)
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{progress.toFixed(0)}%</span>
                </>
              )
            })()}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Slider
              label="FPS"
              min={1}
              max={60}
              value={fps}
              onChange={(e) => updatePreview({ fps: parseInt(e.target.value) })}
            />
          </div>
          <div className="flex-1">
            <Slider
              label="Zoom"
              min={50}
              max={500}
              value={zoom}
              onChange={(e) => updatePreview({ zoom: parseInt(e.target.value) })}
              onMouseUp={syncSettings}
              onTouchEnd={syncSettings}
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2"></label>
            <button
              ref={bgButtonRef}
              onClick={() => setShowBgDropdown(!showBgDropdown)}
              className="w-12 h-12 rounded border-2 border-gray-700 hover:border-purple-500 transition-colors relative overflow-hidden"
              style={backgroundMode === 'color' ? { 
                backgroundImage: `url(/checkerboard.png)`,
                backgroundSize: '32px 32px'
              } : {
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
              title="Background Options"
            >
              {backgroundMode === 'color' && (
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{ backgroundColor: `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a / 255})` }}
                />
              )}
            </button>
            
            {showBgDropdown && (
              <div className="absolute bottom-full mb-2 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 p-3 w-56">
                <button
                  onClick={() => {
                    setShowBgDropdown(false)
                    setShowColorPicker(true)
                  }}
                  className="w-full px-3 py-2 mb-3 rounded border-2 border-gray-600 hover:border-purple-500 transition-colors flex items-center gap-3"
                >
                  <div
                    className="w-8 h-8 rounded flex-shrink-0 relative overflow-hidden"
                    style={{
                      backgroundImage: `url(/checkerboard.png)`,
                      backgroundSize: '32px 32px'
                    }}
                  >
                    <div 
                      className="absolute inset-0"
                      style={{ backgroundColor: `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a / 255})` }}
                    />
                  </div>
                  <span className="text-sm text-white">Select Color</span>
                </button>
                
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <button
                      key={num}
                      onClick={() => {
                        setBackgroundMode('image')
                        setBackgroundImage(`/preview-bg-${String(num).padStart(2, '0')}.png`)
                        setShowBgDropdown(false)
                        syncSettings()
                      }}
                      className="w-12 h-12 rounded border-2 border-gray-600 hover:border-purple-500 transition-colors flex-shrink-0"
                      style={{
                        backgroundImage: `url(/preview-bg-${String(num).padStart(2, '0')}.png)`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                      title={`Background ${num}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {showColorPicker && (
        <ColorPicker
          color={backgroundColor}
          h={0}
          s={100}
          l={50}
          onChange={(newColor) => {
            setBackgroundColor(newColor)
            setBackgroundMode('color')
            syncSettings()
          }}
          onClose={() => setShowColorPicker(false)}
        />
      )}
    </div>
  )
}

export default Preview
