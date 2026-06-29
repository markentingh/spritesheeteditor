import { useState, useRef, useEffect } from 'react'

function MenuDropdown({ label, items, variant = 'toolbar' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const buttonClass = variant === 'toolbar'
    ? 'px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded text-xs font-medium text-gray-300 hover:text-white transition-colors flex items-center gap-1'
    : 'px-3 py-1 text-white hover:bg-gray-800 rounded transition-colors flex items-center gap-1'

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className={buttonClass}>
        {label}
        <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 py-1 min-w-[160px]">
          {items.map((item, i) =>
            item === 'separator' ? (
              <div key={i} className="my-1 border-t border-gray-700" />
            ) : (
              <button
                key={i}
                onClick={() => { item.onClick(); setOpen(false) }}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors whitespace-nowrap"
              >
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

export default MenuDropdown
