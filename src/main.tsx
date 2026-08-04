import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { startUpdateWatch } from './lib/update'
import './theme.css'

startUpdateWatch()

// Puanlarin tarayici temizliginde ucmamasi icin kalici depolama iste.
navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
