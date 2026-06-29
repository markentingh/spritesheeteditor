import { useState, useRef, useEffect } from 'react'
import Preview from './Preview'
import Input from '../forms/Input'
import ExportModal from './ExportModal'

function Sidebar({ rows, columns, onRowsChange, onColumnsChange, image, isAnimating, setIsAnimating, currentFrame, setCurrentFrame, fps, zoom, setFps, setZoom, width, onWidthChange, previewSettings, onPreviewSettingsChange, selectedFrames, padding, onPaddingChange, onEditFrame }) {
  const [isResizing, setIsResizing] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const sidebarRef = useRef(null)

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      
      const newWidth = window.innerWidth - e.clientX
      if (newWidth >= 280 && newWidth <= 600) {
        onWidthChange(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
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
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, onWidthChange])

  return (
    <aside 
      ref={sidebarRef}
      className="bg-gray-800 border-l border-gray-700 overflow-auto flex flex-col relative"
      style={{ width: `${width}px` }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-purple-500 transition-colors z-10"
        onMouseDown={() => setIsResizing(true)}
      />
      
      <div className="p-6 flex flex-col h-full">
        <div className="space-y-6 flex-1">
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Grid Settings</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Rows"
              type="number"
              min="1"
              max="100"
              value={rows}
              onChange={(e) => onRowsChange(parseInt(e.target.value) || 1)}
            />

            <Input
              label="Columns"
              type="number"
              min="1"
              max="100"
              value={columns}
              onChange={(e) => onColumnsChange(parseInt(e.target.value) || 1)}
            />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Padding</h2>
            <div className="grid grid-cols-4 gap-2">
              {['top', 'right', 'bottom', 'left'].map((side) => (
                <div key={side}>
                  <label className="block text-xs font-medium text-gray-400 mb-1 capitalize">{side.charAt(0).toUpperCase() + side.slice(1)}</label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={padding?.[side] ?? 0}
                    onChange={(e) => onPaddingChange({ ...padding, [side]: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    style={{ MozAppearance: 'textfield' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {image && (
          <>
            <Preview
              image={image}
              rows={rows}
              columns={columns}
              padding={padding}
              currentFrame={currentFrame}
              setCurrentFrame={setCurrentFrame}
              fps={fps}
              zoom={zoom}
              setFps={setFps}
              setZoom={setZoom}
              initialSettings={previewSettings}
              onSettingsChange={onPreviewSettingsChange}
              selectedFrames={selectedFrames}
              isAnimating={isAnimating}
              setIsAnimating={setIsAnimating}
              onEditFrame={onEditFrame}
            />
            
            <button
              onClick={() => setShowExportModal(true)}
              className="mt-4 w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors text-white"
            >
              Export New Sprite Sheet
            </button>
          </>
        )}
      </div>

      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          image={image}
          rows={rows}
          columns={columns}
          padding={padding}
          selectedFrames={selectedFrames}
        />
      )}
    </aside>
  )
}

export default Sidebar
