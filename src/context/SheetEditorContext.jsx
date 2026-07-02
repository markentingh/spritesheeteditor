import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const SheetEditorContext = createContext(null)

const createSheet = (key, overrides = {}) => ({
  key,
  title: '',
  rows: 4,
  columns: 4,
  padding: [0, 0, 0, 0],
  selectedFrames: {},
  preview: {
    fps: 10,
    zoom: 100,
    isAnimating: false,
    currentFrame: 0,
    selectedFrameIndex: null,
    panOffset: { x: 0, y: 0 },
    backgroundColor: { hex: '#2D304D', r: 45, g: 48, b: 77, a: 255, h: 234, s: 26, l: 24 },
    backgroundMode: 'color',
    backgroundImage: null,
  },
  ...overrides,
})

const defaultPixelEditor = {
  zoom: 100,
  panOffset: { x: 0, y: 0 },
  selection: null,
  width: 600,
  color: { hex: '#000000', r: 0, g: 0, b: 0, a: 255, h: 0, s: 0, l: 0 },
  pencilWidth: 1,
  pencilAntiAlias: false,
  pencilSpread: 7,
  eraserWidth: 1,
  eraserAlpha: 255,
  eraserAntiAlias: false,
  eraserSpread: 7,
  fillTolerance: 0,
  fillAntiAlias: false,
}

const defaults = {
  activeIndex: 0,
  spriteSheets: [],
  sidebarWidth: 320,
  sheetZoom: 100,
  sheetPanOffset: { x: 0, y: 0 },
  previewHeight: 350,
  spriteSize: null,
  resizeAlgo: 'nearest',
  pixelEditor: defaultPixelEditor,
}

const getInitialState = () => {
  try {
    const savedState = localStorage.getItem('spriteSheetEditorState')
    if (savedState) {
      const parsed = JSON.parse(savedState)
      if (parsed && parsed.spriteSheets) {
        return {
          ...defaults,
          ...parsed
        }
      }
    }
  } catch (error) {
    console.error('Error loading state from localStorage:', error)
  }
  return { ...defaults }
}

const getSheetImage = (key) => {
  try {
    return localStorage.getItem(`spriteSheetImage_${key}`) || null
  } catch (error) {
    console.error('Error loading image from localStorage:', error)
    return null
  }
}

export function SheetEditorProvider({ children }) {
  const initialState = getInitialState()
  const initialSheet = initialState.spriteSheets[initialState.activeIndex] || null
  const pad = initialSheet?.padding || [0, 0, 0, 0]

  const [activeIndex, setActiveIndex] = useState(initialState.activeIndex)
  const [spriteSheets, setSpriteSheets] = useState(initialState.spriteSheets)
  const [image, setImage] = useState(initialSheet ? getSheetImage(initialSheet.key) : null)
  const [rows, setRows] = useState(initialSheet?.rows ?? 4)
  const [columns, setColumns] = useState(initialSheet?.columns ?? 4)
  const [padding, setPadding] = useState({ top: pad[0], right: pad[1], bottom: pad[2], left: pad[3] })
  const [selectedFrames, setSelectedFrames] = useState(initialSheet?.selectedFrames ?? {})
  const [previewSettings, setPreviewSettings] = useState(initialSheet?.preview ?? createSheet('').preview)
  const [animFrame, setAnimFrame] = useState(initialSheet?.preview?.currentFrame ?? 0)
  const [pixelEditorSettings, setPixelEditorSettings] = useState(initialState.pixelEditor ?? defaultPixelEditor)
  const [spriteSize, setSpriteSize] = useState(initialState.spriteSize ?? null)
  const [resizeAlgo, setResizeAlgo] = useState(initialState.resizeAlgo ?? 'nearest')
  const [sheetZoom, setSheetZoom] = useState(initialState.sheetZoom ?? 100)
  const [sheetPanOffset, setSheetPanOffset] = useState(initialState.sheetPanOffset || { x: 0, y: 0 })
  const [previewHeight, setPreviewHeight] = useState(initialState.previewHeight ?? defaults.previewHeight)
  const [title, setTitle] = useState(initialState.title ?? 'Sheet 1')
  const [disableGlobalDragDrop, setDisableGlobalDragDrop] = useState(false)
  const [projectName, setProjectName] = useState(() => localStorage.getItem('spriteSheetEditorProjectName') || 'project')
  const [sidebarWidth, setSidebarWidth] = useState(initialState.sidebarWidth ?? defaults.sidebarWidth)

  const lastLoadedKey = useRef(null)
  const activeSheetKey = spriteSheets[activeIndex]?.key

  const addSheet = (dataUrl) => {
    const key = `sheet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    try {
      localStorage.setItem(`spriteSheetImage_${key}`, dataUrl)
    } catch (error) {
      console.error('Error saving image to localStorage:', error)
      return
    }
    const newSheet = createSheet(key)
    const frames = {}
    for (let i = 0; i < newSheet.rows * newSheet.columns; i++) frames[i] = true
    newSheet.selectedFrames = frames
    setActiveIndex(spriteSheets.length)
    setSpriteSheets(prev => [...prev, newSheet])
  }

  const removeSheet = (index) => {
    const key = spriteSheets[index]?.key
    const next = spriteSheets.filter((_, i) => i !== index)
    try {
      if (key) {
        localStorage.removeItem(`spriteSheetImage_${key}`)
        localStorage.removeItem(`spriteSheetImageOriginal_${key}`)
      }
    } catch (error) {}
    setSpriteSheets(next)
    if (next.length === 0) {
      setActiveIndex(0)
      setImage(null)
    } else {
      setActiveIndex(Math.min(activeIndex, next.length - 1))
    }
  }

  const updateSheetByKey = (key, updates) => {
    setSpriteSheets(prev => {
      const index = prev.findIndex(s => s.key === key)
      if (index === -1) return prev
      const sheet = prev[index]
      const nextSheet = typeof updates === 'function' ? updates(sheet) : { ...sheet, ...updates }
      if (JSON.stringify(sheet) === JSON.stringify(nextSheet)) return prev
      const next = [...prev]
      next[index] = nextSheet
      return next
    })
  }

  const setSelectedFrameIndex = (v) => setPreviewSettings(p => ({ ...p, selectedFrameIndex: v }))

  const toggleFrame = (index) => {
    setSelectedFrames(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const loadProject = useCallback((project, filename = 'project') => {
    if (!project || !Array.isArray(project.spriteSheets)) {
      throw new Error('Invalid project file')
    }
    const baseName = filename.replace(/\.spritesheet$/i, '') || 'project'
    setProjectName(baseName)
    if (project.images) {
      for (const [key, dataUrl] of Object.entries(project.images)) {
        try {
          localStorage.setItem(`spriteSheetImage_${key}`, dataUrl)
        } catch (error) {
          console.error('Error saving image to localStorage:', error)
        }
      }
    }
    const loadedPreviewHeight = project.previewHeight ?? previewHeight ?? defaults.previewHeight
    setPreviewHeight(loadedPreviewHeight)
    setSidebarWidth(project.sidebarWidth ?? defaults.sidebarWidth)
    setPixelEditorSettings(project.pixelEditor ?? defaultPixelEditor)
    setActiveIndex(project.activeIndex ?? 0)
    setSpriteSheets(project.spriteSheets)
    setSheetZoom(project.sheetZoom ?? 100)
    setSheetPanOffset(project.sheetPanOffset ?? { x: 0, y: 0 })
    setSpriteSize(project.spriteSize ?? null)
    setResizeAlgo(project.resizeAlgo ?? 'nearest')
  }, [previewHeight, setProjectName, setPreviewHeight, setSidebarWidth, setPixelEditorSettings, setActiveIndex, setSpriteSheets, setSheetZoom, setSheetPanOffset, setSpriteSize, setResizeAlgo])

  const loadDemo = useCallback(() => {
    fetch('/demo.spritesheet')
      .then(r => {
        if (!r.ok) throw new Error(`Failed to fetch demo project: ${r.status}`)
        return r.json()
      })
      .then(project => {
        loadProject(project, 'demo')
      })
      .catch(err => {
        console.error('Failed to load demo project:', err)
      })
  }, [loadProject])

  const resetEditor = () => {
    try {
      localStorage.clear()
      localStorage.setItem('spriteSheetEditorState', JSON.stringify({ ...defaults, spriteSheets: [] }))
    } catch (error) {
      console.error('Error resetting editor:', error)
    }
    lastLoadedKey.current = null
    setActiveIndex(0)
    setSpriteSheets([])
    setImage(null)
    setRows(4)
    setColumns(4)
    setPadding({ top: 0, right: 0, bottom: 0, left: 0 })
    setSelectedFrames({})
    setPreviewSettings(createSheet('').preview)
    setPixelEditorSettings(defaultPixelEditor)
    setSpriteSize(null)
    setResizeAlgo('nearest')
    setSheetZoom(100)
    setSheetPanOffset({ x: 0, y: 0 })
    setPreviewHeight(defaults.previewHeight)
    setTitle('Sheet 1')
    setProjectName('project')
    setSidebarWidth(defaults.sidebarWidth)
    setDisableGlobalDragDrop(false)
  }

  useEffect(() => {
    if (localStorage.getItem('spriteSheetEditorState')) return
    fetch('/demo.spritesheet')
      .then(r => {
        if (!r.ok) throw new Error(`Failed to fetch demo project: ${r.status}`)
        return r.json()
      })
      .then(project => {
        loadProject(project, 'demo')
      })
      .catch(err => {
        console.error('Failed to load demo project:', err)
      })
  }, [loadProject, spriteSheets.length])

  useEffect(() => {
    const sheet = spriteSheets[activeIndex]
    if (!sheet) return
    if (lastLoadedKey.current === sheet.key) return

    setRows(sheet.rows)
    setColumns(sheet.columns)
    setPadding({ top: sheet.padding[0], right: sheet.padding[1], bottom: sheet.padding[2], left: sheet.padding[3] })
    setSelectedFrames(sheet.selectedFrames)
    setPreviewSettings(sheet.preview)
    setTitle(sheet.title)

    const url = getSheetImage(sheet.key)
    if (!url) {
      lastLoadedKey.current = sheet.key
      setImage(null)
      return
    }

    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      lastLoadedKey.current = sheet.key
      setImage(url)
    }
    img.onerror = () => {
      if (cancelled) return
      lastLoadedKey.current = sheet.key
      setImage(url)
    }
    img.src = url

    return () => { cancelled = true }
  }, [activeIndex, spriteSheets])

  const animFrameRef = useRef(animFrame)
  useEffect(() => { animFrameRef.current = animFrame }, [animFrame])

  // When pausing, commit the live animFrame back into previewSettings.currentFrame
  const prevIsAnimating = useRef(previewSettings?.isAnimating ?? false)
  useEffect(() => {
    const wasAnimating = prevIsAnimating.current
    const isNowAnimating = previewSettings?.isAnimating ?? false
    prevIsAnimating.current = isNowAnimating
    if (wasAnimating && !isNowAnimating) {
      setPreviewSettings(prev => ({ ...prev, currentFrame: animFrameRef.current }))
    }
  }, [previewSettings?.isAnimating])

  useEffect(() => {
    if (!previewSettings?.isAnimating) return
    const fps = previewSettings?.fps || 10
    const activeFrames = Object.entries(selectedFrames || {})
      .filter(([, isSelected]) => isSelected)
      .map(([index]) => parseInt(index))
      .sort((a, b) => a - b)

    if (activeFrames.length === 0) return

    const interval = setInterval(() => {
      const currentIndex = activeFrames.indexOf(animFrameRef.current)
      const nextIndex = (currentIndex + 1) % activeFrames.length
      const nextFrame = activeFrames[nextIndex]
      animFrameRef.current = nextFrame
      setAnimFrame(nextFrame)
    }, 1000 / fps)

    return () => clearInterval(interval)
  }, [previewSettings?.isAnimating, previewSettings?.fps, selectedFrames])

  useEffect(() => {
    if (lastLoadedKey.current !== activeSheetKey) return
    setSpriteSheets(prev => {
      const sheet = prev[activeIndex]
      if (!sheet) return prev
      const nextSheet = {
        ...sheet,
        title,
        rows,
        columns,
        padding: [padding.top, padding.right, padding.bottom, padding.left],
        selectedFrames,
        preview: previewSettings,
      }
      if (JSON.stringify(sheet) === JSON.stringify(nextSheet)) return prev
      const next = [...prev]
      next[activeIndex] = nextSheet
      return next
    })
  }, [activeIndex, rows, columns, padding, selectedFrames, previewSettings, title, activeSheetKey])

  useEffect(() => {
    try {
      localStorage.setItem('spriteSheetEditorState', JSON.stringify({
        activeIndex,
        spriteSheets,
        sheetZoom,
        sheetPanOffset,
        previewHeight,
        sidebarWidth,
        spriteSize,
        resizeAlgo,
        pixelEditor: pixelEditorSettings,
      }))
    } catch (error) {
      console.error('Error saving state to localStorage:', error)
    }
  }, [activeIndex, spriteSheets, sheetZoom, sheetPanOffset, previewHeight, sidebarWidth, spriteSize, resizeAlgo, pixelEditorSettings])

  useEffect(() => {
    if (!activeSheetKey) return
    try {
      if (image) {
        localStorage.setItem(`spriteSheetImage_${activeSheetKey}`, image)
      } else {
        localStorage.removeItem(`spriteSheetImage_${activeSheetKey}`)
      }
    } catch (error) {
      console.error('Error saving image to localStorage:', error)
    }
  }, [activeSheetKey, image])

  useEffect(() => {
    try {
      localStorage.setItem('spriteSheetEditorProjectName', projectName)
    } catch (error) {
      console.error('Error saving project name to localStorage:', error)
    }
  }, [projectName])

  const value = {
    activeIndex, setActiveIndex,
    spriteSheets, setSpriteSheets,
    image, setImage,
    rows, setRows,
    columns, setColumns,
    padding, setPadding,
    title, setTitle,
    selectedFrames, setSelectedFrames,
    previewSettings, setPreviewSettings,
    animFrame, setAnimFrame,
    pixelEditorSettings, setPixelEditorSettings,
    spriteSize, setSpriteSize,
    resizeAlgo, setResizeAlgo,
    sheetZoom, setSheetZoom,
    sheetPanOffset, setSheetPanOffset,
    previewHeight, setPreviewHeight,
    sidebarWidth, setSidebarWidth,
    disableGlobalDragDrop, setDisableGlobalDragDrop,
    projectName, setProjectName,
    activeSheetKey,
    addSheet, removeSheet, updateSheetByKey,
    loadProject, loadDemo, resetEditor,
    setSelectedFrameIndex, toggleFrame,
  }

  return <SheetEditorContext.Provider value={value}>{children}</SheetEditorContext.Provider>
}

export const useSheetEditor = () => {
  const context = useContext(SheetEditorContext)
  if (!context) {
    throw new Error('useSheetEditor must be used within a SheetEditorProvider')
  }
  return context
}