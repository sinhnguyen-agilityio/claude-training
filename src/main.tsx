import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { startMocks } from '@/mocks/browser'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

// The mock API must be ready before the first request is made.
await startMocks()

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
