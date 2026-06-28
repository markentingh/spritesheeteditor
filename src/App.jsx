import { useState, useEffect } from 'react'
import routes from './routes'

function App() {
  const [mountKey, setMountKey] = useState(0)
  const currentPath = window.location.pathname
  const route = routes.find(r => r.path === currentPath) || routes[0]
  const Component = route.component

  useEffect(() => {
    if (localStorage.getItem('spriteSheetImage')) return
    import('./app/sheet-editor/SheetEditor.jsx').then(({ initializeDemoImage }) => {
      initializeDemoImage(() => setMountKey(k => k + 1))
    })
  }, [])

  return <Component key={mountKey} />
}

export default App
