import { useState, useEffect, useRef } from 'react'
import Slider from '../forms/Slider'
import { useSheetEditor } from '../../context/SheetEditorContext'

function ExportModal({ onClose }) {
  const { spriteSheets, activeIndex } = useSheetEditor()
  const [imageDimensions, setImageDimensions] = useState({})
  const [loadedImages, setLoadedImages] = useState({})
  const [framesPerRow, setFramesPerRow] = useState(4)
  const [previewZoom, setPreviewZoom] = useState(100)
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 })
  const [exportPadding, setExportPadding] = useState({ top: 0, right: 0, bottom: 0, left: 0 })
  const [isPreviewPanning, setIsPreviewPanning] = useState(false)
  const [previewPanStart, setPreviewPanStart] = useState({ x: 0, y: 0 })
  const previewRef = useRef(null)

  const frameEntries = []
  for (const sheet of spriteSheets) {
    const selectedIndices = Object.entries(sheet.selectedFrames || {})
      .filter(([_, isSelected]) => isSelected)
      .map(([index]) => parseInt(index))
    for (const index of selectedIndices) {
      frameEntries.push({ sheet, index })
    }
  }

  const totalFrames = frameEntries.length

  const sheetBreakdown = spriteSheets.map((sheet, i) => {
    const count = Object.values(sheet.selectedFrames || {}).filter(Boolean).length
    return { index: i + 1, count }
  }).filter(s => s.count > 0)

  const activeSheet = spriteSheets[activeIndex] || spriteSheets[0]
  const activeKey = activeSheet?.key

  useEffect(() => {
    if (totalFrames > 0) {
      setFramesPerRow(Math.min(4, totalFrames))
    }
  }, [totalFrames])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const dims = {}
      const imgs = {}
      for (const sheet of spriteSheets) {
        const url = localStorage.getItem(`spriteSheetImage_${sheet.key}`)
        if (!url) continue
        const img = await new Promise((resolve) => {
          const i = new Image()
          i.onload = () => resolve(i)
          i.onerror = () => resolve(null)
          i.src = url
        })
        if (img) {
          dims[sheet.key] = { width: img.width, height: img.height }
          imgs[sheet.key] = img
        }
      }
      if (!cancelled) {
        setImageDimensions(dims)
        setLoadedImages(imgs)
      }
    }
    load()
    return () => { cancelled = true }
  }, [spriteSheets])

  const activePad = activeSheet?.padding || [0, 0, 0, 0]
  const activeDim = imageDimensions[activeKey] || { width: 0, height: 0 }
  const outputFrameWidth = activeSheet && activeDim.width
    ? Math.floor((activeDim.width - activePad[1] - activePad[3]) / activeSheet.columns)
    : 0
  const outputFrameHeight = activeSheet && activeDim.height
    ? Math.floor((activeDim.height - activePad[0] - activePad[2]) / activeSheet.rows)
    : 0

  const calculatedRows = Math.max(1, Math.ceil(totalFrames / Math.max(1, framesPerRow)))
  const finalWidth = outputFrameWidth * framesPerRow + exportPadding.left + exportPadding.right
  const finalHeight = outputFrameHeight * calculatedRows + exportPadding.top + exportPadding.bottom
  const framesInLastRow = totalFrames % framesPerRow || framesPerRow
  const emptyFramesInLastRow = framesPerRow - framesInLastRow

  useEffect(() => {
    if (finalWidth === 0 || finalHeight === 0) return
    const zoomX = (400 / finalWidth) * 100
    const zoomY = (400 / finalHeight) * 100
    const fitZoom = Math.max(10, Math.min(zoomX, zoomY, 400))
    setPreviewZoom(Math.round(fitZoom))
    setPreviewPan({ x: 0, y: 0 })
  }, [finalWidth, finalHeight])

  useEffect(() => {
    if (!previewRef.current || totalFrames === 0 || outputFrameWidth === 0 || outputFrameHeight === 0) return
    const canvas = previewRef.current
    canvas.width = finalWidth
    canvas.height = finalHeight
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    frameEntries.forEach((entry, i) => {
      const { sheet, index } = entry
      const img = loadedImages[sheet.key]
      const dim = imageDimensions[sheet.key]
      if (!img || !dim) return

      const pad = sheet.padding || [0, 0, 0, 0]
      const srcFrameWidth = Math.floor((dim.width - pad[1] - pad[3]) / sheet.columns)
      const srcFrameHeight = Math.floor((dim.height - pad[0] - pad[2]) / sheet.rows)
      const srcCol = index % sheet.columns
      const srcRow = Math.floor(index / sheet.columns)

      const destCol = i % framesPerRow
      const destRow = Math.floor(i / framesPerRow)
      const destX = exportPadding.left + destCol * outputFrameWidth
      const destY = exportPadding.top + destRow * outputFrameHeight

      ctx.drawImage(
        img,
        pad[3] + srcCol * srcFrameWidth,
        pad[0] + srcRow * srcFrameHeight,
        srcFrameWidth,
        srcFrameHeight,
        destX,
        destY,
        outputFrameWidth,
        outputFrameHeight
      )
    })
  }, [frameEntries, loadedImages, imageDimensions, outputFrameWidth, outputFrameHeight, framesPerRow, finalWidth, finalHeight, exportPadding])

  const handleExport = () => {
    if (!previewRef.current) return
    previewRef.current.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sprite-sheet-${framesPerRow}x${calculatedRows}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 'image/png')
    onClose()
  }

  const handlePreviewMouseDown = (e) => {
    setIsPreviewPanning(true)
    setPreviewPanStart({ x: e.clientX - previewPan.x, y: e.clientY - previewPan.y })
  }

  const handlePreviewMouseMove = (e) => {
    if (!isPreviewPanning) return
    setPreviewPan({ x: e.clientX - previewPanStart.x, y: e.clientY - previewPanStart.y })
  }

  const handlePreviewMouseUp = () => {
    setIsPreviewPanning(false)
  }

  const resetPreviewView = () => {
    setPreviewZoom(100)
    setPreviewPan({ x: 0, y: 0 })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 w-[600px] max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-4">Export Sprite Sheet</h3>

        <div className="space-y-6">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Total Frames to Export</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {totalFrames} frame{totalFrames !== 1 ? 's' : ''} across {sheetBreakdown.length} sheet{sheetBreakdown.length !== 1 ? 's' : ''}
                </div>
              </div>
              {sheetBreakdown.length > 0 && (
                <ul className="text-xs text-gray-400 space-y-0.5 text-right">
                  {sheetBreakdown.map(s => (
                    <li key={s.index}>{s.count} frame{s.count !== 1 ? 's' : ''} from sheet {s.index}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <Slider
              label="Frames Per Row"
              min={1}
              max={Math.max(1, totalFrames)}
              value={framesPerRow}
              onChange={(e) => setFramesPerRow(parseInt(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Export Padding</label>
            <div className="grid grid-cols-4 gap-2">
              {['top', 'right', 'bottom', 'left'].map(side => (
                <div key={side}>
                  <label className="block text-xs text-gray-500 mb-1 capitalize">{side}</label>
                  <input
                    type="number"
                    min={0}
                    value={exportPadding[side]}
                    onChange={(e) => {
                      const v = Math.max(0, parseInt(e.target.value) || 0)
                      setExportPadding(prev => ({ ...prev, [side]: v }))
                    }}
                    className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            <div
              className="flex items-center justify-center bg-black"
              style={{ height: '400px', cursor: isPreviewPanning ? 'grabbing' : 'grab' }}
              onMouseDown={handlePreviewMouseDown}
              onMouseMove={handlePreviewMouseMove}
              onMouseUp={handlePreviewMouseUp}
              onMouseLeave={handlePreviewMouseUp}
            >
              <canvas
                ref={previewRef}
                style={{
                  width: `${finalWidth * (previewZoom / 100)}px`,
                  height: `${finalHeight * (previewZoom / 100)}px`,
                  transform: `translate(${previewPan.x}px, ${previewPan.y}px)`,
                  imageRendering: 'pixelated',
                  border: '1px solid #4b5563',
                  boxShadow: '0 0 0 1px #1f2937',
                }}
              />
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Slider
                label="Preview Zoom"
                min={10}
                max={400}
                value={previewZoom}
                onChange={(e) => setPreviewZoom(parseInt(e.target.value))}
              />
            </div>
            <button
              onClick={resetPreviewView}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-white transition-colors"
            >
              Reset
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="text-sm text-gray-400 mb-1">Calculated Rows</div>
              <div className="text-2xl font-bold text-white">{calculatedRows}</div>
              {emptyFramesInLastRow > 0 && (
                <div className="text-xs text-gray-500 mt-2">
                  {emptyFramesInLastRow} empty frame{emptyFramesInLastRow !== 1 ? 's' : ''} in last row
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-lg p-4 border border-purple-700">
              <div className="text-sm text-purple-300 mb-1">Final Image Resolution</div>
              <div className="text-2xl font-bold text-white">
                {finalWidth} × {finalHeight}
              </div>
              <div className="text-xs text-purple-400 mt-1">
                {outputFrameWidth}×{outputFrameHeight} per frame
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors text-white"
            >
              Download
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportModal
