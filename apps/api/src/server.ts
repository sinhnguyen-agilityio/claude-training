import { createApp } from './app'

// An empty or non-numeric PORT falls back to the default instead of becoming port 0 or NaN.
const port = Number(process.env.PORT) || 3001

// Express 5 passes a listen error (for example EADDRINUSE) to this callback.
createApp().listen(port, (error?: Error) => {
  if (error) throw error
  process.stdout.write(`API listening on :${port}\n`)
})
