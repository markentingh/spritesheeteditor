import { useState } from 'react'
import { useSheetEditor } from '../../context/SheetEditorContext'

function PaddingModal({ onClose }) {
  const { image, activeSheetKey, setImage, setPadding } = useSheetEditor()
  const [values, setValues] = useState({ top: 0, right: 0, bottom: 0, left: 0 })
  const [mode, setMode] = useState('add')

  const handleApply = () => {
    if (!image) return
    const p = values
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (mode === 'add') {
        canvas.width = img.width + p.left + p.right
        canvas.height = img.height + p.top + p.bottom
        ctx.drawImage(img, p.left, p.top)
      } else {
        const innerW = img.width - p.left - p.right
        const innerH = img.height - p.top - p.bottom
        canvas.width = Math.max(1, innerW)
        canvas.height = Math.max(1, innerH)
        ctx.drawImage(img, p.left, p.top, innerW, innerH, 0, 0, innerW, innerH)
      }
      const dataUrl = canvas.toDataURL('image/png')
      localStorage.setItem(`spriteSheetImage_${activeSheetKey}`, dataUrl)
      setImage(dataUrl)
      setPadding(prev => ({
        top: mode === 'add' ? (prev?.top || 0) + p.top : Math.max(0, (prev?.top || 0) - p.top),
        right: mode === 'add' ? (prev?.right || 0) + p.right : Math.max(0, (prev?.right || 0) - p.right),
        bottom: mode === 'add' ? (prev?.bottom || 0) + p.bottom : Math.max(0, (prev?.bottom || 0) - p.bottom),
        left: mode === 'add' ? (prev?.left || 0) + p.left : Math.max(0, (prev?.left || 0) - p.left),
      }))
      onClose()
    }
    img.src = image
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
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
                value={values[side]}
                onChange={(e) => setValues(prev => ({ ...prev, [side]: parseInt(e.target.value) || 0 }))}
                className="w-full px-2 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-1">Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full px-2 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            >
              <option value="add">Add</option>
              <option value="remove">Remove</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors text-white"
          >
            Apply
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
  )
}

export default PaddingModal
