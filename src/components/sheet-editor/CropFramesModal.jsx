import { useState } from 'react'
import { useSheetEditor } from '../../context/SheetEditorContext'

const ALIGNMENTS = [
    ['top-left',    'top',    'top-right'],
    ['left',        'center', 'right'],
    ['bottom-left', 'bottom', 'bottom-right'],
]

function AlignDot({ align }) {
    const col = align.includes('left') ? 0 : align.includes('right') ? 2 : 1
    const row = align.includes('top') ? 0 : align.includes('bottom') ? 2 : 1
    return (
        <div className="w-8 h-8 flex items-center justify-center">
            <div className="w-6 h-6 grid grid-cols-3 grid-rows-3 gap-px">
                {Array.from({ length: 9 }).map((_, i) => {
                    const r = Math.floor(i / 3)
                    const c = i % 3
                    const active = r === row && c === col
                    return (
                        <div key={i} className={`rounded-sm ${active ? 'bg-white' : 'bg-transparent'}`} />
                    )
                })}
            </div>
        </div>
    )
}

function LockIcon({ locked }) {
    return locked ? (
        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth="2" />
            <path d="M8 11V7a4 4 0 118 0v4" strokeWidth="2" />
        </svg>
    ) : (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth="2" />
            <path d="M8 11V7a4 4 0 118 0" strokeWidth="2" strokeLinecap="round" />
            <path d="M16 11V9" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

function CropFramesModal({ imgRef, rows, columns, padding, onClose }) {
    const { spriteSheets, activeSheetKey, setImage } = useSheetEditor()

    const nw = imgRef.current?.naturalWidth || 0
    const nh = imgRef.current?.naturalHeight || 0
    const pad = padding || { top: 0, right: 0, bottom: 0, left: 0 }
    const frameW = columns > 0 ? Math.round((nw - pad.left - pad.right) / columns) : 1
    const frameH = rows > 0 ? Math.round((nh - pad.top - pad.bottom) / rows) : 1

    const [unit, setUnit] = useState('Pixels')
    const [width, setWidth] = useState(String(frameW))
    const [height, setHeight] = useState(String(frameH))
    const [aspectLocked, setAspectLocked] = useState(true)
    const [alignment, setAlignment] = useState('center')

    const aspectRatio = frameW / frameH

    const parseVal = (v) => {
        const n = parseFloat(v)
        return isNaN(n) || n <= 0 ? null : n
    }

    const toPixels = (v) => {
        const n = parseVal(v)
        if (n === null) return null
        return unit === 'Percent' ? n / 100 : n
    }

    const handleWidthChange = (v) => {
        setWidth(v)
        if (aspectLocked) {
            const n = parseVal(v)
            if (n !== null) {
                if (unit === 'Percent') {
                    setHeight(String(Math.round(n)))
                } else {
                    setHeight(String(Math.round(n / aspectRatio)))
                }
            }
        }
    }

    const handleHeightChange = (v) => {
        setHeight(v)
        if (aspectLocked) {
            const n = parseVal(v)
            if (n !== null) {
                if (unit === 'Percent') {
                    setWidth(String(Math.round(n)))
                } else {
                    setWidth(String(Math.round(n * aspectRatio)))
                }
            }
        }
    }

    const handleUnitChange = (newUnit) => {
        if (newUnit === unit) return
        if (newUnit === 'Percent') {
            const pw = parseVal(width)
            const ph = parseVal(height)
            setWidth(pw !== null ? String(Math.round((pw / frameW) * 100)) : '100')
            setHeight(ph !== null ? String(Math.round((ph / frameH) * 100)) : '100')
        } else {
            const pw = parseVal(width)
            const ph = parseVal(height)
            setWidth(pw !== null ? String(Math.round((pw / 100) * frameW)) : String(frameW))
            setHeight(ph !== null ? String(Math.round((ph / 100) * frameH)) : String(frameH))
        }
        setUnit(newUnit)
    }

    const getPixelDimensions = () => {
        if (unit === 'Pixels') {
            return { w: Math.round(parseVal(width) || frameW), h: Math.round(parseVal(height) || frameH) }
        } else {
            return {
                w: Math.round(((parseVal(width) || 100) / 100) * frameW),
                h: Math.round(((parseVal(height) || 100) / 100) * frameH),
            }
        }
    }

    const handleApply = () => {
        const { w: newFrameW, h: newFrameH } = getPixelDimensions()

        const cropSheet = (sheet) => new Promise((resolve) => {
            const currentKey = `spriteSheetImage_${sheet.key}`
            const originalKey = `spriteSheetImageOriginal_${sheet.key}`
            const srcDataUrl = localStorage.getItem(currentKey)
            if (!srcDataUrl) return resolve(null)
            const img = new Image()
            img.onload = () => {
                const p = { top: sheet.padding[0], right: sheet.padding[1], bottom: sheet.padding[2], left: sheet.padding[3] }
                const srcFrameW = Math.round((img.width - p.left - p.right) / sheet.columns)
                const srcFrameH = Math.round((img.height - p.top - p.bottom) / sheet.rows)
                const newW = newFrameW * sheet.columns + p.left + p.right
                const newH = newFrameH * sheet.rows + p.top + p.bottom
                const srcCanvas = document.createElement('canvas')
                srcCanvas.width = img.width; srcCanvas.height = img.height
                const srcCtx = srcCanvas.getContext('2d')
                srcCtx.drawImage(img, 0, 0)
                const dstCanvas = document.createElement('canvas')
                dstCanvas.width = newW; dstCanvas.height = newH
                const dstCtx = dstCanvas.getContext('2d')
                dstCtx.clearRect(0, 0, newW, newH)
                for (let r = 0; r < sheet.rows; r++) {
                    for (let c = 0; c < sheet.columns; c++) {
                        const srcX = p.left + c * srcFrameW
                        const srcY = p.top + r * srcFrameH
                        const dstX = p.left + c * newFrameW
                        const dstY = p.top + r * newFrameH
                        const halign = alignment.includes('left') ? 'left' : alignment.includes('right') ? 'right' : 'center'
                        const valign = alignment.includes('top') ? 'top' : alignment.includes('bottom') ? 'bottom' : 'center'
                        let offX = 0
                        if (halign === 'center') offX = Math.round((newFrameW - srcFrameW) / 2)
                        else if (halign === 'right') offX = newFrameW - srcFrameW
                        let offY = 0
                        if (valign === 'center') offY = Math.round((newFrameH - srcFrameH) / 2)
                        else if (valign === 'bottom') offY = newFrameH - srcFrameH
                        const frameData = srcCtx.getImageData(srcX, srcY, srcFrameW, srcFrameH)
                        const tmpCanvas = document.createElement('canvas')
                        tmpCanvas.width = newFrameW; tmpCanvas.height = newFrameH
                        const tmpCtx = tmpCanvas.getContext('2d')
                        tmpCtx.putImageData(frameData, offX, offY)
                        dstCtx.putImageData(tmpCtx.getImageData(0, 0, newFrameW, newFrameH), dstX, dstY)
                    }
                }
                const dataUrl = dstCanvas.toDataURL('image/png')
                if (!localStorage.getItem(originalKey)) localStorage.setItem(originalKey, srcDataUrl)
                localStorage.setItem(currentKey, dataUrl)
                resolve({ key: sheet.key, dataUrl })
            }
            img.onerror = () => resolve(null)
            img.src = srcDataUrl
        })

        Promise.all(spriteSheets.map(cropSheet)).then(results => {
            const activeResult = results.find(r => r?.key === activeSheetKey)
            if (activeResult) setImage(activeResult.dataUrl)
            onClose()
        })
    }

    const { w: previewW, h: previewH } = getPixelDimensions()
    const willLoseData = previewW < frameW || previewH < frameH

    const inputClass = "w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl p-6 w-[380px] border border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-white mb-4">Crop Frames</h3>

                {/* Unit selector */}
                <div className="flex gap-2 mb-5">
                    {['Pixels', 'Percent'].map(u => (
                        <button
                            key={u}
                            onClick={() => handleUnitChange(u)}
                            className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors font-medium ${unit === u ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}
                        >
                            {u}
                        </button>
                    ))}
                </div>

                {/* Width / Height inputs with lock */}
                <div className="flex items-stretch gap-2 mb-5">
                    <div className="flex-1 flex flex-col gap-2">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Width {unit === 'Percent' ? '(%)' : '(px)'}</label>
                            <input
                                type="number"
                                min="1"
                                value={width}
                                onChange={(e) => handleWidthChange(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Height {unit === 'Percent' ? '(%)' : '(px)'}</label>
                            <input
                                type="number"
                                min="1"
                                value={height}
                                onChange={(e) => handleHeightChange(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-center pb-0.5">
                        <button
                            onClick={() => setAspectLocked(l => !l)}
                            className={`p-2 rounded-lg border transition-colors ${aspectLocked ? 'bg-purple-600/20 border-purple-500/50 hover:bg-purple-600/30' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
                            title={aspectLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                        >
                            <LockIcon locked={aspectLocked} />
                        </button>
                    </div>
                </div>

                {unit === 'Percent' && (
                    <p className="text-xs text-gray-500 -mt-3 mb-4">→ {previewW} × {previewH} px</p>
                )}

                {/* Alignment grid */}
                <div className="mb-5">
                    <label className="block text-xs text-gray-400 mb-2">Alignment</label>
                    <div className="grid grid-cols-3 gap-1.5 w-fit">
                        {ALIGNMENTS.map((row, ri) =>
                            row.map((align, ci) => (
                                <button
                                    key={align}
                                    onClick={() => setAlignment(align)}
                                    title={align.replace('-', ' ')}
                                    className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-colors ${alignment === align ? 'bg-purple-600 border-purple-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
                                >
                                    <AlignDot align={align} />
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Warning */}
                {willLoseData && (
                    <div className="mb-4 p-3 bg-yellow-900/40 border border-yellow-600/50 rounded-lg text-xs text-yellow-300">
                        Cropping to a smaller size will permanently remove pixels from every frame across all sprite sheets.
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={handleApply}
                        className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors text-white"
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

export default CropFramesModal
