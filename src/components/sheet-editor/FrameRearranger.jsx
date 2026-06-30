import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import Checkbox from '../forms/Checkbox'

function FrameRearranger({ image, rows, columns, padding, selectedFrames, frameOrder, onFrameOrderChange, onToggleFrame }) {
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
  const [dragIndex, setDragIndex] = useState(null)
  const [dropIndex, setDropIndex] = useState(null)
  const containerRef = useRef(null)
  const innerRef = useRef(null)
  const imgRef = useRef(null)

  const pad = padding || { top: 0, right: 0, bottom: 0, left: 0 }

  const enabledNumbers = useMemo(() => {
    const map = {}
    let count = 0
    frameOrder.forEach((_, idx) => {
      if (selectedFrames[idx]) {
        count += 1
        map[idx] = count
      }
    })
    return map
  }, [frameOrder, selectedFrames])

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setNaturalSize({ width: img.width, height: img.height })
    }
    img.src = image
  }, [image])

  const frameWidth = naturalSize.width > 0 ? Math.round((naturalSize.width - pad.left - pad.right) / columns) : 0
  const frameHeight = naturalSize.height > 0 ? Math.round((naturalSize.height - pad.top - pad.bottom) / rows) : 0

  const containerWidth = naturalSize.width > 0 ? naturalSize.width : 0
  const containerHeight = naturalSize.height > 0 ? naturalSize.height : 0

  useLayoutEffect(() => {
    if (!containerRef.current || !innerRef.current || containerWidth === 0 || containerHeight === 0) return
    const updateScale = () => {
      const rect = containerRef.current.getBoundingClientRect()
      const scaleX = (rect.width - 32) / containerWidth
      const scaleY = (rect.height - 32) / containerHeight
      const s = Math.min(scaleX, scaleY, 1)
      innerRef.current.style.width = `${containerWidth}px`
      innerRef.current.style.height = `${containerHeight}px`
      innerRef.current.style.transform = `scale(${s})`
      innerRef.current.style.transformOrigin = 'top left'
    }
    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [containerWidth, containerHeight])

  const handleDragStart = (e, index) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    setDropIndex(index)
  }

  const handleDragLeave = () => {
    setDropIndex(null)
  }

  const handleDrop = (e, index) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      setDropIndex(null)
      return
    }
    const next = [...frameOrder]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(index, 0, moved)
    onFrameOrderChange(next)
    setDragIndex(null)
    setDropIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDropIndex(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-sm text-gray-400">Drag frames to rearrange</span>
        <span className="text-xs text-gray-500">{frameOrder.length} frames</span>
      </div>
      <div
        ref={containerRef}
        className="flex-1 min-h-0 bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden"
      >
        {containerWidth === 0 || containerHeight === 0 ? (
          <div className="text-gray-500 text-sm">Loading...</div>
        ) : (
          <div
            ref={innerRef}
            className="relative shadow-2xl border border-gray-800"
            style={{
              backgroundImage: 'url(/checkerboard.png)',
              backgroundSize: '32px 32px',
            }}
          >
            <svg
              className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
              viewBox={`0 0 ${containerWidth} ${containerHeight}`}
              preserveAspectRatio="none"
            >
              {(() => {
                const lines = []
                const gridWidth = columns * frameWidth
                const gridHeight = rows * frameHeight
                for (let i = 0; i <= rows; i++) {
                  const y = pad.top + (i / rows) * gridHeight
                  lines.push(<line key={`h-${i}`} x1={pad.left} y1={y} x2={pad.left + gridWidth} y2={y} stroke="#ffffff" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeDasharray="7,5" />)
                }
                for (let i = 0; i <= columns; i++) {
                  const x = pad.left + (i / columns) * gridWidth
                  lines.push(<line key={`v-${i}`} x1={x} y1={pad.top} x2={x} y2={pad.top + gridHeight} stroke="#ffffff" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeDasharray="7,5" />)
                }
                return lines
              })()}
            </svg>

            <div
              className="absolute z-20"
              style={{
                top: pad.top,
                left: pad.left,
                width: columns * frameWidth,
                height: rows * frameHeight,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, ${frameWidth}px)`,
                gridTemplateRows: `repeat(${rows}, ${frameHeight}px)`,
              }}
            >
              {frameOrder.map((originalIndex, gridIndex) => {
                const row = Math.floor(originalIndex / columns)
                const col = originalIndex % columns
                const checked = selectedFrames[gridIndex] || false
                const isDragging = dragIndex === gridIndex
                const isDropTarget = dropIndex === gridIndex
                return (
                  <div
                    key={`${originalIndex}-${gridIndex}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, gridIndex)}
                    onDragOver={(e) => handleDragOver(e, gridIndex)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, gridIndex)}
                    onDragEnd={handleDragEnd}
                    className={`relative overflow-hidden cursor-move transition-all ${isDragging ? 'opacity-50' : ''} ${isDropTarget ? 'ring-2 ring-purple-500 ring-inset' : ''} ${checked ? 'hover:bg-purple-500/10' : 'bg-black/50 hover:bg-black/40'}`}
                    style={{
                      width: frameWidth,
                      height: frameHeight,
                      backgroundImage: `url(${image})`,
                      backgroundSize: `${containerWidth}px ${containerHeight}px`,
                      backgroundPosition: `${-(pad.left + col * frameWidth)}px ${-(pad.top + row * frameHeight)}px`,
                      backgroundRepeat: 'no-repeat',
                      imageRendering: 'pixelated',
                    }}
                  >
                    <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={checked}
                        onChange={() => onToggleFrame(gridIndex)}
                        size="md"
                      />
                    </div>
                    {checked && (
                      <div className="absolute bottom-1 right-1 text-white text-xs font-bold leading-none select-none pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                        {enabledNumbers[gridIndex]}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      <img ref={imgRef} src={image} alt="" className="hidden" />
    </div>
  )
}

export default FrameRearranger
