import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useStore } from './stores'
import { applyTheme } from './lib/theme'
import { initAnalytics } from './lib/analytics'

applyTheme(useStore.getState().theme)
initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
