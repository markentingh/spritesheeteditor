import { useState, useEffect, useRef } from 'react'
import Checkbox from '../forms/Checkbox'
import MenuDropdown from '../ui/MenuDropdown'
import PaddingModal from '../sheet-editor/PaddingModal'
import CropFramesModal from '../sheet-editor/CropFramesModal'
import RearrangeFramesModal from '../sheet-editor/RearrangeFramesModal'
import SpriteSheetSidebar from '../sheet-editor/SpriteSheetSidebar'
import { useSheetEditor } from '../../context/SheetEditorContext'

function SheetViewer() {
    const {
        activeIndex,
        spriteSheets,
        image, setImage,
        rows,
        columns,
        padding,
        setTitle,
        selectedFrames,
        sidebarWidth,
        previewSettings,
        pixelEditorSettings,
        spriteSize, setSpriteSize,
        resizeAlgo, setResizeAlgo,
        sheetZoom, setSheetZoom,
        sheetPanOffset, setSheetPanOffset,
        previewHeight,
        projectName, setProjectName,
        activeSheetKey,
        addSheet, removeSheet,
        loadProject, loadDemo, resetEditor,
        setSelectedFrameIndex, toggleFrame,
    } = useSheetEditor()

    const [isSheetPanning, setIsSheetPanning] = useState(false)
    const [sheetPanStart, setSheetPanStart] = useState({ x: 0, y: 0 })
    const [imageScale, setImageScale] = useState(1)
    const [showPaddingModal, setShowPaddingModal] = useState(false)
    const [showRearrangeFramesModal, setShowRearrangeFramesModal] = useState(false)
    const [showResizeModal, setShowResizeModal] = useState(false)
    const [showDeleteSheetModal, setShowDeleteSheetModal] = useState(false)
    const [showCropFramesModal, setShowCropFramesModal] = useState(false)
    const [showSaveAsDialog, setShowSaveAsDialog] = useState(false)
    const [saveAsFilename, setSaveAsFilename] = useState('project')
    const [showNewProjectModal, setShowNewProjectModal] = useState(false)
    const [showDemoModal, setShowDemoModal] = useState(false)
    const [pendingDeleteSheetIndex, setPendingDeleteSheetIndex] = useState(null)
    const [pendingResizeSize, setPendingResizeSize] = useState(null)
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [editTitle, setEditTitle] = useState('')

    const imgRef = useRef(null)
    const mainRef = useRef(null)
    const sheetDragRef = useRef({ dragged: false, startX: 0, startY: 0 })
    const loadInputRef = useRef(null)
    const imageInputRef = useRef(null)

    const imgCallbackRef = (el) => {
        imgRef.current = el
        if (!el) return
        const update = () => {
            if (el.naturalWidth) setImageScale(el.clientWidth / el.naturalWidth)
        }
        if (el.complete) { update() } else { el.addEventListener('load', update, { once: true }) }
    }

    const handleDragOver = (e) => {
        e.preventDefault()
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
    }

    const handleDrop = (e) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
            const reader = new FileReader()
            reader.onload = (event) => addSheet(event.target.result)
            reader.readAsDataURL(file)
        }
    }

    useEffect(() => {
        const updateScale = () => {
            if (imgRef.current && imgRef.current.naturalWidth) {
                setImageScale(imgRef.current.clientWidth / imgRef.current.naturalWidth)
            }
        }
        window.addEventListener('resize', updateScale)
        return () => window.removeEventListener('resize', updateScale)
    }, [])

    useEffect(() => {
        if (showSaveAsDialog) {
            setSaveAsFilename(projectName)
        }
    }, [showSaveAsDialog, projectName])

    const scaleFrame = (srcCtx, srcX, srcY, srcW, srcH, dstW, dstH, algo) => {
        const srcData = srcCtx.getImageData(srcX, srcY, srcW, srcH)
        const dst = new ImageData(dstW, dstH)
        const s = srcData.data
        const d = dst.data
        const xRatio = srcW / dstW
        const yRatio = srcH / dstH
        if (algo === 'nearest') {
            for (let y = 0; y < dstH; y++) {
                for (let x = 0; x < dstW; x++) {
                    const sx = Math.min(Math.floor(x * xRatio), srcW - 1)
                    const sy = Math.min(Math.floor(y * yRatio), srcH - 1)
                    const si = (sy * srcW + sx) * 4
                    const di = (y * dstW + x) * 4
                    d[di] = s[si]; d[di + 1] = s[si + 1]; d[di + 2] = s[si + 2]; d[di + 3] = s[si + 3]
                }
            }
        } else if (algo === 'bilinear') {
            for (let y = 0; y < dstH; y++) {
                for (let x = 0; x < dstW; x++) {
                    const gx = x * xRatio; const gy = y * yRatio
                    const x0 = Math.floor(gx); const y0 = Math.floor(gy)
                    const x1 = Math.min(x0 + 1, srcW - 1); const y1 = Math.min(y0 + 1, srcH - 1)
                    const fx = gx - x0; const fy = gy - y0
                    const di = (y * dstW + x) * 4
                    for (let c = 0; c < 4; c++) {
                        const tl = s[(y0 * srcW + x0) * 4 + c]
                        const tr = s[(y0 * srcW + x1) * 4 + c]
                        const bl = s[(y1 * srcW + x0) * 4 + c]
                        const br = s[(y1 * srcW + x1) * 4 + c]
                        d[di + c] = tl * (1 - fx) * (1 - fy) + tr * fx * (1 - fy) + bl * (1 - fx) * fy + br * fx * fy
                    }
                }
            }
        } else if (algo === 'bicubic') {
            const cubic = (t) => {
                const a = -0.5; const at = Math.abs(t)
                if (at <= 1) return (a + 2) * at * at * at - (a + 3) * at * at + 1
                if (at < 2) return a * at * at * at - 5 * a * at * at + 8 * a * at - 4 * a
                return 0
            }
            for (let y = 0; y < dstH; y++) {
                for (let x = 0; x < dstW; x++) {
                    const gx = x * xRatio; const gy = y * yRatio
                    const di = (y * dstW + x) * 4
                    for (let c = 0; c < 4; c++) {
                        let val = 0
                        for (let m = -1; m <= 2; m++) {
                            for (let n = -1; n <= 2; n++) {
                                const sx = Math.min(Math.max(Math.floor(gx) + n, 0), srcW - 1)
                                const sy = Math.min(Math.max(Math.floor(gy) + m, 0), srcH - 1)
                                val += s[(sy * srcW + sx) * 4 + c] * cubic(gx - (Math.floor(gx) + n)) * cubic(gy - (Math.floor(gy) + m))
                            }
                        }
                        d[di + c] = Math.min(255, Math.max(0, val))
                    }
                }
            }
        } else if (algo === 'hermite') {
            for (let y = 0; y < dstH; y++) {
                for (let x = 0; x < dstW; x++) {
                    const gx = x * xRatio; const gy = y * yRatio
                    const x0 = Math.floor(gx); const y0 = Math.floor(gy)
                    const x1 = Math.min(x0 + 1, srcW - 1); const y1 = Math.min(y0 + 1, srcH - 1)
                    const fx = gx - x0; const fy = gy - y0
                    const h1 = (t) => 2 * t * t * t - 3 * t * t + 1
                    const h2 = (t) => -2 * t * t * t + 3 * t * t
                    const di = (y * dstW + x) * 4
                    for (let c = 0; c < 4; c++) {
                        const tl = s[(y0 * srcW + x0) * 4 + c]
                        const tr = s[(y0 * srcW + x1) * 4 + c]
                        const bl = s[(y1 * srcW + x0) * 4 + c]
                        const br = s[(y1 * srcW + x1) * 4 + c]
                        const top = h1(1 - fx) * tl + h2(1 - fx) * tr
                        const bot = h1(1 - fx) * bl + h2(1 - fx) * br
                        d[di + c] = Math.min(255, Math.max(0, h1(1 - fy) * top + h2(1 - fy) * bot))
                    }
                }
            }
        } else if (algo === 'lanczos') {
            const a = 3
            const sinc = (x) => x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)
            const lanczosK = (x) => Math.abs(x) < a ? sinc(x) * sinc(x / a) : 0
            for (let y = 0; y < dstH; y++) {
                for (let x = 0; x < dstW; x++) {
                    const gx = x * xRatio; const gy = y * yRatio
                    const di = (y * dstW + x) * 4
                    for (let c = 0; c < 4; c++) {
                        let val = 0; let wSum = 0
                        for (let m = Math.floor(gy) - a + 1; m <= Math.floor(gy) + a; m++) {
                            for (let n = Math.floor(gx) - a + 1; n <= Math.floor(gx) + a; n++) {
                                const sx = Math.min(Math.max(n, 0), srcW - 1)
                                const sy = Math.min(Math.max(m, 0), srcH - 1)
                                const w = lanczosK(gx - n) * lanczosK(gy - m)
                                val += s[(sy * srcW + sx) * 4 + c] * w
                                wSum += w
                            }
                        }
                        d[di + c] = Math.min(255, Math.max(0, wSum ? val / wSum : 0))
                    }
                }
            }
        }
        return dst
    }

    const handleResize = (frameWidth, algo) => {
        const resizeSheet = (sheet) => new Promise((resolve) => {
            const originalKey = `spriteSheetImageOriginal_${sheet.key}`
            const currentKey = `spriteSheetImage_${sheet.key}`
            const srcDataUrl = localStorage.getItem(originalKey) || localStorage.getItem(currentKey)
            if (!srcDataUrl) return resolve(null)
            const img = new Image()
            img.onload = () => {
                const pad = { top: sheet.padding[0], right: sheet.padding[1], bottom: sheet.padding[2], left: sheet.padding[3] }
                const srcFrameW = Math.round((img.width - pad.left - pad.right) / sheet.columns)
                const srcFrameH = Math.round((img.height - pad.top - pad.bottom) / sheet.rows)
                const frameHeight = Math.round((frameWidth / srcFrameW) * srcFrameH)
                const newW = frameWidth * sheet.columns + pad.left + pad.right
                const newH = frameHeight * sheet.rows + pad.top + pad.bottom
                const srcCanvas = document.createElement('canvas')
                srcCanvas.width = img.width; srcCanvas.height = img.height
                const srcCtx = srcCanvas.getContext('2d')
                srcCtx.drawImage(img, 0, 0)
                const dstCanvas = document.createElement('canvas')
                dstCanvas.width = newW; dstCanvas.height = newH
                const dstCtx = dstCanvas.getContext('2d')
                for (let r = 0; r < sheet.rows; r++) {
                    for (let c = 0; c < sheet.columns; c++) {
                        const sx = pad.left + c * srcFrameW
                        const sy = pad.top + r * srcFrameH
                        const dx = pad.left + c * frameWidth
                        const dy = pad.top + r * frameHeight
                        const scaled = scaleFrame(srcCtx, sx, sy, srcFrameW, srcFrameH, frameWidth, frameHeight, algo)
                        dstCtx.putImageData(scaled, dx, dy)
                    }
                }
                const dataUrl = dstCanvas.toDataURL('image/png')
                if (!localStorage.getItem(originalKey)) {
                    localStorage.setItem(originalKey, srcDataUrl)
                }
                localStorage.setItem(currentKey, dataUrl)
                resolve({ key: sheet.key, dataUrl })
            }
            img.onerror = () => resolve(null)
            img.src = srcDataUrl
        })

        Promise.all(spriteSheets.map(resizeSheet)).then(results => {
            const activeResult = results.find(r => r?.key === activeSheetKey)
            if (activeResult) {
                setImage(activeResult.dataUrl)
            }
            setSpriteSize(frameWidth)
        })
    }

    const buildProject = () => {
        const images = {}
        for (const sheet of spriteSheets) {
            const img = localStorage.getItem(`spriteSheetImage_${sheet.key}`)
            if (img) images[sheet.key] = img
        }
        return {
            version: 1,
            activeIndex,
            spriteSheets,
            previewHeight,
            sidebarWidth,
            sheetZoom,
            sheetPanOffset,
            spriteSize,
            resizeAlgo,
            pixelEditor: pixelEditorSettings,
            images,
        }
    }

    const downloadProject = (filename) => {
        const project = buildProject()
        const blob = new Blob([JSON.stringify(project)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const handleConfirmSaveAs = () => {
        const base = saveAsFilename.trim().replace(/\.spritesheet$/i, '') || 'project'
        setProjectName(base)
        downloadProject(`${base}.spritesheet`)
        setShowSaveAsDialog(false)
    }

    const handleLoadProject = (file, filename) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const project = JSON.parse(e.target.result)
                loadProject(project, filename)
            } catch (err) {
                console.error('Failed to load project:', err)
                alert('Failed to load project. The file may be corrupted.')
            }
        }
        reader.readAsText(file)
    }

    const handleStartEditTitle = () => {
        const currentTitle = spriteSheets[activeIndex]?.title || ''
        setEditTitle(currentTitle)
        setIsEditingTitle(true)
    }

    const handleSaveTitle = () => {
        setTitle(editTitle.trim())
        setIsEditingTitle(false)
    }

    return (

        <>
            <input
                ref={loadInputRef}
                type="file"
                accept=".spritesheet"
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleLoadProject(file, file.name)
                    e.target.value = ''
                }}
                className="hidden"
            />

            <main
                ref={mainRef}
                className="flex-1 relative overflow-hidden bg-gray-950"
            >
                {(() => {
                    const SIZES = [16, 32, 48, 64, 96, 128, 256, 512]
                    const origW = imgRef.current?.naturalWidth || 0
                    const pad2 = padding || { top: 0, right: 0, bottom: 0, left: 0 }
                    const origFrameW = columns > 0 ? Math.round((origW - pad2.left - pad2.right) / columns) : 0
                    const activeSize = spriteSize ?? (origFrameW > 0 ? origFrameW : null)
                    const customDefault = origFrameW > 0 ? String(origFrameW) : ''
                    return (
                        <div className="absolute top-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800 px-4 py-2 flex items-center gap-1 z-30">
                            <MenuDropdown
                                label="File"
                                variant="pixel-editor"
                                items={[
                                    { label: 'New Project', onClick: () => setShowNewProjectModal(true) },
                                    { label: 'Load Project', onClick: () => loadInputRef.current?.click() },
                                    'separator',
                                    { label: 'Save As', onClick: () => setShowSaveAsDialog(true) },
                                    'separator',
                                    { label: 'View Demo', onClick: () => setShowDemoModal(true) },
                                ]}
                            />
                            {image && (
                                <>
                                    <MenuDropdown
                                        label="Sheets"
                                        variant="pixel-editor"
                                        items={[
                                            { label: 'Edit Padding', onClick: () => setShowPaddingModal(true) },
                                            { label: 'Rearrange Frames', onClick: () => setShowRearrangeFramesModal(true) },
                                            { label: 'Crop Frames', onClick: () => setShowCropFramesModal(true) },
                                        ]}
                                    />
                                    <span className="text-xs text-gray-500 mr-2 shrink-0">Frame px:</span>
                                    {SIZES.map(size => {
                                        const active = activeSize === size
                                        return (
                                            <button
                                                key={size}
                                                onClick={() => { setPendingResizeSize(size); setShowResizeModal(true) }}
                                                className={`px-2.5 py-1 border rounded text-xs font-medium transition-colors ${active
                                                        ? 'bg-purple-600 border-purple-500 text-white'
                                                        : 'bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white'
                                                    }`}
                                            >
                                                {size}
                                            </button>
                                        )
                                    })}
                                    <div className="flex items-center gap-1 ml-1">
                                        <input
                                            type="number"
                                            min="1"
                                            defaultValue={customDefault}
                                            placeholder="custom"
                                            className={`w-20 px-2 py-1 border rounded text-xs font-medium bg-gray-800 text-gray-300 focus:outline-none focus:border-purple-500 transition-colors ${activeSize !== null && !SIZES.includes(activeSize) ? 'border-purple-500 text-white' : 'border-gray-700'}
                                                }`}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const v = parseInt(e.target.value)
                                                    if (v > 0) { setPendingResizeSize(v); setShowResizeModal(true) }
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={(e) => {
                                                const input = e.currentTarget.previousSibling
                                                const v = parseInt(input.value)
                                                if (v > 0) { setPendingResizeSize(v); setShowResizeModal(true) }
                                            }}
                                            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded text-xs font-medium text-gray-300 hover:text-white transition-colors"
                                        >
                                            Go
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )
                })()}
                {image && (() => {
                    const nw = imgRef.current?.naturalWidth || 0
                    const nh = imgRef.current?.naturalHeight || 0
                    const pad = padding || { top: 0, right: 0, bottom: 0, left: 0 }
                    const frameW = columns > 0 ? Math.round((nw - pad.left - pad.right) / columns) : 0
                    const frameH = rows > 0 ? Math.round((nh - pad.top - pad.bottom) / rows) : 0
                    const totalFrames = rows * columns
                    const totalSelected = Object.values(selectedFrames).filter(Boolean).length
                    const sep = <span className="text-gray-700 select-none mx-1">|</span>
                    return (
                        <div className="absolute bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm border-t border-gray-800 px-4 py-1.5 flex items-center gap-2 text-xs text-gray-400 z-30 pointer-events-none">
                            <span>Sheet: <span className="text-gray-200">{nw} × {nh}px</span></span>
                            {sep}
                            <span>Frame: <span className="text-gray-200">{frameW} × {frameH}px</span></span>
                            {sep}
                            <span>Grid: <span className="text-gray-200">{columns}c × {rows}r</span></span>
                            {sep}
                            <span>Frames: <span className="text-gray-200">{totalFrames}</span></span>
                            {sep}
                            <span>Selected: <span className="text-gray-200">{totalSelected}</span></span>
                            <div className="ml-auto flex items-center gap-3 pointer-events-auto">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Zoom</span>
                                    <input
                                        type="range"
                                        min="10"
                                        max="400"
                                        value={sheetZoom}
                                        onChange={(e) => setSheetZoom(parseInt(e.target.value))}
                                        className="w-24 accent-purple-500"
                                    />
                                    <span className="text-gray-200 w-8 text-right">{sheetZoom}%</span>
                                </div>
                                <button
                                    onClick={() => { setSheetPanOffset({ x: 0, y: 0 }); setSheetZoom(100) }}
                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 hover:border-gray-500 transition-colors text-gray-300 hover:text-white"
                                    title="Reset pan and zoom"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Reset
                                </button>
                            </div>
                        </div>
                    )
                })()}
                <div
                    className="absolute inset-0"
                    onMouseDown={(e) => {
                        if (!image) return
                        sheetDragRef.current = { dragged: false, startX: e.clientX, startY: e.clientY }
                        setIsSheetPanning(true)
                        setSheetPanStart({ x: e.clientX - sheetPanOffset.x, y: e.clientY - sheetPanOffset.y })
                    }}
                    onMouseMove={(e) => {
                        if (!isSheetPanning) return
                        const dx = e.clientX - sheetDragRef.current.startX
                        const dy = e.clientY - sheetDragRef.current.startY
                        if (!sheetDragRef.current.dragged && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
                            sheetDragRef.current.dragged = true
                        }
                        setSheetPanOffset({ x: e.clientX - sheetPanStart.x, y: e.clientY - sheetPanStart.y })
                    }}
                    onMouseUp={() => setIsSheetPanning(false)}
                    onMouseLeave={() => setIsSheetPanning(false)}
                    onWheel={(e) => { if (!image) return; setSheetZoom(z => Math.min(400, Math.max(10, z - Math.sign(e.deltaY) * 10))) }}
                    style={{ cursor: image ? (isSheetPanning && sheetDragRef.current.dragged ? 'grabbing' : 'grab') : 'default' }}
                >
                    {!image ? (
                        <div className="absolute inset-0 flex items-center justify-center p-8">
                        <div
                            className={`w-full max-w-2xl h-96 border-[3px] rounded-xl flex flex-col 
                                items-center justify-center cursor-pointer transition-all duration-200 
                                border-gray-700 bg-gray-900/50 hover:border-purple-400 hover:bg-gray-900/70`}
                            style={{
                                borderStyle: 'dashed',
                                borderSpacing: '10px'
                            }}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => imageInputRef.current?.click()}
                        >
                            <div className="p-8 rounded-full bg-gray-800/50 mb-6">
                                <svg className="w-16 h-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <p className="text-xl text-gray-200 mb-2 font-medium">Drop sprite sheet here</p>
                            <p className="text-sm text-gray-400">or click to add (PNG or JPG)</p>
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/png,image/jpeg"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
                                        const reader = new FileReader()
                                        reader.onload = (event) => addSheet(event.target.result)
                                        reader.readAsDataURL(file)
                                    }
                                    e.target.value = ''
                                }}
                                className="hidden"
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        {image && (() => {
                            const nw = imgRef.current?.naturalWidth || 0
                            const nh = imgRef.current?.naturalHeight || 0
                            const pad = padding || { top: 0, right: 0, bottom: 0, left: 0 }
                            const frameW = columns > 0 ? Math.round((nw - pad.left - pad.right) / columns) : 0
                            const frameH = rows > 0 ? Math.round((nh - pad.top - pad.bottom) / rows) : 0
                            const totalFrames = rows * columns
                            const totalSelected = Object.values(selectedFrames).filter(Boolean).length
                            const sep = <span className="text-gray-700 select-none mx-1">|</span>
                            return (
                                <div className="absolute bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm border-t border-gray-800 px-4 py-1.5 flex items-center gap-2 text-xs text-gray-400 z-30 pointer-events-none">
                                    <span>Sheet: <span className="text-gray-200">{nw} × {nh}px</span></span>
                                    {sep}
                                    <span>Frame: <span className="text-gray-200">{frameW} × {frameH}px</span></span>
                                    {sep}
                                    <span>Grid: <span className="text-gray-200">{columns}c × {rows}r</span></span>
                                    {sep}
                                    <span>Frames: <span className="text-gray-200">{totalFrames}</span></span>
                                    {sep}
                                    <span>Selected: <span className="text-gray-200">{totalSelected}</span></span>
                                    <div className="ml-auto flex items-center gap-3 pointer-events-auto">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500">Zoom</span>
                                            <input
                                                type="range"
                                                min="10"
                                                max="400"
                                                value={sheetZoom}
                                                onChange={(e) => setSheetZoom(parseInt(e.target.value))}
                                                className="w-24 accent-purple-500"
                                            />
                                            <span className="text-gray-200 w-8 text-right">{sheetZoom}%</span>
                                        </div>
                                        <button
                                            onClick={() => { setSheetPanOffset({ x: 0, y: 0 }); setSheetZoom(100) }}
                                            className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 hover:border-gray-500 transition-colors text-gray-300 hover:text-white"
                                            title="Reset pan and zoom"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            )
                        })()}
                        <div
                            className="absolute"
                            style={{
                                left: '50%',
                                top: '50%',
                                transform: `translate(calc(-50% + ${sheetPanOffset.x}px), calc(-50% + ${sheetPanOffset.y}px)) scale(${sheetZoom / 100})`,
                                transformOrigin: 'center center',
                            }}
                        >
                            <div className="text-center mb-2 -mt-8">
                                <div className="inline-flex items-center gap-2 bg-gray-900/80 backdrop-blur-sm px-4 py-1.5 rounded-full border border-gray-800">
                                    {isEditingTitle ? (
                                        <>
                                            <input
                                                autoFocus
                                                type="text"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle() }}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                className="bg-transparent text-white text-sm font-medium focus:outline-none border-b border-purple-500 w-32"
                                            />
                                            <button onClick={handleSaveTitle} onMouseDown={(e) => e.stopPropagation()} className="text-green-400 hover:text-green-300">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-white text-sm font-medium">
                                                {spriteSheets[activeIndex]?.title || `Sheet ${activeIndex + 1}`}
                                            </span>
                                            <button onClick={handleStartEditTitle} onMouseDown={(e) => e.stopPropagation()} className="text-gray-400 hover:text-white">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div
                                className="relative inline-block overflow-hidden shadow-2xl border border-gray-800"
                                style={{
                                    backgroundImage: 'url(/checkerboard.png)',
                                    backgroundSize: '32px 32px'
                                }}
                            >
                                <img
                                    ref={imgCallbackRef}
                                    src={image}
                                    alt="Sprite sheet"
                                    className="block relative z-0"
                                    style={{ maxWidth: 'none', imageRendering: 'pixelated' }}
                                />
                                {(() => {
                                    const nw = imgRef.current?.naturalWidth || 1
                                    const nh = imgRef.current?.naturalHeight || 1
                                    const pl = (padding.left / nw) * 100
                                    const pr = (padding.right / nw) * 100
                                    const pt = (padding.top / nh) * 100
                                    const pb = (padding.bottom / nh) * 100
                                    const innerW = 100 - pl - pr
                                    const innerH = 100 - pt - pb
                                    return (
                                        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                                            {Array.from({ length: rows + 1 }).map((_, i) => {
                                                const y = pt + (i / rows) * innerH
                                                return <line key={`h-${i}`} x1={pl} y1={y} x2={100 - pr} y2={y} stroke="#ffffff" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="7,5" />
                                            })}
                                            {Array.from({ length: columns + 1 }).map((_, i) => {
                                                const x = pl + (i / columns) * innerW
                                                return <line key={`v-${i}`} x1={x} y1={pt} x2={x} y2={100 - pb} stroke="#ffffff" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="7,5" />
                                            })}
                                        </svg>
                                    )
                                })()}
                                <div
                                    className="absolute z-20"
                                    style={{
                                        top: `${padding.top * imageScale}px`,
                                        right: `${padding.right * imageScale}px`,
                                        bottom: `${padding.bottom * imageScale}px`,
                                        left: `${padding.left * imageScale}px`,
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(${columns}, 1fr)`,
                                        gridTemplateRows: `repeat(${rows}, 1fr)`,
                                    }}
                                >
                                    {(() => {
                                        let checkedCount = 0
                                        return Array.from({ length: rows * columns }).map((_, index) => {
                                            const checked = selectedFrames[index] || false
                                            if (checked) checkedCount++
                                            const frameNum = checkedCount
                                            return (
                                                <div
                                                    key={index}
                                                    className={`relative cursor-pointer transition-colors ${previewSettings.selectedFrameIndex === index ? 'ring-4 ring-purple-500 ring-inset' : ''
                                                        } ${checked ? 'hover:bg-purple-500/10' : 'bg-black/50 hover:bg-black/40'}`}
                                                    onMouseUp={() => {
                                                        if (!sheetDragRef.current.dragged) setSelectedFrameIndex(index)
                                                    }}
                                                >
                                                    <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
                                                        <Checkbox
                                                            checked={checked}
                                                            onChange={() => toggleFrame(index)}
                                                            size="md"
                                                        />
                                                    </div>
                                                    {checked && (
                                                        <div className="absolute bottom-1 right-1 text-white text-xs font-bold leading-none select-none pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                                                            {frameNum}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })
                                    })()}
                                </div>
                            </div>
                        </div>
                    </>
                )}
                </div>
            </main>

            <SpriteSheetSidebar />

            {showPaddingModal && (
                <PaddingModal onClose={() => setShowPaddingModal(false)} />
            )}

            {showRearrangeFramesModal && (
                <RearrangeFramesModal onClose={() => setShowRearrangeFramesModal(false)} />
            )}

            {showCropFramesModal && (
                <CropFramesModal
                    imgRef={imgRef}
                    rows={rows}
                    columns={columns}
                    padding={padding}
                    onClose={() => setShowCropFramesModal(false)}
                />
            )}

            {showResizeModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowResizeModal(false)}>
                    <div className="bg-gray-800 rounded-xl p-6 w-96 border border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-2">Resize Sprite Sheet</h3>
                        <p className="text-gray-400 text-sm mb-4">Resizing will regenerate every sprite sheet in the project at <span className="text-white font-medium">{pendingResizeSize}px</span> per frame. Any pixel edits you've made to any sprite sheet will be lost.</p>
                        <div className="mb-5">
                            <label className="block text-xs text-gray-400 mb-1.5">Scaling Algorithm</label>
                            <select
                                value={resizeAlgo}
                                onChange={(e) => setResizeAlgo(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                            >
                                <option value="nearest">Nearest Neighbor</option>
                                <option value="bilinear">Bilinear</option>
                                <option value="bicubic">Bicubic</option>
                                <option value="hermite">Hermite</option>
                                <option value="lanczos">Lanczos-3</option>
                            </select>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowResizeModal(false); handleResize(pendingResizeSize, resizeAlgo) }}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors text-white"
                            >
                                Resize
                            </button>
                            <button
                                onClick={() => setShowResizeModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteSheetModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowDeleteSheetModal(false)}>
                    <div className="bg-gray-800 rounded-xl p-6 w-96 border border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-2">Remove Sprite Sheet?</h3>
                        <p className="text-gray-400 text-sm mb-6">This cannot be undone. The sprite sheet and its settings will be permanently deleted.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { removeSheet(pendingDeleteSheetIndex); setPendingDeleteSheetIndex(null); setShowDeleteSheetModal(false) }}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors text-white"
                            >
                                Remove
                            </button>
                            <button
                                onClick={() => setShowDeleteSheetModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSaveAsDialog && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowSaveAsDialog(false)}>
                    <div className="bg-gray-800 rounded-xl p-6 w-96 border border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-2">Save Project As</h3>
                        <p className="text-gray-400 text-sm mb-4">Enter a filename for the project. The <span className="text-white font-medium">.spritesheet</span> extension will be added automatically.</p>
                        <input
                            type="text"
                            value={saveAsFilename}
                            onChange={(e) => setSaveAsFilename(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmSaveAs() }}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500 mb-5"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={handleConfirmSaveAs}
                                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors text-white"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setShowSaveAsDialog(false)}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showNewProjectModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowNewProjectModal(false)}>
                    <div className="bg-gray-800 rounded-xl p-6 w-96 border border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-2">New Project</h3>
                        <p className="text-gray-400 text-sm mb-6">This will remove your sprite sheets and reset all settings to their defaults. This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { resetEditor(); setShowNewProjectModal(false) }}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors text-white"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => setShowNewProjectModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDemoModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowDemoModal(false)}>
                    <div className="bg-gray-800 rounded-xl p-6 w-96 border border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-2">View Demo</h3>
                        <p className="text-gray-400 text-sm mb-6">This will replace your current sprite sheet and all settings with the demo. Your existing work will be lost.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { loadDemo(); setShowDemoModal(false) }}
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

        </>
    )
}

export default SheetViewer
