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

// Loaded after readEnv(): the client reads DATABASE_URL when it is imported, and a missing value
// should end in the short message above, not in a stack trace from that module.
const { db } = await import('./db/client')

// Express 5 passes a listen error (for example EADDRINUSE) to this callback.
createApp({ logger: stdLogger, db }).listen(env.PORT, (error?: Error) => {
  if (error) throw error
  process.stdout.write(`API listening on :${env.PORT}\n`)
})
