/** Where the API writes its log lines. Tests pass a recording logger; `createApp` defaults to silent. */
export interface Logger {
  info(message: string): void
  error(message: string, error: unknown): void
}

export const silentLogger: Logger = {
  info: () => {},
  error: () => {},
}

/** Writes to stdout and stderr (`process.stdout.write`, not `console.log`, see the release checklist). */
export const stdLogger: Logger = {
  info: (message) => {
    process.stdout.write(`${message}\n`)
  },
  error: (message, error) => {
    const detail = error instanceof Error ? (error.stack ?? error.message) : String(error)
    process.stderr.write(`${message}: ${detail}\n`)
  },
}
