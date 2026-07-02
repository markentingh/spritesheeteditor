import { useState, useEffect, useRef, useCallback } from 'react'
import FrameRearranger from './FrameRearranger'
import Preview from './Preview'
import { useSheetEditor } from '../../context/SheetEditorContext'

function generateRearrangedImage(image, rows, columns, padding, frameOrder) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      const frameWidth = Math.round((img.width - padding.left - padding.right) / columns)
      const frameHeight = Math.round((img.height - padding.top - padding.bottom) / rows)
      frameOrder.forEach((originalIndex, newIndex) => {
        const srcRow = Math.floor(originalIndex / columns)
        const srcCol = originalIndex % columns
        const dstRow = Math.floor(newIndex / columns)
        const dstCol = newIndex % columns
        const sx = padding.left + srcCol * frameWidth
        const sy = padding.top + srcRow * frameHeight
        const dx = padding.left + dstCol * frameWidth
        const dy = padding.top + dstRow * frameHeight
        ctx.drawImage(img, sx, sy, frameWidth, frameHeight, dx, dy, frameWidth, frameHeight)
      })
      resolve(canvas.toDataURL('image/png'))
    }
    img.src = image
  })
}

function applyFrameOrderToSelection(frameOrder, selectedFrames) {
  const next = {}
  frameOrder.forEach((originalIndex, newIndex) => {
    next[newIndex] = selectedFrames[originalIndex] || false
  })
  return next
}

function RearrangeFramesModal({ onClose }) {
  const {
    activeSheetKey,
    image,
    setImage,
    rows,
    columns,
    padding,
    selectedFrames,
    setSelectedFrames,
    previewSettings,
    setPreviewSettings,
    sheetZoom,
    setSheetZoom,
    sheetPanOffset,
    setSheetPanOffset,
    previewHeight,
    setPreviewHeight,
    setDisableGlobalDragDrop,
  } = useSheetEditor()

  const originalStateRef = useRef({
    previewSettings,
    sheetZoom,
    sheetPanOffset,
    previewHeight,
    selectedFrames,
  })

  const [frameOrder, setFrameOrder] = useState(() =>
    Array.from({ length: rows * columns }, (_, i) => i)
  )
  const [tempImage, setTempImage] = useState(image)
  const [tempSelectedFrames, setTempSelectedFrames] = useState(() =>
    applyFrameOrderToSelection(frameOrder, selectedFrames)
  )
  const [isApplying, setIsApplying] = useState(false)
  const initialRenderRef = useRef(true)

  useEffect(() => {
    setDisableGlobalDragDrop(true)
    return () => setDisableGlobalDragDrop(false)
  }, [setDisableGlobalDragDrop])

  const restoreOriginalSettings = useCallback(() => {
    const original = originalStateRef.current
    setPreviewSettings(original.previewSettings)
    setSheetZoom(original.sheetZoom)
    setSheetPanOffset(original.sheetPanOffset)
    setPreviewHeight(original.previewHeight)
  }, [setPreviewSettings, setSheetZoom, setSheetPanOffset, setPreviewHeight])

  const generateTemporary = useCallback(async (order) => {
    const newImage = await generateRearrangedImage(image, rows, columns, padding, order)
    const newSelectedFrames = applyFrameOrderToSelection(order, originalStateRef.current.selectedFrames)
    setTempImage(newImage)
    setTempSelectedFrames(newSelectedFrames)
  }, [image, rows, columns, padding])

  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false
      return
    }
    generateTemporary(frameOrder)
  }, [frameOrder, generateTemporary])

  const handleToggleFrame = (newIndex) => {
    const next = { ...tempSelectedFrames }
    next[newIndex] = !next[newIndex]
    setTempSelectedFrames(next)
  }

  useEffect(() => {
    setSelectedFrames(tempSelectedFrames)
  }, [tempSelectedFrames, setSelectedFrames])

  const handleApply = async () => {
    if (isApplying) return
    setIsApplying(true)
    try {
      const originalKey = `spriteSheetImageOriginal_${activeSheetKey}`
      const currentKey = `spriteSheetImage_${activeSheetKey}`
      try {
        if (!localStorage.getItem(originalKey)) {
          localStorage.setItem(originalKey, image)
        }
        localStorage.setItem(currentKey, tempImage)
      } catch (error) {
        console.error('Error saving images:', error)
      }
      setImage(tempImage)
      restoreOriginalSettings()
      onClose()
    } finally {
      setIsApplying(false)
    }
  }

  const handleClose = () => {
    setSelectedFrames(originalStateRef.current.selectedFrames)
    restoreOriginalSettings()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={handleClose}>
      <div
        className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '90vw', height: '85vh', maxWidth: '1400px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">Rearrange Frames</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex min-h-0 p-4 gap-4">
          <div className="flex-1 min-w-0 flex flex-col">
            <FrameRearranger
              image={image}
              rows={rows}
              columns={columns}
              padding={padding}
              selectedFrames={selectedFrames}
              frameOrder={frameOrder}
              onFrameOrderChange={setFrameOrder}
              onToggleFrame={handleToggleFrame}
            />
          </div>
          <div className="w-150 flex flex-col border-l border-gray-800 pl-4">
            <Preview hideControls image={tempImage} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/50 rounded-lg font-medium transition-colors text-white"
          >
            {isApplying ? 'Applying...' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RearrangeFramesModal
