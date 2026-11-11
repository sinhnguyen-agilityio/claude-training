// The Vercel function (#48). vercel.json rewrites /api/(.*) here. The app is bundled by
// `pnpm api:bundle` (part of the Vercel build command) from apps/api/src/vercel.ts, because Vercel
// does not resolve the extensionless imports and the .ts exports of the workspace packages.
export { default } from '../apps/api/dist/vercel.mjs'
