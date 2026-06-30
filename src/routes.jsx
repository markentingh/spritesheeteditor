import SheetEditor from './app/SheetEditor'
import { SheetEditorProvider } from './app/SheetEditorContext'

const routes = [
  {
    path: '/',
    component: () => <SheetEditorProvider><SheetEditor /></SheetEditorProvider>,
  },
]

export default routes
