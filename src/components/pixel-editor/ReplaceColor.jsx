import { useState, useEffect, useRef } from 'react'

function ReplaceColor({ onClose, onApply, onApplyToSheet, onSaveSheet, canvasRef,  onPickingChange }) {
  const [replaceColorSettings, setReplaceColorSettings] = useState({
    sourceColors: [],
    targetHue: 0,
    targetSaturation: 50,
    targetLightness: 50,
    targetAlpha: 255,
    fuzziness: 1
  })
  const [isPickingColor, setIsPickingColor] = useState(false)
  const [replacingColorIndex, setReplacingColorIndex] = useState(null)
  const [hoverColor, setHoverColor] = useState(null)
  const [cursorPos, setCursorPos] = useState(null)
  const [maskPreview, setMaskPreview] = useState(null)
  const [originalImageData, setOriginalImageData] = useState(null)
  const [applyToSheet, setApplyToSheet] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const modalRef = useRef(null)

  // Save original canvas state on mount
  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setOriginalImageData(imageData)
  }, [])

  useEffect(() => {
    if (!isPickingColor) return

    const handleMouseMove = (e) => {
      if (!canvasRef.current) return
      
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      
      // Check if mouse is over the canvas
      const isOverCanvas = e.clientX >= rect.left && e.clientX <= rect.right &&
                          e.clientY >= rect.top && e.clientY <= rect.bottom
      
      if (!isOverCanvas) {
        setHoverColor(null)
        setCursorPos(null)
        return
      }
      
      const x = Math.floor((e.clientX - rect.left) / (rect.width / canvas.width))
      const y = Math.floor((e.clientY - rect.top) / (rect.height / canvas.height))
      
      if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
        const ctx = canvas.getContext('2d')
        const pixel = ctx.getImageData(x, y, 1, 1).data
        setHoverColor({ r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] })
        setCursorPos({ x: e.clientX, y: e.clientY })
      }
    }

    const handleClick = (e) => {
      if (!canvasRef.current) return
      
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const x = Math.floor((e.clientX - rect.left) / (rect.width / canvas.width))
      const y = Math.floor((e.clientY - rect.top) / (rect.height / canvas.height))
      
      if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
        const ctx = canvas.getContext('2d')
        const pixel = ctx.getImageData(x, y, 1, 1).data
        const newColor = {
          r: pixel[0],
          g: pixel[1],
          b: pixel[2],
          a: pixel[3]
        }
        
        // Calculate hue from picked color
        const r = pixel[0] / 255
        const g = pixel[1] / 255
        const b = pixel[2] / 255
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        let h = 0
        
        if (max !== min) {
          const d = max - min
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
            case g: h = ((b - r) / d + 2) / 6; break
            case b: h = ((r - g) / d + 4) / 6; break
          }
        }
        
        setReplaceColorSettings(prev => {
          if (replacingColorIndex !== null) {
            // Replace existing color at index
            const newColors = [...prev.sourceColors]
            newColors[replacingColorIndex] = newColor
            return {
              ...prev,
              sourceColors: newColors,
            }
          } else {
            // Add new color - only set targetHue for the first color picked
            const isFirst = prev.sourceColors.length === 0
            return {
              ...prev,
              sourceColors: prev.sourceColors.length < 6 ? [...prev.sourceColors, newColor] : prev.sourceColors,
              ...(isFirst && { targetHue: Math.round(h * 360) })
            }
          }
        })
        setIsPickingColor(false)
        setReplacingColorIndex(null)
        setHoverColor(null)
        setCursorPos(null)
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsPickingColor(false)
        setReplacingColorIndex(null)
        setHoverColor(null)
        setCursorPos(null)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPickingColor, canvasRef])
  
  // Add crosshair cursor style when picking - override all other cursors
  useEffect(() => {
    if (isPickingColor) {
      // Add a style tag to override all cursor styles with maximum specificity
      const style = document.createElement('style')
      style.id = 'replace-color-cursor-override'
      style.textContent = `
        *, *::before, *::after, 
        body, html, 
        canvas, div, button, 
        [style*="cursor"] {
          cursor: crosshair !important;
        }
      `
      document.head.appendChild(style)
      document.body.style.setProperty('cursor', 'crosshair', 'important')
    } else {
      document.body.style.cursor = ''
      const style = document.getElementById('replace-color-cursor-override')
      if (style) {
        style.remove()
      }
    }
    
    return () => {
      document.body.style.cursor = ''
      const style = document.getElementById('replace-color-cursor-override')
      if (style) {
        style.remove()
      }
    }
  }, [isPickingColor])

  const handlePickColor = () => {
    setIsPickingColor(true)
    if (onPickingChange) onPickingChange(true)
  }

  const handleApply = () => {
    applyToCanvas()
    if (applyToSheet) {
      setShowConfirm(true)
    } else {
      if (onApply) onApply()
      onClose()
    }
  }

  // Always called to apply HSL changes to the pixel editor canvas
  // (used by both single-frame and whole-sheet apply)
  const applyToCanvas = () => {
    if (!canvasRef.current || !originalImageData) return
    if (replaceColorSettings.sourceColors.length === 0) return

    const { sourceColors, targetHue, targetSaturation, targetLightness, targetAlpha, fuzziness } = replaceColorSettings
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const originalData = originalImageData.data

    const copyCanvas = document.createElement('canvas')
    copyCanvas.width = canvas.width
    copyCanvas.height = canvas.height
    const copyCtx = copyCanvas.getContext('2d')
    copyCtx.putImageData(originalImageData, 0, 0)
    const copyImageData = copyCtx.getImageData(0, 0, canvas.width, canvas.height)
    const copyData = copyImageData.data

    const rgbToHsl = (r, g, b) => {
      r /= 255; g /= 255; b /= 255
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      let h, s, l = (max + min) / 2
      if (max === min) { h = s = 0 } else {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
          case g: h = ((b - r) / d + 2) / 6; break
          case b: h = ((r - g) / d + 4) / 6; break
        }
      }
      return { h: h * 360, s: s * 100, l: l * 100 }
    }

    const hslToRgb = (h, s, l) => {
      h /= 360; s /= 100; l /= 100
      let r, g, b
      if (s === 0) { r = g = b = l } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1; if (t > 1) t -= 1
          if (t < 1/6) return p + (q - p) * 6 * t
          if (t < 1/2) return q
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
          return p
        }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s
        const p = 2 * l - q
        r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3)
      }
      return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
    }

    for (let i = 0; i < originalData.length; i += 4) {
      const r = originalData[i], g = originalData[i + 1], b = originalData[i + 2], a = originalData[i + 3]
      let matchPercent = 0
      for (const sourceColor of sourceColors) {
        const dr = r - sourceColor.r, dg = g - sourceColor.g
        const db = b - sourceColor.b, da = a - sourceColor.a
        const distance = Math.sqrt(dr * dr + dg * dg + db * db + da * da)
        if (distance <= fuzziness) matchPercent = Math.max(matchPercent, 1 - (distance / fuzziness))
      }
      if (matchPercent > 0) {
        const hsl = rgbToHsl(r, g, b)
        const fullS = Math.max(0, Math.min(100, hsl.s + (targetSaturation - 50) * 2))
        const fullL = Math.max(0, Math.min(100, hsl.l + (targetLightness - 50) * 2))
        const rgb = hslToRgb(targetHue, fullS, fullL)
        // Blend fully-transformed color against original by matchPercent
        copyData[i]     = Math.round(r + (rgb.r - r) * matchPercent)
        copyData[i + 1] = Math.round(g + (rgb.g - g) * matchPercent)
        copyData[i + 2] = Math.round(b + (rgb.b - b) * matchPercent)
        copyData[i + 3] = Math.round(a + (targetAlpha - a) * matchPercent)
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    copyCtx.putImageData(copyImageData, 0, 0)
    ctx.drawImage(copyCanvas, 0, 0)
  }

  const applyToEntireSheet = () => {
    if (!onApplyToSheet) return
    
    const { sourceColors, targetHue, targetSaturation, targetLightness, targetAlpha, fuzziness } = replaceColorSettings
    if (sourceColors.length === 0) return

    // Ask PixelEditor to composite the current frame and give us the fresh sheet
    onApplyToSheet((freshSheetData) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
      
      const rgbToHsl = (r, g, b) => {
        r /= 255; g /= 255; b /= 255
        const max = Math.max(r, g, b), min = Math.min(r, g, b)
        let h, s, l = (max + min) / 2
        if (max === min) { h = s = 0 } else {
          const d = max - min
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
            case g: h = ((b - r) / d + 2) / 6; break
            case b: h = ((r - g) / d + 4) / 6; break
          }
        }
        return { h: h * 360, s: s * 100, l: l * 100 }
      }
      
      const hslToRgb = (h, s, l) => {
        h /= 360; s /= 100; l /= 100
        let r, g, b
        if (s === 0) { r = g = b = l } else {
          const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1; if (t > 1) t -= 1
            if (t < 1/6) return p + (q - p) * 6 * t
            if (t < 1/2) return q
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
            return p
          }
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s
          const p = 2 * l - q
          r = hue2rgb(p, q, h + 1/3)
          g = hue2rgb(p, q, h)
          b = hue2rgb(p, q, h - 1/3)
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
      }
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
        let matchPercent = 0
        for (const sourceColor of sourceColors) {
          const dr = r - sourceColor.r, dg = g - sourceColor.g
          const db = b - sourceColor.b, da = a - sourceColor.a
          const distance = Math.sqrt(dr * dr + dg * dg + db * db + da * da)
          if (distance <= fuzziness) matchPercent = Math.max(matchPercent, 1 - (distance / fuzziness))
        }
        if (matchPercent > 0) {
          const hsl = rgbToHsl(r, g, b)
          const fullS = Math.max(0, Math.min(100, hsl.s + (targetSaturation - 50) * 2))
          const fullL = Math.max(0, Math.min(100, hsl.l + (targetLightness - 50) * 2))
          const rgb = hslToRgb(targetHue, fullS, fullL)
          data[i]     = Math.round(r + (rgb.r - r) * matchPercent)
          data[i + 1] = Math.round(g + (rgb.g - g) * matchPercent)
          data[i + 2] = Math.round(b + (rgb.b - b) * matchPercent)
          data[i + 3] = Math.round(a + (targetAlpha - a) * matchPercent)
        }
      }
      
        ctx.putImageData(imageData, 0, 0)
        const newSheetData = canvas.toDataURL('image/png')
        if (onSaveSheet) onSaveSheet(newSheetData)
        if (onApply) onApply(newSheetData)
        setShowConfirm(false)
        onClose()
      }
      img.src = freshSheetData
    })
  }

  const handleCancel = () => {
    // Revert to original image
    if (canvasRef.current && originalImageData) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.putImageData(originalImageData, 0, 0)
    }
    onClose()
  }
  
  // Notify parent when picking state changes
  useEffect(() => {
    if (onPickingChange) {
      onPickingChange(isPickingColor)
    }
  }, [isPickingColor, onPickingChange])

  // Generate fuzziness mask preview
  useEffect(() => {
    if (!canvasRef.current || !originalImageData || replaceColorSettings.sourceColors.length === 0) return
    
    const canvas = canvasRef.current
    const data = originalImageData.data
    
    const { sourceColors, fuzziness } = replaceColorSettings
    
    // Create mask canvas
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = canvas.width
    maskCanvas.height = canvas.height
    const maskCtx = maskCanvas.getContext('2d')
    const maskData = maskCtx.createImageData(canvas.width, canvas.height)
    
    // Build grayscale mask
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      
      // Check distance against all source colors, use closest match
      let maxSimilarity = 0
      for (const sourceColor of sourceColors) {
        const dr = r - sourceColor.r
        const dg = g - sourceColor.g
        const db = b - sourceColor.b
        const da = a - sourceColor.a
        const distance = Math.sqrt(dr * dr + dg * dg + db * db + da * da)
        
        // Calculate similarity (0 = no match, 255 = perfect match)
        if (distance <= fuzziness) {
          const similarity = Math.round(255 * (1 - distance / fuzziness))
          maxSimilarity = Math.max(maxSimilarity, similarity)
        }
      }
      
      // Set mask pixel to grayscale similarity value
      maskData.data[i] = maxSimilarity
      maskData.data[i + 1] = maxSimilarity
      maskData.data[i + 2] = maxSimilarity
      maskData.data[i + 3] = 255
    }
    
    maskCtx.putImageData(maskData, 0, 0)
    setMaskPreview(maskCanvas.toDataURL())
  }, [canvasRef, originalImageData, replaceColorSettings.sourceColors, replaceColorSettings.fuzziness])

  // Apply changes in real-time to canvas preview whenever settings change
  useEffect(() => {
    if (!canvasRef.current || !originalImageData || replaceColorSettings.sourceColors.length === 0) return
    applyToCanvas()
  }, [canvasRef, originalImageData, replaceColorSettings])

  return (
    <div ref={modalRef} className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 -ml-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-[400px] border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Replace Color</h3>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Source Colors */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Source Colors</label>
            <div className="flex flex-wrap gap-2">
              {replaceColorSettings.sourceColors.map((color, index) => (
                <div
                  key={index}
                  className="relative w-12 h-12 rounded border-2 border-gray-700 group cursor-pointer"
                  style={{
                    backgroundImage: 'url(/checkerboard.png)',
                    backgroundSize: '16px 16px'
                  }}
                  onClick={() => {
                    setReplacingColorIndex(index)
                    setIsPickingColor(true)
                    if (onPickingChange) onPickingChange(true)
                  }}
                  title="Click to replace this color"
                >
                  <div
                    className="absolute inset-0 rounded"
                    style={{
                      backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setReplaceColorSettings(prev => ({
                        ...prev,
                        sourceColors: prev.sourceColors.filter((_, i) => i !== index)
                      }))
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 hover:bg-red-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={handlePickColor}
                disabled={replaceColorSettings.sourceColors.length >= 6}
                className={`w-12 h-12 rounded border-2 border-dashed flex items-center justify-center transition-colors ${
                  replaceColorSettings.sourceColors.length >= 6
                    ? 'border-gray-700 text-gray-700 cursor-not-allowed'
                    : isPickingColor
                    ? 'border-purple-600 bg-purple-600 text-white'
                    : 'border-gray-600 text-gray-400 hover:border-purple-600 hover:text-purple-600'
                }`}
                title="Add source color"
              >
                <span className="material-symbols-outlined text-2xl">add</span>
              </button>
            </div>
          </div>

          {/* Fuzziness Mask Preview */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Fuzziness Mask Preview</label>
            <div className="w-full h-48 rounded border-2 border-gray-700 overflow-hidden bg-black flex items-center justify-center">
              {maskPreview ? (
                <img 
                  src={maskPreview} 
                  alt="Fuzziness mask"
                  className="w-full h-full object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <span className="text-xs text-gray-600">Pick a source color to preview mask</span>
              )}
            </div>
          </div>

          {/* Fuzziness */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Fuzziness: {replaceColorSettings.fuzziness}</label>
            <input
              type="range"
              min="1"
              max="200"
              value={replaceColorSettings.fuzziness}
              onChange={(e) => setReplaceColorSettings(prev => ({ ...prev, fuzziness: parseInt(e.target.value) }))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700"
            />
          </div>

          {/* Target Color Sliders */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Hue: {replaceColorSettings.targetHue}°</label>
            <input
              type="range"
              min="0"
              max="360"
              value={replaceColorSettings.targetHue}
              onChange={(e) => setReplaceColorSettings(prev => ({ ...prev, targetHue: parseInt(e.target.value) }))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, 
                  hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), 
                  hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), 
                  hsl(360, 100%, 50%))`
              }}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Saturation: {replaceColorSettings.targetSaturation}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={replaceColorSettings.targetSaturation}
              onChange={(e) => setReplaceColorSettings(prev => ({ ...prev, targetSaturation: parseInt(e.target.value) }))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, hsl(${replaceColorSettings.targetHue}, 0%, ${replaceColorSettings.targetLightness}%), hsl(${replaceColorSettings.targetHue}, 100%, ${replaceColorSettings.targetLightness}%))`
              }}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Lightness: {replaceColorSettings.targetLightness}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={replaceColorSettings.targetLightness}
              onChange={(e) => setReplaceColorSettings(prev => ({ ...prev, targetLightness: parseInt(e.target.value) }))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, hsl(${replaceColorSettings.targetHue}, ${replaceColorSettings.targetSaturation}%, 0%), hsl(${replaceColorSettings.targetHue}, ${replaceColorSettings.targetSaturation}%, 50%), hsl(${replaceColorSettings.targetHue}, ${replaceColorSettings.targetSaturation}%, 100%))`
              }}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Alpha: {replaceColorSettings.targetAlpha}</label>
            <input
              type="range"
              min="0"
              max="255"
              value={replaceColorSettings.targetAlpha}
              onChange={(e) => setReplaceColorSettings(prev => ({ ...prev, targetAlpha: parseInt(e.target.value) }))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700"
            />
          </div>

          {/* Apply To Entire Sprite Sheet */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={applyToSheet}
              onChange={(e) => setApplyToSheet(e.target.checked)}
              className="w-4 h-4 rounded accent-purple-600"
            />
            <span className="text-xs text-gray-300">Apply To Entire Sprite Sheet</span>
          </label>

          {/* Apply and Cancel Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors text-white"
            >
              Apply
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 rounded-lg p-6 w-[380px] border border-gray-700 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-3">Apply To Entire Sprite Sheet</h3>
            <p className="text-sm text-gray-300 mb-6">
              This will permanently apply the color changes to every pixel in the entire sprite sheet. 
              This action <span className="text-red-400 font-semibold">cannot be undone</span>. Are you sure?
            </p>
            <div className="flex gap-3">
              <button
                onClick={applyToEntireSheet}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors text-white"
              >
                Okay
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hover Color Preview Circle */}
      {isPickingColor && hoverColor && cursorPos && (() => {
        // Calculate position with modal offset
        const modalRect = modalRef.current?.getBoundingClientRect()
        const modalOffsetX = modalRect ? modalRect.left : 0
        const modalOffsetY = modalRect ? modalRect.top : 0
        
        return (
          <div
            style={{
              position: 'fixed',
              left: `${cursorPos.x - modalOffsetX}px`,
              top: `${cursorPos.y - modalOffsetY + 25}px`,
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: '0 0 0 1px black, 0 4px 8px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
              zIndex: 9999,
              transform: 'translate(-50%, 0)',
              backgroundImage: 'url(/checkerboard.png)',
              backgroundSize: '16px 16px'
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                backgroundColor: `rgba(${hoverColor.r}, ${hoverColor.g}, ${hoverColor.b}, ${hoverColor.a / 255})`
              }}
            />
          </div>
        )
      })()}
    </div>
  )
}

export default ReplaceColor
