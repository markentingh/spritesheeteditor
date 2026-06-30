import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/sheet-editor/Sidebar'
import PixelEditor from './PixelEditor'
import SheetViewer from '../components/sheet-editor/SheetViewer'
import { useSheetEditor } from './SheetEditorContext'

function SheetEditor() {
  const {
    image,
    previewSettings,
    activeSheetKey,
    addSheet,
    disableGlobalDragDrop,
  } = useSheetEditor()

  const [isGlobalDragging, setIsGlobalDragging] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [showDemoModal, setShowDemoModal] = useState(false)
  
  const fileInputRef = useRef(null)


  useEffect(() => {
    const handleGlobalDragEnter = (e) => {
      if (disableGlobalDragDrop) return
      e.preventDefault()
      setIsGlobalDragging(true)
    }

    const handleGlobalDragOver = (e) => {
      if (disableGlobalDragDrop) return
      e.preventDefault()
    }

    const handleGlobalDragLeave = (e) => {
      if (disableGlobalDragDrop) return
      if (e.clientX === 0 && e.clientY === 0) {
        setIsGlobalDragging(false)
      }
    }

    const handleGlobalDrop = (e) => {
      if (disableGlobalDragDrop) return
      e.preventDefault()
      setIsGlobalDragging(false)
      const file = e.dataTransfer.files[0]
      if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
        const reader = new FileReader()
        reader.onload = (event) => addSheet(event.target.result)
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
  }, [disableGlobalDragDrop, addSheet])


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
        <SheetViewer />

        {previewSettings.selectedFrameIndex !== null && image && (
          <PixelEditor />
        )}

        <Sidebar key={activeSheetKey} />
      </div>


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
                  localStorage.clear()
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
              <p className="text-gray-400 text-lg">Release to add sprite sheet</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SheetEditor
