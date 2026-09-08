import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'

// autoUpdate: a new version installs itself on the next visit. Prompting
// someone to "reload to update" is a decision they have no way to evaluate,
// and during an emergency it is a dialog between them and the forecast.
// Guarded because there is no service worker at all over file:// or in a
// private window, and an unhandled rejection there is a confusing thing to
// leave in the console of someone just opening the built page to look at it.
if ('serviceWorker' in navigator) registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
