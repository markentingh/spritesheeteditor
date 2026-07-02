import { useState, useEffect, useRef, useCallback } from 'react'
import { useSheetEditor } from '../../context/SheetEditorContext'

const LS_KEY = 'references'

export function loadReferences() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveReferences(refs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(refs))
  } catch {}
}

export function addReference(ref) {
  const refs = loadReferences()
  const next = [...refs, ref]
  saveReferences(next)
  return next
}

function extractFrameDataUrl(spriteSheetKey, frameIndex, rows, columns) {
  return new Promise((resolve) => {
    const src = localStorage.getItem(`spriteSheetImage_${spriteSheetKey}`)
    if (!src) return resolve(null)
    const img = new Image()
    img.onload = () => {
      const fW = Math.floor(img.width / columns)
      const fH = Math.floor(img.height / rows)
      const col = frameIndex % columns
      const row = Math.floor(frameIndex / columns)
      const c = document.createElement('canvas')
      c.width = fW; c.height = fH
      c.getContext('2d').drawImage(img, col * fW, row * fH, fW, fH, 0, 0, fW, fH)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function SingleReferenceWindow({ refData, onClose }) {
  const { x, y, w, h, spriteSheet, index, rows, columns, id } = refData
  const { spriteSheets } = useSheetEditor()
  const sheetTitle = spriteSheets?.find(s => s.key === spriteSheet)?.title || ''
  const [pos, setPos] = useState({ x, y })
  const [size, setSize] = useState({ w, h })
  const [imgZoom, setImgZoom] = useState(refData.imgZoom ?? 1)
  const [imgPan, setImgPan] = useState(refData.imgPan ?? { x: 0, y: 0 })
  const [imgSrc, setImgSrc] = useState(null)
  const dragRef = useRef(null)
  const resizeRef = useRef(null)
  const imgPanRef = useRef(null)

  useEffect(() => {
    extractFrameDataUrl(spriteSheet, index, rows, columns).then(setImgSrc)
  }, [spriteSheet, index, rows, columns])

  // Persist all state changes to localStorage
  const persist = useCallback((newPos, newSize, newImgZoom, newImgPan) => {
    const refs = loadReferences()
    const next = refs.map(r => r.id === id ? {
      ...r,
      x: newPos.x, y: newPos.y,
      w: newSize.w, h: newSize.h,
      imgZoom: newImgZoom,
      imgPan: newImgPan,
    } : r)
    saveReferences(next)
  }, [id])

  // Title bar drag
  const onTitleMouseDown = (e) => {
    e.preventDefault()
    const startX = e.clientX - pos.x
    const startY = e.clientY - pos.y
    dragRef.current = { startX, startY }

    const onMove = (me) => {
      if (!dragRef.current) return
      const newPos = { x: me.clientX - dragRef.current.startX, y: me.clientY - dragRef.current.startY }
      setPos(newPos)
    }
    const onUp = (me) => {
      const newPos = { x: me.clientX - dragRef.current.startX, y: me.clientY - dragRef.current.startY }
      dragRef.current = null
      setPos(newPos)
      persist(newPos, size, imgZoom, imgPan)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Bottom-right resize
  const onResizeMouseDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const startW = size.w
    const startH = size.h
    resizeRef.current = true

    const onMove = (me) => {
      if (!resizeRef.current) return
      const newSize = {
        w: Math.max(120, startW + (me.clientX - startX)),
        h: Math.max(80, startH + (me.clientY - startY)),
      }
      setSize(newSize)
    }
    const onUp = (me) => {
      const newSize = {
        w: Math.max(120, startW + (me.clientX - startX)),
        h: Math.max(80, startH + (me.clientY - startY)),
      }
      resizeRef.current = null
      setSize(newSize)
      persist(pos, newSize, imgZoom, imgPan)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        background: '#111827',
        border: '1px solid #374151',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        minWidth: 120,
        minHeight: 80,
        userSelect: 'none',
      }}
    >
      {/* Title bar */}
      <div
        onMouseDown={onTitleMouseDown}
        style={{
          background: '#1f2937',
          borderBottom: '1px solid #374151',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'grab',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>
          Reference · Frame {index + 1} · {sheetTitle || spriteSheet}
        </span>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            padding: '1px 4px',
            fontSize: 14,
            lineHeight: 1,
            borderRadius: 4,
          }}
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Image area */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          backgroundImage: 'repeating-conic-gradient(#1f2937 0% 25%, #111827 0% 50%)',
          backgroundSize: '16px 16px',
          position: 'relative',
          cursor: imgPanRef.current ? 'grabbing' : 'grab',
        }}
        onWheel={(e) => {
          e.preventDefault()
          const next = Math.min(32, Math.max(0.25, imgZoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))
          setImgZoom(next)
          persist(pos, size, next, imgPan)
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          const startX = e.clientX - imgPan.x
          const startY = e.clientY - imgPan.y
          imgPanRef.current = { startX, startY }
          const onMove = (me) => {
            if (!imgPanRef.current) return
            const np = { x: me.clientX - imgPanRef.current.startX, y: me.clientY - imgPanRef.current.startY }
            setImgPan(np)
          }
          const onUp = (me) => {
            const np = { x: me.clientX - imgPanRef.current.startX, y: me.clientY - imgPanRef.current.startY }
            imgPanRef.current = null
            setImgPan(np)
            persist(pos, size, imgZoom, np)
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
          }
          window.addEventListener('mousemove', onMove)
          window.addEventListener('mouseup', onUp)
        }}
        onDoubleClick={() => { setImgZoom(1); setImgPan({ x: 0, y: 0 }); persist(pos, size, 1, { x: 0, y: 0 }) }}
      >
        {imgSrc
          ? <img
              src={imgSrc}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(calc(-50% + ${imgPan.x}px), calc(-50% + ${imgPan.y}px)) scale(${imgZoom})`,
                transformOrigin: 'center center',
                imageRendering: 'pixelated',
                maxWidth: 'none',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
              alt="reference"
            />
          : <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#4b5563', fontSize: 11 }}>No image</span>
        }
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={onResizeMouseDown}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 14,
          height: 14,
          cursor: 'nwse-resize',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: 2,
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M7 1L1 7M7 4L4 7M7 7" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

export function ReferenceManager() {
  const [refs, setRefs] = useState(() => loadReferences())

  // Listen for storage changes from PixelEditor adding a new reference
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS_KEY) {
        setRefs(loadReferences())
      }
    }
    window.addEventListener('storage', onStorage)
    // Also listen to a custom event for same-tab updates
    const onRefAdded = () => setRefs(loadReferences())
    window.addEventListener('reference-added', onRefAdded)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('reference-added', onRefAdded)
    }
  }, [])

  const handleClose = (id) => {
    const next = refs.filter(r => r.id !== id)
    saveReferences(next)
    setRefs(next)
  }

  return (
    <>
      {refs.map(r => (
        <SingleReferenceWindow
          key={r.id}
          refData={r}
          onClose={() => handleClose(r.id)}
        />
      ))}
    </>
  )
}
