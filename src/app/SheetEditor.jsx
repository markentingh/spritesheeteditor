import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/sheet-editor/Sidebar'
import PixelEditor from './PixelEditor'
import SheetViewer from '../components/sheet-editor/SheetViewer'
import { useSheetEditor } from '../context/SheetEditorContext'
import { ReferenceManager } from '../components/pixel-editor/ReferenceWindow'

function SheetEditor() {
  const {
    image,
    previewSettings,
    activeSheetKey,
    addSheet,
    disableGlobalDragDrop,
  } = useSheetEditor()

  const [isGlobalDragging, setIsGlobalDragging] = useState(false)

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
      </header>

      <div className="flex-1 flex overflow-hidden">
        <SheetViewer />

        {previewSettings.selectedFrameIndex !== null && image && (
          <PixelEditor />
        )}

        <Sidebar key={activeSheetKey} />
      </div>


      <ReferenceManager />

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
