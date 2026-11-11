// The Vercel serverless entry (#48). `pnpm api:bundle` bundles it to apps/api/dist/vercel.mjs, which
// api/index.mjs re-exports. It builds the same app that server.ts listens on; Vercel
// calls the exported Express app as the handler.
import { createApp } from './app'
import { loadEnv } from './config/env'
import { db } from './db/client'
import { stdLogger } from './utils/logger'

const env = loadEnv(process.env)

export default createApp({ logger: stdLogger, db, allowReset: env.ALLOW_RESET })
