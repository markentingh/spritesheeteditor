import { useState } from 'react'
import { useSheetEditor } from '../../context/SheetEditorContext'

function SpriteSheetSidebar() {
  const { spriteSheets, activeIndex, setActiveIndex, addSheet, removeSheet } = useSheetEditor()
  const [showConfirm, setShowConfirm] = useState(null)

  const handleAdd = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => addSheet(event.target.result)
      reader.readAsDataURL(file)
    }
    input.click()
  }

  return (
    <div className="w-24 bg-gray-900 border-l border-gray-800 flex flex-col shrink-0">
      <div className="p-2 border-b border-gray-800">
        <button
          onClick={handleAdd}
          className="w-full h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-purple-500 rounded-lg transition-colors"
          title="Add sprite sheet"
        >
          <span className="material-symbols-outlined text-purple-400">add</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {spriteSheets.map((sheet, index) => (
          <div
            key={sheet.key}
            onClick={() => setActiveIndex(index)}
            title={sheet.title || `Sheet ${index + 1}`}
            className={`relative group cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
              index === activeIndex
                ? 'border-purple-500 ring-2 ring-purple-500/30'
                : 'border-gray-700 hover:border-gray-500'
            }`}
            style={{ aspectRatio: '1' }}
          >
            {sheet.thumbnail || localStorage.getItem(`spriteSheetImage_${sheet.key}`) ? (
              <img
                src={sheet.thumbnail || localStorage.getItem(`spriteSheetImage_${sheet.key}`)}
                alt={`Sheet ${index + 1}`}
                className="w-full h-full object-contain bg-gray-950"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-950 text-gray-500 text-xs font-medium">
                empty
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-center text-white py-0.5">
              {index + 1}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowConfirm(index) }}
              className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center bg-red-600/90 hover:bg-red-500 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove sprite sheet"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
            </button>
          </div>
        ))}
      </div>

      {showConfirm !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowConfirm(null)}>
          <div className="bg-gray-800 rounded-xl p-6 w-80 border border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Remove Sprite Sheet?</h3>
            <p className="text-gray-400 text-sm mb-6">This cannot be undone. The sprite sheet and its settings will be permanently deleted.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { removeSheet(showConfirm); setShowConfirm(null) }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors text-white"
              >
                Remove
              </button>
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SpriteSheetSidebar
