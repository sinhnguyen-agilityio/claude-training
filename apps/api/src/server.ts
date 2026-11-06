import { createApp } from './app'
import { loadEnv, type Env } from './config/env'
import { stdLogger } from './utils/logger'

function readEnv(): Env {
  try {
    return loadEnv(process.env)
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  }
}

const env = readEnv()

// Express 5 passes a listen error (for example EADDRINUSE) to this callback.
createApp({ logger: stdLogger }).listen(env.PORT, (error?: Error) => {
  if (error) throw error
  process.stdout.write(`API listening on :${env.PORT}\n`)
})
